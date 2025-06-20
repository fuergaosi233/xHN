import { useState, useEffect, useCallback, useRef } from 'react'
import { ProcessedItem } from '@/lib/hackernews'

interface StoryUpdate {
  id: number
  title_cn: string | null
  summary_cn: string | null
  updated_at: string | null
}

export function useStoryUpdates(stories: ProcessedItem[]) {
  const [updatedStories, setUpdatedStories] = useState<ProcessedItem[]>(stories)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const [isChecking, setIsChecking] = useState(false)

  const checkForUpdates = useCallback(async () => {
    if (isChecking || stories.length === 0) return

    // 找出需要更新的故事（正在处理中或未翻译的）
    const storiesNeedingUpdate = stories.filter(story => 
      !story.summary || 
      story.summary === '正在处理中...' || 
      story.summary === '暂无摘要' ||
      !story.chineseTitle ||
      story.chineseTitle === story.title
    )

    if (storiesNeedingUpdate.length === 0) {
      // 没有需要更新的故事，停止检查
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    setIsChecking(true)
    try {
      const storyIds = storiesNeedingUpdate.map(story => story.id)
      const response = await fetch('/api/stories/updates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ storyIds }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.updates.length > 0) {
          // 更新已完成翻译的故事
          setUpdatedStories(prevStories => 
            prevStories.map(story => {
              const update = data.updates.find((u: StoryUpdate) => u.id === story.id)
              if (update && update.title_cn && update.summary_cn) {
                return {
                  ...story,
                  chineseTitle: update.title_cn,
                  summary: update.summary_cn
                }
              }
              return story
            })
          )
        }
      }
    } catch (error) {
      console.error('Failed to check story updates:', error)
    } finally {
      setIsChecking(false)
    }
  }, [stories, isChecking])

  // 开始或停止自动检查
  useEffect(() => {
    const hasProcessingStories = stories.some(story => 
      !story.summary || 
      story.summary === '正在处理中...' || 
      story.summary === '暂无摘要' ||
      !story.chineseTitle ||
      story.chineseTitle === story.title
    )

    if (hasProcessingStories && !intervalRef.current) {
      // 立即检查一次
      checkForUpdates()
      
      // 然后每15秒检查一次
      intervalRef.current = setInterval(() => {
        checkForUpdates()
      }, 15000)
    } else if (!hasProcessingStories && intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [stories, checkForUpdates])

  // 当stories prop变化时，重置本地状态
  useEffect(() => {
    setUpdatedStories(stories)
  }, [stories])

  return {
    stories: updatedStories,
    isChecking,
    manualCheck: checkForUpdates
  }
}