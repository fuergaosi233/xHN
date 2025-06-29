import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { processedStories, ProcessedStory } from '@/lib/db/schema'
import { desc, and, isNotNull } from 'drizzle-orm'
import { log } from '@/lib/logger'

// 强制此路由为动态
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'top'
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)

    let orderBy
    switch (type) {
      case 'best':
        // 使用原始数据中的score进行排序
        orderBy = desc(processedStories.createdAt)
        break
      case 'new':
        orderBy = desc(processedStories.createdAt)
        break
      default:
        orderBy = desc(processedStories.createdAt)
    }

    const database = await getDb()
    const items = await database
      .select()
      .from(processedStories)
      .where(and(
        isNotNull(processedStories.chineseTitle),
        isNotNull(processedStories.summary)
      ))
      .orderBy(orderBy)
      .limit(limit)

    const baseUrl = request.nextUrl.origin
    const now = new Date().toISOString()
    
    const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>xHN - 智能科技新闻聚合平台</title>
    <link>${baseUrl}</link>
    <description>获取 Hacker News 最新资讯，AI 生成中文摘要，一键追踪全球科技动态</description>
    <language>zh-cn</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${baseUrl}/api/rss?type=${type}" rel="self" type="application/rss+xml"/>
    <generator>xHN RSS Generator</generator>
    ${items.map((item: ProcessedStory) => {
      const originalData = item.originalData as any || {}
      return `
    <item>
      <title><![CDATA[${item.chineseTitle || item.title}]]></title>
      <link>${item.url || `https://news.ycombinator.com/item?id=${item.storyId}`}</link>
      <guid isPermaLink="false">xhn-${item.storyId}</guid>
      <description><![CDATA[
        <p><strong>中文摘要：</strong></p>
        <p>${item.summary || '暂无摘要'}</p>
        <br/>
        <p><strong>原文标题：</strong> ${item.title}</p>
        ${originalData.score ? `<p><strong>评分：</strong> ${originalData.score} 分</p>` : ''}
        ${originalData.descendants ? `<p><strong>评论数：</strong> ${originalData.descendants} 条</p>` : ''}
        ${originalData.by ? `<p><strong>作者：</strong> ${originalData.by}</p>` : ''}
        <p><strong>发布时间：</strong> ${item.createdAt ? new Date(item.createdAt).toLocaleString('zh-CN') : '未知'}</p>
        <br/>
        <p><a href="${item.url || `https://news.ycombinator.com/item?id=${item.storyId}`}" target="_blank">查看原文</a> | <a href="${baseUrl}/story/${item.storyId}" target="_blank">查看详情</a></p>
      ]]></description>
      <pubDate>${item.createdAt ? new Date(item.createdAt).toUTCString() : new Date().toUTCString()}</pubDate>
      <author>${originalData.by || 'unknown'}@hackernews</author>
      <category>${item.category || 'Technology'}</category>
      <source url="${baseUrl}">xHN</source>
    </item>`
    }).join('')}
  </channel>
</rss>`

    return new NextResponse(rssXml, {
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=1800', // 30分钟缓存
      },
    })
  } catch (error) {
    log.error('RSS generation error in /api/rss:', { error: error instanceof Error ? error : new Error(String(error)) })
    return NextResponse.json(
      { error: 'Failed to generate RSS feed' },
      { status: 500 }
    )
  }
}