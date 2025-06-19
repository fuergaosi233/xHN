'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import ModelInfo from '@/components/ModelInfo'

interface QueueStatus {
  pending: number
  processing: number
  completed: number
  failed: number
  activeWorkers: number
  maxConcurrency: number
}

interface StatusData {
  queueStatus: QueueStatus
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

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/queue/status')
      const data = await response.json()
      setStatusData(data)
    } catch (error) {
      console.error('Failed to fetch status:', error)
    } finally {
      setLoading(false)
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
        <Badge variant="outline" className="animate-pulse">
          实时更新
        </Badge>
      </div>

      {/* Model Configuration */}
      <ModelInfo />

      {/* Queue Status */}
      {statusData?.queueStatus && (
        <Card>
          <CardHeader>
            <CardTitle>处理队列状态</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
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

      {/* System Statistics */}
      {statusData?.systemInfo && (
        <Card>
          <CardHeader>
            <CardTitle>系统统计</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {statusData.systemInfo.totalProcessed}
                </div>
                <div className="text-sm text-muted-foreground">总处理量</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {statusData.systemInfo.successRate.toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">成功率</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {statusData.systemInfo.averageProcessingTime.toFixed(1)}s
                </div>
                <div className="text-sm text-muted-foreground">平均处理时间</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Tasks */}
      {statusData?.recentTasks && (
        <Card>
          <CardHeader>
            <CardTitle>最近任务</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {statusData.recentTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex-1">
                    <div className="font-medium">{task.title}</div>
                    <div className="text-sm text-muted-foreground">
                      ID: {task.storyId}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={
                        task.status === 'completed' ? 'default' :
                        task.status === 'processing' ? 'secondary' :
                        task.status === 'failed' ? 'destructive' : 'outline'
                      }
                    >
                      {task.status}
                    </Badge>
                    {task.processingTime && (
                      <span className="text-xs text-muted-foreground">
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
    </div>
  )
}