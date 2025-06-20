import { NextResponse } from 'next/server'
import { queueManager } from '@/lib/queue'
import { db } from '@/lib/db'
import { processedStories, processingQueue } from '@/lib/db/schema'
import { sql, desc, count, avg } from 'drizzle-orm'

export async function GET() {
  try {
    const queueStatus = await queueManager.getQueueStatus()
    
    // 获取缓存统计
    const cacheStats = await db
      .select({
        total: count(),
        recent: sql<number>`COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END)`,
        withTranslation: sql<number>`COUNT(CASE WHEN chinese_title IS NOT NULL AND chinese_title != title THEN 1 END)`,
        avgProcessingTime: avg(processedStories.processingTime)
      })
      .from(processedStories)
    
    // 获取队列统计
    const queueStats = await db
      .select({
        totalTasks: count(),
        pendingCount: sql<number>`COUNT(CASE WHEN status = 'pending' THEN 1 END)`,
        processingCount: sql<number>`COUNT(CASE WHEN status = 'processing' THEN 1 END)`,
        completedCount: sql<number>`COUNT(CASE WHEN status = 'completed' THEN 1 END)`,
        failedCount: sql<number>`COUNT(CASE WHEN status = 'failed' THEN 1 END)`
      })
      .from(processingQueue)
    
    // 获取最近任务
    const recentTasks = await db
      .select({
        id: processingQueue.id,
        storyId: processingQueue.storyId,
        title: processingQueue.title,
        status: processingQueue.status,
        createdAt: processingQueue.createdAt,
        completedAt: processingQueue.completedAt,
        processingTime: sql<number>`EXTRACT(EPOCH FROM (completed_at - processing_started_at)) * 1000`,
      })
      .from(processingQueue)
      .orderBy(desc(processingQueue.updatedAt))
      .limit(20)
    
    // 获取最后更新时间
    const lastProcessedStory = await db
      .select({ updatedAt: processedStories.updatedAt })
      .from(processedStories)
      .orderBy(desc(processedStories.updatedAt))
      .limit(1)
    
    const stats = cacheStats[0]
    const qStats = queueStats[0]
    
    return NextResponse.json({
      success: true,
      queueStatus,
      cacheStats: {
        totalCached: stats?.total || 0,
        recentCached: stats?.recent || 0,
        withTranslation: stats?.withTranslation || 0,
        avgProcessingTime: stats?.avgProcessingTime || 0,
        lastUpdate: lastProcessedStory[0]?.updatedAt || null
      },
      queueStats: {
        totalTasks: qStats?.totalTasks || 0,
        pending: qStats?.pendingCount || 0,
        processing: qStats?.processingCount || 0,
        completed: qStats?.completedCount || 0,
        failed: qStats?.failedCount || 0
      },
      recentTasks: recentTasks.map(task => ({
        ...task,
        createdAt: task.createdAt?.toISOString(),
        completedAt: task.completedAt?.toISOString(),
      })),
      systemInfo: {
        totalProcessed: stats?.total || 0,
        successRate: qStats?.totalTasks ? ((qStats.completedCount / qStats.totalTasks) * 100) : 0,
        averageProcessingTime: (stats?.avgProcessingTime || 0) / 1000
      }
    })
  } catch (error) {
    console.error('Queue status error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to get queue status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST() {
  try {
    // 启动队列处理器
    await queueManager.startProcessor()
    
    return NextResponse.json({
      success: true,
      message: 'Queue processor started'
    })
  } catch (error) {
    console.error('Queue processor start error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to start queue processor',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}