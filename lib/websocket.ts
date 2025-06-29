import { Server as SocketIOServer } from 'socket.io'
import { Server as HTTPServer } from 'http'
import { NextApiResponse } from 'next'
import { log } from './logger'

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
        log.error('Failed to get global Socket.IO instance', { error: error instanceof Error ? error : new Error(String(error)) })
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
      // 静默忽略，不打印错误日志，因为可能没有客户端连接
      return
    }

    try {
      rooms.forEach(room => {
        io.to(room).emit('story-updated', update)
      })
    } catch (error) {
      log.error('Failed to broadcast story update', { error: error instanceof Error ? error : new Error(String(error)), updateStoryId: update.storyId, rooms })
    }
  }

  // 广播批量更新
  broadcastBatchUpdate(updates: StoryUpdateEvent[], rooms: string[] = ['top-stories', 'new-stories', 'best-stories']) {
    const io = this.io || this.getGlobalIO()
    if (!io || updates.length === 0) {
      // 静默忽略
      return
    }

    const batchEvent: BatchUpdateEvent = {
      updates,
      count: updates.length
    }

    try {
      rooms.forEach(room => {
        io.to(room).emit('batch-updated', batchEvent)
      })
    } catch (error) {
      log.error('Failed to broadcast batch update', { error: error instanceof Error ? error : new Error(String(error)), updateCount: updates.length, rooms })
    }
  }

  // 获取连接统计
  getStats() {
    const io = this.io || this.getGlobalIO()
    if (!io) return { connected: 0, rooms: {} }

    const rooms = io.sockets.adapter.rooms
    const roomStats: Record<string, number> = {}
    
    rooms.forEach((sockets: Set<any>, roomName: string) => {
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
  const socket = res.socket as any
  if (!socket?.server?.io) {
    const httpServer = socket?.server
    if (httpServer) {
      const io = new SocketIOServer(httpServer, {
        path: '/api/socket',
        addTrailingSlash: false,
        cors: {
          origin: process.env.NODE_ENV === 'production' 
            ? process.env.NEXTAUTH_URL || false 
            : ['http://localhost:3000', 'http://127.0.0.1:3000'],
          methods: ['GET', 'POST']
        }
      })

      io.on('connection', (socket) => {
        socket.on('join-room', (room: string) => {
          if (['top-stories', 'new-stories', 'best-stories'].includes(room)) {
            socket.join(room)
            socket.emit('room-joined', room)
          }
        })

        socket.on('leave-room', (room: string) => {
          socket.leave(room)
        })

        socket.on('disconnect', () => {
          // Silent disconnect
        })
      })

      httpServer.io = io
      wsManager.setGlobalIO(io)
    }
  }
  return socket?.server?.io
}