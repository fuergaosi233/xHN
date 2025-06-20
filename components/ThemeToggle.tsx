'use client'

import { useState, useEffect } from 'react'
import { Moon, Sun, Monitor } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
        <div className="h-4 w-4 bg-muted animate-pulse rounded" />
      </Button>
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
        return <Sun className="h-4 w-4" />
      case 'dark':
        return <Moon className="h-4 w-4" />
      case 'system':
        return <Monitor className="h-4 w-4" />
      default:
        return <Sun className="h-4 w-4" />
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
    <Button
      variant="ghost"
      size="sm"
      onClick={cycleTheme}
      className="h-8 w-8 p-0 hover:bg-accent/70 transition-all duration-200"
      title={getTooltip()}
    >
      <div className="transition-transform duration-300 hover:scale-110">
        {getIcon()}
      </div>
    </Button>
  )
}