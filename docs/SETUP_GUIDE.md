# 项目设置指南

## 本地开发设置

### 方法一：使用 Docker (推荐)

1. **配置数据库环境变量**
   ```bash
   # 复制 Docker 环境变量模板
   cp .env.docker.example .env.docker
   
   # 根据需要编辑数据库配置
   # vim .env.docker
   ```

2. **启动 PostgreSQL 数据库**
   ```bash
   docker-compose up -d
   ```

3. **初始化数据库**
   访问 `http://localhost:3000/api/db/init` 进行POST请求，或在应用启动后使用API初始化。

4. **启动开发服务器**
   ```bash
   npm run dev
   ```

### 方法二：使用远程数据库

1. **配置环境变量**
   
   编辑 `.env.local` 文件，设置你的数据库连接：
   ```env
   POSTGRES_URL="postgresql://username:password@host:5432/database"
   ```

2. **初始化数据库**
   ```bash
   # 使用 API 初始化
   curl -X POST http://localhost:3000/api/db/init
   ```

## Vercel 部署设置

### 1. 设置 Vercel Postgres

1. 在 Vercel 项目中添加 Postgres 数据库：
   - 进入项目的 **Storage** 标签
   - 点击 **Create Database** 
   - 选择 **Postgres**
   - 数据库创建后，环境变量会自动添加到你的项目中

### 2. 配置环境变量

在 Vercel 项目设置中添加以下环境变量：

```env
# AI 配置 (必需)
OPENAI_API_KEY=your_api_key_here
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-3.5-turbo

# Prompt 配置 (可选)
AI_SYSTEM_PROMPT=你是一个专业而有趣的技术新闻总结大师...
AI_USER_PROMPT_TEMPLATE=请为以下技术新闻生成中文标题和摘要...

# 队列配置 (可选)
QUEUE_CONCURRENCY=3
QUEUE_RETRY_ATTEMPTS=3
QUEUE_RETRY_DELAY=5000
```

### 3. 初始化数据库

部署后访问 `https://your-app.vercel.app/api/db/init` (POST 请求) 来初始化数据库表。

## 配置说明

### AI 模型配置

支持多种 AI 模型提供商：

```env
# OpenAI 官方
OPENAI_API_KEY=sk-your-key
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-3.5-turbo

# OpenRouter (免费模型)
OPENAI_API_KEY=sk-or-your-key
OPENAI_BASE_URL=https://openrouter.ai/api/v1
OPENAI_MODEL=deepseek/deepseek-r1-0528-qwen3-8b:free

# DeepSeek (国内)
OPENAI_API_KEY=sk-your-key
OPENAI_BASE_URL=https://api.deepseek.com/v1
OPENAI_MODEL=deepseek-chat
```

### Prompt 自定义

你可以自定义 AI 的角色和回复格式，支持两种模式：

**基础模式（仅基于标题）：**
```env
AI_SYSTEM_PROMPT="你是一个专业而有趣的技术新闻总结大师，擅长将复杂的技术文章转化为引人入胜的中文内容。"

AI_USER_PROMPT_TEMPLATE="请为以下技术新闻生成中文标题和摘要：

【原标题】{title}
{url_info}

请按以下格式回复：
中文标题：[一个吸引人的中文标题，不超过50字]
摘要：[用2-3句话总结文章亮点，突出技术价值和实用性，不超过100字]"
```

**增强模式（基于实际网页内容）：**
```env
AI_USER_PROMPT_TEMPLATE_WITH_CONTENT="请基于以下完整的技术文章内容生成准确的中文标题和摘要：

【原标题】{title}
【文章网址】{url}
【文章内容】
{content}

请按以下格式回复：
中文标题：[基于实际内容的准确中文标题，不超过50字]
摘要：[基于完整内容的详细摘要，突出核心观点和技术要点，100-150字]

要求：
1. 标题必须准确反映文章主要内容
2. 摘要要包含关键技术细节和实际价值
3. 保持专业性的同时让内容更易理解"
```

### 网页内容抓取配置

项目支持自动抓取网页内容以生成更准确的摘要：

```env
# 内容抓取设置
CONTENT_FETCH_ENABLED=true          # 启用内容抓取
CONTENT_MAX_LENGTH=10000            # 最大内容长度
CONTENT_TIMEOUT=30000               # 抓取超时时间(毫秒)
```

### 队列系统配置

```env
QUEUE_CONCURRENCY=3        # 同时处理的文章数量
QUEUE_RETRY_ATTEMPTS=3     # 失败重试次数
QUEUE_RETRY_DELAY=5000     # 重试延迟(毫秒)
```

## 监控和调试

### 检查数据库状态

访问 `GET /api/db/init` 查看数据库连接状态和表结构。

### 检查队列状态

访问 `GET /api/queue/status` 查看当前队列处理状态。

### 启动队列处理器

访问 `POST /api/queue/status` 手动启动队列处理器。

## 故障排除

### 数据库连接问题

1. 检查环境变量是否正确设置
2. 确认数据库服务正在运行
3. 检查网络连接和防火墙设置

### AI 处理失败

1. 检查 API Key 是否有效
2. 确认模型名称正确
3. 检查 API 额度是否充足
4. 查看控制台错误日志

### 队列阻塞

1. 检查队列状态 API
2. 重启队列处理器
3. 清理失败的任务
4. 调整并发设置

## 性能优化

### 数据库优化

- 定期清理过期缓存：自动清理24小时后过期的缓存
- 索引优化：已为常用查询字段创建索引

### 队列优化

- 并发控制：防止 API 被打挂
- 失败重试：自动重试失败的任务
- 优先级处理：最热文章优先处理

### 缓存策略

- 24小时缓存：减少重复处理
- 智能缓存检查：只处理新文章
- 过期自动清理：保持数据库整洁

## 开发工具

```bash
# 启动数据库浏览器
npm run db:studio

# 生成数据库迁移
npm run db:generate

# 执行数据库迁移
npm run db:migrate
```