import OpenAI from 'openai'
import { getCurrentModelConfig, validateModelConfig } from './config'
import axios from 'axios'
import { JSDOM, VirtualConsole } from 'jsdom'
import { Readability } from '@mozilla/readability'
import { lookup } from 'dns/promises'
import { log } from './logger'

let openai: OpenAI | null = null

function getOpenAIClient(): OpenAI {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required')
    }
    
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    })
  }
  return openai
}

export interface AIProcessResult {
  chineseTitle: string
  summary: string
  category?: string
  tags?: string[]
  content?: string
  originalContent?: string
}

interface WebContentResult {
  title: string
  content: string
  cleanedContent: string
  error?: string
}

// 通过 FlareSolverr 抓取：真浏览器 + 反检测，能过 Cloudflare/DDoS-Guard 等 JS 挑战墙。
// 裸 headless chrome 会被这些站点识别并返回"请启用 JavaScript"的壳页，抽不到正文。
// FLARESOLVERR_URL 形如 http://xhn-flaresolverr:8191
async function fetchHtmlViaFlareSolverr(url: string): Promise<string> {
  const base = process.env.FLARESOLVERR_URL
  if (!base) {
    throw new Error('FLARESOLVERR_URL not configured')
  }

  const maxTimeout = parseInt(process.env.CONTENT_TIMEOUT || '40000')
  const response = await axios.post(
    `${base.replace(/\/$/, '')}/v1`,
    { cmd: 'request.get', url, maxTimeout },
    { timeout: maxTimeout + 15000, headers: { 'Content-Type': 'application/json' } }
  )

  const data = response.data
  if (data?.status !== 'ok' || !data?.solution?.response) {
    throw new Error(`FlareSolverr failed: ${data?.message || data?.status || 'no response'}`)
  }
  return String(data.solution.response)
}

// 通过无头 Chrome (CDP) 抓取渲染后的 HTML —— 参考 karakeep 的抓取架构，
// 复用集群内同一个 chrome 实例（CHROME_CDP_URL，如 http://chrome.karakeep:9222）
async function fetchHtmlViaBrowser(url: string): Promise<string> {
  const cdpUrl = process.env.CHROME_CDP_URL
  if (!cdpUrl) {
    throw new Error('CHROME_CDP_URL not configured')
  }

  // Chrome 的调试端口会拒绝非 IP/localhost 的 Host 头，先把服务名解析成 IP
  const parsed = new URL(cdpUrl)
  const { address } = await lookup(parsed.hostname)
  const browserURL = `${parsed.protocol}//${address}:${parsed.port || 9222}`

  const puppeteer = await import('puppeteer-core')
  const browser = await puppeteer.connect({ browserURL })
  const page = await browser.newPage()
  try {
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36')
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: parseInt(process.env.CONTENT_TIMEOUT || '30000')
    })
    // 给 JS 渲染的页面留一点水合时间
    await new Promise(resolve => setTimeout(resolve, 1500))
    return await page.content()
  } finally {
    await page.close().catch(() => {})
    // 只断开连接，不关闭共享的浏览器实例
    browser.disconnect()
  }
}

async function fetchHtmlViaAxios(url: string): Promise<string> {
  const response = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
    },
    timeout: parseInt(process.env.CONTENT_TIMEOUT || '30000'),
    maxContentLength: 10 * 1024 * 1024, // 10MB limit
    responseType: 'text'
  })
  return String(response.data)
}

// 从 HTML 提取正文：优先 Readability（karakeep 同款思路），失败退回选择器启发式
function extractContent(html: string, url: string): { title: string; text: string } {
  const virtualConsole = new VirtualConsole() // 屏蔽第三方页面 CSS 解析报错噪音
  const dom = new JSDOM(html, { url, virtualConsole })
  const document = dom.window.document

  const reader = new Readability(document.cloneNode(true) as Document)
  const article = reader.parse()
  if (article?.textContent && article.textContent.trim().length > 200) {
    return {
      title: article.title || '',
      text: article.textContent
    }
  }

  // Readability 失败（内容太短/结构特殊）时的启发式兜底
  const unwantedSelectors = [
    'script', 'style', 'nav', 'header', 'footer',
    '.nav', '.navigation', '.menu', '.sidebar',
    '.advertisement', '.ads', '.social-share',
    '.comments', '.comment-section', '.related-posts'
  ]
  unwantedSelectors.forEach(selector => {
    document.querySelectorAll(selector).forEach(el => el.remove())
  })

  const contentSelectors = [
    'article', '[role="main"]', '.article-content', '.post-content',
    '.entry-content', '.content', 'main', '.main-content'
  ]
  let contentElement: Element | null = null
  for (const selector of contentSelectors) {
    contentElement = document.querySelector(selector)
    if (contentElement) break
  }

  return {
    title: document.querySelector('h1')?.textContent?.trim() ||
           document.querySelector('title')?.textContent?.trim() || '',
    text: (contentElement || document.body)?.textContent || ''
  }
}

// 抓取器优先级：FlareSolverr（反检测，过 CF 墙）→ 无头 Chrome（CDP）→ axios 直抓。
// 前一个未配置或抛错就降级到下一个，任一成功即用其 HTML。
async function fetchHtml(url: string): Promise<{ html: string; via: string }> {
  const strategies: Array<{ name: string; fn: () => Promise<string> }> = [
    { name: 'flaresolverr', fn: () => fetchHtmlViaFlareSolverr(url) },
    { name: 'chrome', fn: () => fetchHtmlViaBrowser(url) },
    { name: 'axios', fn: () => fetchHtmlViaAxios(url) },
  ]

  let lastError: Error | null = null
  for (const s of strategies) {
    try {
      const html = await s.fn()
      return { html, via: s.name }
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err))
      // "未配置"不算失败，静默跳过；真正的抓取错误才记 warn
      if (!/not configured/.test(e.message)) {
        log.warn(`Fetch strategy ${s.name} failed`, { url, error: e })
        lastError = e
      }
    }
  }
  throw lastError || new Error('No fetch strategy available')
}

async function fetchWebContent(url: string): Promise<WebContentResult> {
  try {
    const { html, via } = await fetchHtml(url)

    let { title, text } = extractContent(html, url)

    // 抽出的正文过短且疑似反爬壳页时，视为失败（宁可只用标题翻译，也不要把"请启用JS"喂给模型）
    const looksBlocked = /enable\s+javascript|verify\s+you\s+are\s+human|checking\s+your\s+browser|just\s+a\s+moment|cf-browser-verification|请开启\s*javascript|正在验证/i.test(text)
    if (looksBlocked && text.trim().length < 500) {
      log.warn('Fetched content looks like a bot-wall, discarding body', { url, via, len: text.trim().length })
      text = ''
    } else {
      log.debug('Fetched web content', { url, via, len: text.trim().length })
    }

    const cleanedContent = text
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim()
      .substring(0, 50000)

    return {
      title,
      content: text.substring(0, 100000), // Store more content in DB
      cleanedContent,
    }
  } catch (error) {
    log.error('Failed to fetch web content', { error: error instanceof Error ? error : new Error(String(error)), url })
    return {
      title: '',
      content: '',
      cleanedContent: '',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

export async function processWithAI(title: string, url?: string): Promise<AIProcessResult> {
  try {
    // 验证配置
    const configValidation = validateModelConfig()
    if (!configValidation.valid) {
      throw new Error(`配置错误: ${configValidation.error}`)
    }
    
    const modelConfig = getCurrentModelConfig()
    
    // Fetch web content if URL is provided
    let webContent: WebContentResult | null = null
    if (url) {
      log.info('Fetching web content', { url })
      webContent = await fetchWebContent(url)
      
      if (webContent.error) {
        log.warn('Failed to fetch content from URL', { url, error: new Error(webContent.error) })
      } else {
        log.info('Successfully fetched web content', { url, title: webContent.title.substring(0, 100), contentLength: webContent.cleanedContent.length })
      }
    }
    
    // 获取可配置的 Prompt
    const systemPrompt = process.env.AI_SYSTEM_PROMPT || 
      "你是一个专业的技术新闻翻译和摘要助手，擅长将英文技术新闻翻译成准确、流畅的中文。基于提供的内容进行分析和总结。"
    
    const userPromptTemplate = webContent?.cleanedContent 
      ? process.env.AI_USER_PROMPT_TEMPLATE_WITH_CONTENT || `
请为以下英文文章生成中文翻译和摘要：

【原标题】{title}
【文章内容】{content}
{url_info}

请按以下格式回复：
中文标题：[这里是中文翻译的标题]
摘要：[这里是基于文章内容的详细中文摘要，200字以内]
分类：[文章的技术分类，如：AI/机器学习、前端开发、后端架构等]
标签：[相关技术标签，用逗号分隔]

要求：
1. 中文标题要准确且符合中文表达习惯
2. 摘要要基于实际内容，突出文章要点和技术细节
3. 分类要准确反映文章的技术领域
4. 标签要包含文章中提到的主要技术和概念
`
      : process.env.AI_USER_PROMPT_TEMPLATE || `
请为以下英文标题生成中文翻译和摘要：

【原标题】{title}
{url_info}

请按以下格式回复：
中文标题：[这里是中文翻译的标题]
摘要：[这里是简洁的中文摘要，不超过100字]

要求：
1. 中文标题要准确且符合中文表达习惯
2. 摘要要简洁明了，突出重点
3. 如果是技术类文章，请保留重要的技术术语
`
    
    // 替换模板变量（使用函数形式，避免正文中的 $& 等模式被 String.replace 特殊解释）
    const maxContentChars = parseInt(process.env.AI_MAX_CONTENT_CHARS || '8000')
    const urlInfo = url ? `【链接】${url}` : ''
    const contentInfo = (webContent?.cleanedContent || '').substring(0, maxContentChars)
    const prompt = userPromptTemplate
      .replace(/\{title\}/g, () => title)
      .replace(/\{content\}/g, () => contentInfo)
      .replace(/\{url_info\}/g, () => urlInfo)

    const requestBody: any = {
      model: modelConfig.model,
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: webContent?.cleanedContent ? 1000 : 500,
      temperature: modelConfig.temperature
    }

    // 火山方舟的推理模型（如 doubao-seed-1.6-flash 250828+）默认开启 thinking，
    // 隐藏推理会烧掉数千 output tokens；翻译任务不需要，显式关闭
    if (process.env.AI_THINKING) {
      requestBody.thinking = { type: process.env.AI_THINKING }
    }

    const completion = await getOpenAIClient().chat.completions.create(requestBody)

    // 处理deepseek-r1等推理模型的特殊响应格式
    const message = completion.choices[0]?.message
    let response = message?.content || ''
    
    // 如果content为空但有reasoning，尝试从reasoning中提取
    if (!response && (message as any)?.reasoning) {
      response = (message as any).reasoning
    }
    
    // 改进的解析逻辑，支持多行匹配
    const chineseTitleMatch = response.match(/中文标题[：:]\s*([\s\S]+?)(?=\n摘要|\n分类|$)/)
    const summaryMatch = response.match(/摘要[：:]\s*([\s\S]+?)(?=\n分类|\n标签|$)/)
    const categoryMatch = response.match(/分类[：:]\s*([\s\S]+?)(?=\n标签|$)/)
    const tagsMatch = response.match(/标签[：:]\s*([\s\S]+?)$/)
    
    const parsedTitle = chineseTitleMatch?.[1]?.trim()
    const parsedSummary = summaryMatch?.[1]?.trim()

    // 标题和摘要都解析不出来说明响应格式异常，抛出让队列重试，避免缓存无效结果
    if (!parsedTitle && !parsedSummary) {
      throw new Error(`AI 响应格式无法解析: ${response.substring(0, 200)}`)
    }

    const chineseTitle = parsedTitle || title
    const summary = parsedSummary || '暂无摘要'
    const category = categoryMatch?.[1]?.trim() || undefined
    const tags = tagsMatch?.[1]?.trim()?.split(',').map(tag => tag.trim()).filter(tag => tag) || undefined
    
    return {
      chineseTitle,
      summary,
      category,
      tags,
      content: webContent?.cleanedContent,
      originalContent: webContent?.content
    }
  } catch (error) {
    log.error('AI processing failed', { error: error instanceof Error ? error : new Error(String(error)), title, url, model: process.env.OPENAI_MODEL })
    // 向上抛出，让队列走重试/失败流程，避免把失败结果当成功缓存
    throw error instanceof Error ? error : new Error(String(error))
  }
}