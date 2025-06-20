import { cn } from "@/lib/utils"
import { Loader2, RefreshCw, Download, Upload, Zap } from "lucide-react"

interface LoadingAnimationProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

// 旋转加载动画
export function SpinningLoader({ className, size = 'md' }: LoadingAnimationProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  }
  
  return (
    <Loader2 className={cn("animate-spin", sizeClasses[size], className)} />
  )
}

// 脉冲动画
export function PulseLoader({ className, size = 'md' }: LoadingAnimationProps) {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  }
  
  return (
    <div className={cn("flex space-x-1", className)}>
      <div className={cn("bg-primary rounded-full animate-pulse", sizeClasses[size])} style={{ animationDelay: '0ms' }} />
      <div className={cn("bg-primary rounded-full animate-pulse", sizeClasses[size])} style={{ animationDelay: '150ms' }} />
      <div className={cn("bg-primary rounded-full animate-pulse", sizeClasses[size])} style={{ animationDelay: '300ms' }} />
    </div>
  )
}

// 弹跳动画
export function BounceLoader({ className, size = 'md' }: LoadingAnimationProps) {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  }
  
  return (
    <div className={cn("flex space-x-1", className)}>
      <div className={cn("bg-primary rounded-full animate-bounce", sizeClasses[size])} style={{ animationDelay: '0ms' }} />
      <div className={cn("bg-primary rounded-full animate-bounce", sizeClasses[size])} style={{ animationDelay: '100ms' }} />
      <div className={cn("bg-primary rounded-full animate-bounce", sizeClasses[size])} style={{ animationDelay: '200ms' }} />
    </div>
  )
}

// 刷新动画
export function RefreshLoader({ className, size = 'md' }: LoadingAnimationProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  }
  
  return (
    <RefreshCw className={cn("animate-spin", sizeClasses[size], className)} />
  )
}

// 下载动画
export function DownloadLoader({ className, size = 'md' }: LoadingAnimationProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  }
  
  return (
    <div className={cn("relative", className)}>
      <Download className={cn("animate-bounce", sizeClasses[size])} />
      <div className="absolute inset-0 animate-ping opacity-30">
        <Download className={sizeClasses[size]} />
      </div>
    </div>
  )
}

// 上传动画
export function UploadLoader({ className, size = 'md' }: LoadingAnimationProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  }
  
  return (
    <div className={cn("relative", className)}>
      <Upload className={cn("animate-bounce", sizeClasses[size])} />
      <div className="absolute inset-0 animate-ping opacity-30">
        <Upload className={sizeClasses[size]} />
      </div>
    </div>
  )
}

// AI 处理动画
export function AIProcessingLoader({ className, size = 'md' }: LoadingAnimationProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  }
  
  return (
    <div className={cn("relative", className)}>
      <Zap className={cn("animate-pulse text-blue-500", sizeClasses[size])} />
      <div className="absolute inset-0 animate-ping">
        <Zap className={cn("text-blue-300 opacity-50", sizeClasses[size])} />
      </div>
      <div className="absolute inset-0 animate-spin [animation-duration:3s]">
        <div className={cn("border-2 border-transparent border-t-blue-400 rounded-full", sizeClasses[size])} />
      </div>
    </div>
  )
}

// 渐变波浪动画
export function WaveLoader({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-end justify-center space-x-1", className)}>
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="w-1 bg-primary rounded-full animate-pulse"
          style={{
            height: `${Math.random() * 20 + 10}px`,
            animationDelay: `${i * 0.1}s`,
            animationDuration: '1s'
          }}
        />
      ))}
    </div>
  )
}