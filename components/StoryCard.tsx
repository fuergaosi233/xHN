import { useState, useEffect, useRef } from 'react'
import { ProcessedItem } from '@/lib/hackernews'
import { ArrowUpRight, MessageCircle, Heart, Bookmark, Sparkles, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStoryActions } from '@/lib/user'
import { useUmami } from '@/components/Analytics'

interface StoryCardProps {
  story: ProcessedItem
  index: number
}

const PLACEHOLDER_SUMMARY = new Set(['暂无摘要', '正在处理中...'])

export default function StoryCard({ story, index }: StoryCardProps) {
  const { isLiked, isBookmarked, toggleLike, toggleBookmark } = useStoryActions()
  const { track } = useUmami()
  const [liked, setLiked] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)
  const [flash, setFlash] = useState(false)
  const previousStoryRef = useRef<ProcessedItem | null>(null)

  useEffect(() => {
    setLiked(isLiked(story.id))
    setBookmarked(isBookmarked(story.id))
  }, [story.id, isLiked, isBookmarked])

  // 内容更新时轻微高亮一下，不做浮夸动画
  useEffect(() => {
    const prev = previousStoryRef.current
    if (prev && prev.id === story.id && story.isUpdated) {
      const changed = prev.chineseTitle !== story.chineseTitle || prev.summary !== story.summary
      if (changed) {
        setFlash(true)
        const t = setTimeout(() => setFlash(false), 1600)
        return () => clearTimeout(t)
      }
    }
    previousStoryRef.current = story
  }, [story.chineseTitle, story.summary, story.isUpdated, story.id])

  const formatTime = (timestamp: number) => {
    const diff = Date.now() / 1000 - timestamp
    if (diff < 3600) return `${Math.max(1, Math.floor(diff / 60))} 分钟前`
    if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`
    return `${Math.floor(diff / 86400)} 天前`
  }

  const getDomain = (url?: string) => {
    if (!url) return 'news.ycombinator.com'
    try {
      return new URL(url).hostname.replace(/^www\./, '')
    } catch {
      return ''
    }
  }

  const href = story.url || `https://news.ycombinator.com/item?id=${story.id}`
  const domain = getDomain(story.url)
  const monogram = (domain[0] || 'H').toUpperCase()

  const hasRealSummary = story.summary && !PLACEHOLDER_SUMMARY.has(story.summary)
  const isProcessing = story.summary === '正在处理中...'
  const isUnfetchable = !!story.summary && story.summary.includes('无法抓取')
  const hasChinese = story.chineseTitle && story.chineseTitle !== story.title

  const handleLike = () => {
    const s = toggleLike(story.id)
    setLiked(s)
    track('story_like', { story_id: story.id, action: s ? 'like' : 'unlike' })
  }
  const handleBookmark = () => {
    const s = toggleBookmark(story.id)
    setBookmarked(s)
    track('story_bookmark', { story_id: story.id, action: s ? 'bookmark' : 'unbookmark' })
  }
  const handleClick = (type: string) =>
    track('story_click', { story_id: story.id, click_type: type, story_position: index + 1 })

  return (
    <article
      className={cn(
        'group relative py-7 animate-fadeIn rounded-2xl transition-colors mobile-safe',
        flash && 'animate-contentUpdate'
      )}
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
    >
      <div className="flex gap-4">
        {/* 域名字母牌，给列表视觉节奏（无文章图时的替代锚点） */}
        <div className="hidden sm:flex shrink-0 mt-1">
          <div className="w-10 h-10 rounded-xl bg-muted border border-hairline flex items-center justify-center text-[0.95rem] font-semibold text-muted-foreground select-none">
            {monogram}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          {/* 元信息行 */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.78rem] text-muted-foreground mb-2">
            <span className="truncate max-w-[45%]">{domain}</span>
            <span className="text-border">·</span>
            <span className="font-medium text-foreground/70">{story.score} 点</span>
            {typeof story.descendants === 'number' && story.descendants > 0 && (
              <>
                <span className="text-border">·</span>
                <a
                  href={`https://news.ycombinator.com/item?id=${story.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  <MessageCircle className="w-3 h-3" />
                  {story.descendants}
                </a>
              </>
            )}
            <span className="text-border">·</span>
            <span>{formatTime(story.time)}</span>
          </div>

          {/* 标题 */}
          <h2 className="headline text-[1.32rem] sm:text-[1.4rem] text-foreground">
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors group-hover:text-link decoration-transparent"
              onClick={() => handleClick('title')}
            >
              {story.chineseTitle || story.title}
            </a>
          </h2>

          {/* 英文原标题 */}
          {hasChinese && (
            <p className="mt-1.5 text-[0.9rem] text-muted-foreground/80 leading-snug">
              {story.title}
            </p>
          )}

          {/* 摘要 / 状态 */}
          {isProcessing ? (
            <p className="mt-3 inline-flex items-center gap-2 text-[0.9rem] text-muted-foreground">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              AI 正在生成中文摘要…
            </p>
          ) : isUnfetchable ? (
            <p className="mt-3 inline-flex items-start gap-2 reading-body !text-[0.95rem] text-muted-foreground/80">
              <AlertCircle className="w-4 h-4 mt-1 shrink-0" />
              <span>{story.summary}</span>
            </p>
          ) : hasRealSummary ? (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => handleClick('summary')}
              className="block mt-3"
            >
              <p className="reading-body transition-colors group-hover:text-foreground/85">
                {story.summary}
              </p>
            </a>
          ) : null}

          {/* 操作区：桌面端 hover 才浮现，移动端常显但低调 */}
          <div className="flex items-center gap-1 mt-4 -ml-2 sm:opacity-0 sm:group-hover:opacity-100 sm:-translate-y-0.5 sm:group-hover:translate-y-0 transition-all duration-200">
            <button
              onClick={handleLike}
              aria-label="喜欢"
              className={cn(
                'h-8 w-8 inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors',
                liked && 'text-rose-500'
              )}
            >
              <Heart className={cn('w-[1.05rem] h-[1.05rem]', liked && 'fill-current')} />
            </button>
            <button
              onClick={handleBookmark}
              aria-label="收藏"
              className={cn(
                'h-8 w-8 inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-link hover:bg-link/10 transition-colors',
                bookmarked && 'text-link'
              )}
            >
              <Bookmark className={cn('w-[1.05rem] h-[1.05rem]', bookmarked && 'fill-current')} />
            </button>
            {story.url && (
              <a
                href={story.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => handleClick('external')}
                className="h-8 pl-2.5 pr-3 ml-0.5 inline-flex items-center gap-1 rounded-full text-[0.8rem] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                阅读原文
                <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}
