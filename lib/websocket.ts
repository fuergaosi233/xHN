import { Server as SocketIOServer } from 'socket.io'
import { Server as HTTPServer } from 'http'
import { NextApiResponse } from 'next'

export interface StoryUpdateEvent {
  storyId: number
  title: string
  chineseTitle: string
  summary: string
  updatedAt: string
  processingTime: number
}

export interface BatchUpdateEvent {
  updates: StoryUpdateEvent[]
  count: number
}

class WebSocketManager {
  private io: SocketIOServer | null = null
  private globalIO: any = null

  // 获取全局Socket.IO实例
  getGlobalIO() {
    if (typeof window === 'undefined') {
      try {
        // 在服务器端，尝试获取全局Socket.IO实例
        if (global && (global as any).socketio) {
          return (global as any).socketio
        }
      } catch (error) {
        console.error('Failed to get global Socket.IO instance:', error)
      }
    }
    return null
  }

  // 设置全局Socket.IO实例
  setGlobalIO(io: SocketIOServer) {
    if (typeof window === 'undefined') {
      (global as any).socketio = io
      this.io = io
    }
  }

  // 广播单个故事更新
  broadcastStoryUpdate(update: StoryUpdateEvent, rooms: string[] = ['top-stories', 'new-stories', 'best-stories']) {
    const io = this.io || this.getGlobalIO()
    if (!io) {
      console.log('No Socket.IO instance available for broadcasting')
      return
    }

    rooms.forEach(room => {
      io.to(room).emit('story-updated', update)
    })
    
    console.log(`Broadcasted story update for story ${update.storyId} to rooms: ${rooms.join(', ')}`)
  }

  // 广播批量更新
  broadcastBatchUpdate(updates: StoryUpdateEvent[], rooms: string[] = ['top-stories', 'new-stories', 'best-stories']) {
    const io = this.io || this.getGlobalIO()
    if (!io || updates.length === 0) {
      console.log('No Socket.IO instance available for batch broadcasting')
      return
    }

    const batchEvent: BatchUpdateEvent = {
      updates,
      count: updates.length
    }

    rooms.forEach(room => {
      io.to(room).emit('batch-updated', batchEvent)
    })

    console.log(`Broadcasted batch update of ${updates.length} stories to rooms: ${rooms.join(', ')}`)
  }

  // 获取连接统计
  getStats() {
    const io = this.io || this.getGlobalIO()
    if (!io) return { connected: 0, rooms: {} }

    const rooms = io.sockets.adapter.rooms
    const roomStats: Record<string, number> = {}
    
    rooms.forEach((sockets, roomName) => {
      if (['top-stories', 'new-stories', 'best-stories'].includes(roomName)) {
        roomStats[roomName] = sockets.size
      }
    })

    return {
      connected: io.sockets.sockets.size,
      rooms: roomStats
    }
  }

  // 获取Socket.IO实例
  getIO() {
    return this.io || this.getGlobalIO()
  }
}

export const wsManager = new WebSocketManager()

// Next.js API路由辅助函数
export function initializeWebSocket(res: NextApiResponse) {
  if (!res.socket.server.io) {
    console.log('Initializing WebSocket server...')
    const httpServer = res.socket.server as any
    res.socket.server.io = wsManager.initialize(httpServer)
  }
  return res.socket.server.io
}