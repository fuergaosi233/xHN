import { getDb } from './db'
import { processingQueue, processedStories, ProcessingQueue } from './db/schema'
import { processWithAI } from './openai'
import { eq, and, lt, desc, asc, sql, gt, inArray } from 'drizzle-orm'
import { HackerNewsItem } from './hackernews'
import { wsManager, StoryUpdateEvent } from './websocket'
import { log } from './logger'

export interface QueueTask {
  id: number
  storyId: number
  title: string
  url?: string
  priority: number
}

export interface ProcessingResult {
  chineseTitle: string
  summary: string
  category?: string
  tags?: string[]
  content?: string
  originalContent?: string
  processingTime: number
  modelUsed: string
}

class QueueManager {
  private processing = new Set<number>()
  private workerRunning = false
  private readonly maxConcurrency: number
  private readonly retryDelay: number
  private readonly maxRetries: number
  private readonly cacheTtlMs: number
  // processing 状态超过该时长视为进程被杀导致的卡死任务，回收重跑
  private readonly stuckTimeoutMinutes: number

  constructor() {
    this.maxConcurrency = parseInt(process.env.QUEUE_CONCURRENCY || '3')
    this.retryDelay = parseInt(process.env.QUEUE_RETRY_DELAY || '5000')
    this.maxRetries = parseInt(process.env.QUEUE_RETRY_ATTEMPTS || '3')
    // 翻译结果内容不可变，默认缓存 7 天，避免热榜文章每天重复送 LLM
    this.cacheTtlMs = parseInt(process.env.CACHE_TTL_HOURS || '168') * 60 * 60 * 1000
    this.stuckTimeoutMinutes = parseInt(process.env.QUEUE_STUCK_TIMEOUT_MINUTES || '10')
  }

  // 添加任务到队列
  async addTask(story: HackerNewsItem, priority: number = 0): Promise<number> {
    try {
      const database = await getDb()
      // 检查是否已经在队列中或已完成
      const existing = await database.select()
        .from(processingQueue)
        .where(eq(processingQueue.storyId, story.id))
        .limit(1)

      if (existing.length > 0) {
        return existing[0].id
      }

      // 检查是否已经处理过且未过期
      const cached = await this.getCachedResult(story.id)
      if (cached) {
        return -1 // 表示已缓存，无需处理
      }

      // 添加新任务（story_id 唯一约束 + onConflictDoNothing 防止并发重复入队）
      const [newTask] = await database.insert(processingQueue)
        .values({
          storyId: story.id,
          title: story.title,
          url: story.url,
          priority,
          status: 'pending'
        })
        .onConflictDoNothing({ target: processingQueue.storyId })
        .returning({ id: processingQueue.id })

      if (!newTask) {
        return -1 // 并发下已被其他请求入队
      }

      log.queue('task_added', { taskId: newTask.id, storyId: story.id, title: story.title })
      return newTask.id
    } catch (error) {
      log.error('Failed to add task to queue', { error: error instanceof Error ? error : new Error(String(error)), storyId: story.id })
      throw error
    }
  }

  // 批量添加任务：3 条固定查询替代逐条 addTask 的 N*3 次往返
  async addBatchTasks(stories: HackerNewsItem[], priority: number = 0): Promise<number[]> {
    if (stories.length === 0) return []

    try {
      const database = await getDb()
      const storyIds = stories.map(s => s.id)

      // 失败超过 30 分钟的任务允许重置重试，避免一次上游故障导致长期不再尝试
      await database.update(processingQueue)
        .set({ status: 'pending', attempts: 0, error: null, updatedAt: new Date() })
        .where(and(
          inArray(processingQueue.storyId, storyIds),
          eq(processingQueue.status, 'failed'),
          lt(processingQueue.updatedAt, new Date(Date.now() - 30 * 60 * 1000))
        ))

      // 已在队列中的
      const existing = await database.select({ storyId: processingQueue.storyId })
        .from(processingQueue)
        .where(inArray(processingQueue.storyId, storyIds))
      const existingIds = new Set(existing.map((r: { storyId: number }) => r.storyId))

      // 已有有效缓存的
      const now = new Date()
      const cached = await database.select({ storyId: processedStories.storyId })
        .from(processedStories)
        .where(and(
          inArray(processedStories.storyId, storyIds),
          gt(processedStories.expiresAt, now)
        ))
      const cachedIds = new Set(cached.map((r: { storyId: number }) => r.storyId))

      const toInsert = stories.filter(s => !existingIds.has(s.id) && !cachedIds.has(s.id))
      if (toInsert.length === 0) return []

      const inserted = await database.insert(processingQueue)
        .values(toInsert.map(story => ({
          storyId: story.id,
          title: story.title,
          url: story.url,
          priority,
          status: 'pending'
        })))
        .onConflictDoNothing({ target: processingQueue.storyId })
        .returning({ id: processingQueue.id })

      log.queue('batch_tasks_added', { count: inserted.length, requested: stories.length })
      return inserted.map((r: { id: number }) => r.id)
    } catch (error) {
      log.error('Failed to add batch tasks', { error: error instanceof Error ? error : new Error(String(error)), count: stories.length })
      return []
    }
  }

  // 原子领取下一个待处理任务：FOR UPDATE SKIP LOCKED 防止多实例/并发重复领取
  async claimNextTask(): Promise<ProcessingQueue | null> {
    try {
      const database = await getDb()
      const result = await database.execute(sql`
        UPDATE processing_queue
        SET status = 'processing',
            processing_started_at = NOW(),
            attempts = attempts + 1,
            updated_at = NOW()
        WHERE id = (
          SELECT id FROM processing_queue
          WHERE status = 'pending'
          ORDER BY priority DESC, created_at ASC
          LIMIT 1
          FOR UPDATE SKIP LOCKED
        )
        RETURNING id, story_id AS "storyId", title, url, status, priority,
                  attempts, max_attempts AS "maxAttempts", error, result,
                  created_at AS "createdAt", updated_at AS "updatedAt",
                  processing_started_at AS "processingStartedAt", completed_at AS "completedAt"
      `)
      const rows = (result as any).rows ?? result
      return rows?.[0] || null
    } catch (error) {
      log.error('Failed to claim next task', { error: error instanceof Error ? error : new Error(String(error)) })
      return null
    }
  }

  // 回收卡死任务：进程被杀后停留在 processing 的任务超时回退 pending（或超过重试次数标记 failed）
  async recoverStuckTasks(): Promise<number> {
    try {
      const database = await getDb()
      const result = await database.execute(sql`
        UPDATE processing_queue
        SET status = CASE WHEN attempts >= max_attempts THEN 'failed' ELSE 'pending' END,
            error = 'processing timed out (worker died?)',
            updated_at = NOW()
        WHERE status = 'processing'
          AND processing_started_at < NOW() - (${this.stuckTimeoutMinutes} * INTERVAL '1 minute')
      `)
      const count = (result as any).rowCount ?? 0
      if (count > 0) {
        log.warn('Recovered stuck tasks', { count })
      }
      return count
    } catch (error) {
      log.error('Failed to recover stuck tasks', { error: error instanceof Error ? error : new Error(String(error)) })
      return 0
    }
  }

  // 处理单个任务（任务须已由 claimNextTask 原子领取，状态已是 processing）
  async processTask(task: ProcessingQueue): Promise<boolean> {
    if (this.processing.has(task.id)) {
      return false // 正在处理中
    }

    this.processing.add(task.id)
    const database = await getDb()

    try {
      const startTime = Date.now()
      
      // 调用AI处理
      const result = await processWithAI(task.title, task.url || undefined)
      const processingTime = Date.now() - startTime

      // 保存处理结果
      await this.saveResult(task, {
        chineseTitle: result.chineseTitle,
        summary: result.summary,
        category: result.category,
        tags: result.tags,
        content: result.content,
        originalContent: result.originalContent,
        processingTime,
        modelUsed: process.env.OPENAI_MODEL || 'unknown'
      })

      // 更新任务状态为完成
      await database.update(processingQueue)
        .set({
          status: 'completed',
          completedAt: new Date(),
          updatedAt: new Date(),
          result: result
        })
        .where(eq(processingQueue.id, task.id))

      log.queue('task_completed', { taskId: task.id, storyId: task.storyId, processingTime })
      return true

    } catch (error) {
      log.error('Task processing failed', { taskId: task.id, storyId: task.storyId, error: error instanceof Error ? error : new Error(String(error)), attempts: task.attempts || 1 })

      // attempts 已在领取时递增；未达上限回退 pending 重试，否则标记 failed
      await database.update(processingQueue)
        .set({
          status: (task.attempts || 1) >= (task.maxAttempts || 3) ? 'failed' : 'pending',
          error: error instanceof Error ? error.message : 'Unknown error',
          updatedAt: new Date()
        })
        .where(eq(processingQueue.id, task.id))

      return false
    } finally {
      this.processing.delete(task.id)
    }
  }

  // 保存处理结果到缓存
  private async saveResult(task: ProcessingQueue, result: ProcessingResult) {
    const database = await getDb()
    const now = new Date()
    const expiresAt = new Date(now.getTime() + this.cacheTtlMs)

    await database.insert(processedStories)
      .values({
        storyId: task.storyId,
        title: task.title,
        url: task.url,
        chineseTitle: result.chineseTitle,
        summary: result.summary,
        category: result.category,
        content: result.originalContent || result.content, // Store original content for DB
        tags: result.tags ? { tags: result.tags } : null,
        processingTime: result.processingTime,
        modelUsed: result.modelUsed,
        expiresAt
      })
      .onConflictDoUpdate({
        target: processedStories.storyId,
        set: {
          chineseTitle: result.chineseTitle,
          summary: result.summary,
          category: result.category,
          content: result.originalContent || result.content,
          tags: result.tags ? { tags: result.tags } : null,
          processingTime: result.processingTime,
          modelUsed: result.modelUsed,
          updatedAt: now,
          expiresAt
        }
      })

    // 广播WebSocket更新事件
    try {
      const updateEvent: StoryUpdateEvent = {
        storyId: task.storyId,
        title: task.title,
        chineseTitle: result.chineseTitle,
        summary: result.summary,
        updatedAt: now.toISOString(),
        processingTime: result.processingTime
      }

      wsManager.broadcastStoryUpdate(updateEvent)
    } catch (error) {
      log.error('Failed to broadcast story update', { error: error instanceof Error ? error : new Error(String(error)), storyId: task.storyId })
    }
  }

  // 获取缓存结果
  async getCachedResult(storyId: number) {
    try {
      const database = await getDb()
      const now = new Date()
      
      const [cached] = await database.select()
        .from(processedStories)
        .where(and(
          eq(processedStories.storyId, storyId),
          gt(processedStories.expiresAt, now)
        ))
        .limit(1)

      return cached || null
    } catch (error) {
      log.error('Failed to get cached result', { error: error instanceof Error ? error : new Error(String(error)), storyId })
      return null
    }
  }

  // 单轮排空：在并发上限内持续领取并处理任务，直到队列为空
  private async drainOnce(): Promise<void> {
    while (this.processing.size < this.maxConcurrency) {
      const task = await this.claimNextTask()
      if (!task) break

      this.processTask(task).catch(error => {
        log.error('Task processing error', { taskId: task.id, error: error instanceof Error ? error : new Error(String(error)) })
      })
    }
  }

  // 兼容旧调用：一次性触发排空（新增任务后由 API 路由调用，即时响应无需等轮询）
  async startProcessor() {
    await this.drainOnce()
  }

  // 常驻 worker 循环：由 instrumentation.ts 在进程启动时调用，进程内幂等
  async startWorker(pollIntervalMs: number = 5000) {
    if (this.workerRunning) return
    this.workerRunning = true
    log.queue('worker_started', { maxConcurrency: this.maxConcurrency, pollIntervalMs })

    let recoverCounter = 0
    while (true) {
      try {
        // 每 ~1 分钟回收一次卡死任务
        if (recoverCounter <= 0) {
          await this.recoverStuckTasks()
          recoverCounter = Math.max(1, Math.floor(60000 / pollIntervalMs))
        }
        recoverCounter--

        await this.drainOnce()
      } catch (error) {
        log.error('Queue worker loop error', { error: error instanceof Error ? error : new Error(String(error)) })
      }
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs))
    }
  }

  // 获取队列状态
  async getQueueStatus() {
    try {
      const database = await getDb()
      const stats = await database.select({
        status: processingQueue.status,
        count: sql<number>`count(*)`
      })
      .from(processingQueue)
      .groupBy(processingQueue.status)

      const statusCounts = stats.reduce((acc: Record<string, number>, stat: any) => {
        acc[stat.status] = Number(stat.count)
        return acc
      }, {} as Record<string, number>)

      return {
        pending: statusCounts.pending || 0,
        processing: statusCounts.processing || 0,
        completed: statusCounts.completed || 0,
        failed: statusCounts.failed || 0,
        activeWorkers: this.processing.size,
        maxConcurrency: this.maxConcurrency
      }
    } catch (error) {
      log.error('Failed to get queue status', { error: error instanceof Error ? error : new Error(String(error)) })
      return {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        activeWorkers: 0,
        maxConcurrency: this.maxConcurrency
      }
    }
  }

  // 清理旧任务
  async cleanupOldTasks(daysOld: number = 7) {
    try {
      const database = await getDb()
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysOld)

      const result = await database.delete(processingQueue)
        .where(lt(processingQueue.createdAt, cutoffDate))

      log.info('Queue cleanup completed', { cleanedTasks: result.rowCount || 0, daysOld })
      return result.rowCount || 0
    } catch (error) {
      log.error('Failed to cleanup old tasks', { error: error instanceof Error ? error : new Error(String(error)), daysOld })
      return 0
    }
  }
}

export const queueManager = new QueueManager()