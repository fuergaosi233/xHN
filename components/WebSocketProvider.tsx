'use client'

import { useEffect } from 'react'

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // 初始化WebSocket服务器
    fetch('/api/socket')
      .then(() => {
        console.log('WebSocket server endpoint accessed')
      })
      .catch(error => {
        console.error('Failed to access WebSocket endpoint:', error)
      })
  }, [])

  return <>{children}</>
}