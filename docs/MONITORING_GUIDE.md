# 系统监控和调试指南

## 概述

xHN 提供了完整的系统监控和调试工具，帮助开发者和运维人员实时了解系统状态、性能指标和潜在问题。

## 监控面板

### `/status` 页面

访问应用的 `/status` 页面可以查看完整的系统状态仪表板：

**功能特点：**
- 📊 **实时数据更新**：每秒自动刷新系统状态
- 🎯 **多维度监控**：队列、缓存、数据库、WebSocket 全方位监控
- 🔧 **调试工具集成**：一键访问各种调试功能
- 📈 **性能指标**：响应时间、成功率、错误率等关键指标
- 🛠️ **操作界面**：支持队列控制、缓存清理等操作

## 监控 API

### 1. 队列状态监控

**获取队列状态：**
```bash
GET /api/queue/status
```

响应示例：
```json
{
  "isProcessing": true,
  "stats": {
    "pending": 15,
    "processing": 3,
    "completed": 142,
    "failed": 2
  },
  "config": {
    "concurrency": 3,
    "retryAttempts": 3,
    "retryDelay": 5000
  },
  "lastProcessed": "2024-01-15T10:30:45.123Z",
  "processingRate": "2.3/min",
  "estimatedCompletion": "5 minutes"
}
```

**启动/停止队列处理器：**
```bash
POST /api/queue/status
Content-Type: application/json

{
  "action": "start" | "stop" | "restart"
}
```

### 2. 缓存状态监控

**获取详细缓存统计：**
```bash
GET /api/status/cached
```

响应示例：
```json
{
  "summary": {
    "totalStories": 156,
    "cachedStories": 142,
    "pendingStories": 14,
    "cacheHitRate": "91.0%"
  },
  "details": {
    "cached": [
      {
        "id": 12345,
        "title": "Example Story",
        "title_cn": "示例故事",
        "status": "completed",
        "cached_at": "2024-01-15T10:25:30.123Z",
        "expires_at": "2024-01-16T10:25:30.123Z"
      }
    ],
    "pending": [
      {
        "id": 12346,
        "title": "Pending Story",
        "queued_at": "2024-01-15T10:30:00.123Z",
        "estimated_completion": "2024-01-15T10:32:00.123Z"
      }
    ]
  },
  "performance": {
    "avgProcessingTime": "2.3s",
    "successRate": "96.8%",
    "errorRate": "3.2%"
  }
}
```

### 3. 单个故事调试

**获取故事详细调试信息：**
```bash
GET /api/status/story/[id]
```

响应示例：
```json
{
  "story": {
    "id": 12345,
    "title": "Original Title",
    "title_cn": "中文标题",
    "summary_cn": "中文摘要",
    "url": "https://example.com/article",
    "status": "completed",
    "created_at": "2024-01-15T10:20:00.123Z",
    "updated_at": "2024-01-15T10:25:30.123Z"
  },
  "processing": {
    "startTime": "2024-01-15T10:22:00.123Z",
    "endTime": "2024-01-15T10:25:30.123Z",
    "duration": "3.4s",
    "attempts": 1,
    "lastError": null
  },
  "content": {
    "originalLength": 5420,
    "extractedLength": 3200,
    "contentFetched": true,
    "fetchTime": "1.2s"
  },
  "ai": {
    "model": "gpt-3.5-turbo",
    "promptTokens": 1240,
    "completionTokens": 180,
    "totalTokens": 1420,
    "cost": "$0.002"
  },
  "cache": {
    "cached": true,
    "cacheKey": "story:12345",
    "ttl": "23h 34m",
    "hitCount": 5
  }
}
```

### 4. WebSocket 连接监控

**获取 WebSocket 统计：**
```bash
GET /api/socketio
```

响应示例：
```json
{
  "status": "active",
  "server": {
    "uptime": "2h 30m 15s",
    "memoryUsage": "45.2MB",
    "cpu": "12%"
  },
  "connections": {
    "total": 8,
    "active": 6,
    "idle": 2
  },
  "rooms": {
    "stories": {
      "clients": 5,
      "messages": 142
    },
    "queue": {
      "clients": 3,
      "messages": 28
    }
  },
  "performance": {
    "messagesPerSecond": 2.3,
    "avgLatency": "45ms",
    "errorRate": "0.1%"
  }
}
```

## 日志和错误跟踪

### 1. 应用日志

**查看实时日志：**
```bash
# 开发环境
npm run dev

# 生产环境 (使用 PM2)
pm2 logs xhn --lines 100 --follow
```

**日志级别：**
- `ERROR`: 系统错误和异常
- `WARN`: 警告信息和性能问题
- `INFO`: 一般信息和操作记录
- `DEBUG`: 详细调试信息（仅开发环境）

### 2. 错误分析

**常见错误类型：**

**AI 处理错误：**
```json
{
  "error": "AI Processing Failed",
  "story_id": 12345,
  "model": "gpt-3.5-turbo",
  "error_code": "rate_limit_exceeded",
  "message": "API rate limit exceeded",
  "retry_after": 60,
  "timestamp": "2024-01-15T10:30:00.123Z"
}
```

**内容抓取错误：**
```json
{
  "error": "Content Fetch Failed",
  "story_id": 12345,
  "url": "https://example.com/article",
  "error_code": "timeout",
  "message": "Request timeout after 30s",
  "status_code": null,
  "timestamp": "2024-01-15T10:30:00.123Z"
}
```

**数据库错误：**
```json
{
  "error": "Database Error",
  "operation": "insert",
  "table": "stories",
  "error_code": "connection_lost",
  "message": "Connection to database lost",
  "timestamp": "2024-01-15T10:30:00.123Z"
}
```

## 性能监控

### 1. 关键指标

**系统性能指标：**
- **响应时间**: API 请求平均响应时间
- **吞吐量**: 每分钟处理的文章数量
- **成功率**: 成功处理的文章比例
- **错误率**: 失败处理的文章比例
- **队列长度**: 待处理文章数量
- **缓存命中率**: 缓存命中的比例

**资源使用指标：**
- **内存使用**: 应用内存占用情况
- **CPU 使用**: CPU 使用率
- **数据库连接**: 活动连接数
- **WebSocket 连接**: 实时连接数

### 2. 性能优化建议

**基于监控数据的优化建议：**

```typescript
// 示例：基于队列长度调整并发数
if (queueStats.pending > 50) {
  // 增加并发处理数
  updateConcurrency(5)
} else if (queueStats.pending < 10) {
  // 减少并发处理数以节省资源
  updateConcurrency(2)
}
```

## 告警和通知

### 1. 告警规则

**自动告警触发条件：**
- 队列处理停止超过 5 分钟
- 错误率超过 10%
- 内存使用超过 80%
- 数据库连接失败
- WebSocket 连接数异常

### 2. 通知方式

**支持的通知渠道：**
- 系统日志记录
- WebSocket 实时推送
- 邮件通知（需配置）
- Webhook 回调（需配置）

**配置告警通知：**
```env
# 告警配置
ALERT_EMAIL_ENABLED=true
ALERT_EMAIL_SMTP_HOST=smtp.gmail.com
ALERT_EMAIL_FROM=alerts@yourapp.com
ALERT_EMAIL_TO=admin@yourapp.com

# Webhook 告警
ALERT_WEBHOOK_ENABLED=true
ALERT_WEBHOOK_URL=https://hooks.slack.com/your-webhook-url
```

## 调试工具

### 1. 交互式调试

**在状态页面的调试功能：**
- **队列控制**: 启动/停止/重启队列处理器
- **缓存管理**: 清理特定缓存或全部缓存
- **连接测试**: 测试数据库和 AI 服务连接
- **性能测试**: 模拟负载测试处理性能

### 2. 开发者工具

**本地开发调试：**
```bash
# 启用详细日志
DEBUG=xhn:* npm run dev

# 数据库调试
npm run db:studio

# 查看数据库状态
npm run db:status
```

**生产环境调试：**
```bash
# 查看 PM2 进程状态
pm2 status

# 查看进程详细信息
pm2 show xhn

# 重启应用
pm2 restart xhn

# 查看实时日志
pm2 logs xhn --follow
```

### 3. API 测试

**使用 curl 测试各个端点：**
```bash
# 测试队列状态
curl -X GET http://localhost:3000/api/queue/status

# 测试缓存状态
curl -X GET http://localhost:3000/api/status/cached

# 测试故事处理
curl -X POST http://localhost:3000/api/queue/status \
  -H "Content-Type: application/json" \
  -d '{"action": "start"}'

# 测试 WebSocket 连接
curl -X GET http://localhost:3000/api/socketio
```

## 监控最佳实践

### 1. 监控策略

**定期检查项目：**
- 每日检查系统性能指标
- 每周分析错误日志和趋势
- 定期优化队列配置
- 监控缓存命中率和过期策略

### 2. 预防性维护

**定期维护任务：**
- 清理过期缓存数据
- 优化数据库索引
- 更新 AI 模型配置
- 检查和更新依赖项

### 3. 容量规划

**基于监控数据制定扩容计划：**
- 根据队列长度趋势预测负载
- 根据内存使用情况规划资源
- 根据错误率优化配置
- 根据用户增长调整基础设施

## 故障排除

### 1. 常见问题诊断

**队列处理停止：**
1. 检查 `/api/queue/status` 确认状态
2. 查看错误日志定位问题
3. 检查 AI 服务和数据库连接
4. 重启队列处理器

**缓存问题：**
1. 检查 `/api/status/cached` 查看缓存状态
2. 确认数据库连接正常
3. 检查缓存过期策略
4. 必要时清理缓存

**WebSocket 连接问题：**
1. 检查 `/api/socketio` 确认服务状态
2. 测试客户端连接
3. 检查防火墙和代理设置
4. 重启 WebSocket 服务

### 2. 紧急响应

**系统宕机处理：**
1. 立即检查系统状态页面
2. 查看错误日志确定问题原因
3. 重启相关服务
4. 通知相关人员
5. 记录问题和解决方案

通过本监控指南，你可以有效地监控和维护 xHN 系统，确保其稳定运行和最佳性能。