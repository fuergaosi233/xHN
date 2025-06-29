import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { processedStories, ProcessedStory } from '@/lib/db/schema'
import { inArray, and, isNotNull } from 'drizzle-orm'
import { log } from '@/lib/logger'

// 强制此路由为动态
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { storyIds } = body

    if (!Array.isArray(storyIds) || storyIds.length === 0) {
      return NextResponse.json({ error: 'Invalid story IDs' }, { status: 400 })
    }

    const database = await getDb()
    const updatedStories = await database
      .select()
      .from(processedStories)
      .where(
        and(
          inArray(processedStories.storyId, storyIds),
          isNotNull(processedStories.chineseTitle),
          isNotNull(processedStories.summary)
        )
      )

    const updates = updatedStories.map((story: ProcessedStory) => ({
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