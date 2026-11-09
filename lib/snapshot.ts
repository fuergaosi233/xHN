import { inArray, eq } from 'drizzle-orm'
import { getDb } from './db'
import { processedStories, systemConfig } from './db/schema'
import { HackerNewsAPI, HackerNewsItem, ProcessedItem } from './hackernews'
import { queueManager } from './queue'
import { toClientImages } from './images'
import { log } from './logger'

// 榜单快照：后台定时把三个榜单拉好、合并翻译结果放在内存里（并持久化到 system_config），
// 页面 SSR 和 /api/stories 直接读快照，打开就有内容，不再"请求时现拉 HN + 现翻译"。
// 新上榜的文章由刷新任务提前入队翻译，不必等用户访问才触发。

export type ListType = 'top' | 'best' | 'new'

export interface QueueSummary {
  pending: number
  processing: number
}

export interface Snapshot {
  type: ListType
  items: ProcessedItem[]
  builtAt: number
  queue: QueueSummary
}

const LIST_TYPES: ListType[] = ['top', 'best', 'new']
// 每个榜单预取的深度（HN 首页 30 条/页，top 预取 5 页）
const DEPTH: Record<ListType, number> = { top: 150, best: 100, new: 60 }
const REFRESH_MS = parseInt(process.env.SNAPSHOT_REFRESH_MS || '120000')
const CONFIG_KEY = (type: ListType) => `snapshot:${type}`

const hnAPI = new HackerNewsAPI()

class SnapshotStore {
  private snaps = new Map<ListType, Snapshot>()
  // 最近一次从 HN 拉到的原始榜单，翻译完成时只需重新合并，不必再请求 HN
  private raw = new Map<ListType, HackerNewsItem[]>()
  private building = new Map<ListType, Promise<Snapshot | null>>()
  private remergeTimer: NodeJS.Timeout | null = null
  private started = false

  // 读快照：有就立即返回（过旧则后台刷新），冷启动时先读持久化的，再不行才同步构建
  async get(type: ListType): Promise<Snapshot | null> {
    this.start()
    const snap = this.snaps.get(type) || await this.loadPersisted(type)
    if (snap) {
      if (Date.now() - snap.builtAt > REFRESH_MS * 2) this.rebuild(type)
      return snap
    }
    return this.rebuild(type)
  }

  // 常驻刷新：由 instrumentation 在进程启动时调用，进程内幂等
  start() {
    if (this.started || process.env.DISABLE_SNAPSHOT === 'true') return
    this.started = true
    const tick = () => {
      // 串行刷新三个榜单，避免同时向 HN 发几百个请求
      LIST_TYPES.reduce((p, type) => p.then(() => this.rebuild(type)).then(() => undefined), Promise.resolve())
        .catch(() => {})
    }
    tick()
    setInterval(tick, REFRESH_MS).unref?.()
    log.info('Snapshot refresher started', { refreshMs: REFRESH_MS })
  }

  // 翻译完成后调用：去抖 3 秒，把新结果合并进现有快照（只查库，不请求 HN）
  onStoryProcessed() {
    if (this.remergeTimer) return
    this.remergeTimer = setTimeout(() => {
      this.remergeTimer = null
      for (const type of LIST_TYPES) {
        const items = this.raw.get(type)
        if (items) this.merge(type, items, false).catch(() => {})
      }
    }, 3000)
  }

  private rebuild(type: ListType): Promise<Snapshot | null> {
    let job = this.building.get(type)
    if (!job) {
      job = this.build(type)
        .catch(error => {
          log.warn('Snapshot build failed', { type, error: error instanceof Error ? error : new Error(String(error)) })
          return this.snaps.get(type) || null
        })
        .finally(() => this.building.delete(type))
      this.building.set(type, job)
    }
    return job
  }

  private async fetchList(type: ListType): Promise<HackerNewsItem[]> {
    if (type === 'new') {
      const pages = await Promise.all([0, 1, 2].map(p => hnAPI.getNewStoriesSorted(p, DEPTH.new / 3)))
      return pages.flat()
    }
    const ids = type === 'top'
      ? await hnAPI.getTopStories(0, DEPTH.top)
      : await hnAPI.getBestStories(0, DEPTH.best)
    return hnAPI.getMultipleItems(ids)
  }

  private async build(type: ListType): Promise<Snapshot> {
    const started = Date.now()
    const items = (await this.fetchList(type)).filter(s => s && s.url && s.title)
    if (items.length === 0) throw new Error('empty HN list')
    this.raw.set(type, items)
    const snap = await this.merge(type, items, true)
    log.debug('Snapshot built', { type, items: snap.items.length, ms: Date.now() - started })
    return snap
  }

  // 合并翻译结果。top/best 只展示已处理完的文章（未完成的已入队，几分钟内会出现）；
  // new 本来就是刚发的帖子，未翻译的也展示，带"处理中"占位
  private async merge(type: ListType, items: HackerNewsItem[], enqueue: boolean): Promise<Snapshot> {
    const database = await getDb()
    const rows = await database.select({
      storyId: processedStories.storyId,
      chineseTitle: processedStories.chineseTitle,
      summary: processedStories.summary,
      category: processedStories.category,
      tags: processedStories.tags,
      images: processedStories.images,
      processingTime: processedStories.processingTime,
    })
      .from(processedStories)
      .where(inArray(processedStories.storyId, items.map(s => s.id)))
    const byId = new Map<number, (typeof rows)[number]>(rows.map((r: (typeof rows)[number]) => [r.storyId, r]))

    const out: ProcessedItem[] = []
    const pending: HackerNewsItem[] = []
    for (const story of items) {
      const t = byId.get(story.id)
      if (t && t.chineseTitle && t.summary) {
        out.push({
          id: story.id,
          title: story.title,
          url: story.url,
          score: story.score,
          by: story.by,
          time: story.time,
          descendants: story.descendants,
          type: story.type,
          chineseTitle: t.chineseTitle,
          summary: t.summary,
          category: t.category || undefined,
          tags: (t.tags as any)?.tags || undefined,
          images: toClientImages(t.images),
          cached: true,
          processingTime: t.processingTime || 0,
        })
      } else {
        pending.push(story)
        if (type === 'new') {
          out.push({
            id: story.id, title: story.title, url: story.url, score: story.score, by: story.by,
            time: story.time, descendants: story.descendants, type: story.type,
            chineseTitle: story.title, summary: '正在处理中...', cached: false, processingTime: 0,
          })
        }
      }
    }

    if (enqueue && pending.length > 0) {
      await queueManager.addBatchTasks(pending, type === 'top' ? 2 : type === 'best' ? 1 : 0)
      queueManager.startProcessor().catch(() => {})
    }

    const status = await queueManager.getQueueStatus()
    const snap: Snapshot = {
      type,
      items: out,
      builtAt: enqueue ? Date.now() : (this.snaps.get(type)?.builtAt ?? Date.now()),
      queue: { pending: status.pending, processing: status.processing },
    }
    this.snaps.set(type, snap)
    this.persist(snap).catch(() => {})
    return snap
  }

  private async persist(snap: Snapshot) {
    const database = await getDb()
    const value = JSON.stringify(snap)
    await database.insert(systemConfig)
      .values({ key: CONFIG_KEY(snap.type), value, description: 'homepage list snapshot' })
      .onConflictDoUpdate({ target: systemConfig.key, set: { value, updatedAt: new Date() } })
  }

  private async loadPersisted(type: ListType): Promise<Snapshot | null> {
    try {
      const database = await getDb()
      const [row] = await database.select({ value: systemConfig.value })
        .from(systemConfig)
        .where(eq(systemConfig.key, CONFIG_KEY(type)))
        .limit(1)
      if (!row) return null
      const snap = JSON.parse(row.value) as Snapshot
      // 内存里可能已经有更新的（并发构建完成），不覆盖
      if (!this.snaps.has(type)) this.snaps.set(type, snap)
      return this.snaps.get(type) || null
    } catch {
      return null
    }
  }
}

// Next 会把 instrumentation、路由、页面打成不同的 bundle，模块级单例可能有多份；挂到 globalThis 保证进程内唯一
const g = globalThis as unknown as { __xhnSnapshot?: SnapshotStore }
export const snapshotStore = g.__xhnSnapshot ?? (g.__xhnSnapshot = new SnapshotStore())

export function sliceSnapshot(snap: Snapshot, page: number, limit: number) {
  const data = snap.items.slice(page * limit, (page + 1) * limit)
  return { data, hasMore: (page + 1) * limit < snap.items.length }
}
