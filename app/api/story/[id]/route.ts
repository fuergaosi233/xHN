import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { processedStories } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

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
    
    // 转换为前端期望的格式
    const processedItem = {
      id: processedStory.storyId,
      title: processedStory.title,
      url: processedStory.url,
      by: JSON.parse(processedStory.originalData as string || '{}').by || 'unknown',
      time: JSON.parse(processedStory.originalData as string || '{}').time || 0,
      score: JSON.parse(processedStory.originalData as string || '{}').score || 0,
      descendants: JSON.parse(processedStory.originalData as string || '{}').descendants || 0,
      chineseTitle: processedStory.chineseTitle,
      summary: processedStory.summary,
      tags: processedStory.tags as string[] || [],
      category: processedStory.category
    }

    return NextResponse.json({
      success: true,
      data: processedItem,
      cached: true
    })

  } catch (error) {
    console.error('Error fetching story:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    )
  }
}