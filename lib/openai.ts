import OpenAI from 'openai'
import { getCurrentModelConfig, validateModelConfig } from './config'
import axios from 'axios'
import { JSDOM } from 'jsdom'

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

async function fetchWebContent(url: string): Promise<WebContentResult> {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 30000,
      maxContentLength: 10 * 1024 * 1024, // 10MB limit
    })

    const dom = new JSDOM(response.data)
    const document = dom.window.document

    // Remove unwanted elements
    const unwantedSelectors = [
      'script', 'style', 'nav', 'header', 'footer', 
      '.nav', '.navigation', '.menu', '.sidebar',
      '.advertisement', '.ads', '.social-share',
      '.comments', '.comment-section', '.related-posts'
    ]
    
    unwantedSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector)
      elements.forEach(el => el.remove())
    })

    // Try to find the main content using common article selectors
    const contentSelectors = [
      'article',
      '[role="main"]',
      '.article-content',
      '.post-content',
      '.entry-content',
      '.content',
      'main',
      '.main-content'
    ]

    let contentElement = null
    for (const selector of contentSelectors) {
      contentElement = document.querySelector(selector)
      if (contentElement) break
    }

    // If no specific content area found, use body
    if (!contentElement) {
      contentElement = document.body
    }

    // Extract title
    let pageTitle = document.querySelector('h1')?.textContent?.trim() ||
                   document.querySelector('title')?.textContent?.trim() ||
                   ''

    // Extract and clean content
    let rawContent = contentElement?.textContent || ''
    
    // Clean up the content
    const cleanedContent = rawContent
      .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
      .replace(/\n\s*\n/g, '\n') // Remove empty lines
      .trim()
      .substring(0, 50000) // Limit content length for LLM processing

    return {
      title: pageTitle,
      content: rawContent.substring(0, 100000), // Store more content in DB
      cleanedContent,
    }
  } catch (error) {
    console.error('Failed to fetch web content:', error)
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
      console.log(`Fetching content from: ${url}`)
      webContent = await fetchWebContent(url)
      
      if (webContent.error) {
        console.warn(`Failed to fetch content from ${url}: ${webContent.error}`)
      } else {
        console.log(`Successfully fetched content. Title: ${webContent.title.substring(0, 100)}...`)
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
    
    // 替换模板变量
    const urlInfo = url ? `【链接】${url}` : ''
    const contentInfo = webContent?.cleanedContent || ''
    const prompt = userPromptTemplate
      .replace('{title}', title)
      .replace('{content}', contentInfo)
      .replace('{url_info}', urlInfo)

    const completion = await getOpenAIClient().chat.completions.create({
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
    })

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
    
    const chineseTitle = chineseTitleMatch?.[1]?.trim() || title
    const summary = summaryMatch?.[1]?.trim() || '暂无摘要'
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
    console.error('AI processing failed:', error)
    return {
      chineseTitle: title,
      summary: '处理失败，暂无摘要'
    }
  }
}