import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { processedStories } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { log } from '@/lib/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const storyId = parseInt(params.id)
    
    if (isNaN(storyId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid story ID' },
        { status: 400 }
      )
    }

    const db = await getDb()
    
    // 从数据库查询单个故事
    const story = await db
      .select()
      .from(processedStories)
      .where(eq(processedStories.storyId, storyId))
      .limit(1)

    if (story.length === 0) {
      // 如果数据库中没有，尝试从 HackerNews API 获取
      const response = await fetch(`https://hacker-news.firebaseio.com/v0/item/${storyId}.json`)
      
      if (!response.ok) {
        return NextResponse.json(
          { success: false, error: 'Story not found' },
          { status: 404 }
        )
      }

      const hnStory = await response.json()
      
      if (!hnStory) {
        return NextResponse.json(
          { success: false, error: 'Story not found' },
          { status: 404 }
        )
      }

      // 返回原始HN数据格式
      const processedItem = {
        id: hnStory.id,
        title: hnStory.title,
        url: hnStory.url,
        by: hnStory.by,
        time: hnStory.time,
        score: hnStory.score,
        descendants: hnStory.descendants,
        chineseTitle: hnStory.title, // 默认使用原标题
        summary: '暂无摘要',
        tags: [],
        category: 'unknown'
      }

      return NextResponse.json({
        success: true,
        data: processedItem,
        cached: false
      })
    }

    const processedStory = story[0]

    // originalData 是 jsonb 列，drizzle 返回的已经是对象，无需（也不能）JSON.parse
    const originalData = (processedStory.originalData || {}) as Record<string, any>

    // 转换为前端期望的格式
    const processedItem = {
      id: processedStory.storyId,
      title: processedStory.title,
      url: processedStory.url,
      by: originalData.by || 'unknown',
      time: originalData.time || 0,
      score: originalData.score || 0,
      descendants: originalData.descendants || 0,
      chineseTitle: processedStory.chineseTitle,
      summary: processedStory.summary,
      tags: (processedStory.tags as any)?.tags || [],
      category: processedStory.category
    }

    return NextResponse.json({
      success: true,
      data: processedItem,
      cached: true
    })

  } catch (error) {
    log.error('Error fetching story in /api/story/[id]:', { storyIdParam: params.id, error: error instanceof Error ? error : new Error(String(error)) })
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    )
  }
}