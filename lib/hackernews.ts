import axios from 'axios'

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

  async getTopStories(): Promise<number[]> {
    const cacheKey = 'topstories'
    const cached = this.getCachedData(cacheKey)
    if (cached) return cached

    const response = await axios.get(`${HN_API_BASE}/topstories.json`)
    const data = response.data.slice(0, 30) // Get top 30 stories
    this.setCachedData(cacheKey, data)
    return data
  }

  async getBestStories(): Promise<number[]> {
    const cacheKey = 'beststories'
    const cached = this.getCachedData(cacheKey)
    if (cached) return cached

    const response = await axios.get(`${HN_API_BASE}/beststories.json`)
    const data = response.data.slice(0, 30) // Get top 30 stories
    this.setCachedData(cacheKey, data)
    return data
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
      console.error(`Failed to fetch item ${id}:`, error)
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