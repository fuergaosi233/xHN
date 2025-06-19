import { ProcessedItem } from './hackernews'

export interface CacheEntry {
  data: ProcessedItem[]
  timestamp: number
  type: 'top' | 'best'
}

class LocalCache {
  private cache = new Map<string, CacheEntry>()
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours

  getCacheKey(type: 'top' | 'best'): string {
    const date = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
    return `${type}-${date}`
  }

  get(type: 'top' | 'best'): ProcessedItem[] | null {
    const key = this.getCacheKey(type)
    const entry = this.cache.get(key)
    
    if (!entry) return null
    
    const isExpired = Date.now() - entry.timestamp > this.CACHE_DURATION
    if (isExpired) {
      this.cache.delete(key)
      return null
    }
    
    return entry.data
  }

  set(type: 'top' | 'best', data: ProcessedItem[]): void {
    const key = this.getCacheKey(type)
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      type
    })
  }

  clear(): void {
    this.cache.clear()
  }

  getSize(): number {
    return this.cache.size
  }

  // Clean up expired entries
  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.CACHE_DURATION) {
        this.cache.delete(key)
      }
    }
  }
}

export const cache = new LocalCache()

// Auto cleanup every hour
setInterval(() => {
  cache.cleanup()
}, 60 * 60 * 1000)