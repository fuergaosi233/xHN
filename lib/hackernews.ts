import { log } from './logger'

export interface HackerNewsItem {
  id: number
  title: string
  url?: string
  score: number
  by: string
  time: number
  descendants?: number
  type: string
  text?: string
}

export interface ProcessedItem extends HackerNewsItem {
  chineseTitle?: string
  summary?: string
  cached: boolean
  processingTime: number
  isUpdated?: boolean // 标记是否刚刚更新，用于动画效果
  updatedAt?: number // 更新时间戳
}

const HN_API_BASE = 'https://hacker-news.firebaseio.com/v0'
const ALGOLIA_API_BASE = 'https://hn.algolia.com/api/v1'
const FETCH_TIMEOUT = 15000

// 带过期清理和容量上限的 TTL 缓存，避免长跑进程中 item-* 条目无限累积
class TTLCache {
  private store = new Map<string, { data: any; expiresAt: number }>()

  constructor(private readonly maxEntries = 2000) {}

  get(key: string) {
    const entry = this.store.get(key)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return null
    }
    return entry.data
  }

  set(key: string, data: any, ttlMs: number) {
    if (this.store.size >= this.maxEntries) {
      this.evict()
    }
    this.store.set(key, { data, expiresAt: Date.now() + ttlMs })
  }

  private evict() {
    const now = Date.now()
    const entries = Array.from(this.store.entries())
    for (const [key, entry] of entries) {
      if (now > entry.expiresAt) this.store.delete(key)
    }
    // 全部未过期时删掉最早写入的 10%（Map 迭代保持插入顺序）
    if (this.store.size >= this.maxEntries) {
      const dropCount = Math.ceil(this.maxEntries / 10)
      const keys = Array.from(this.store.keys())
      for (const key of keys.slice(0, dropCount)) {
        this.store.delete(key)
      }
    }
  }
}

async function fetchJson(url: string): Promise<any> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT),
    cache: 'no-store'
  })
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }
  return response.json()
}

export class HackerNewsAPI {
  private cache = new TTLCache()
  private readonly LIST_CACHE_DURATION = 5 * 60 * 1000 // 榜单缓存 5 分钟
  private readonly ITEM_CACHE_DURATION = 5 * 60 * 1000
  private readonly NEW_CACHE_DURATION = 60 * 1000 // 最新文章变化快，缓存 1 分钟
  private readonly ITEM_FETCH_CONCURRENCY = 10

  private async getStoryList(list: 'topstories' | 'beststories' | 'newstories'): Promise<number[]> {
    const cacheKey = `${list}-full`
    const cached = this.cache.get(cacheKey)
    if (cached) return cached

    const data = await fetchJson(`${HN_API_BASE}/${list}.json`)
    const allStories = data.slice(0, 500)
    this.cache.set(cacheKey, allStories, this.LIST_CACHE_DURATION)
    return allStories
  }

  async getTopStories(page: number = 0, limit: number = 20): Promise<number[]> {
    const allStories = await this.getStoryList('topstories')
    return allStories.slice(page * limit, (page + 1) * limit)
  }

  async getBestStories(page: number = 0, limit: number = 20): Promise<number[]> {
    const allStories = await this.getStoryList('beststories')
    return allStories.slice(page * limit, (page + 1) * limit)
  }

  async getNewStories(page: number = 0, limit: number = 20): Promise<number[]> {
    const allStories = await this.getStoryList('newstories')
    return allStories.slice(page * limit, (page + 1) * limit)
  }

  // 最新文章走 Algolia：一次请求返回带完整字段的按时间排序列表，
  // 替代原先"拉 200 个 ID 再逐个抓详情"的做法
  async getNewStoriesSorted(page: number = 0, limit: number = 20): Promise<HackerNewsItem[]> {
    const cacheKey = `newsorted-${page}-${limit}`
    const cached = this.cache.get(cacheKey)
    if (cached) return cached

    try {
      const data = await fetchJson(
        `${ALGOLIA_API_BASE}/search_by_date?tags=story&hitsPerPage=${limit}&page=${page}`
      )
      const stories: HackerNewsItem[] = (data.hits || [])
        .map((hit: any) => ({
          id: parseInt(hit.objectID),
          title: hit.title,
          url: hit.url || undefined,
          score: hit.points || 0,
          by: hit.author || 'unknown',
          time: hit.created_at_i,
          descendants: hit.num_comments ?? undefined,
          type: 'story'
        }))
        .filter((story: HackerNewsItem) => story.id && story.title)

      this.cache.set(cacheKey, stories, this.NEW_CACHE_DURATION)
      return stories
    } catch (error) {
      log.warn('Algolia fetch failed, falling back to firebase API', { error: error instanceof Error ? error : new Error(String(error)) })
      return this.getNewStoriesSortedFallback(page, limit)
    }
  }

  // Algolia 不可用时的兜底：仍走 firebase，但把过量抓取压到 100 条以内
  private async getNewStoriesSortedFallback(page: number = 0, limit: number = 20): Promise<HackerNewsItem[]> {
    const storyIds = await this.getNewStories(0, Math.min(100, (page + 1) * limit + 20))
    const stories = await this.getMultipleItems(storyIds)

    const sortedStories = stories
      .filter(story => story.url && story.title && story.time)
      .sort((a, b) => b.time - a.time)

    return sortedStories.slice(page * limit, (page + 1) * limit)
  }

  async getItem(id: number): Promise<HackerNewsItem | null> {
    const cacheKey = `item-${id}`
    const cached = this.cache.get(cacheKey)
    if (cached) return cached

    try {
      const data = await fetchJson(`${HN_API_BASE}/item/${id}.json`)
      if (data) {
        this.cache.set(cacheKey, data, this.ITEM_CACHE_DURATION)
      }
      return data
    } catch (error) {
      log.error('Failed to fetch HackerNews item', { itemId: id, error: error instanceof Error ? error : new Error(String(error)) })
      return null
    }
  }

  // 并发池限流抓取，替代一次性发出全部请求
  async getMultipleItems(ids: number[]): Promise<HackerNewsItem[]> {
    const results: (HackerNewsItem | null)[] = new Array(ids.length).fill(null)
    let nextIndex = 0

    const workers = Array.from(
      { length: Math.min(this.ITEM_FETCH_CONCURRENCY, ids.length) },
      async () => {
        while (nextIndex < ids.length) {
          const i = nextIndex++
          results[i] = await this.getItem(ids[i])
        }
      }
    )
    await Promise.all(workers)

    return results.filter((item): item is HackerNewsItem => item !== null)
  }
}
