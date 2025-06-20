# Railway Deployment Setup

## Required Environment Variables

Set these environment variables in your Railway project:

```bash
# Database (already provided)
DATABASE_URL=postgresql://postgres:MEaPcpsTxuavthjKkHTitBmUpVfiiMnd@ballast.proxy.rlwy.net:41987/railway

# OpenAI Configuration (required)
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-3.5-turbo

# AI Prompt Configuration (optional)
AI_SYSTEM_PROMPT=你是一个专业的技术新闻翻译和摘要助手，擅长将英文技术新闻翻译成准确、流畅的中文。
AI_USER_PROMPT_TEMPLATE=请为以下英文标题生成中文翻译和摘要：\n\n【原标题】{title}\n{url_info}\n\n请按以下格式回复：\n中文标题：[这里是中文翻译的标题]\n摘要：[这里是简洁的中文摘要，不超过100字]\n\n要求：\n1. 中文标题要准确且符合中文表达习惯\n2. 摘要要简洁明了，突出重点\n3. 如果是技术类文章，请保留重要的技术术语

# Queue Configuration (optional)
QUEUE_CONCURRENCY=3
QUEUE_RETRY_ATTEMPTS=3
QUEUE_RETRY_DELAY=5000

# App Configuration
NEXT_PUBLIC_APP_URL=https://your-railway-domain.railway.app
```

## Deployment Commands

Railway will automatically detect this as a Next.js project and use:
- Build: `npm run build`
- Start: `npm start`

## Database Setup

The database is already configured with the provided URL. The app will automatically initialize the required tables on first run via the `/api/db/init` endpoint.