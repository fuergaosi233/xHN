import { useState, useEffect, useRef } from 'react'
import { ProcessedItem } from '@/lib/hackernews'
import { ExternalLink, Clock, User, MessageCircle, Heart, Bookmark } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { useStoryActions } from '@/lib/user'

interface StoryCardProps {
  story: ProcessedItem
  index: number
}

export default function StoryCard({ story, index }: StoryCardProps) {
  const { isLiked, isBookmarked, toggleLike, toggleBookmark } = useStoryActions()
  const [liked, setLiked] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)
  const [currentStory, setCurrentStory] = useState<ProcessedItem>(story)
  const [isUpdating, setIsUpdating] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // 从用户管理器初始化状态
  useEffect(() => {
    setLiked(isLiked(currentStory.id))
    setBookmarked(isBookmarked(currentStory.id))
  }, [currentStory.id, isLiked, isBookmarked])

  // 单个卡片的自动更新逻辑
  useEffect(() => {
    const shouldAutoUpdate = currentStory.summary === '正在处理中...' || 
                           currentStory.summary === '暂无摘要' ||
                           !currentStory.chineseTitle ||
                           currentStory.chineseTitle === currentStory.title

    if (shouldAutoUpdate && !isUpdating) {
      // 开始定期检查这个story的更新
      intervalRef.current = setInterval(async () => {
        try {
          setIsUpdating(true)
          const response = await fetch(`/api/story/${currentStory.id}`)
          const data = await response.json()
          
          if (data.success && data.data) {
            const updatedStory = data.data
            // 检查是否有实质性更新
            const hasUpdate = updatedStory.summary !== currentStory.summary ||
                            updatedStory.chineseTitle !== currentStory.chineseTitle
            
            if (hasUpdate) {
              setCurrentStory(updatedStory)
              
              // 如果翻译完成，停止自动更新
              if (updatedStory.summary !== '正在处理中...' && 
                  updatedStory.summary !== '暂无摘要' &&
                  updatedStory.chineseTitle &&
                  updatedStory.chineseTitle !== updatedStory.title) {
                if (intervalRef.current) {
                  clearInterval(intervalRef.current)
                  intervalRef.current = null
                }
              }
            }
          }
        } catch (error) {
          console.error('Failed to update story:', error)
        } finally {
          setIsUpdating(false)
        }
      }, 10000) // 每10秒检查一次
    }

    // 清理函数
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [currentStory.summary, currentStory.chineseTitle, currentStory.title, currentStory.id, isUpdating])

  // 当父组件传入新的story时，更新本地状态
  useEffect(() => {
    setCurrentStory(story)
  }, [story])
  
  const formatTime = (timestamp: number) => {
    const now = Date.now() / 1000
    const diff = now - timestamp
    
    if (diff < 3600) {
      return `${Math.floor(diff / 60)} 分钟前`
    } else if (diff < 86400) {
      return `${Math.floor(diff / 3600)} 小时前`
    } else {
      return `${Math.floor(diff / 86400)} 天前`
    }
  }

  const getDomain = (url?: string) => {
    if (!url) return ''
    try {
      return new URL(url).hostname.replace('www.', '')
    } catch {
      return ''
    }
  }

  const handleLike = () => {
    const newLikedState = toggleLike(currentStory.id)
    setLiked(newLikedState)
  }

  const handleBookmark = () => {
    const newBookmarkedState = toggleBookmark(currentStory.id)
    setBookmarked(newBookmarkedState)
  }

  return (
    <Card className="hover:shadow-sm transition-all duration-300 border-l-0 border-r-0 border-t-0 border-b-0 last:border-b">
      <CardContent className="py-6 px-6">
        <div className="space-y-4">
          {/* Title Section */}
          <div className="space-y-2">
            <h2 className="text-xl font-medium text-foreground leading-relaxed">
              <a 
                href={currentStory.url || `https://news.ycombinator.com/item?id=${currentStory.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors decoration-2 underline-offset-4 hover:underline"
              >
                {currentStory.chineseTitle || currentStory.title}
              </a>
            </h2>
            
            {/* Original Title if different */}
            {currentStory.chineseTitle && currentStory.chineseTitle !== currentStory.title && (
              <h3 className="text-sm text-muted-foreground/80 font-normal italic leading-relaxed">
                <a 
                  href={currentStory.url || `https://news.ycombinator.com/item?id=${currentStory.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-muted-foreground transition-colors"
                >
                  “{story.title}”
                </a>
              </h3>
            )}
          </div>
          
          {/* Summary */}
          {currentStory.summary && currentStory.summary !== '暂无摘要' && currentStory.summary !== '正在处理中...' && (
            <div className="group">
              <a 
                href={currentStory.url || `https://news.ycombinator.com/item?id=${currentStory.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-muted-foreground hover:text-foreground transition-colors duration-200"
              >
                <p className="text-sm leading-relaxed line-height-loose tracking-wide indent-4">
                  {currentStory.summary}
                </p>
              </a>
            </div>
          )}
            
            {/* Processing indicator */}
            {currentStory.summary === '正在处理中...' && (
              <div className="mb-4">
                <Badge variant="outline" className="text-xs">
                  🤖 AI 正在生成中文摘要...
                </Badge>
              </div>
            )}
          
          {/* Meta Information & Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-border/30">
            <div className="flex items-center gap-4 text-xs text-muted-foreground/70">
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                <span className="font-medium">{currentStory.by}</span>
              </div>
              
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>{formatTime(currentStory.time)}</span>
              </div>
              
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-foreground">{currentStory.score}</span>
                <span>点</span>
              </div>
              
              {currentStory.descendants && (
                <a 
                  href={`https://news.ycombinator.com/item?id=${currentStory.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 hover:text-foreground transition-colors rounded-md px-2 py-1 hover:bg-accent/50"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span className="font-medium">{currentStory.descendants}</span>
                </a>
              )}
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLike}
                className={cn(
                  "h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600",
                  liked && "text-red-500 bg-red-50"
                )}
              >
                <Heart className={cn("w-4 h-4", liked && "fill-current")} />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBookmark}
                className={cn(
                  "h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600",
                  bookmarked && "text-blue-500 bg-blue-50"
                )}
              >
                <Bookmark className={cn("w-4 h-4", bookmarked && "fill-current")} />
              </Button>
              
              {currentStory.url && (
                <Button variant="ghost" size="sm" asChild className="h-8 px-3 ml-1">
                  <a
                    href={currentStory.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 hover:bg-accent/70"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline text-xs font-medium">
                      {getDomain(currentStory.url)}
                    </span>
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}