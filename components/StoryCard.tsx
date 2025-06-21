import { useState, useEffect } from 'react'
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
  // 从用户管理器初始化状态
  useEffect(() => {
    setLiked(isLiked(story.id))
    setBookmarked(isBookmarked(story.id))
  }, [story.id, isLiked, isBookmarked])
  
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
    const newLikedState = toggleLike(story.id)
    setLiked(newLikedState)
  }

  const handleBookmark = () => {
    const newBookmarkedState = toggleBookmark(story.id)
    setBookmarked(newBookmarkedState)
  }

  return (
    <Card className="hover:shadow-sm transition-all duration-300 border-l-0 border-r-0 border-t-0 border-b-0 last:border-b animate-fadeIn hover:scale-[1.01] mobile-safe">
      <CardContent className="py-6 px-4 sm:px-6">
        <div className="space-y-4">
          {/* Title Section */}
          <div className="space-y-2">
            <h2 className="text-xl font-medium text-foreground leading-relaxed">
              <a 
                href={story.url || `https://news.ycombinator.com/item?id=${story.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors decoration-2 underline-offset-4 hover:underline"
              >
                {story.chineseTitle || story.title}
              </a>
            </h2>
            
            {/* Original Title if different */}
            {story.chineseTitle && story.chineseTitle !== story.title && (
              <h3 className="text-sm text-muted-foreground/80 font-normal italic leading-relaxed">
                <a 
                  href={story.url || `https://news.ycombinator.com/item?id=${story.id}`}
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
          {story.summary && story.summary !== '暂无摘要' && story.summary !== '正在处理中...' && (
            <div className="group">
              <a 
                href={story.url || `https://news.ycombinator.com/item?id=${story.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-muted-foreground hover:text-foreground transition-colors duration-200"
              >
                <p className="text-sm leading-relaxed line-height-loose tracking-wide indent-4">
                  {story.summary}
                </p>
              </a>
            </div>
          )}
            
            {/* Processing indicator */}
            {story.summary === '正在处理中...' && (
              <div className="mb-4">
                <Badge variant="outline" className="text-xs">
                  🤖 AI 正在生成中文摘要...
                </Badge>
              </div>
            )}
          
          {/* Meta Information & Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-border/30">
            <div className="flex items-center gap-2 sm:gap-4 text-xs text-muted-foreground/70 min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                <span className="font-medium">{story.by}</span>
              </div>
              
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>{formatTime(story.time)}</span>
              </div>
              
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-foreground">{story.score}</span>
                <span>点</span>
              </div>
              
              {story.descendants && (
                <a 
                  href={`https://news.ycombinator.com/item?id=${story.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 hover:text-foreground transition-colors rounded-md px-2 py-1 hover:bg-accent/50"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span className="font-medium">{story.descendants}</span>
                </a>
              )}
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-1 flex-shrink-0">
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
              
              {story.url && (
                <Button variant="ghost" size="sm" asChild className="h-8 px-3 ml-1">
                  <a
                    href={story.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 hover:bg-accent/70"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline text-xs font-medium">
                      {getDomain(story.url)}
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