import { NextRequest, NextResponse } from 'next/server'
import { HackerNewsAPI, ProcessedItem } from '@/lib/hackernews'
import { queueManager } from '@/lib/queue'
import { checkDbConnection, getDb } from '@/lib/db'
import { processedStories } from '@/lib/db/schema'
import { inArray } from 'drizzle-orm'
import { log } from '@/lib/logger'

const hnAPI = new HackerNewsAPI()

// 强制此路由为动态
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') as 'top' | 'best' | 'new' || 'top'
  const forceRefresh = searchParams.get('refresh') === 'true'
  const page = parseInt(searchParams.get('page') || '0')
  const limit = parseInt(searchParams.get('limit') || '20')
  
  try {
    
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
    
    // 直接从数据库获取已翻译的故事数据
    const storyIds = validStories.map(story => story.id)
    const database = await getDb()
    
    // 批量查询数据库中已有的翻译数据
    let existingTranslations: any[] = []
    if (!forceRefresh && storyIds.length > 0) {
      existingTranslations = await database.select({
        storyId: processedStories.storyId,
        chineseTitle: processedStories.chineseTitle,
        summary: processedStories.summary,
        processingTime: processedStories.processingTime,
      })
      .from(processedStories)
      .where(inArray(processedStories.storyId, storyIds))
      
      // Found existing translations from database
    }
    
    // 创建翻译数据映射
    const translationMap = new Map()
    existingTranslations.forEach(translation => {
      translationMap.set(translation.storyId, translation)
    })
    
    // 处理故事列表
    const finalStories: ProcessedItem[] = []
    const storiesToProcess: typeof validStories = []
    
    for (const story of validStories) {
      const translation = translationMap.get(story.id)
      
      if (translation && translation.chineseTitle && translation.summary) {
        // 使用数据库中的翻译数据
        finalStories.push({
          ...story,
          chineseTitle: translation.chineseTitle,
          summary: translation.summary,
          cached: true,
          processingTime: translation.processingTime || 0
        })
      } else {
        // 需要翻译的故事
        storiesToProcess.push(story)
        finalStories.push({
          ...story,
          chineseTitle: story.title,
          summary: '正在处理中...',
          cached: false,
          processingTime: 0
        })
      }
    }
    
    // 将需要翻译的故事添加到处理队列
    if (storiesToProcess.length > 0) {
      await queueManager.addBatchTasks(storiesToProcess, type === 'top' ? 1 : 0)
      queueManager.startProcessor()
    }
    
    // 按原始顺序排序 (finalStories已经按照validStories的顺序构建，所以不需要额外排序)
    const sortedStories = finalStories
    
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
    log.error('Stories API Error in /api/stories:', { type, page, limit, error: error instanceof Error ? error : new Error(String(error)) })
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