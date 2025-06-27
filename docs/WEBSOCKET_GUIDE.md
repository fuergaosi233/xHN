# WebSocket 实时更新指南

## 概述

xHN 使用 WebSocket 技术实现实时更新功能，替代了传统的轮询机制。当文章翻译完成时，系统会自动推送更新到所有连接的客户端，用户无需手动刷新页面。

## 功能特点

- ⚡ **实时推送**：文章翻译完成后立即推送到客户端
- 🔄 **自动重连**：连接断开时自动重新连接
- 📊 **连接状态监控**：实时显示连接状态和统计信息
- 🎯 **精准更新**：只推送更新的文章，避免不必要的重新渲染
- 🛡️ **错误处理**：完善的错误处理和重试机制

## 技术架构

### 服务端实现

**WebSocket 服务器：** `/pages/api/socket.ts`
- 使用 Socket.io 实现 WebSocket 服务
- 支持房间管理和广播消息
- 提供连接统计和监控功能

**WebSocket 管理：** `/lib/websocket.ts`
- 全局 WebSocket 管理器
- 连接池管理
- 消息广播和房间管理

**API 端点：** `/app/api/socketio/route.ts`
- `GET /api/socketio` - 获取连接统计
- `POST /api/socketio` - 管理 WebSocket 服务

### 客户端实现

**WebSocket 提供者：** `/components/WebSocketProvider.tsx`
- React Context 提供 WebSocket 连接
- 自动连接管理和重连机制
- 全局状态管理

**实时更新 Hook：** `/lib/hooks/useWebSocketUpdates.ts`
- 监听故事更新消息
- 自动更新本地状态
- 处理连接状态变化

**故事更新 Hook：** `/lib/hooks/useStoryUpdates.ts`
- 管理故事列表状态
- 处理实时更新逻辑
- 优化渲染性能

## 使用方法

### 1. 基本设置

在应用根部包裹 WebSocket 提供者：

```tsx
// app/layout.tsx
import { WebSocketProvider } from '@/components/WebSocketProvider'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh">
      <body>
        <WebSocketProvider>
          {children}
        </WebSocketProvider>
      </body>
    </html>
  )
}
```

### 2. 在组件中使用实时更新

```tsx
// components/StoryList.tsx
import { useWebSocketUpdates } from '@/lib/hooks/useWebSocketUpdates'
import { useStoryUpdates } from '@/lib/hooks/useStoryUpdates'

export function StoryList() {
  // 使用实时更新 Hook
  const { isConnected, connectionStatus } = useWebSocketUpdates()
  const { stories, updateStory } = useStoryUpdates()

  return (
    <div>
      {/* 连接状态指示器 */}
      <div className={`status ${isConnected ? 'connected' : 'disconnected'}`}>
        {connectionStatus}
      </div>
      
      {/* 故事列表 */}
      {stories.map(story => (
        <StoryCard key={story.id} story={story} />
      ))}
    </div>
  )
}
```

### 3. 监听特定事件

```tsx
import { useEffect } from 'react'
import { useWebSocket } from '@/components/WebSocketProvider'

export function CustomComponent() {
  const { socket, isConnected } = useWebSocket()

  useEffect(() => {
    if (!socket || !isConnected) return

    // 监听故事更新
    socket.on('story-updated', (data) => {
      console.log('Story updated:', data)
      // 处理更新逻辑
    })

    // 监听批量更新
    socket.on('stories-batch-updated', (stories) => {
      console.log('Batch update:', stories)
      // 处理批量更新
    })

    // 清理监听器
    return () => {
      socket.off('story-updated')
      socket.off('stories-batch-updated')
    }
  }, [socket, isConnected])

  return <div>Your component content</div>
}
```

## 消息类型

### 服务端发送的消息

**1. 单个故事更新**
```typescript
socket.emit('story-updated', {
  id: number,
  title_cn: string,
  summary_cn: string,
  status: 'completed' | 'failed',
  updated_at: string
})
```

**2. 批量故事更新**
```typescript
socket.emit('stories-batch-updated', [
  {
    id: number,
    title_cn: string,
    summary_cn: string,
    status: 'completed' | 'failed',
    updated_at: string
  }
])
```

**3. 队列状态更新**
```typescript
socket.emit('queue-status', {
  pending: number,
  processing: number,
  completed: number,
  failed: number
})
```

### 客户端发送的消息

**1. 加入房间**
```typescript
socket.emit('join-room', 'stories')
```

**2. 离开房间**
```typescript
socket.emit('leave-room', 'stories')
```

## 房间管理

### 默认房间

- **`stories`**: 用于故事更新广播
- **`queue`**: 用于队列状态更新
- **`debug`**: 用于调试信息（开发环境）

### 自定义房间

```typescript
// 加入自定义房间
socket.emit('join-room', 'custom-room')

// 向特定房间发送消息
io.to('custom-room').emit('custom-event', data)
```

## 配置选项

### 环境变量

```env
# WebSocket 配置
WEBSOCKET_ENABLED=true                    # 启用 WebSocket
WEBSOCKET_CORS_ORIGIN=http://localhost:3000  # CORS 源
WEBSOCKET_PING_TIMEOUT=60000             # Ping 超时时间
WEBSOCKET_PING_INTERVAL=25000            # Ping 间隔时间
```

### 客户端配置

```typescript
// WebSocketProvider.tsx 中的配置
const socketOptions = {
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5,
  timeout: 20000,
  transports: ['websocket', 'polling']
}
```

## 监控和调试

### 1. 连接统计

访问 `/api/socketio` 获取实时连接统计：

```bash
curl http://localhost:3000/api/socketio
```

响应示例：
```json
{
  "status": "active",
  "connections": 5,
  "rooms": {
    "stories": 3,
    "queue": 2,
    "debug": 1
  },
  "uptime": "2h 30m 15s"
}
```

### 2. 状态页面监控

访问 `/status` 页面查看详细的 WebSocket 状态信息。

### 3. 调试模式

开发环境下启用调试日志：

```typescript
// 在浏览器控制台中
localStorage.setItem('debug', 'socket.io-client:*')
```

## 性能优化

### 1. 连接池管理

- 自动清理闲置连接
- 限制最大连接数
- 连接复用和负载均衡

### 2. 消息优化

- 批量发送更新消息
- 消息去重和合并
- 限制消息频率

### 3. 内存管理

- 自动清理过期数据
- 优化消息存储
- 垃圾回收机制

## 故障排除

### 常见问题

**1. 连接失败**
- 检查网络连接
- 确认端口是否开放
- 检查防火墙设置

**2. 频繁断连**
- 调整重连参数
- 检查服务器负载
- 优化网络环境

**3. 消息丢失**
- 启用消息确认机制
- 检查连接状态
- 使用消息队列缓存

### 调试步骤

1. **检查连接状态**
   ```typescript
   console.log('Socket connected:', socket.connected)
   console.log('Socket ID:', socket.id)
   ```

2. **监听连接事件**
   ```typescript
   socket.on('connect', () => console.log('Connected'))
   socket.on('disconnect', () => console.log('Disconnected'))
   socket.on('connect_error', (error) => console.error('Connection error:', error))
   ```

3. **查看服务器日志**
   ```bash
   # 查看 WebSocket 相关日志
   pm2 logs --lines 100 | grep -i websocket
   ```

## 最佳实践

### 1. 连接管理

- 在组件卸载时正确清理连接
- 避免重复连接
- 使用连接池复用连接

### 2. 错误处理

- 实现完善的错误处理机制
- 提供用户友好的错误提示
- 记录错误日志用于调试

### 3. 性能考虑

- 避免频繁的连接和断开
- 合理使用房间功能
- 优化消息传输大小

### 4. 安全考虑

- 验证客户端身份
- 限制连接频率
- 防止消息泛洪攻击

## 进阶用法

### 1. 自定义事件处理

```typescript
// 创建自定义 Hook
export function useCustomWebSocketEvents() {
  const { socket } = useWebSocket()

  useEffect(() => {
    if (!socket) return

    const handleCustomEvent = (data: any) => {
      // 处理自定义事件
    }

    socket.on('custom-event', handleCustomEvent)
    return () => socket.off('custom-event', handleCustomEvent)
  }, [socket])
}
```

### 2. 消息中间件

```typescript
// 添加消息拦截器
socket.use((event, next) => {
  // 消息预处理
  console.log('Outgoing message:', event)
  next()
})
```

### 3. 与状态管理集成

```typescript
// 与 Redux/Zustand 等状态管理库集成
export const useWebSocketWithStore = () => {
  const { socket } = useWebSocket()
  const dispatch = useAppDispatch()

  useEffect(() => {
    if (!socket) return

    socket.on('story-updated', (story) => {
      dispatch(updateStory(story))
    })
  }, [socket, dispatch])
}
```

通过以上指南，你可以充分利用 xHN 的 WebSocket 实时更新功能，为用户提供流畅的实时体验。