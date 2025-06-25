'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, Database, Clock, TrendingUp, CheckCircle, Bug, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import ModelInfo from '@/components/ModelInfo'

interface QueueStatus {
  pending: number
  processing: number
  completed: number
  failed: number
  activeWorkers: number
  maxConcurrency: number
}

interface CacheStats {
  totalCached: number
  recentCached: number
  withTranslation: number
  avgProcessingTime: number
  lastUpdate: string | null
}

interface QueueStats {
  totalTasks: number
  pending: number
  processing: number
  completed: number
  failed: number
}

interface StatusData {
  success: boolean
  queueStatus: QueueStatus
  cacheStats: CacheStats
  queueStats: QueueStats
  recentTasks: Array<{
    id: number
    storyId: number
    title: string
    status: string
    createdAt: string
    completedAt?: string
    processingTime?: number
  }>
  systemInfo: {
    totalProcessed: number
    successRate: number
    averageProcessingTime: number
  }
}

export default function StatusPage() {
  const [statusData, setStatusData] = useState<StatusData | null>(null)
  const [loading, setLoading] = useState(true)
  const [debugMode, setDebugMode] = useState(false)
  const [cachedData, setCachedData] = useState<any>(null)
  const [storyId, setStoryId] = useState('')
  const [storyDebugData, setStoryDebugData] = useState<any>(null)

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/queue/status')
      const data = await response.json()
      if (data.success) {
        setStatusData(data)
      }
    } catch (error) {
      console.error('Failed to fetch status:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCachedData = async () => {
    try {
      const response = await fetch('/api/status/cached')
      const data = await response.json()
      setCachedData(data)
    } catch (error) {
      console.error('Failed to fetch cached data:', error)
    }
  }

  const fetchStoryDebug = async () => {
    if (!storyId.trim()) return
    try {
      const response = await fetch(`/api/status/story/${storyId.trim()}`)
      const data = await response.json()
      setStoryDebugData(data)
    } catch (error) {
      console.error('Failed to fetch story debug data:', error)
      setStoryDebugData({ success: false, error: 'Failed to fetch data' })
    }
  }

  const formatTime = (dateString: string | null) => {
    if (!dateString) return '从未'
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    if (diff < 60000) {
      return '刚刚'
    } else if (diff < 3600000) {
      return `${Math.floor(diff / 60000)} 分钟前`
    } else if (diff < 86400000) {
      return `${Math.floor(diff / 3600000)} 小时前`
    } else {
      return `${Math.floor(diff / 86400000)} 天前`
    }
  }

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 5000) // 每5秒更新一次
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center">加载中...</div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">系统状态</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchStatus}>
            <RefreshCw className="w-4 h-4 mr-1" />
            刷新
          </Button>
          <Button 
            variant={debugMode ? "default" : "outline"} 
            size="sm" 
            onClick={() => setDebugMode(!debugMode)}
          >
            <Bug className="w-4 h-4 mr-1" />
            调试模式
          </Button>
          <Badge variant="outline" className="animate-pulse">
            实时更新
          </Badge>
        </div>
      </div>

      {/* Model Configuration */}
      <ModelInfo />

      {/* Cache Statistics */}
      {statusData?.cacheStats && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              <CardTitle>缓存统计</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {statusData.cacheStats.totalCached}
                </div>
                <div className="text-sm text-muted-foreground">总缓存数</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {statusData.cacheStats.recentCached}
                </div>
                <div className="text-sm text-muted-foreground">24小时新增</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {statusData.cacheStats.withTranslation}
                </div>
                <div className="text-sm text-muted-foreground">已翻译</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {(statusData.cacheStats.avgProcessingTime / 1000).toFixed(1)}s
                </div>
                <div className="text-sm text-muted-foreground">平均处理时间</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-medium text-gray-600">
                  {formatTime(statusData.cacheStats.lastUpdate)}
                </div>
                <div className="text-sm text-muted-foreground">最后更新</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Real-time Queue Status */}
      {statusData?.queueStatus && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              <CardTitle>实时队列状态</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {statusData.queueStatus.pending}
                </div>
                <div className="text-sm text-muted-foreground">等待中</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {statusData.queueStatus.processing}
                </div>
                <div className="text-sm text-muted-foreground">处理中</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {statusData.queueStatus.completed}
                </div>
                <div className="text-sm text-muted-foreground">已完成</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {statusData.queueStatus.failed}
                </div>
                <div className="text-sm text-muted-foreground">失败</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {statusData.queueStatus.activeWorkers}
                </div>
                <div className="text-sm text-muted-foreground">活跃工作者</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">
                  {statusData.queueStatus.maxConcurrency}
                </div>
                <div className="text-sm text-muted-foreground">最大并发</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Historical Queue Stats */}
      {statusData?.queueStats && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              <CardTitle>历史队列统计</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-600">
                  {statusData.queueStats.totalTasks}
                </div>
                <div className="text-sm text-muted-foreground">总任务数</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {statusData.queueStats.completed}
                </div>
                <div className="text-sm text-muted-foreground">已完成</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {statusData.queueStats.failed}
                </div>
                <div className="text-sm text-muted-foreground">失败</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {statusData.queueStats.pending}
                </div>
                <div className="text-sm text-muted-foreground">等待中</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {statusData.queueStats.processing}
                </div>
                <div className="text-sm text-muted-foreground">处理中</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Statistics */}
      {statusData?.systemInfo && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              <CardTitle>系统性能统计</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                <div className="text-3xl font-bold text-blue-600">
                  {statusData.systemInfo.totalProcessed}
                </div>
                <div className="text-sm text-blue-700 font-medium">总处理量</div>
                <div className="text-xs text-blue-600 mt-1">累计翻译文章数</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                <div className="text-3xl font-bold text-green-600">
                  {statusData.systemInfo.successRate.toFixed(1)}%
                </div>
                <div className="text-sm text-green-700 font-medium">成功率</div>
                <div className="text-xs text-green-600 mt-1">翻译成功比例</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg">
                <div className="text-3xl font-bold text-orange-600">
                  {statusData.systemInfo.averageProcessingTime.toFixed(1)}s
                </div>
                <div className="text-sm text-orange-700 font-medium">平均处理时间</div>
                <div className="text-xs text-orange-600 mt-1">单篇文章处理耗时</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Tasks */}
      {statusData?.recentTasks && statusData.recentTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>最近任务 (最新20条)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {statusData.recentTasks.slice(0, 10).map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{task.title}</div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <span>ID: {task.storyId}</span>
                      {task.createdAt && (
                        <span>• {formatTime(task.createdAt)}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge 
                      variant={
                        task.status === 'completed' ? 'default' :
                        task.status === 'processing' ? 'secondary' :
                        task.status === 'failed' ? 'destructive' : 'outline'
                      }
                    >
                      {task.status === 'completed' ? '完成' :
                       task.status === 'processing' ? '处理中' :
                       task.status === 'failed' ? '失败' : task.status}
                    </Badge>
                    {task.processingTime && (
                      <span className="text-xs text-muted-foreground min-w-0">
                        {(task.processingTime / 1000).toFixed(1)}s
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Debug Section */}
      {debugMode && (
        <>
          {/* Database Cache Debug */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                <CardTitle>数据库缓存调试</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button onClick={fetchCachedData} variant="outline">
                  <Database className="w-4 h-4 mr-2" />
                  查询缓存数据
                </Button>
                
                {cachedData && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {cachedData.valid?.count || 0}
                        </div>
                        <div className="text-sm text-green-700">有效缓存</div>
                      </div>
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          {cachedData.all?.count || 0}
                        </div>
                        <div className="text-sm text-blue-700">总缓存记录</div>
                      </div>
                    </div>
                    
                    {cachedData.valid?.data && cachedData.valid.data.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">最近有效缓存记录：</h4>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {cachedData.valid.data.slice(0, 5).map((item: any, index: number) => (
                            <div key={index} className="p-2 border rounded text-sm">
                              <div className="font-medium">ID: {item.storyId}</div>
                              <div className="text-gray-600 truncate">{item.chineseTitle || item.title}</div>
                              <div className="text-xs text-gray-500">
                                过期时间: {new Date(item.expiresAt).toLocaleString()}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Story Debug */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Search className="w-5 h-5" />
                <CardTitle>文章缓存查询</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <input
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="输入文章ID (例如: 42123456)"
                    value={storyId}
                    onChange={(e) => setStoryId(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && fetchStoryDebug()}
                  />
                  <Button onClick={fetchStoryDebug} variant="outline">
                    <Search className="w-4 h-4 mr-2" />
                    查询
                  </Button>
                </div>
                
                {storyDebugData && (
                  <div className="p-4 border rounded-lg bg-gray-50">
                    <pre className="text-sm overflow-auto">
                      {JSON.stringify(storyDebugData, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}