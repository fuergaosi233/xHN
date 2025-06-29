import { NextRequest, NextResponse } from 'next/server'
import { queueManager } from '@/lib/queue'
import { log } from '@/lib/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const storyIdString = params.id
  try {
    const storyId = parseInt(storyIdString)
    
    if (isNaN(storyId)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid story ID'
      }, { status: 400 })
    }
    
    // 检查缓存
    const cached = await queueManager.getCachedResult(storyId)
    
    return NextResponse.json({
      success: true,
      storyId,
      cached: !!cached,
      data: cached,
      currentTime: new Date().toISOString()
    })
    
  } catch (error) {
    log.error('Debug Story API Error in /api/status/story/[id]:', { storyIdParam: storyIdString, error: error instanceof Error ? error : new Error(String(error)) })
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to query story',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}