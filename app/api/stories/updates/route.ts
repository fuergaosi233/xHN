import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { processedStories } from '@/lib/db/schema'
import { inArray, and, isNotNull } from 'drizzle-orm'
import { log } from '@/lib/logger'

// 强制此路由为动态
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { storyIds } = body

    if (!Array.isArray(storyIds) || storyIds.length === 0 || storyIds.length > 200) {
      return NextResponse.json({ error: 'Invalid story IDs' }, { status: 400 })
    }

    if (!storyIds.every((id: unknown) => Number.isInteger(id))) {
      return NextResponse.json({ error: 'Invalid story IDs' }, { status: 400 })
    }

    const database = await getDb()
    // 只取轮询需要的列，避免把 content 大字段也搬出来（一次最多 200 行）
    const updatedStories = await database
      .select({
        storyId: processedStories.storyId,
        chineseTitle: processedStories.chineseTitle,
        summary: processedStories.summary,
        updatedAt: processedStories.updatedAt,
      })
      .from(processedStories)
      .where(
        and(
          inArray(processedStories.storyId, storyIds),
          isNotNull(processedStories.chineseTitle),
          isNotNull(processedStories.summary)
        )
      )

    const updates = updatedStories.map((story: typeof updatedStories[number]) => ({
      id: story.storyId,
      title_cn: story.chineseTitle,
      summary_cn: story.summary,
      updated_at: story.updatedAt
    }))

    return NextResponse.json({
      success: true,
      updates
    })
  } catch (error) {
    log.error('Story updates check error in /api/stories/updates:', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: 'Failed to check story updates' },
      { status: 500 }
    )
  }
}