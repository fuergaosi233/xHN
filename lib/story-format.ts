import { ProcessedItem } from './hackernews'

export const PROCESSING_SUMMARY = '正在处理中...'
const PLACEHOLDER_SUMMARY = new Set(['暂无摘要', PROCESSING_SUMMARY])

export function formatTime(timestamp: number) {
  const diff = Date.now() / 1000 - timestamp
  if (diff < 3600) return `${Math.max(1, Math.floor(diff / 60))} 分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`
  return `${Math.floor(diff / 86400)} 天前`
}

export function getDomain(url?: string) {
  if (!url) return 'news.ycombinator.com'
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

export function hnUrl(id: number) {
  return `https://news.ycombinator.com/item?id=${id}`
}

// 配图地址是 /api/img 代理地址，按展示尺寸取不同宽度的缩略图
export function imageSrc(url: string, width: number) {
  return `${url}&w=${width}`
}

export function storyState(story: ProcessedItem) {
  const isProcessing = story.summary === PROCESSING_SUMMARY
  const isUnfetchable = !!story.summary && story.summary.includes('无法抓取')
  const hasSummary = !!story.summary && !PLACEHOLDER_SUMMARY.has(story.summary) && !isUnfetchable
  const hasChinese = !!story.chineseTitle && story.chineseTitle !== story.title
  // 抓取失败的提示文案自带 ⚠️，界面上已有图标，去掉避免重复
  const notice = isUnfetchable ? story.summary!.replace(/^\s*⚠️\s*/, '') : ''
  return { isProcessing, isUnfetchable, hasSummary, hasChinese, notice }
}
