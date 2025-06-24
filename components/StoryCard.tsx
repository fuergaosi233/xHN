import { useState, useEffect, useRef } from 'react'
import { ProcessedItem } from '@/lib/hackernews'
import { ExternalLink, Clock, User, MessageCircle, Heart, Bookmark } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { useStoryActions } from '@/lib/user'
import { useUmami } from '@/components/Analytics'

interface StoryCardProps {
  story: ProcessedItem
  index: number
}

export default function StoryCard({ story, index }: StoryCardProps) {
  const { isLiked, isBookmarked, toggleLike, toggleBookmark } = useStoryActions()
  const { track } = useUmami()
  const [liked, setLiked] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [showUpdateBadge, setShowUpdateBadge] = useState(false)
  const previousStoryRef = useRef<ProcessedItem | null>(null)
  
  // 从用户管理器初始化状态
  useEffect(() => {
    setLiked(isLiked(story.id))
    setBookmarked(isBookmarked(story.id))
  }, [story.id, isLiked, isBookmarked])

  // 检测内容更新并触发动画
  useEffect(() => {
    const previousStory = previousStoryRef.current
    if (previousStory && previousStory.id === story.id) {
      // 检测标题或摘要是否发生变化
      const titleChanged = previousStory.chineseTitle !== story.chineseTitle
      const summaryChanged = previousStory.summary !== story.summary
      
      if ((titleChanged || summaryChanged) && story.isUpdated) {
        setIsAnimating(true)
        setShowUpdateBadge(true)
        
        // 动画结束后重置状态
        setTimeout(() => {
          setIsAnimating(false)
        }, 600)
        
        // 更新徽章显示3秒后消失
        setTimeout(() => {
          setShowUpdateBadge(false)
        }, 3000)
      }
    }
    
    previousStoryRef.current = story
  }, [story.chineseTitle, story.summary, story.isUpdated])
  
  // 清理更新标记
  useEffect(() => {
    if (story.isUpdated && story.updatedAt) {
      const timeSinceUpdate = Date.now() - story.updatedAt
      if (timeSinceUpdate > 5000) { // 5秒后清理标记
        // 这里可以通过父组件传递的回调来清理标记
        // 或者依赖外部状态管理
      }
    }
  }, [story.isUpdated, story.updatedAt])
  
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
    
    // 追踪点赞事件
    track('story_like', {
      story_id: story.id,
      story_title: story.title,
      action: newLikedState ? 'like' : 'unlike'
    })
  }

  const handleBookmark = () => {
    const newBookmarkedState = toggleBookmark(story.id)
    setBookmarked(newBookmarkedState)
    
    // 追踪收藏事件
    track('story_bookmark', {
      story_id: story.id,
      story_title: story.title,
      action: newBookmarkedState ? 'bookmark' : 'unbookmark'
    })
  }

  const handleStoryClick = (type: 'title' | 'summary' | 'external') => {
    // 追踪文章点击事件
    track('story_click', {
      story_id: story.id,
      story_title: story.title,
      click_type: type,
      story_position: index + 1
    })
  }

  const handleCommentClick = () => {
    // 追踪评论点击事件
    track('story_comment_click', {
      story_id: story.id,
      story_title: story.title,
      comment_count: story.descendants
    })
  }

  return (
    <Card className={cn(
      "hover:shadow-sm transition-all duration-300 border-l-0 border-r-0 border-t-0 border-b-0 last:border-b animate-fadeIn hover:scale-[1.01] mobile-safe",
      isAnimating && "animate-contentUpdate animate-glow",
      story.isUpdated && "ring-2 ring-primary/30 ring-offset-2 ring-offset-background"
    )}>
      <CardContent className="py-6 px-4 sm:px-6 relative">
        {/* 更新徽章 */}
        {showUpdateBadge && (
          <div className="absolute top-2 right-2 z-10">
            <Badge 
              variant="default" 
              className="animate-bounce bg-primary text-primary-foreground text-xs px-2 py-1 shadow-lg"
            >
              ✨ 已更新
            </Badge>
          </div>
        )}
        
        <div className="space-y-4">
          {/* Title Section */}
          <div className="space-y-2">
            <h2 className={cn(
              "text-xl font-medium text-foreground leading-relaxed transition-all duration-500",
              isAnimating && "scale-[1.02] text-primary"
            )}>
              <a 
                href={story.url || `https://news.ycombinator.com/item?id=${story.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors decoration-2 underline-offset-4 hover:underline"
                onClick={() => handleStoryClick('title')}
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
            <div className={cn(
              "group transition-all duration-500",
              isAnimating && "bg-accent/30 rounded-lg p-3 -m-3 shadow-sm"
            )}>
              <a 
                href={story.url || `https://news.ycombinator.com/item?id=${story.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-muted-foreground hover:text-foreground transition-colors duration-200"
                onClick={() => handleStoryClick('summary')}
              >
                <p className={cn(
                  "text-sm leading-relaxed line-height-loose tracking-wide indent-4 transition-all duration-500",
                  isAnimating && "text-foreground font-medium"
                )}>
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
                  onClick={handleCommentClick}
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
                    onClick={() => handleStoryClick('external')}
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