import OpenAI from 'openai'
import { getCurrentModelConfig, validateModelConfig } from './config'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
})

export interface AIProcessResult {
  chineseTitle: string
  summary: string
  category?: string
  tags?: string[]
}

export async function processWithAI(title: string, url?: string): Promise<AIProcessResult> {
  try {
    // 验证配置
    const configValidation = validateModelConfig()
    if (!configValidation.valid) {
      throw new Error(`配置错误: ${configValidation.error}`)
    }
    
    const modelConfig = getCurrentModelConfig()
    
    // 获取可配置的 Prompt
    const systemPrompt = process.env.AI_SYSTEM_PROMPT || 
      "你是一个专业的技术新闻翻译和摘要助手，擅长将英文技术新闻翻译成准确、流畅的中文。"
    
    const userPromptTemplate = process.env.AI_USER_PROMPT_TEMPLATE || `
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
    const prompt = userPromptTemplate
      .replace('{title}', title)
      .replace('{url_info}', urlInfo)

    const completion = await openai.chat.completions.create({
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
      max_tokens: 500,
      temperature: modelConfig.temperature
    })

    // 处理deepseek-r1等推理模型的特殊响应格式
    const message = completion.choices[0]?.message
    let response = message?.content || ''
    
    // 如果content为空但有reasoning，尝试从reasoning中提取
    if (!response && message?.reasoning) {
      response = message.reasoning
    }
    
    // 改进的解析逻辑，支持多行匹配
    const chineseTitleMatch = response.match(/中文标题[：:]\s*(.+?)(?=\n摘要|\n分类|$)/s)
    const summaryMatch = response.match(/摘要[：:]\s*(.+?)(?=\n分类|\n标签|$)/s)
    const categoryMatch = response.match(/分类[：:]\s*(.+?)(?=\n标签|$)/s)
    const tagsMatch = response.match(/标签[：:]\s*(.+?)$/s)
    
    const chineseTitle = chineseTitleMatch?.[1]?.trim() || title
    const summary = summaryMatch?.[1]?.trim() || '暂无摘要'
    const category = categoryMatch?.[1]?.trim() || undefined
    const tags = tagsMatch?.[1]?.trim()?.split(',').map(tag => tag.trim()).filter(tag => tag) || undefined
    
    return {
      chineseTitle,
      summary,
      category,
      tags
    }
  } catch (error) {
    console.error('AI processing failed:', error)
    return {
      chineseTitle: title,
      summary: '处理失败，暂无摘要'
    }
  }
}