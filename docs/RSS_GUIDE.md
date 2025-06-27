# RSS 功能使用说明

## 概述

xHN 提供了完整的 RSS 订阅功能，允许用户通过 RSS 阅读器订阅和获取包含中文摘要的技术新闻。支持多种订阅类型和自定义参数，让用户可以按需获取感兴趣的内容。

## 功能特点

- 📡 **标准 RSS 2.0 格式**：完全兼容所有主流 RSS 阅读器
- 🇨🇳 **中文摘要支持**：每篇文章都包含 AI 生成的中文标题和摘要
- 🔥 **多种订阅类型**：支持最热文章和最受欢迎文章订阅
- ⚙️ **灵活参数配置**：可自定义文章数量和更新频率
- 🚀 **高性能缓存**：智能缓存机制，快速响应 RSS 请求
- 📱 **移动友好**：适配各种设备的 RSS 阅读器

## RSS 订阅地址

### 基础订阅地址

**最热文章（默认）：**
```
https://your-domain.com/api/rss
https://your-domain.com/api/rss?type=top
```

**最受欢迎文章：**
```
https://your-domain.com/api/rss?type=best
```

### 自定义参数

**限制文章数量：**
```
https://your-domain.com/api/rss?limit=20
https://your-domain.com/api/rss?type=top&limit=50
https://your-domain.com/api/rss?type=best&limit=30
```

**完整参数示例：**
```
https://your-domain.com/api/rss?type=top&limit=25
```

## 支持的参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `type` | string | `top` | 文章类型：`top`（最热）或 `best`（最受欢迎） |
| `limit` | number | `50` | 返回文章数量，范围：1-100 |

## RSS Feed 格式

### Feed 信息

```xml
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>xHN - 智能科技新闻聚合</title>
    <link>https://your-domain.com</link>
    <description>Hacker News 中文版 - AI 自动翻译的技术新闻</description>
    <language>zh-CN</language>
    <lastBuildDate>Mon, 15 Jan 2024 10:30:00 GMT</lastBuildDate>
    <ttl>60</ttl>
    <generator>xHN RSS Generator</generator>
    
    <!-- 文章项目 -->
    <item>
      <title>AI 突破：新型神经网络架构提升 50% 性能</title>
      <link>https://example.com/original-article</link>
      <description><![CDATA[
        <h3>AI Breakthrough: New Neural Network Architecture Improves Performance by 50%</h3>
        <p><strong>中文摘要：</strong>研究人员开发了一种新型神经网络架构，在多个基准测试中表现出 50% 的性能提升。这项突破性技术有望应用于自动驾驶、医疗诊断等关键领域。</p>
        <p><strong>原文链接：</strong><a href="https://example.com/original-article">https://example.com/original-article</a></p>
      ]]></description>
      <pubDate>Mon, 15 Jan 2024 10:25:00 GMT</pubDate>
      <guid>https://example.com/original-article</guid>
      <category>AI</category>
      <category>Technology</category>
    </item>
    
  </channel>
</rss>
```

### 文章项目详细说明

每个 RSS 项目包含以下信息：

- **`title`**: AI 生成的中文标题
- **`link`**: 原文链接
- **`description`**: 包含原标题和中文摘要的完整描述
- **`pubDate`**: 文章发布时间
- **`guid`**: 唯一标识符（通常是原文 URL）
- **`category`**: 文章分类标签

## 在 RSS 阅读器中使用

### 1. 添加 RSS 订阅

**在常见 RSS 阅读器中添加订阅：**

**Feedly:**
1. 点击 "Add Content"
2. 输入 RSS 地址：`https://your-domain.com/api/rss`
3. 点击 "Follow"

**Inoreader:**
1. 点击 "Add subscription"
2. 粘贴 RSS 地址
3. 点击 "Subscribe"

**Apple News (iOS/macOS):**
1. 打开 Safari
2. 访问 RSS 地址
3. 点击 "订阅到 Apple News"

**其他阅读器:**
大多数 RSS 阅读器都支持直接粘贴 RSS 订阅地址的方式添加订阅。

### 2. 推荐的 RSS 阅读器

**桌面端：**
- **Feedly** - 功能丰富，支持多平台同步
- **Inoreader** - 专业级功能，适合重度用户
- **NetNewsWire** - macOS 原生应用，界面简洁

**移动端：**
- **Reeder** (iOS) - 界面优美，阅读体验佳
- **Flipboard** (iOS/Android) - 杂志式阅读体验
- **Feedly** (iOS/Android) - 跨平台同步

**浏览器扩展：**
- **RSS Feed Reader** (Chrome)
- **Feedbro** (Firefox/Chrome)

## 高级功能

### 1. 自定义订阅

**创建多个专门的订阅源：**
```
# 每日精选（20篇最热文章）
https://your-domain.com/api/rss?type=top&limit=20

# 周精选（50篇最受欢迎文章）
https://your-domain.com/api/rss?type=best&limit=50

# 快速浏览（10篇最新文章）
https://your-domain.com/api/rss?type=top&limit=10
```

### 2. RSS 缓存机制

**缓存策略：**
- RSS feed 缓存时间：5 分钟
- 文章内容缓存：24 小时
- 自动清理过期缓存

**缓存优势：**
- 快速响应 RSS 请求
- 减少服务器负载
- 提高用户体验

### 3. 更新频率

**推荐的更新频率设置：**
- **实时关注**: 每 15 分钟检查一次
- **日常阅读**: 每小时检查一次
- **轻度使用**: 每 4 小时检查一次

## 故障排除

### 常见问题

**1. RSS 订阅无法加载**
- 检查网络连接
- 确认 RSS 地址正确
- 尝试在浏览器中直接访问 RSS 地址

**2. 文章内容不完整**
- 部分文章可能还在处理中
- 稍后刷新 RSS 订阅
- 检查原文链接是否可访问

**3. 中文摘要缺失**
- AI 处理可能需要一些时间
- 通常在文章发布后 1-5 分钟内完成
- 可通过原文链接查看完整内容

### 调试方法

**检查 RSS Feed 格式：**
1. 在浏览器中访问 RSS 地址
2. 查看 XML 格式是否正确
3. 检查是否有错误信息

**验证 RSS 有效性：**
使用 RSS 验证工具：
- [W3C Feed Validator](https://validator.w3.org/feed/)
- [RSS Validator](http://www.rssboard.org/rss-validator/)

## 开发者信息

### API 实现

RSS 功能通过 `/app/api/rss/route.ts` 实现：

```typescript
// 获取 RSS feed
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'top'
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
  
  // 获取文章数据
  const stories = await getStories(type, limit)
  
  // 生成 RSS XML
  const rssXml = generateRSS(stories)
  
  return new Response(rssXml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300' // 5分钟缓存
    }
  })
}
```

### RSS XML 生成

```typescript
function generateRSS(stories: Story[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>xHN - 智能科技新闻聚合</title>
    <link>${process.env.NEXT_PUBLIC_APP_URL}</link>
    <description>Hacker News 中文版 - AI 自动翻译的技术新闻</description>
    <language>zh-CN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <ttl>60</ttl>
    
    ${stories.map(story => `
    <item>
      <title><![CDATA[${story.title_cn || story.title}]]></title>
      <link>${story.url}</link>
      <description><![CDATA[
        ${generateItemDescription(story)}
      ]]></description>
      <pubDate>${new Date(story.time * 1000).toUTCString()}</pubDate>
      <guid>${story.url}</guid>
    </item>
    `).join('')}
    
  </channel>
</rss>`
}
```

## 集成示例

### 在网站中添加 RSS 发现

```html
<!-- 在 HTML head 中添加 RSS 自动发现 -->
<link 
  rel="alternate" 
  type="application/rss+xml" 
  title="xHN RSS Feed" 
  href="https://your-domain.com/api/rss"
>
```

### 使用 JavaScript 解析 RSS

```javascript
// 使用 Fetch API 获取 RSS
fetch('https://your-domain.com/api/rss')
  .then(response => response.text())
  .then(xmlText => {
    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml')
    const items = xmlDoc.querySelectorAll('item')
    
    items.forEach(item => {
      const title = item.querySelector('title').textContent
      const link = item.querySelector('link').textContent
      const description = item.querySelector('description').textContent
      console.log({ title, link, description })
    })
  })
```

## 最佳实践

### 1. 订阅管理

- 根据阅读习惯选择合适的文章数量
- 设置合理的更新频率避免过度占用带宽
- 定期清理不活跃的订阅

### 2. 阅读体验优化

- 使用支持中文的 RSS 阅读器
- 启用文章缓存功能提高离线阅读体验
- 利用标签和分类功能组织订阅内容

### 3. 移动端使用

- 选择支持离线同步的移动 RSS 应用
- 在 WiFi 环境下同步内容节省流量
- 利用推送通知及时获取重要更新

通过本指南，你可以充分利用 xHN 的 RSS 功能，打造个性化的技术新闻阅读体验。