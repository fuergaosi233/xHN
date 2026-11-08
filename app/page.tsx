'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import StoryCard, { FeedView } from '@/components/StoryCard'
import StoryCardSkeleton from '@/components/StoryCardSkeleton'
import StoryDetail from '@/components/StoryDetail'
import { ProcessedItem } from '@/lib/hackernews'
import { TrendingUp, Star, Clock, Loader2, LayoutGrid, Rows3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useInfiniteScroll } from '@/lib/hooks/useInfiniteScroll'
import { useStoryUpdates } from '@/lib/hooks/useStoryUpdates'
import { useWebSocketUpdates } from '@/lib/hooks/useWebSocketUpdates'
import { userManager } from '@/lib/user'
import { useUmami } from '@/components/Analytics'

type TabType = 'top' | 'best' | 'new'

interface QueueStatus {
  pending: number
  processing: number
  completed: number
  failed: number
  activeWorkers: number
  maxConcurrency: number
}

interface APIResponse {
  success: boolean
  data: ProcessedItem[]
  cached: boolean
  count: number
  processingCount?: number
  queueStatus?: QueueStatus
  message?: string
  processingTime?: number
  error?: string
  page?: number
  limit?: number
  hasMore?: boolean
}

export default function Home() {
  const { track } = useUmami()
  const [activeTab, setActiveTab] = useState<TabType>('top')
  const [stories, setStories] = useState<ProcessedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [apiInfo, setApiInfo] = useState<{ cached: boolean; count: number; processingCount?: number; queueStatus?: QueueStatus; message?: string; processingTime?: number } | null>(null)
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false)
  const [currentPage, setCurrentPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  
  // 使用轮询更新hook (保持原有的轮询机制)
  const { stories: pollingUpdatedStories, isChecking } = useStoryUpdates(stories)
  
  // 使用WebSocket增强更新hook (在轮询基础上添加实时更新)
  const roomType = activeTab === 'top' ? 'top-stories' : activeTab === 'new' ? 'new-stories' : 'best-stories'
  const { stories: updatedStories, isConnected, connectionError } = useWebSocketUpdates(pollingUpdatedStories, roomType)

  const fetchStories = async (type: TabType, page: number = 0, append: boolean = false, forceRefresh = false) => {
    if (append) {
      setLoadingMore(true)
    } else {
      setLoading(true)
      setStories([])
      setCurrentPage(0)
      setHasMore(true)
    }
    setError(null)
    
    try {
      const params = new URLSearchParams({
        type,
        page: page.toString(),
        limit: '20'
      })
      
      if (forceRefresh) {
        params.append('refresh', 'true')
      }
      
      const response = await fetch(`/api/stories?${params}`)
      const data: APIResponse = await response.json()
      
      if (data.success) {
        if (append) {
          setStories(prev => [...prev, ...data.data])
        } else {
          setStories(data.data)
        }
        
        setCurrentPage(page)
        setHasMore(data.hasMore || false)
        setLastUpdated(new Date())
        setApiInfo({
          cached: data.cached,
          count: data.count,
          processingCount: data.processingCount,
          queueStatus: data.queueStatus,
          message: data.message,
          processingTime: data.processingTime
        })
      } else {
        setError(data.error || '获取数据失败')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '网络错误')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const loadMoreStories = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchStories(activeTab, currentPage + 1, true)
    }
  }, [activeTab, currentPage, loadingMore, hasMore])

  // 无限滚动hook
  const { observe } = useInfiniteScroll(hasMore, loadingMore, loadMoreStories)

  useEffect(() => {
    fetchStories(activeTab)
  }, [activeTab])

  // 处理计数显示逻辑（保留显示，但不自动刷新整页）
  useEffect(() => {
    if (apiInfo?.processingCount && apiInfo.processingCount > 0) {
      setAutoRefreshEnabled(true)
    } else {
      setAutoRefreshEnabled(false)
    }
  }, [apiInfo?.processingCount])

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab)
    
    // 追踪标签页切换事件
    track('tab_change', {
      from_tab: activeTab,
      to_tab: tab
    })
  }

  const handleRefresh = () => {
    fetchStories(activeTab, 0, false, true)
  }


  // ---- 视图、筛选、选中、详情抽屉 ----
  // userManager 是模块级单例，引用稳定，不会让 memo 的卡片每次都重渲染
  const actions = userManager
  const [mounted, setMounted] = useState(false)
  const [, setPrefsVersion] = useState(0)
  const [view, setView] = useState<FeedView>('grid')
  const [category, setCategory] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [openId, setOpenId] = useState<number | null>(null)

  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem('xhn:view')
    if (saved === 'grid' || saved === 'list') setView(saved)
  }, [])

  const changeView = useCallback((v: FeedView) => {
    setView(v)
    localStorage.setItem('xhn:view', v)
    track('view_change', { view: v })
  }, [track])

  // 切换榜单时重置筛选与选中
  useEffect(() => {
    setCategory(null)
    setSelectedId(null)
    setOpenId(null)
  }, [activeTab])

  // 分类筛选项：从已加载的文章里统计
  const categories = useMemo(() => {
    const counts = new Map<string, number>()
    for (const s of updatedStories) {
      if (s.category) counts.set(s.category, (counts.get(s.category) || 0) + 1)
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])
  }, [updatedStories])

  const rankOf = useMemo(() => new Map(updatedStories.map((s, i) => [s.id, i])), [updatedStories])
  const visible = useMemo(
    () => (category ? updatedStories.filter(s => s.category === category) : updatedStories),
    [updatedStories, category]
  )

  const openPos = openId === null ? -1 : visible.findIndex(s => s.id === openId)
  const openStory = openPos >= 0 ? visible[openPos] : null

  const markRead = useCallback((story: ProcessedItem) => {
    actions.markRead(story.id)
    setPrefsVersion(v => v + 1)
  }, [actions])

  const handleVisit = useCallback((story: ProcessedItem, type: string) => {
    markRead(story)
    track('story_click', { story_id: story.id, click_type: type, story_position: (rankOf.get(story.id) ?? 0) + 1 })
  }, [markRead, track, rankOf])

  const handleOpen = useCallback((index: number) => {
    const story = updatedStories[index]
    if (!story) return
    setOpenId(story.id)
    setSelectedId(story.id)
    markRead(story)
    track('story_open', { story_id: story.id, story_position: index + 1 })
  }, [updatedStories, markRead, track])

  const toggleLike = useCallback((story: ProcessedItem) => {
    const s = actions.toggleLike(story.id)
    setPrefsVersion(v => v + 1)
    track('story_like', { story_id: story.id, action: s ? 'like' : 'unlike' })
  }, [actions, track])

  const toggleBookmark = useCallback((story: ProcessedItem) => {
    const s = actions.toggleBookmark(story.id)
    setPrefsVersion(v => v + 1)
    track('story_bookmark', { story_id: story.id, action: s ? 'bookmark' : 'unbookmark' })
  }, [actions, track])

  // 在当前可见列表里前后移动；接近底部时预加载下一页
  const step = useCallback((delta: number) => {
    if (visible.length === 0) return
    const currentId = openId ?? selectedId
    const cur = currentId === null ? -1 : visible.findIndex(s => s.id === currentId)
    const next = Math.min(visible.length - 1, Math.max(0, cur + delta))
    const story = visible[next]
    setSelectedId(story.id)
    if (openId !== null) {
      setOpenId(story.id)
      markRead(story)
    } else {
      const el = document.querySelector(`[data-story-index="${rankOf.get(story.id)}"]`)
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
    if (next >= visible.length - 3) loadMoreStories()
  }, [visible, openId, selectedId, rankOf, markRead, loadMoreStories])

  // 键盘：J/K 上下篇、Enter 详情、O 打开原文、C 打开讨论、V 切换视图、Esc 关闭
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const target = e.target as HTMLElement
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return

      const currentId = openId ?? selectedId
      const current = currentId === null ? null : visible.find(s => s.id === currentId) || null
      switch (e.key) {
        case 'j':
        case 'ArrowDown':
          if (e.key === 'ArrowDown' && openId === null) return
          e.preventDefault(); step(1); break
        case 'k':
        case 'ArrowUp':
          if (e.key === 'ArrowUp' && openId === null) return
          e.preventDefault(); step(-1); break
        case 'Enter':
          if (openId === null && current) { e.preventDefault(); handleOpen(rankOf.get(current.id) ?? 0) }
          break
        case 'o':
          if (current) { window.open(current.url || `https://news.ycombinator.com/item?id=${current.id}`, '_blank', 'noopener'); handleVisit(current, 'key_external') }
          break
        case 'c':
          if (current) { window.open(`https://news.ycombinator.com/item?id=${current.id}`, '_blank', 'noopener'); handleVisit(current, 'key_comments') }
          break
        case 'v':
          changeView(view === 'grid' ? 'list' : 'grid'); break
        case 'Escape':
          if (openId !== null) setOpenId(null)
          else setSelectedId(null)
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openId, selectedId, visible, rankOf, step, handleOpen, handleVisit, changeView, view])

  const TABS: { key: TabType; label: string; icon: typeof TrendingUp }[] = [
    { key: 'top', label: '最热', icon: TrendingUp },
    { key: 'best', label: '最受欢迎', icon: Star },
    { key: 'new', label: '最新', icon: Clock },
  ]

  const processing = apiInfo?.queueStatus ? apiInfo.queueStatus.pending + apiInfo.queueStatus.processing : 0

  const chip = (active: boolean) => cn(
    'shrink-0 h-7 px-2.5 rounded-full text-[0.78rem] transition-colors whitespace-nowrap',
    active ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
  )

  return (
    <div>
      {/* 页面标题：压缩高度，把首屏留给内容 */}
      <div className="pt-8 pb-5 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h1 className="display-title text-[1.9rem] sm:text-[2.25rem] text-foreground">
            今日 Hacker News
          </h1>
          <p className="mt-1.5 text-[0.92rem] text-muted-foreground">
            实时聚合全球科技圈的讨论，AI 翻译标题、提炼摘要、挑选配图。
            {processing > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 text-[0.8rem] text-muted-foreground/80">
                <Loader2 className="w-3 h-3 animate-spin" />
                {processing} 篇处理中
              </span>
            )}
          </p>
        </div>
        <p className="hidden lg:block text-[0.75rem] text-muted-foreground/70">
          <kbd className="font-sans">J</kbd>/<kbd className="font-sans">K</kbd> 浏览 · Enter 详情 · O 原文 · C 讨论 · V 切换视图
        </p>
      </div>

      {/* 工具栏：榜单切换 + 分类筛选 + 视图切换，吸附在导航栏下方 */}
      <div className="sticky top-14 z-30 -mx-5 px-5 py-2.5 glass border-b border-hairline">
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-x-3 gap-y-2">
          <div className="inline-flex items-center gap-1 p-1 rounded-full bg-muted shrink-0">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => handleTabChange(key)}
                className={cn(
                  'inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-[0.82rem] font-medium transition-all duration-200',
                  activeTab === key
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          <div className="order-last sm:order-none w-full sm:w-auto sm:flex-1 min-w-0 flex items-center gap-1 overflow-x-auto no-scrollbar">
            {categories.length > 1 && (
              <>
                <button className={chip(category === null)} onClick={() => setCategory(null)}>
                  全部 <span className="tabular-nums opacity-60">{updatedStories.length}</span>
                </button>
                {categories.map(([name, count]) => (
                  <button
                    key={name}
                    className={chip(category === name)}
                    onClick={() => { setCategory(category === name ? null : name); track('category_filter', { category: name }) }}
                  >
                    {name} <span className="tabular-nums opacity-60">{count}</span>
                  </button>
                ))}
              </>
            )}
          </div>

          <div className="ml-auto sm:ml-0 inline-flex items-center p-0.5 rounded-lg bg-muted shrink-0">
            {([['grid', LayoutGrid, '卡片'], ['list', Rows3, '列表']] as const).map(([v, Icon, label]) => (
              <button
                key={v}
                onClick={() => changeView(v)}
                aria-label={`${label}视图`}
                title={`${label}视图（V）`}
                className={cn(
                  'h-7 w-8 inline-flex items-center justify-center rounded-md transition-colors',
                  view === v ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className={cn('pt-5', view === 'list' && 'max-w-5xl mx-auto')}>
          <StoryCardSkeleton count={6} view={view} />
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="text-center py-24">
          <p className="headline text-lg text-foreground mb-2">获取数据失败</p>
          <p className="text-sm text-muted-foreground mb-6">{error}</p>
          <Button onClick={() => fetchStories(activeTab)} className="rounded-full">重试</Button>
        </div>
      )}

      {/* Feed */}
      {!loading && !error && visible.length > 0 && (
        <>
          <div className={cn(
            view === 'grid'
              ? 'pt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3'
              : 'pt-3 max-w-5xl mx-auto space-y-0.5'
          )}>
            {visible.map(story => (
              <StoryCard
                key={story.id}
                story={story}
                index={rankOf.get(story.id) ?? 0}
                view={view}
                selected={selectedId === story.id}
                liked={mounted && actions.isLiked(story.id)}
                bookmarked={mounted && actions.isBookmarked(story.id)}
                read={mounted && actions.isRead(story.id)}
                onOpen={handleOpen}
                onVisit={handleVisit}
                onToggleLike={toggleLike}
                onToggleBookmark={toggleBookmark}
              />
            ))}
          </div>

          {hasMore && (
            <div ref={observe} className="flex justify-center py-10">
              {loadingMore ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  加载更多…
                </div>
              ) : (
                <span className="text-muted-foreground/60 text-sm">向下滚动加载更多</span>
              )}
            </div>
          )}

          {!hasMore && !loadingMore && (
            <div className="text-center py-10">
              <p className="text-muted-foreground/60 text-sm">已经到底啦 · 共 {updatedStories.length} 篇</p>
            </div>
          )}
        </>
      )}

      {/* Empty */}
      {!loading && !error && visible.length === 0 && (
        <div className="text-center py-24">
          <p className="text-muted-foreground">{category ? '这个分类下暂时没有文章' : '暂无数据'}</p>
        </div>
      )}

      <StoryDetail
        story={openStory}
        position={openPos}
        total={visible.length}
        liked={!!openStory && actions.isLiked(openStory.id)}
        bookmarked={!!openStory && actions.isBookmarked(openStory.id)}
        onClose={() => setOpenId(null)}
        onPrev={() => step(-1)}
        onNext={() => step(1)}
        onVisit={handleVisit}
        onToggleLike={toggleLike}
        onToggleBookmark={toggleBookmark}
      />
    </div>
  )
}
