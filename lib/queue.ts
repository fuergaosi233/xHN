import { getDb } from './db'
import { processingQueue, processedStories, ProcessingQueue } from './db/schema'
import { processWithAI } from './openai'
import { eq, and, lt, desc, asc, sql, gt } from 'drizzle-orm'
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
  private readonly maxConcurrency: number
  private readonly retryDelay: number
  private readonly maxRetries: number

  constructor() {
    this.maxConcurrency = parseInt(process.env.QUEUE_CONCURRENCY || '3')
    this.retryDelay = parseInt(process.env.QUEUE_RETRY_DELAY || '5000')
    this.maxRetries = parseInt(process.env.QUEUE_RETRY_ATTEMPTS || '3')
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

      // 添加新任务
      const [newTask] = await database.insert(processingQueue)
        .values({
          storyId: story.id,
          title: story.title,
          url: story.url,
          priority,
          status: 'pending'
        })
        .returning({ id: processingQueue.id })

      log.queue('task_added', { taskId: newTask.id, storyId: story.id, title: story.title })
      return newTask.id
    } catch (error) {
      log.error('Failed to add task to queue', { error: error instanceof Error ? error : new Error(String(error)), storyId: story.id })
      throw error
    }
  }

  // 批量添加任务
  async addBatchTasks(stories: HackerNewsItem[], priority: number = 0): Promise<number[]> {
    const taskIds: number[] = []
    
    for (const story of stories) {
      try {
        const taskId = await this.addTask(story, priority)
        if (taskId > 0) {
          taskIds.push(taskId)
        }
      } catch (error) {
        log.error('Failed to add story to batch queue', { error: error instanceof Error ? error : new Error(String(error)), storyId: story.id })
      }
    }
    
    return taskIds
  }

  // 获取下一个待处理任务
  async getNextTask(): Promise<ProcessingQueue | null> {
    try {
      const database = await getDb()
      const [task] = await database.select()
        .from(processingQueue)
        .where(eq(processingQueue.status, 'pending'))
        .orderBy(desc(processingQueue.priority), asc(processingQueue.createdAt))
        .limit(1)

      return task || null
    } catch (error) {
      log.error('Failed to get next task', { error: error instanceof Error ? error : new Error(String(error)) })
      return null
    }
  }

  // 处理单个任务
  async processTask(task: ProcessingQueue): Promise<boolean> {
    if (this.processing.has(task.id)) {
      return false // 正在处理中
    }

    this.processing.add(task.id)
    const database = await getDb()

    try {
      // 更新任务状态为处理中
      await database.update(processingQueue)
        .set({
          status: 'processing',
          processingStartedAt: new Date(),
          attempts: (task.attempts || 0) + 1,
          updatedAt: new Date()
        })
        .where(eq(processingQueue.id, task.id))

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
      log.error('Task processing failed', { taskId: task.id, storyId: task.storyId, error: error instanceof Error ? error : new Error(String(error)), attempts: (task.attempts || 0) + 1 })
      
      // 更新任务状态为失败
      await database.update(processingQueue)
        .set({
          status: ((task.attempts || 0) + 1) >= (task.maxAttempts || 3) ? 'failed' : 'pending',
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
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24小时后过期

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

  // 启动队列处理器
  async startProcessor() {
    if (this.processing.size >= this.maxConcurrency) {
      return // 已达到最大并发数
    }

    const task = await this.getNextTask()
    if (!task) {
      return // 没有待处理任务
    }

    // 异步处理任务
    this.processTask(task).catch(error => {
      log.error('Task processing error', { error: error instanceof Error ? error : new Error(String(error)) })
    })

    // 如果还有处理能力，继续启动处理器
    setTimeout(() => {
      this.startProcessor()
    }, 100)
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