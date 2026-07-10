'use client'

import { useState, useEffect, useCallback } from 'react'
import StoryCard from '@/components/StoryCard'
import StoryCardSkeleton from '@/components/StoryCardSkeleton'
import { ProcessedItem } from '@/lib/hackernews'
import { TrendingUp, Star, Clock, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useInfiniteScroll } from '@/lib/hooks/useInfiniteScroll'
import { useStoryUpdates } from '@/lib/hooks/useStoryUpdates'
import { useWebSocketUpdates } from '@/lib/hooks/useWebSocketUpdates'
import { useUmami } from '@/components/Analytics'

type TabType = 'top' | 'best' | 'new'

interface QueueStatus {
  pending: number
  processing: number
  completed: number
  failed: number
  activeWorkers: number
  maxConcurrency: number
}

interface APIResponse {
  success: boolean
  data: ProcessedItem[]
  cached: boolean
  count: number
  processingCount?: number
  queueStatus?: QueueStatus
  message?: string
  processingTime?: number
  error?: string
  page?: number
  limit?: number
  hasMore?: boolean
}

export default function Home() {
  const { track } = useUmami()
  const [activeTab, setActiveTab] = useState<TabType>('top')
  const [stories, setStories] = useState<ProcessedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [apiInfo, setApiInfo] = useState<{ cached: boolean; count: number; processingCount?: number; queueStatus?: QueueStatus; message?: string; processingTime?: number } | null>(null)
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false)
  const [currentPage, setCurrentPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  
  // 使用轮询更新hook (保持原有的轮询机制)
  const { stories: pollingUpdatedStories, isChecking } = useStoryUpdates(stories)
  
  // 使用WebSocket增强更新hook (在轮询基础上添加实时更新)
  const roomType = activeTab === 'top' ? 'top-stories' : activeTab === 'new' ? 'new-stories' : 'best-stories'
  const { stories: updatedStories, isConnected, connectionError } = useWebSocketUpdates(pollingUpdatedStories, roomType)

  const fetchStories = async (type: TabType, page: number = 0, append: boolean = false, forceRefresh = false) => {
    if (append) {
      setLoadingMore(true)
    } else {
      setLoading(true)
      setStories([])
      setCurrentPage(0)
      setHasMore(true)
    }
    setError(null)
    
    try {
      const params = new URLSearchParams({
        type,
        page: page.toString(),
        limit: '20'
      })
      
      if (forceRefresh) {
        params.append('refresh', 'true')
      }
      
      const response = await fetch(`/api/stories?${params}`)
      const data: APIResponse = await response.json()
      
      if (data.success) {
        if (append) {
          setStories(prev => [...prev, ...data.data])
        } else {
          setStories(data.data)
        }
        
        setCurrentPage(page)
        setHasMore(data.hasMore || false)
        setLastUpdated(new Date())
        setApiInfo({
          cached: data.cached,
          count: data.count,
          processingCount: data.processingCount,
          queueStatus: data.queueStatus,
          message: data.message,
          processingTime: data.processingTime
        })
      } else {
        setError(data.error || '获取数据失败')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '网络错误')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const loadMoreStories = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchStories(activeTab, currentPage + 1, true)
    }
  }, [activeTab, currentPage, loadingMore, hasMore])

  // 无限滚动hook
  const { observe } = useInfiniteScroll(hasMore, loadingMore, loadMoreStories)

  useEffect(() => {
    fetchStories(activeTab)
  }, [activeTab])

  // 处理计数显示逻辑（保留显示，但不自动刷新整页）
  useEffect(() => {
    if (apiInfo?.processingCount && apiInfo.processingCount > 0) {
      setAutoRefreshEnabled(true)
    } else {
      setAutoRefreshEnabled(false)
    }
  }, [apiInfo?.processingCount])

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab)
    
    // 追踪标签页切换事件
    track('tab_change', {
      from_tab: activeTab,
      to_tab: tab
    })
  }

  const handleRefresh = () => {
    fetchStories(activeTab, 0, false, true)
  }

  const TABS: { key: TabType; label: string; icon: typeof TrendingUp }[] = [
    { key: 'top', label: '最热', icon: TrendingUp },
    { key: 'best', label: '最受欢迎', icon: Star },
    { key: 'new', label: '最新', icon: Clock },
  ]

  return (
    <div>
      {/* 页面主标题（Apple 编辑页那种大标题 + 副题） */}
      <div className="pt-12 pb-8">
        <h1 className="display-title text-[2.4rem] sm:text-[3rem] text-foreground">
          今日 Hacker News
        </h1>
        <p className="mt-3 text-[1.05rem] text-muted-foreground leading-relaxed max-w-xl">
          实时聚合全球科技圈的讨论，AI 翻译标题、提炼摘要，中文速读。
        </p>
      </div>

      {/* 分段切换（iOS 分段控件风格），吸附在导航栏下方 */}
      <div className="sticky top-14 z-30 -mx-5 px-5 py-3 glass border-b border-hairline">
        <div className="inline-flex items-center gap-1 p-1 rounded-full bg-muted">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => handleTabChange(key)}
              className={cn(
                'inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full text-[0.85rem] font-medium transition-all duration-200',
                activeTab === key
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="pt-2">
          <StoryCardSkeleton count={4} />
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="text-center py-24">
          <p className="headline text-lg text-foreground mb-2">获取数据失败</p>
          <p className="text-sm text-muted-foreground mb-6">{error}</p>
          <Button onClick={() => fetchStories(activeTab)} className="rounded-full">重试</Button>
        </div>
      )}

      {/* List */}
      {!loading && !error && updatedStories.length > 0 && (
        <>
          <div className="divide-y divide-hairline">
            {updatedStories.map((story, index) => (
              <StoryCard key={story.id} story={story} index={index} />
            ))}
          </div>

          {hasMore && (
            <div ref={observe} className="flex justify-center py-10">
              {loadingMore ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  加载更多…
                </div>
              ) : (
                <span className="text-muted-foreground/60 text-sm">向下滚动加载更多</span>
              )}
            </div>
          )}

          {!hasMore && !loadingMore && (
            <div className="text-center py-10">
              <p className="text-muted-foreground/60 text-sm">已经到底啦 · 共 {updatedStories.length} 篇</p>
            </div>
          )}
        </>
      )}

      {/* Empty */}
      {!loading && !error && updatedStories.length === 0 && (
        <div className="text-center py-24">
          <p className="text-muted-foreground">暂无数据</p>
        </div>
      )}
    </div>
  )
}