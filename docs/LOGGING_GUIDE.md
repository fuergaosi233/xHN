# 日志系统使用指南

## 概述

xHN 项目集成了完整的日志管理系统，基于 Winston 构建，提供统一的日志接口、自动轮转、日志级别管理和监控功能。

## 功能特点

- 🚀 **统一日志接口** - 替换所有 console.log，提供结构化日志
- 📊 **多级别日志** - Error、Warn、Info、Debug 四个级别
- 🔄 **自动轮转** - 基于文件大小和时间的智能轮转
- 💾 **持久化存储** - 生产环境自动保存到文件
- 🎯 **专用日志类型** - API、数据库、AI、队列等专用日志方法
- 📈 **性能监控** - 内置性能计时和监控装饰器
- 🔍 **搜索分析** - 支持日志搜索和分析功能

## 基础使用

### 导入日志模块

```typescript
import { log } from '@/lib/logger'
```

### 基本日志方法

```typescript
// 错误日志
log.error('Something went wrong', { userId: 123, operation: 'login' })

// 警告日志
log.warn('API rate limit approaching', { currentRequests: 95, limit: 100 })

// 信息日志
log.info('User logged in successfully', { userId: 123, ip: '192.168.1.1' })

// 调试日志
log.debug('Processing user data', { data: { id: 123, name: 'John' } })
```

### 上下文信息

所有日志方法都支持第二个参数传入上下文对象：

```typescript
log.info('Story processed successfully', {
  storyId: 12345,
  title: 'Example Story',
  processingTime: 1500,
  model: 'gpt-3.5-turbo',
  userId: 'anonymous'
})
```

## 专用日志方法

### API 请求日志

```typescript
// API 请求开始
log.api.request('GET', '/api/stories', { 
  userAgent: 'Mozilla/5.0...',
  ip: '192.168.1.1' 
})

// API 请求完成
log.api.response('GET', '/api/stories', 200, 156, {
  resultCount: 20,
  cacheHit: true
})
```

### 数据库操作日志

```typescript
log.db('SELECT', 'stories', { 
  storyId: 123,
  duration: 45 
})

log.db('INSERT', 'processed_stories', {
  storyId: 123,
  success: true,
  duration: 23
})
```

### AI 处理日志

```typescript
log.ai('doubao-lite-4k', 'translate_story', {
  storyId: 123,
  inputTokens: 150,
  outputTokens: 80,
  duration: 2300
})
```

### 队列操作日志

```typescript
log.queue('task_added', { 
  taskId: 456,
  storyId: 123,
  priority: 5 
})

log.queue('task_completed', {
  taskId: 456,
  processingTime: 2100,
  success: true
})
```

### WebSocket 连接日志

```typescript
log.ws('client_connected', { 
  socketId: 'abc123',
  room: 'top-stories' 
})

log.ws('message_broadcast', {
  event: 'story-updated',
  room: 'top-stories',
  clientCount: 5
})
```

### 缓存操作日志

```typescript
log.cache('GET', 'story:123', { 
  hit: true,
  ttl: 3600 
})

log.cache('SET', 'story:123', {
  size: 2048,
  ttl: 3600
})
```

### 性能监控日志

```typescript
log.perf('story_processing', 2350, {
  storyId: 123,
  modelUsed: 'gpt-3.5-turbo',
  success: true
})

// 自动记录超过阈值的慢操作
log.perf('slow_database_query', 5200, {
  query: 'SELECT * FROM stories...',
  table: 'stories'
})
```

### 安全事件日志

```typescript
log.security('failed_login_attempt', {
  ip: '192.168.1.1',
  userAgent: 'Mozilla/5.0...',
  reason: 'invalid_credentials'
})

log.security('rate_limit_exceeded', {
  ip: '192.168.1.1',
  endpoint: '/api/stories',
  attempts: 100
})
```

## 装饰器支持

### 性能监控装饰器

```typescript
import { performanceLog } from '@/lib/logger'

class StoryService {
  @performanceLog('story_processing')
  async processStory(story: HackerNewsItem) {
    // 方法执行时间会自动记录
    return await this.doProcessing(story)
  }
}
```

### 错误捕获装饰器

```typescript
import { errorLog } from '@/lib/logger'

class APIService {
  @errorLog('API_Call')
  async fetchData(url: string) {
    // 异常会自动记录到日志
    return await fetch(url)
  }
}
```

## 日志配置

### 环境变量

```env
# 日志级别 (error|warn|info|debug)
LOG_LEVEL=info

# 日志文件目录
LOGS_DIR=./logs

# 生产环境会自动启用文件日志
NODE_ENV=production
```

### 日志级别说明

- **ERROR** - 系统错误、异常、失败操作
- **WARN** - 警告信息、性能问题、非致命错误
- **INFO** - 一般信息、操作记录、系统状态
- **DEBUG** - 详细调试信息（仅开发环境）

## 日志文件管理

### 文件结构

```
logs/
├── error.log          # 错误日志
├── combined.log       # 综合日志
├── access.log         # API 访问日志  
├── exceptions.log     # 未捕获异常
├── rejections.log     # Promise 拒绝
└── *.log.YYYYMMDD.gz  # 轮转的压缩日志
```

### 日志管理命令

```bash
# 设置日志目录
npm run logs:setup

# 查看日志状态
npm run logs:status

# 清理旧日志
npm run logs:clean

# 手动轮转日志
npm run logs:rotate

# 实时查看日志
npm run logs:tail [日志类型]

# 搜索日志内容
npm run logs:search <关键词> [日志类型]
```

### 使用示例

```bash
# 查看系统日志状态
npm run logs:status

# 实时查看错误日志
npm run logs:tail error

# 搜索包含 "API" 的日志
npm run logs:search "API"

# 在错误日志中搜索 "failed"
npm run logs:search "failed" error

# 清理 30 天前的日志
npm run logs:clean
```

## API 接口

### 获取日志信息

```bash
# 获取最新 50 行综合日志
GET /api/logs?type=combined&lines=50

# 获取错误级别日志
GET /api/logs?type=error&level=error&lines=100

# 搜索包含特定关键词的日志
GET /api/logs?type=combined&search=story&lines=20

# 获取日志状态
GET /api/logs?type=status
```

响应格式：

```json
{
  "success": true,
  "data": {
    "type": "combined",
    "totalLines": 1500,
    "returnedLines": 50,
    "logs": [
      {
        "timestamp": "2024-01-15T10:30:45.123Z",
        "level": "info",
        "message": "Story processed successfully",
        "meta": {
          "storyId": 123,
          "processingTime": 1500
        },
        "raw": "[2024-01-15 10:30:45] INFO: Story processed successfully | {\"storyId\": 123}"
      }
    ]
  }
}
```

## 监控集成

### 状态页面集成

日志信息已集成到 `/status` 监控页面，提供：

- 📊 实时日志统计
- 🔍 日志搜索功能
- 📈 错误率趋势
- 🎯 日志级别分布

### 使用监控页面

1. 访问 `http://localhost:3000/status`
2. 查看 "日志监控" 区域
3. 使用搜索功能查找特定日志
4. 查看系统健康状态

## 最佳实践

### 1. 日志级别选择

```typescript
// ✅ 正确使用
log.error('Database connection failed', { error, retryCount: 3 })
log.warn('API response time slow', { duration: 5000, threshold: 2000 })
log.info('User action completed', { userId: 123, action: 'login' })
log.debug('Processing user data', { data: userData })

// ❌ 错误使用
log.error('User clicked button')  // 不是错误
log.info('Database query failed')  // 应该是 error
```

### 2. 结构化日志

```typescript
// ✅ 好的结构化日志
log.info('Story processing completed', {
  storyId: 123,
  title: 'Example Story',
  processingTime: 1500,
  model: 'gpt-3.5-turbo',
  success: true,
  tokensUsed: 250
})

// ❌ 非结构化日志  
log.info(`Story ${storyId} processed in ${time}ms using ${model}`)
```

### 3. 敏感信息处理

```typescript
// ✅ 安全的日志记录
log.info('User authenticated', {
  userId: user.id,
  email: user.email.replace(/(.{3}).*(@.*)/, '$1***$2'), // 脱敏
  loginTime: new Date()
})

// ❌ 危险的日志记录
log.info('User login', { password: user.password }) // 永远不要记录密码
```

### 4. 性能考虑

```typescript
// ✅ 高效的日志记录
if (log.debug.enabled) {  // 仅在 debug 模式下计算
  log.debug('Complex calculation result', {
    result: expensiveCalculation()
  })
}

// 使用惰性求值
log.debug('User data', () => ({ 
  user: formatUserForLogging(user) 
}))
```

### 5. 错误日志上下文

```typescript
// ✅ 提供足够的上下文
try {
  await processStory(story)
} catch (error) {
  log.error('Story processing failed', {
    storyId: story.id,
    title: story.title,
    url: story.url,
    error: error.message,
    stack: error.stack,
    retryCount: attempts,
    modelUsed: process.env.OPENAI_MODEL
  })
  throw error
}
```

## 故障排除

### 常见问题

**1. 日志文件不生成**
- 检查 `LOGS_DIR` 环境变量
- 确认目录权限
- 检查磁盘空间

**2. 日志级别不正确**
- 检查 `LOG_LEVEL` 环境变量
- 确认环境（开发/生产）配置

**3. 日志文件过大**
- 运行 `npm run logs:rotate`
- 设置自动轮转
- 定期清理旧日志

### 调试步骤

1. **检查日志配置**
   ```bash
   npm run logs:status
   ```

2. **验证日志写入**
   ```typescript
   import { log } from '@/lib/logger'
   log.info('Test log message', { test: true })
   ```

3. **查看实时日志**
   ```bash
   npm run logs:tail combined
   ```

通过这个完整的日志系统，你可以有效地监控和调试 xHN 应用的运行状态。