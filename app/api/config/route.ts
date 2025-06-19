import { NextResponse } from 'next/server'
import { getCurrentModelConfig, validateModelConfig, MODEL_CONFIGS } from '@/lib/config'

export async function GET() {
  try {
    const validation = validateModelConfig()
    const currentConfig = getCurrentModelConfig()
    
    return NextResponse.json({
      success: true,
      data: {
        currentModel: currentConfig,
        validation,
        availableModels: MODEL_CONFIGS,
        environment: {
          hasApiKey: !!process.env.OPENAI_API_KEY,
          baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
          model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo'
        }
      }
    })
  } catch (error) {
    console.error('Config API Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get configuration',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}