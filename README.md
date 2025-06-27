# xHN - 智能科技新闻聚合平台

一个现代化的 Hacker News 中文版应用，使用火山方舟豆包1.6模型自动生成中文标题和内容摘要。

## 🌐 在线体验

**[https://xhn.y1s1.host/](https://xhn.y1s1.host/)**

**Powered by Doubao-1.6**

## 功能特点

- 🔥 **实时热点**：获取 Hacker News 24小时最热和最受欢迎的文章
- 🤖 **AI 翻译**：支持多种 AI 模型（OpenAI、DeepSeek、火山方舟等）自动生成中文标题和摘要
- 🌐 **智能内容分析**：自动抓取并分析网页内容，生成更准确的摘要
- ⚡ **实时更新**：WebSocket 实时推送翻译完成的内容，无需手动刷新
- 🎯 **可配置 Prompt**：自定义 AI 角色和回复格式，支持基于实际内容的增强型提示
- 🚀 **任务队列系统**：智能排队处理，防止 API 被打挂
- 💾 **数据库缓存**：使用 PostgreSQL 缓存处理结果，24小时有效期
- 🔄 **并发控制**：支持多篇文章同时处理，提升效率
- 📊 **高级监控**：完整的系统状态监控和调试工具（/status 页面）
- 📡 **RSS 支持**：支持 RSS 订阅，包含中文摘要内容
- 💖 **点赞收藏**：支持文章点赞和收藏功能（本地存储）
- 🎨 **现代化 UI**：使用 shadcn/ui 构建的简洁美观界面
- 📚 **阅读优化**：专为阅读体验设计的版面布局
- 📱 **响应式设计**：适配各种设备屏幕
- 🔮 **SSO 就绪**：为未来的单点登录系统预留接口
- ⚡ **性能优化**：使用 Next.js 14 构建

## 技术栈

- **框架**：Next.js 14 (App Router)
- **UI 组件**：shadcn/ui + Radix UI
- **数据库**：PostgreSQL (Vercel Postgres)
- **ORM**：Drizzle ORM
- **样式**：Tailwind CSS
- **状态管理**：原生 React Hooks + 本地存储
- **AI 服务**：火山方舟豆包1.6 (兼容 OpenAI API 格式)
- **部署**：Vercel
- **语言**：TypeScript

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/fuergaosi233/xhn.git
cd xhn
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

复制 `.env.example` 为 `.env.local` 并配置火山方舟豆包1.6：

```bash
cp .env.example .env.local
```

#### 火山方舟豆包1.6配置（推荐）：
```env
OPENAI_API_KEY=your-volcengine-api-key
OPENAI_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
OPENAI_MODEL=doubao-lite-4k
```

> 🌋 **获取API密钥**: 访问 [火山方舟控制台](https://www.volcengine.com/product/ark) 创建应用并获取API密钥

#### 其他兼容模型（可选）：

**OpenAI 官方:**
```env
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-3.5-turbo
```

**DeepSeek:**
```env
OPENAI_API_KEY=your-deepseek-api-key
OPENAI_BASE_URL=https://api.deepseek.com/v1
OPENAI_MODEL=deepseek-chat
```

> 💡 **更多配置选项**: 查看 [模型配置指南](./docs/MODEL_CONFIGURATION.md) 了解所有支持的模型和详细配置说明。

### 4. 设置数据库

**选项 A: 使用 Docker (推荐本地开发)**
```bash
# 复制数据库配置模板
cp .env.docker.example .env.docker

# 根据需要修改数据库配置
# 默认配置: 用户名 hacknews_user, 密码 hacknews_password

# 启动数据库
docker-compose up -d
```

**选项 B: 使用其他 PostgreSQL 数据库**
更新 `.env.local` 中的数据库连接配置

### 5. 初始化数据库

```bash
# 启动应用后访问初始化接口
curl -X POST http://localhost:3000/api/db/init
```

### 6. 启动开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

> 📖 **详细设置指南**: 查看 [设置指南](./docs/SETUP_GUIDE.md) 了解完整的部署和配置说明。

## 部署到 Vercel

1. **创建项目并连接 GitHub 仓库**
2. **添加 Postgres 数据库**
   - 在项目的 Storage 标签中创建 Postgres 数据库
   - 环境变量会自动注入
3. **配置火山方舟豆包1.6环境变量**
   ```env
   OPENAI_API_KEY=your_volcengine_api_key
   OPENAI_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
   OPENAI_MODEL=doubao-lite-4k
   ```
4. **部署并初始化数据库**
   - 部署完成后访问 `https://your-app.vercel.app/api/db/init` (POST请求)

## API 路由

### 核心功能 API
- `GET /api/stories?type=top` - 获取24小时最热文章
- `GET /api/stories?type=best` - 获取最受欢迎文章
- `POST /api/stories/updates` - 检查故事更新状态
- `GET /api/story/[id]` - 获取单个故事详情

### 配置和系统信息
- `GET /api/config` - 获取当前模型配置信息
- `GET /api/queue/status` - 获取队列处理状态
- `POST /api/queue/status` - 启动队列处理器
- `GET /api/db/init` - 检查数据库状态
- `POST /api/db/init` - 初始化数据库表结构

### 实时通信和订阅
- `GET /api/socketio` - 获取 WebSocket 连接统计
- `POST /api/socketio` - 管理 WebSocket 服务
- `GET /api/rss?type=top&limit=50` - 获取 RSS feed（支持中文摘要）

### 高级监控和调试
- `GET /api/status/cached` - 获取详细缓存统计信息
- `GET /api/status/story/[id]` - 获取单个故事的调试信息

## 支持的 AI 模型

| 提供商 | 模型 | 推荐用途 | 成本 |
|--------|------|----------|------|
| 火山方舟 | doubao-lite-4k | **默认推荐**，豆包1.6，速度快成本低 | 很低 |
| 火山方舟 | doubao-pro-4k | 豆包1.6专业版，质量更高 | 低 |
| 火山方舟 | doubao-pro-32k | 豆包1.6长文本版 | 中 |
| OpenAI | GPT-3.5 Turbo | 备用选择 | 低 |
| DeepSeek | deepseek-chat | 备用选择 | 很低 |

## 项目结构

```
├── app/                    # Next.js 应用目录
│   ├── api/               # API 路由
│   │   ├── config/        # 配置相关 API
│   │   ├── db/            # 数据库管理 API
│   │   ├── queue/         # 队列状态 API
│   │   ├── rss/           # RSS 订阅 API
│   │   ├── socketio/      # WebSocket 管理 API
│   │   ├── status/        # 系统状态和调试 API
│   │   ├── stories/       # 文章获取和更新 API
│   │   └── story/         # 单个文章 API
│   ├── status/            # 系统状态监控页面
│   ├── globals.css        # 全局样式
│   ├── layout.tsx         # 根布局
│   └── page.tsx           # 首页
├── components/            # React 组件
│   ├── ui/                # shadcn/ui 基础组件
│   ├── Analytics.tsx      # 分析组件
│   ├── LoadingSpinner.tsx # 加载组件
│   ├── ModelInfo.tsx      # 模型信息组件
│   ├── StoryCard.tsx      # 文章卡片组件
│   ├── ThemeToggle.tsx    # 主题切换组件
│   └── WebSocketProvider.tsx # WebSocket 提供者
├── lib/                   # 工具库
│   ├── db/                # 数据库相关
│   │   ├── migrations/    # 数据库迁移文件
│   │   ├── index.ts       # 数据库连接
│   │   └── schema.ts      # 数据库模式
│   ├── hooks/             # React Hooks
│   │   ├── useInfiniteScroll.ts    # 无限滚动
│   │   ├── useStoryUpdates.ts      # 故事更新管理
│   │   ├── useTheme.tsx            # 主题管理
│   │   └── useWebSocketUpdates.ts  # WebSocket 实时更新
│   ├── cache.ts           # 缓存管理
│   ├── config.ts          # 配置管理（支持11种AI模型）
│   ├── hackernews.ts      # Hacker News API
│   ├── openai.ts          # AI 集成（含网页内容抓取）
│   ├── queue.ts           # 任务队列系统
│   ├── user.ts            # 用户管理
│   ├── utils.ts           # 工具函数
│   └── websocket.ts       # WebSocket 管理
├── docs/                  # 项目文档
├── scripts/               # 脚本工具
├── pages/api/             # Socket.io 支持
└── public/                # 静态文件
```

## 开发工具

### 数据库管理命令

```bash
# 启动数据库
npm run db:start

# 停止数据库
npm run db:stop

# 查看数据库状态
npm run db:status

# 连接到数据库
npm run db:connect

# 备份数据库
npm run db:backup

# 重置数据库 (慎用)
npm run db:reset

# 启动数据库浏览器
npm run db:studio
```

### 日志管理命令

```bash
# 设置日志目录和配置
npm run logs:setup

# 查看日志状态和统计
npm run logs:status

# 清理旧日志文件
npm run logs:clean

# 手动轮转大日志文件
npm run logs:rotate

# 实时查看日志 (可指定类型: error, combined, access)
npm run logs:tail [日志类型]

# 搜索日志内容
npm run logs:search <关键词> [日志类型]
```

**日志类型说明：**
- `error` - 错误日志
- `combined` - 综合日志
- `access` - API 访问日志
- `exceptions` - 未捕获异常
- `rejections` - Promise 拒绝

### 数据库配置

所有数据库配置都通过环境变量管理：

- **本地开发**: 编辑 `.env.docker` 文件
- **生产环境**: Vercel 会自动注入 PostgreSQL 环境变量

默认配置：
- 用户名: `hacknews_user`
- 密码: `hacknews_password`  
- 数据库: `hacknews_cn`
- 端口: `5432`

### 自定义数据库配置

如果你需要修改默认的数据库配置：

1. 复制配置模板：
   ```bash
   cp .env.docker.example .env.docker
   ```

2. 编辑 `.env.docker` 文件：
   ```env
   POSTGRES_USER=my_custom_user
   POSTGRES_PASSWORD=my_secure_password
   POSTGRES_DATABASE=my_database
   POSTGRES_PORT=5433
   ```

3. 重启数据库：
   ```bash
   npm run db:stop
   npm run db:start
   ```

## 许可证

MIT License