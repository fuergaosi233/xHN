import { useEffect, useRef, useState } from 'react'
import { ProcessedItem } from '@/lib/hackernews'
import { X, ChevronUp, ChevronDown, ArrowUpRight, MessageCircle, Heart, Bookmark, Link2, Check, AlertCircle, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatTime, getDomain, hnUrl, imageSrc, storyState } from '@/lib/story-format'
import { StoryImage } from './StoryCard'

interface StoryDetailProps {
  story: ProcessedItem | null
  position: number
  total: number
  liked: boolean
  bookmarked: boolean
  onClose: () => void
  onPrev: () => void
  onNext: () => void
  onVisit: (story: ProcessedItem, type: string) => void
  onToggleLike: (story: ProcessedItem) => void
  onToggleBookmark: (story: ProcessedItem) => void
}

// 详情抽屉：桌面端从右侧滑出，移动端占满全屏。完整摘要 + 全部配图 + 操作
export default function StoryDetail({ story, position, total, liked, bookmarked, onClose, onPrev, onNext, onVisit, onToggleLike, onToggleBookmark }: StoryDetailProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)
  const open = !!story

  // 打开时锁住背景滚动
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  // 切换文章时回到顶部
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
    setCopied(false)
  }, [story?.id])

  if (!story) return null

  const href = story.url || hnUrl(story.id)
  const { isProcessing, isUnfetchable, hasSummary, hasChinese, notice } = storyState(story)
  const images = story.images || []

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${story.chineseTitle || story.title}\n${href}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // 剪贴板不可用（非 https 等）时静默
    }
  }

  const iconBtn = 'h-8 w-8 inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-30 disabled:pointer-events-none'

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={story.chineseTitle || story.title}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px] animate-overlayIn" onClick={onClose} />
      <aside className="absolute inset-y-0 right-0 w-full sm:w-[min(40rem,92vw)] bg-background sm:border-l border-hairline shadow-2xl flex flex-col animate-drawerIn">
        <div className="flex items-center justify-between h-14 px-3 sm:px-4 border-b border-hairline shrink-0">
          <div className="flex items-center gap-0.5">
            <button className={iconBtn} onClick={onPrev} disabled={position <= 0} aria-label="上一篇（K）">
              <ChevronUp className="w-4 h-4" />
            </button>
            <button className={iconBtn} onClick={onNext} disabled={position >= total - 1} aria-label="下一篇（J）">
              <ChevronDown className="w-4 h-4" />
            </button>
            <span className="ml-1.5 text-[0.78rem] text-muted-foreground tabular-nums">{position + 1} / {total}</span>
          </div>
          <button className={iconBtn} onClick={onClose} aria-label="关闭（Esc）">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain">
          <div className="px-5 sm:px-7 py-6">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.78rem] text-muted-foreground">
              <span>{getDomain(story.url)}</span>
              <span className="text-border">·</span>
              <span className="font-medium text-foreground/70">{story.score} 点</span>
              <span className="text-border">·</span>
              <span>{formatTime(story.time)}</span>
              <span className="text-border">·</span>
              <span>by {story.by}</span>
            </div>

            <h2 className="headline mt-3 text-[1.5rem] sm:text-[1.7rem] text-foreground">
              <a href={href} target="_blank" rel="noopener noreferrer" onClick={() => onVisit(story, 'detail_title')} className="hover:text-link transition-colors">
                {story.chineseTitle || story.title}
              </a>
            </h2>
            {hasChinese && (
              <p className="mt-2 text-[0.9rem] text-muted-foreground/80 leading-snug">{story.title}</p>
            )}

            {(story.category || (story.tags && story.tags.length > 0)) && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {story.category && (
                  <span className="px-2 py-0.5 rounded-md bg-muted text-[0.75rem] text-foreground/75">{story.category}</span>
                )}
                {story.tags?.map(tag => (
                  <span key={tag} className="px-2 py-0.5 rounded-md border border-hairline text-[0.75rem] text-muted-foreground">{tag}</span>
                ))}
              </div>
            )}

            {images[0] && (
              <figure className="mt-6">
                <a href={imageSrc(images[0].url, 1600)} target="_blank" rel="noopener noreferrer" className="block rounded-xl overflow-hidden bg-muted border border-hairline">
                  <StoryImage src={images[0].url} alt={images[0].caption || ''} width={960} sizes="(min-width: 640px) 40rem, 100vw" className="w-full max-h-[26rem] object-contain" />
                </a>
                {images[0].caption && (
                  <figcaption className="mt-2 text-[0.8rem] text-muted-foreground">{images[0].caption}</figcaption>
                )}
              </figure>
            )}

            <div className="mt-6">
              {isProcessing ? (
                <p className="inline-flex items-center gap-2 text-muted-foreground">
                  <Sparkles className="w-4 h-4 animate-pulse" />
                  AI 正在阅读原文、挑选配图…
                </p>
              ) : isUnfetchable ? (
                <p className="flex items-start gap-2 reading-body !text-[0.95rem]">
                  <AlertCircle className="w-4 h-4 mt-1 shrink-0" />
                  <span>{notice}</span>
                </p>
              ) : hasSummary ? (
                <p className="reading-body !text-foreground/85">{story.summary}</p>
              ) : null}
            </div>

            {images.length > 1 && (
              <div className={cn('mt-6 grid gap-3', images.length > 2 && 'sm:grid-cols-2')}>
                {images.slice(1).map(img => (
                  <figure key={img.url}>
                    <a href={imageSrc(img.url, 1600)} target="_blank" rel="noopener noreferrer" className="block rounded-xl overflow-hidden bg-muted border border-hairline">
                      <StoryImage src={img.url} alt={img.caption || ''} width={960} sizes="(min-width: 640px) 20rem, 100vw" className="w-full max-h-[20rem] object-contain" />
                    </a>
                    {img.caption && <figcaption className="mt-1.5 text-[0.78rem] text-muted-foreground">{img.caption}</figcaption>}
                  </figure>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0 border-t border-hairline px-4 sm:px-6 py-3 flex items-center gap-2 bg-background">
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onVisit(story, 'detail_external')}
            className="h-9 px-4 inline-flex items-center gap-1.5 rounded-full bg-foreground text-background text-[0.85rem] font-medium hover:opacity-85 transition-opacity"
          >
            阅读原文
            <ArrowUpRight className="w-4 h-4" />
          </a>
          <a
            href={hnUrl(story.id)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onVisit(story, 'detail_comments')}
            className="h-9 px-3.5 inline-flex items-center gap-1.5 rounded-full border border-border text-[0.85rem] text-foreground/80 hover:bg-accent transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            {story.descendants ? `${story.descendants} 条讨论` : 'HN 讨论'}
          </a>
          <div className="ml-auto flex items-center">
            <button onClick={() => onToggleLike(story)} aria-label="喜欢" className={cn(iconBtn, 'hover:text-rose-500', liked && 'text-rose-500')}>
              <Heart className={cn('w-[1.05rem] h-[1.05rem]', liked && 'fill-current')} />
            </button>
            <button onClick={() => onToggleBookmark(story)} aria-label="收藏" className={cn(iconBtn, 'hover:text-link', bookmarked && 'text-link')}>
              <Bookmark className={cn('w-[1.05rem] h-[1.05rem]', bookmarked && 'fill-current')} />
            </button>
            <button onClick={copyLink} aria-label="复制链接" className={iconBtn}>
              {copied ? <Check className="w-[1.05rem] h-[1.05rem] text-emerald-500" /> : <Link2 className="w-[1.05rem] h-[1.05rem]" />}
            </button>
          </div>
        </div>
      </aside>
    </div>
  )
}
