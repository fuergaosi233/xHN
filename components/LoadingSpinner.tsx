import { Card, CardContent } from '@/components/ui/card'
import { Loader2, Brain, Sparkles } from 'lucide-react'

interface LoadingSpinnerProps {
  message?: string
  variant?: 'default' | 'ai' | 'sparkle'
  size?: 'sm' | 'md' | 'lg'
}

export default function LoadingSpinner({ 
  message = '加载中...', 
  variant = 'default',
  size = 'md'
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  }

  const getSpinner = () => {
    const className = `${sizeClasses[size]} animate-spin`
    
    switch (variant) {
      case 'ai':
        return <Brain className={`${className} text-blue-500`} />
      case 'sparkle':
        return <Sparkles className={`${className} text-purple-500`} />
      default:
        return <Loader2 className={className} />
    }
  }

  const getPulsingDots = () => (
    <div className="flex space-x-1 justify-center items-center">
      <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
      <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
      <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
    </div>
  )

  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="relative">
          {getSpinner()}
          {variant === 'ai' && (
            <div className="absolute inset-0 animate-ping">
              <Brain className={`${sizeClasses[size]} text-blue-200 opacity-75`} />
            </div>
          )}
        </div>
        
        <div className="text-center space-y-2">
          <p className="text-muted-foreground text-sm font-medium">{message}</p>
          {getPulsingDots()}
        </div>
        
        {variant === 'ai' && (
          <div className="text-xs text-muted-foreground/70 text-center max-w-sm">
            <p>AI 正在智能分析内容...</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}