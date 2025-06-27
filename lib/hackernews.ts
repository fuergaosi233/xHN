import axios from 'axios'
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

export class HackerNewsAPI {
  private cache = new Map<string, { data: any; timestamp: number }>()
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

  private getCachedData(key: string) {
    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data
    }
    return null
  }

  private setCachedData(key: string, data: any) {
    this.cache.set(key, { data, timestamp: Date.now() })
  }

  async getTopStories(page: number = 0, limit: number = 20): Promise<number[]> {
    const cacheKey = 'topstories-full'
    let allStories = this.getCachedData(cacheKey)
    
    if (!allStories) {
      const response = await axios.get(`${HN_API_BASE}/topstories.json`)
      allStories = response.data.slice(0, 500) // Get top 500 stories
      this.setCachedData(cacheKey, allStories)
    }

    const start = page * limit
    const end = start + limit
    return allStories.slice(start, end)
  }

  async getBestStories(page: number = 0, limit: number = 20): Promise<number[]> {
    const cacheKey = 'beststories-full'
    let allStories = this.getCachedData(cacheKey)
    
    if (!allStories) {
      const response = await axios.get(`${HN_API_BASE}/beststories.json`)
      allStories = response.data.slice(0, 500) // Get top 500 stories
      this.setCachedData(cacheKey, allStories)
    }

    const start = page * limit
    const end = start + limit
    return allStories.slice(start, end)
  }

  async getNewStories(page: number = 0, limit: number = 20): Promise<number[]> {
    const cacheKey = 'newstories-full'
    let allStories = this.getCachedData(cacheKey)
    
    if (!allStories) {
      const response = await axios.get(`${HN_API_BASE}/newstories.json`)
      allStories = response.data.slice(0, 500) // Get top 500 stories
      this.setCachedData(cacheKey, allStories)
    }

    const start = page * limit
    const end = start + limit
    return allStories.slice(start, end)
  }

  async getNewStoriesSorted(page: number = 0, limit: number = 20): Promise<HackerNewsItem[]> {
    // 先获取足够多的最新文章ID
    const storyIds = await this.getNewStories(0, Math.min(200, (page + 1) * limit + 50))
    
    // 获取所有文章详情
    const stories = await this.getMultipleItems(storyIds)
    
    // 按时间排序（最新的在前）
    const sortedStories = stories
      .filter(story => story.url && story.title && story.time)
      .sort((a, b) => b.time - a.time)
    
    // 分页
    const start = page * limit
    const end = start + limit
    return sortedStories.slice(start, end)
  }

  async getItem(id: number): Promise<HackerNewsItem | null> {
    const cacheKey = `item-${id}`
    const cached = this.getCachedData(cacheKey)
    if (cached) return cached

    try {
      const response = await axios.get(`${HN_API_BASE}/item/${id}.json`)
      const data = response.data
      this.setCachedData(cacheKey, data)
      return data
    } catch (error) {
      log.error('Failed to fetch HackerNews item', { itemId: id, error })
      return null
    }
  }

  async getMultipleItems(ids: number[]): Promise<HackerNewsItem[]> {
    const promises = ids.map(id => this.getItem(id))
    const results = await Promise.allSettled(promises)
    
    return results
      .filter((result): result is PromiseFulfilledResult<HackerNewsItem> => 
        result.status === 'fulfilled' && result.value !== null
      )
      .map(result => result.value)
  }
}