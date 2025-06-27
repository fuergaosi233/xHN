import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { processedStories } from '@/lib/db/schema'
import { desc, gt, sql } from 'drizzle-orm'
import { log } from '@/lib/logger'

export async function GET() {
  try {
    const database = await getDb()
    const now = new Date()
    
    // 获取最近的10条有效缓存记录
    const validCached = await database.select({
      storyId: processedStories.storyId,
      title: processedStories.title,
      chineseTitle: processedStories.chineseTitle,
      summary: processedStories.summary,
      processingTime: processedStories.processingTime,
      createdAt: processedStories.createdAt,
      updatedAt: processedStories.updatedAt,
      expiresAt: processedStories.expiresAt,
    })
    .from(processedStories)
    .where(gt(processedStories.expiresAt, now))
    .orderBy(desc(processedStories.updatedAt))
    .limit(10)
    
    // 获取所有记录（包括过期的）
    const allRecords = await database.select({
      storyId: processedStories.storyId,
      title: processedStories.title,
      chineseTitle: processedStories.chineseTitle,
      summary: processedStories.summary,
      processingTime: processedStories.processingTime,
      createdAt: processedStories.createdAt,
      updatedAt: processedStories.updatedAt,
      expiresAt: processedStories.expiresAt,
      expired: sql<boolean>`${processedStories.expiresAt} < ${now}`
    })
    .from(processedStories)
    .orderBy(desc(processedStories.updatedAt))
    .limit(20)
    
    return NextResponse.json({
      success: true,
      currentTime: now.toISOString(),
      valid: {
        count: validCached.length,
        data: validCached
      },
      all: {
        count: allRecords.length,
        data: allRecords
      }
    })
    
  } catch (error) {
    log.error('Debug API Error in /api/status/cached:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to query cached data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}