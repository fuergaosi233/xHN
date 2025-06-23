'use client'

import { useState, useEffect, useCallback } from 'react'
import StoryCard from '@/components/StoryCard'
import LoadingSpinner from '@/components/LoadingSpinner'
import StoryCardSkeleton from '@/components/StoryCardSkeleton'
import { ProcessedItem } from '@/lib/hackernews'
import { TrendingUp, Star, Clock, Loader2 } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useInfiniteScroll } from '@/lib/hooks/useInfiniteScroll'
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
  
  // 使用WebSocket自动更新hook
  const roomType = activeTab === 'top' ? 'top-stories' : activeTab === 'new' ? 'new-stories' : 'best-stories'
  const { stories: updatedStories, isConnected, connectionError } = useWebSocketUpdates(stories, roomType)

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

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      
      {/* Main Content */}
      <Tabs defaultValue="top" value={activeTab} onValueChange={(value) => handleTabChange(value as TabType)}>
        <div className="flex justify-center mb-8">
          <TabsList className="grid w-full max-w-[600px] grid-cols-3">
            <TabsTrigger value="top" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              24小时最热
            </TabsTrigger>
            <TabsTrigger value="best" className="flex items-center gap-2">
              <Star className="w-4 h-4" />
              最受欢迎
            </TabsTrigger>
            <TabsTrigger value="new" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              最新文章
            </TabsTrigger>
          </TabsList>
        </div>

        {/* WebSocket连接状态 */}
        {connectionError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-center">
            <p className="text-red-700 text-sm">
              实时更新连接失败: {connectionError}
            </p>
          </div>
        )}
        
        <div className="flex justify-center mb-4">
          <Badge variant={isConnected ? "default" : "secondary"} className="text-xs">
            {isConnected ? "🟢 实时更新已连接" : "🔴 实时更新未连接"}
          </Badge>
        </div>

        <TabsContent value="top" className="mt-6">
          {/* Loading State */}
          {loading && (
            <div className="space-y-4">
              <LoadingSpinner 
                message="正在获取最热新闻..." 
                variant="ai" 
                size="lg"
              />
              <StoryCardSkeleton count={3} />
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <Card className="text-center p-8">
              <CardContent>
                <h3 className="font-medium mb-2 text-destructive">获取数据失败</h3>
                <p className="text-sm text-muted-foreground mb-4">{error}</p>
                <Button
                  onClick={() => fetchStories(activeTab)}
                  variant="destructive"
                >
                  重试
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Stories List */}
          {!loading && !error && updatedStories.length > 0 && (
            <>
              <div className="divide-y divide-border/30">
                {updatedStories.map((story, index) => (
                  <StoryCard key={story.id} story={story} index={index} />
                ))}
              </div>
              
              {/* Infinite Scroll Trigger */}
              {hasMore && (
                <div ref={observe} className="flex justify-center py-8">
                  {loadingMore ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>加载更多文章...</span>
                    </div>
                  ) : (
                    <div className="text-muted-foreground text-sm">
                      滚动查看更多
                    </div>
                  )}
                </div>
              )}
              
              {/* End Message */}
              {!hasMore && !loadingMore && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground text-sm">
                    已加载全部文章 ({updatedStories.length} 篇)
                  </p>
                </div>
              )}
            </>
          )}

          {/* Empty State */}
          {!loading && !error && updatedStories.length === 0 && (
            <Card className="text-center p-8">
              <CardContent>
                <p className="text-muted-foreground">暂无数据</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="best" className="mt-6">
          {/* Loading State */}
          {loading && (
            <div className="space-y-4">
              <LoadingSpinner 
                message="正在获取最受欢迎新闻..." 
                variant="sparkle" 
                size="lg"
              />
              <StoryCardSkeleton count={3} />
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <Card className="text-center p-8">
              <CardContent>
                <h3 className="font-medium mb-2 text-destructive">获取数据失败</h3>
                <p className="text-sm text-muted-foreground mb-4">{error}</p>
                <Button
                  onClick={() => fetchStories(activeTab)}
                  variant="destructive"
                >
                  重试
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Stories List */}
          {!loading && !error && updatedStories.length > 0 && (
            <>
              <div className="divide-y divide-border/30">
                {updatedStories.map((story, index) => (
                  <StoryCard key={story.id} story={story} index={index} />
                ))}
              </div>
              
              {/* Infinite Scroll Trigger */}
              {hasMore && (
                <div ref={observe} className="flex justify-center py-8">
                  {loadingMore ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>加载更多文章...</span>
                    </div>
                  ) : (
                    <div className="text-muted-foreground text-sm">
                      滚动查看更多
                    </div>
                  )}
                </div>
              )}
              
              {/* End Message */}
              {!hasMore && !loadingMore && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground text-sm">
                    已加载全部文章 ({updatedStories.length} 篇)
                  </p>
                </div>
              )}
            </>
          )}

          {/* Empty State */}
          {!loading && !error && updatedStories.length === 0 && (
            <Card className="text-center p-8">
              <CardContent>
                <p className="text-muted-foreground">暂无数据</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="new" className="mt-6">
          {/* Loading State */}
          {loading && (
            <div className="space-y-4">
              <LoadingSpinner 
                message="正在获取最新文章..." 
                variant="default" 
                size="lg"
              />
              <StoryCardSkeleton count={3} />
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <Card className="text-center p-8">
              <CardContent>
                <h3 className="font-medium mb-2 text-destructive">获取数据失败</h3>
                <p className="text-sm text-muted-foreground mb-4">{error}</p>
                <Button
                  onClick={() => fetchStories(activeTab)}
                  variant="destructive"
                >
                  重试
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Stories List */}
          {!loading && !error && updatedStories.length > 0 && (
            <>
              <div className="divide-y divide-border/30">
                {updatedStories.map((story, index) => (
                  <StoryCard key={story.id} story={story} index={index} />
                ))}
              </div>
              
              {/* Infinite Scroll Trigger */}
              {hasMore && (
                <div ref={observe} className="flex justify-center py-8">
                  {loadingMore ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>加载更多文章...</span>
                    </div>
                  ) : (
                    <div className="text-muted-foreground text-sm">
                      滚动查看更多
                    </div>
                  )}
                </div>
              )}
              
              {/* End Message */}
              {!hasMore && !loadingMore && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground text-sm">
                    已加载全部文章 ({updatedStories.length} 篇)
                  </p>
                </div>
              )}
            </>
          )}

          {/* Empty State */}
          {!loading && !error && updatedStories.length === 0 && (
            <Card className="text-center p-8">
              <CardContent>
                <p className="text-muted-foreground">暂无数据</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}