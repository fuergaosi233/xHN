'use client'

import { useState, useEffect } from 'react'
import { Moon, Sun, Monitor } from 'lucide-react'
import { useTheme } from '@/lib/hooks/useTheme'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // 避免水合错误
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <span className="h-9 w-9 inline-flex items-center justify-center">
        <span className="h-[1.05rem] w-[1.05rem] bg-muted animate-pulse rounded-full" />
      </span>
    )
  }

  const cycleTheme = () => {
    if (theme === 'light') {
      setTheme('dark')
    } else if (theme === 'dark') {
      setTheme('system')
    } else {
      setTheme('light')
    }
  }

  const getIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun className="h-[1.05rem] w-[1.05rem]" />
      case 'dark':
        return <Moon className="h-[1.05rem] w-[1.05rem]" />
      case 'system':
        return <Monitor className="h-[1.05rem] w-[1.05rem]" />
      default:
        return <Sun className="h-[1.05rem] w-[1.05rem]" />
    }
  }

  const getTooltip = () => {
    switch (theme) {
      case 'light':
        return '切换到暗色模式'
      case 'dark':
        return '切换到跟随系统'
      case 'system':
        return '切换到亮色模式'
      default:
        return '切换主题'
    }
  }

  return (
    <button
      onClick={cycleTheme}
      className="h-9 w-9 inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      title={getTooltip()}
      aria-label={getTooltip()}
    >
      {getIcon()}
    </button>
  )
}