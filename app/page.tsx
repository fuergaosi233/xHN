'use client'

import { useState, useEffect } from 'react'
import StoryCard from '@/components/StoryCard'
import LoadingSpinner from '@/components/LoadingSpinner'
import { ProcessedItem } from '@/lib/hackernews'
import { TrendingUp, Star } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type TabType = 'top' | 'best'

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
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('top')
  const [stories, setStories] = useState<ProcessedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [apiInfo, setApiInfo] = useState<{ cached: boolean; count: number; processingCount?: number; queueStatus?: QueueStatus; message?: string; processingTime?: number } | null>(null)
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false)

  const fetchStories = async (type: TabType, forceRefresh = false) => {
    setLoading(true)
    setError(null)
    
    try {
      const url = forceRefresh 
        ? `/api/stories?type=${type}&refresh=true` 
        : `/api/stories?type=${type}`
      
      const response = await fetch(url)
      const data: APIResponse = await response.json()
      
      if (data.success) {
        setStories(data.data)
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
    }
  }

  useEffect(() => {
    fetchStories(activeTab)
  }, [activeTab])

  // 自动刷新逻辑：当有内容正在处理时，定期检查更新
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null
    let timeoutId: NodeJS.Timeout | null = null
    
    if (apiInfo?.processingCount && apiInfo.processingCount > 0 && !loading) {
      setAutoRefreshEnabled(true)
      // 立即开始刷新检查
      timeoutId = setTimeout(() => {
        intervalId = setInterval(() => {
          console.log('Auto-refreshing to check for translation updates...')
          fetchStories(activeTab)
        }, 8000) // 每8秒刷新一次，更频繁的检查
      }, 5000) // 5秒后开始自动刷新
    } else {
      setAutoRefreshEnabled(false)
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId)
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [apiInfo?.processingCount, loading, activeTab])

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab)
  }

  const handleRefresh = () => {
    fetchStories(activeTab, true)
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      
      {/* Main Content */}
      <Tabs defaultValue="top" value={activeTab} onValueChange={(value) => handleTabChange(value as TabType)}>
        <div className="flex justify-center mb-8">
          <TabsList className="grid w-[400px] grid-cols-2">
            <TabsTrigger value="top" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              24小时最热
            </TabsTrigger>
            <TabsTrigger value="best" className="flex items-center gap-2">
              <Star className="w-4 h-4" />
              最受欢迎
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="top" className="mt-6">
          {/* Loading State */}
          {loading && (
            <LoadingSpinner message="正在获取最热新闻..." />
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
          {!loading && !error && stories.length > 0 && (
            <div className="space-y-0">
              {stories.map((story, index) => (
                <StoryCard key={story.id} story={story} index={index} />
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && stories.length === 0 && (
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
            <LoadingSpinner message="正在获取最受欢迎新闻..." />
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
          {!loading && !error && stories.length > 0 && (
            <div className="space-y-0">
              {stories.map((story, index) => (
                <StoryCard key={story.id} story={story} index={index} />
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && stories.length === 0 && (
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