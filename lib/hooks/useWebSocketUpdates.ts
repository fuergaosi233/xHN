import { useState, useEffect, useCallback, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { ProcessedItem } from '@/lib/hackernews'

interface StoryUpdateEvent {
  storyId: number
  title: string
  chineseTitle: string
  summary: string
  updatedAt: string
  processingTime: number
}

interface BatchUpdateEvent {
  updates: StoryUpdateEvent[]
  count: number
}

export function useWebSocketUpdates(stories: ProcessedItem[], roomType: 'top-stories' | 'new-stories' | 'best-stories' = 'top-stories') {
  const [updatedStories, setUpdatedStories] = useState<ProcessedItem[]>(stories)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const socketRef = useRef<Socket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const cleanupTimerRef = useRef<NodeJS.Timeout | null>(null)

  // 清理更新标记的函数
  const clearUpdateFlags = useCallback(() => {
    setUpdatedStories(prevStories => 
      prevStories.map(story => ({
        ...story,
        isUpdated: false,
        updatedAt: undefined
      }))
    )
  }, [])

  // 设置自动清理定时器
  const scheduleCleanup = useCallback(() => {
    if (cleanupTimerRef.current) {
      clearTimeout(cleanupTimerRef.current)
    }
    
    cleanupTimerRef.current = setTimeout(() => {
      clearUpdateFlags()
    }, 5000) // 5秒后清理更新标记
  }, [clearUpdateFlags])

  const applyStoryUpdate = useCallback((update: StoryUpdateEvent) => {
    setUpdatedStories(prevStories => 
      prevStories.map(story => {
        if (story.id === update.storyId) {
          return {
            ...story,
            chineseTitle: update.chineseTitle,
            summary: update.summary,
            cached: true,
            processingTime: update.processingTime,
            isUpdated: true, // 添加更新标记用于动画
            updatedAt: Date.now() // 记录更新时间
          }
        }
        return story
      })
    )
    scheduleCleanup() // 设置清理定时器
  }, [scheduleCleanup])

  const applyBatchUpdate = useCallback((batchUpdate: BatchUpdateEvent) => {
    setUpdatedStories(prevStories => {
      const updateMap = new Map(batchUpdate.updates.map(u => [u.storyId, u]))
      
      return prevStories.map(story => {
        const update = updateMap.get(story.id)
        if (update) {
          return {
            ...story,
            chineseTitle: update.chineseTitle,
            summary: update.summary,
            cached: true,
            processingTime: update.processingTime,
            isUpdated: true, // 添加更新标记用于动画
            updatedAt: Date.now() // 记录更新时间
          }
        }
        return story
      })
    })
    scheduleCleanup() // 设置清理定时器
  }, [scheduleCleanup])

  const connectWebSocket = useCallback(() => {
    if (socketRef.current?.connected) {
      return
    }

    try {
      const socket = io({
        path: '/api/socket',
        autoConnect: false,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        timeout: 10000
      })

      socket.on('connect', () => {
        console.log('WebSocket connected')
        setIsConnected(true)
        setConnectionError(null)
        
        // 加入对应的房间
        socket.emit('join-room', roomType)
      })

      socket.on('room-joined', (room: string) => {
        console.log(`Joined room: ${room}`)
      })

      socket.on('story-updated', (update: StoryUpdateEvent) => {
        console.log('Received story update:', update)
        applyStoryUpdate(update)
      })

      socket.on('batch-updated', (batchUpdate: BatchUpdateEvent) => {
        console.log('Received batch update:', batchUpdate)
        applyBatchUpdate(batchUpdate)
      })

      socket.on('disconnect', (reason) => {
        console.log('WebSocket disconnected:', reason)
        setIsConnected(false)
        
        // 如果是服务器端断开，尝试重连
        if (reason === 'io server disconnect') {
          setTimeout(() => socket.connect(), 5000)
        }
      })

      socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error)
        setConnectionError(error.message)
        setIsConnected(false)
      })

      socketRef.current = socket
      socket.connect()

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error)
      setConnectionError(error instanceof Error ? error.message : 'Unknown error')
    }
  }, [roomType, applyStoryUpdate, applyBatchUpdate])

  const disconnectWebSocket = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect()
      socketRef.current = null
      setIsConnected(false)
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
  }, [])

  // 初始化WebSocket连接
  useEffect(() => {
    // 检查是否有需要监听更新的故事
    const hasProcessingStories = stories.some(story => 
      !story.summary || 
      story.summary === '正在处理中...' || 
      story.summary === '暂无摘要' ||
      !story.chineseTitle ||
      story.chineseTitle === story.title
    )

    if (hasProcessingStories) {
      connectWebSocket()
    } else {
      disconnectWebSocket()
    }

    return () => {
      disconnectWebSocket()
      if (cleanupTimerRef.current) {
        clearTimeout(cleanupTimerRef.current)
        cleanupTimerRef.current = null
      }
    }
  }, [stories, connectWebSocket, disconnectWebSocket])

  // 当stories prop变化时，重置本地状态
  useEffect(() => {
    setUpdatedStories(stories)
  }, [stories])

  // 切换房间类型
  useEffect(() => {
    if (socketRef.current?.connected) {
      // 离开当前房间，加入新房间
      socketRef.current.emit('leave-room', roomType)
      socketRef.current.emit('join-room', roomType)
    }
  }, [roomType])

  // 手动重连
  const reconnect = useCallback(() => {
    disconnectWebSocket()
    setTimeout(() => {
      connectWebSocket()
    }, 1000)
  }, [disconnectWebSocket, connectWebSocket])

  return {
    stories: updatedStories,
    isConnected,
    connectionError,
    reconnect
  }
}