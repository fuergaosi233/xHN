import { NextRequest, NextResponse } from 'next/server'
import { HackerNewsAPI, ProcessedItem } from '@/lib/hackernews'
import { queueManager } from '@/lib/queue'
import { checkDbConnection } from '@/lib/db'

const hnAPI = new HackerNewsAPI()

// 强制此路由为动态
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') as 'top' | 'best' | 'new' || 'top'
    const forceRefresh = searchParams.get('refresh') === 'true'
    const page = parseInt(searchParams.get('page') || '0')
    const limit = parseInt(searchParams.get('limit') || '20')
    
    // 检查数据库连接
    const dbCheck = await checkDbConnection()
    if (!dbCheck.success) {
      return NextResponse.json({
        success: false,
        error: 'Database connection failed',
        details: dbCheck.error
      }, { status: 500 })
    }

    // 获取 Hacker News 数据
    console.log(`Fetching ${type} stories, page ${page}, limit ${limit}...`)
    let stories: any[]
    
    if (type === 'new') {
      // 对于最新文章，直接返回已排序的结果
      stories = await hnAPI.getNewStoriesSorted(page, limit)
    } else {
      const storyIds = type === 'top' 
        ? await hnAPI.getTopStories(page, limit) 
        : await hnAPI.getBestStories(page, limit)
      
      stories = await hnAPI.getMultipleItems(storyIds)
    }
    
    // 过滤出有效的故事（有URL的）
    const validStories = stories.filter(story => story.url && story.title)
    
    // 检查缓存并收集需要处理的故事
    const processedStories: ProcessedItem[] = []
    const storiesToProcess: typeof validStories = []
    
    for (const story of validStories) {
      if (!forceRefresh) {
        // 检查是否已缓存
        const cached = await queueManager.getCachedResult(story.id)
        if (cached) {
          processedStories.push({
            ...story,
            chineseTitle: cached.chineseTitle || story.title,
            summary: cached.summary || '暂无摘要',
            cached: true,
            processingTime: cached.processingTime || 0
          })
          continue
        }
      }
      
      storiesToProcess.push(story)
    }
    
    // 将未缓存的故事添加到处理队列
    if (storiesToProcess.length > 0) {
      console.log(`Adding ${storiesToProcess.length} stories to processing queue`)
      await queueManager.addBatchTasks(storiesToProcess, type === 'top' ? 1 : 0)
      
      // 启动队列处理器
      queueManager.startProcessor()
      
      // 对于未缓存的故事，返回原始标题
      for (const story of storiesToProcess) {
        processedStories.push({
          ...story,
          chineseTitle: story.title,
          summary: '正在处理中...',
          cached: false,
          processingTime: 0
        })
      }
    }
    
    // 按原始顺序排序
    const sortedStories = processedStories.sort((a, b) => {
      const aIndex = validStories.findIndex(s => s.id === a.id)
      const bIndex = validStories.findIndex(s => s.id === b.id)
      return aIndex - bIndex
    })
    
    // 获取队列状态
    const queueStatus = await queueManager.getQueueStatus()
    
    return NextResponse.json({
      success: true,
      data: sortedStories,
      cached: storiesToProcess.length === 0,
      count: sortedStories.length,
      processingCount: storiesToProcess.length,
      queueStatus,
      page,
      limit,
      hasMore: sortedStories.length === limit, // 如果返回的数量等于limit，说明可能还有更多
      message: storiesToProcess.length > 0 
        ? `${storiesToProcess.length} 篇文章正在处理中，请稍后刷新查看结果`
        : '所有文章已处理完成'
    })
    
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch stories',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}