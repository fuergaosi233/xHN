export interface ModelConfig {
  name: string
  provider: string
  baseUrl: string
  model: string
  maxTokens: number
  temperature: number
  description: string
}

export const MODEL_CONFIGS: Record<string, ModelConfig> = {
  'doubao-lite-4k': {
    name: '豆包1.6 Lite 4K',
    provider: '火山方舟',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    model: 'doubao-lite-4k',
    maxTokens: 300,
    temperature: 0.7,
    description: '火山方舟豆包1.6轻量版，速度快成本极低，推荐日常使用'
  },
  'doubao-pro-4k': {
    name: '豆包1.6 Pro 4K',
    provider: '火山方舟',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    model: 'doubao-pro-4k',
    maxTokens: 300,
    temperature: 0.7,
    description: '火山方舟豆包1.6专业版，质量更高，适合重要内容处理'
  },
  'doubao-pro-32k': {
    name: '豆包1.6 Pro 32K',
    provider: '火山方舟',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    model: 'doubao-pro-32k',
    maxTokens: 300,
    temperature: 0.7,
    description: '火山方舟豆包1.6长文本版，支持32K上下文，适合长文章处理'
  },
  'openai-gpt35': {
    name: 'GPT-3.5 Turbo',
    provider: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-3.5-turbo',
    maxTokens: 300,
    temperature: 0.7,
    description: 'OpenAI 官方 GPT-3.5，备用选择'
  },
  'openai-gpt4': {
    name: 'GPT-4',
    provider: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',  
    model: 'gpt-4',
    maxTokens: 300,
    temperature: 0.7,
    description: 'OpenAI GPT-4，质量更高，成本较高'
  },
  'openai-gpt4o': {
    name: 'GPT-4o',
    provider: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o',
    maxTokens: 300,
    temperature: 0.7,
    description: 'OpenAI 最新的 GPT-4o 模型，性能优异'
  },
  'deepseek-chat': {
    name: 'DeepSeek Chat',
    provider: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    maxTokens: 300,
    temperature: 0.7,
    description: '深度求索的对话模型，备用选择'
  },
  'moonshot-8k': {
    name: 'Moonshot v1 8K',
    provider: 'Moonshot AI',
    baseUrl: 'https://api.moonshot.cn/v1',
    model: 'moonshot-v1-8k',
    maxTokens: 300,
    temperature: 0.7,
    description: 'Kimi 8K 上下文模型'
  },
  'moonshot-32k': {
    name: 'Moonshot v1 32K',
    provider: 'Moonshot AI',
    baseUrl: 'https://api.moonshot.cn/v1',
    model: 'moonshot-v1-32k',
    maxTokens: 300,
    temperature: 0.7,
    description: 'Kimi 32K 上下文模型'
  },
  'zhipuai-glm4': {
    name: 'GLM-4',
    provider: '智谱AI',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    model: 'glm-4',
    maxTokens: 300,
    temperature: 0.7,
    description: '智谱AI GLM-4 模型'
  },
  'claude-sonnet': {
    name: 'Claude 3 Sonnet',
    provider: 'Anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    model: 'claude-3-sonnet-20240229',
    maxTokens: 300,
    temperature: 0.7,
    description: 'Anthropic Claude 3 Sonnet (需要兼容接口)'
  }
}

export function getCurrentModelConfig(): ModelConfig {
  const baseUrl = process.env.OPENAI_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3'
  const model = process.env.OPENAI_MODEL || 'doubao-lite-4k'
  
  // 尝试从预定义配置中找到匹配的配置
  for (const config of Object.values(MODEL_CONFIGS)) {
    if (config.baseUrl === baseUrl && config.model === model) {
      return config
    }
  }
  
  // 如果没有找到预定义配置，返回自定义配置
  return {
    name: 'Custom Model',
    provider: 'Custom',
    baseUrl,
    model,
    maxTokens: 300,
    temperature: 0.7,
    description: '自定义模型配置'
  }
}

export function validateModelConfig(): { valid: boolean; error?: string } {
  const apiKey = process.env.OPENAI_API_KEY
  const baseUrl = process.env.OPENAI_BASE_URL
  const model = process.env.OPENAI_MODEL
  
  if (!apiKey) {
    return { valid: false, error: '缺少 OPENAI_API_KEY 环境变量' }
  }
  
  if (!baseUrl) {
    return { valid: false, error: '缺少 OPENAI_BASE_URL 环境变量' }
  }
  
  if (!model) {
    return { valid: false, error: '缺少 OPENAI_MODEL 环境变量' }
  }
  
  return { valid: true }
}