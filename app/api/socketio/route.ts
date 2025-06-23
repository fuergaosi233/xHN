import { NextRequest, NextResponse } from 'next/server'
import { wsManager } from '@/lib/websocket'

export async function GET() {
  // 获取WebSocket连接统计
  const stats = wsManager.getStats()
  
  return NextResponse.json({
    success: true,
    stats,
    message: 'WebSocket server is running'
  })
}

export async function POST() {
  try {
    // 这里可以用于手动触发测试事件或管理操作
    return NextResponse.json({
      success: true,
      message: 'WebSocket endpoint ready'
    })
  } catch (error) {
    console.error('WebSocket endpoint error:', error)
    return NextResponse.json({
      success: false,
      error: 'WebSocket operation failed'
    }, { status: 500 })
  }
}