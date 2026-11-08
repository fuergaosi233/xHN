import { useState, useEffect, useRef, memo } from 'react'
import { ProcessedItem } from '@/lib/hackernews'
import { MessageCircle, Heart, Bookmark, Sparkles, AlertCircle, Images } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatTime, getDomain, hnUrl, imageSrc, storyState } from '@/lib/story-format'

export type FeedView = 'grid' | 'list'

interface StoryCardProps {
  story: ProcessedItem
  index: number
  view: FeedView
  selected: boolean
  liked: boolean
  bookmarked: boolean
  read: boolean
  onOpen: (index: number) => void
  onVisit: (story: ProcessedItem, type: string) => void
  onToggleLike: (story: ProcessedItem) => void
  onToggleBookmark: (story: ProcessedItem) => void
}

// 配图加载失败（源站下线/拒绝代理）时整块隐藏，不留破图
export function StoryImage({ src, alt, width, className, sizes }: { src: string; alt: string; width: number; className?: string; sizes?: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) return null
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imageSrc(src, width)}
      srcSet={`${imageSrc(src, 480)} 480w, ${imageSrc(src, 960)} 960w, ${imageSrc(src, 1600)} 1600w`}
      sizes={sizes}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={className}
    />
  )
}

function StoryCard({ story, index, view, selected, liked, bookmarked, read, onOpen, onVisit, onToggleLike, onToggleBookmark }: StoryCardProps) {
  const [flash, setFlash] = useState(false)
  const [coverFailed, setCoverFailed] = useState(false)
  const previousStoryRef = useRef<ProcessedItem | null>(null)

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

  const href = story.url || hnUrl(story.id)
  const domain = getDomain(story.url)
  const { isProcessing, isUnfetchable, hasSummary, hasChinese, notice } = storyState(story)
  const cover = !coverFailed ? story.images?.[0] : undefined
  const imageCount = story.images?.length || 0
  const tags = (story.tags || []).slice(0, 3)

  const stop = (e: React.MouseEvent) => e.stopPropagation()

  const meta = (
    <div className="flex items-center gap-x-1.5 min-w-0 text-[0.75rem] text-muted-foreground">
      <span className="tabular-nums text-muted-foreground/70">{index + 1}</span>
      <span className="text-border">·</span>
      <span className="truncate">{domain}</span>
      {story.category && (
        <span className="shrink-0 ml-1 px-1.5 py-px rounded-md bg-muted text-[0.7rem] text-foreground/70">
          {story.category}
        </span>
      )}
    </div>
  )

  const title = (
    <h2 className={cn('headline text-foreground', view === 'grid' ? 'text-[1.06rem] leading-snug' : 'text-[1.02rem] sm:text-[1.08rem] leading-snug', read && 'text-foreground/55')}>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={e => { stop(e); onVisit(story, 'title') }}
        className="decoration-transparent hover:text-link transition-colors"
      >
        {story.chineseTitle || story.title}
      </a>
    </h2>
  )

  const summary = isProcessing ? (
    <p className="inline-flex items-center gap-2 text-[0.85rem] text-muted-foreground">
      <Sparkles className="w-3.5 h-3.5 animate-pulse" />
      AI 正在阅读原文、挑选配图…
    </p>
  ) : isUnfetchable ? (
    <p className="flex items-start gap-1.5 text-[0.85rem] leading-relaxed text-muted-foreground/80">
      <AlertCircle className="w-3.5 h-3.5 mt-[0.2rem] shrink-0" />
      <span className="line-clamp-2">{notice}</span>
    </p>
  ) : hasSummary ? (
    <p className={cn(
      'text-[0.9rem] leading-[1.7] text-muted-foreground',
      view === 'list' ? 'line-clamp-2' : cover ? 'line-clamp-4' : 'line-clamp-[7]'
    )}>
      {story.summary}
    </p>
  ) : null

  const stats = (
    <div className="flex items-center gap-x-2.5 text-[0.75rem] text-muted-foreground tabular-nums">
      <span className="font-medium text-foreground/70">{story.score} 点</span>
      {typeof story.descendants === 'number' && story.descendants > 0 && (
        <a
          href={hnUrl(story.id)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => { stop(e); onVisit(story, 'comments') }}
          className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
        >
          <MessageCircle className="w-3 h-3" />
          {story.descendants}
        </a>
      )}
      <span>{formatTime(story.time)}</span>
    </div>
  )

  const actions = (
    <div className="flex items-center -mr-1.5">
      <button
        onClick={e => { stop(e); onToggleLike(story) }}
        aria-label="喜欢"
        className={cn(
          'h-7 w-7 inline-flex items-center justify-center rounded-full text-muted-foreground/70 hover:text-rose-500 hover:bg-rose-500/10 transition-colors',
          liked && 'text-rose-500'
        )}
      >
        <Heart className={cn('w-[0.95rem] h-[0.95rem]', liked && 'fill-current')} />
      </button>
      <button
        onClick={e => { stop(e); onToggleBookmark(story) }}
        aria-label="收藏"
        className={cn(
          'h-7 w-7 inline-flex items-center justify-center rounded-full text-muted-foreground/70 hover:text-link hover:bg-link/10 transition-colors',
          bookmarked && 'text-link'
        )}
      >
        <Bookmark className={cn('w-[0.95rem] h-[0.95rem]', bookmarked && 'fill-current')} />
      </button>
    </div>
  )

  const tagRow = tags.length > 0 && (
    <div className="flex flex-wrap gap-1">
      {tags.map(tag => (
        <span key={tag} className="px-1.5 py-px rounded text-[0.7rem] text-muted-foreground border border-hairline">
          {tag}
        </span>
      ))}
    </div>
  )

  if (view === 'list') {
    return (
      <article
        data-story-index={index}
        onClick={() => onOpen(index)}
        className={cn(
          'group relative flex gap-4 px-3 sm:px-4 py-4 rounded-xl cursor-pointer transition-colors hover:bg-muted/60 animate-fadeIn mobile-safe',
          selected && 'bg-muted/70 ring-1 ring-border',
          flash && 'animate-contentUpdate'
        )}
        style={{ animationDelay: `${Math.min(index % 20, 8) * 30}ms` }}
      >
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          {meta}
          {title}
          {summary}
          <div className="flex items-center justify-between gap-3 pt-0.5">
            <div className="flex items-center gap-3 min-w-0">
              {stats}
              <div className="hidden md:block">{tagRow}</div>
            </div>
            {actions}
          </div>
        </div>
        {cover && (
          <div className="relative shrink-0 self-start w-24 sm:w-40 aspect-[4/3] sm:aspect-[16/10] rounded-lg overflow-hidden bg-muted border border-hairline">
            <StoryImage
              src={cover.url}
              alt={cover.caption || story.chineseTitle || story.title}
              width={480}
              sizes="160px"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
            {imageCount > 1 && (
              <span className="absolute bottom-1 right-1 inline-flex items-center gap-0.5 px-1 rounded bg-black/55 text-white text-[0.65rem]">
                <Images className="w-2.5 h-2.5" />{imageCount}
              </span>
            )}
          </div>
        )}
      </article>
    )
  }

  return (
    <article
      data-story-index={index}
      onClick={() => onOpen(index)}
      className={cn(
        'group relative flex flex-col rounded-2xl overflow-hidden cursor-pointer bg-card border border-hairline transition-all duration-200 hover:border-border hover:shadow-[0_6px_24px_-12px_rgba(0,0,0,0.18)] animate-fadeIn mobile-safe',
        selected && 'ring-2 ring-link/50 border-transparent',
        flash && 'animate-contentUpdate'
      )}
      style={{ animationDelay: `${Math.min(index % 20, 8) * 30}ms` }}
    >
      {cover && (
        <div className="relative aspect-[2/1] bg-muted overflow-hidden border-b border-hairline">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageSrc(cover.url, 960)}
            srcSet={`${imageSrc(cover.url, 480)} 480w, ${imageSrc(cover.url, 960)} 960w`}
            sizes="(min-width: 1280px) 30vw, (min-width: 768px) 45vw, 100vw"
            alt={cover.caption || story.chineseTitle || story.title}
            loading="lazy"
            decoding="async"
            onError={() => setCoverFailed(true)}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
          {imageCount > 1 && (
            <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/55 backdrop-blur text-white text-[0.7rem]">
              <Images className="w-3 h-3" />{imageCount}
            </span>
          )}
        </div>
      )}
      <div className="flex-1 flex flex-col gap-2 p-4">
        {meta}
        {title}
        {hasChinese && (
          <p className="text-[0.78rem] text-muted-foreground/70 leading-snug line-clamp-1">{story.title}</p>
        )}
        {summary}
        {tagRow}
        <div className="mt-auto pt-1.5 flex items-center justify-between">
          {stats}
          {actions}
        </div>
      </div>
    </article>
  )
}

export default memo(StoryCard)
