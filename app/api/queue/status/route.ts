import { NextResponse } from 'next/server'
import { queueManager } from '@/lib/queue'

export async function GET() {
  try {
    const status = await queueManager.getQueueStatus()
    
    return NextResponse.json({
      success: true,
      data: status
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