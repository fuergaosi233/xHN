'use client'

import { useState, useEffect } from 'react'
import { Settings, Info, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { ModelConfig } from '@/lib/config'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

interface ConfigData {
  currentModel: ModelConfig
  validation: { valid: boolean; error?: string }
  availableModels: Record<string, ModelConfig>
  environment: {
    hasApiKey: boolean
    baseUrl: string
    model: string
  }
}

export default function ModelInfo() {
  const [configData, setConfigData] = useState<ConfigData | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchConfig()
  }, [])

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/config')
      const data = await response.json()
      if (data.success) {
        setConfigData(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch config:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return null
  }

  if (!configData) {
    return (
      <Card className="border-destructive">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-destructive">
            <XCircle className="w-4 h-4" />
            <span className="text-sm">无法获取模型配置信息</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  const { currentModel, validation, environment } = configData

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {validation.valid ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <XCircle className="w-5 h-5 text-destructive" />
            )}
            <div>
              <CardTitle className="text-base">
                {currentModel.name}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {currentModel.provider} • {validation.valid ? '配置正常' : '配置错误'}
              </p>
            </div>
            {validation.valid ? (
              <Badge variant="secondary">正常</Badge>
            ) : (
              <Badge variant="destructive">错误</Badge>
            )}
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">
              {showDetails ? '隐藏详情' : '显示详情'}
            </span>
            {showDetails ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </div>
        
        {!validation.valid && (
          <div className="mt-2 text-sm text-destructive">
            ⚠️ {validation.error}
          </div>
        )}
      </CardHeader>

      {/* Details Panel */}
      {showDetails && (
        <CardContent className="pt-0">
          <Separator className="mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4" />
                <h4 className="font-medium">当前配置</h4>
              </div>
              <div className="space-y-2 text-muted-foreground">
                <div className="flex justify-between">
                  <span>API Base URL:</span>
                  <span className="font-mono text-xs break-all">{environment.baseUrl}</span>
                </div>
                <div className="flex justify-between">
                  <span>模型:</span>
                  <span className="font-mono text-xs">{environment.model}</span>
                </div>
                <div className="flex justify-between">
                  <span>API Key:</span>
                  <Badge variant={environment.hasApiKey ? "secondary" : "destructive"} className="text-xs">
                    {environment.hasApiKey ? '已配置' : '未配置'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>最大 Token:</span>
                  <span>{currentModel.maxTokens}</span>
                </div>
                <div className="flex justify-between">
                  <span>Temperature:</span>
                  <span>{currentModel.temperature}</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-medium">模型描述</h4>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {currentModel.description}
              </p>
              
              {!validation.valid && (
                <Card className="border-amber-200 bg-amber-50">
                  <CardContent className="p-3">
                    <p className="text-amber-800 text-xs">
                      <strong>配置提示:</strong> 请检查 .env.local 文件中的环境变量配置。
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}