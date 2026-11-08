import { createHmac, timingSafeEqual } from 'crypto'
import { JSDOM, VirtualConsole } from 'jsdom'
import { log } from './logger'

// 原文里的候选配图（抽正文时顺带收集，交给多模态 LLM 决定放哪几张）
export interface ImageCandidate {
  url: string
  alt?: string
  caption?: string
  source: 'og' | 'article'
}

// 下载、校验并压缩过、可以直接喂给 LLM 的候选图
export interface PreparedImage extends ImageCandidate {
  width: number
  height: number
  dataUrl: string
}

// LLM 选中、最终存库展示的配图
export interface StoryImage {
  url: string
  caption?: string
  width?: number
  height?: number
}

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'

// 明显不是内容图的：图标、头像、徽章、追踪像素、广告位
const JUNK_URL = /(^data:|\.svg(\?|#|$)|\.ico(\?|$)|gravatar\.com|\/(avatars?|emoji|icons?|badges?|sprites?|pixel|spacer|tracking|ads?)\/|[-_/](logo|favicon|avatar|icon|badge|sprite|spinner|placeholder|blank|1x1)[-_.]|shields\.io|badgen\.net|doubleclick|googlesyndication|facebook\.com\/tr)/i

function absolutize(src: string | null | undefined, base: string): string | null {
  if (!src) return null
  const s = src.trim()
  if (!s || s.startsWith('data:') || s.startsWith('blob:')) return null
  try {
    const u = new URL(s, base)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    return u.toString()
  } catch {
    return null
  }
}

// srcset 取最大的那一档
function largestFromSrcset(srcset: string | null): string | null {
  if (!srcset) return null
  let best: { url: string; score: number } | null = null
  for (const part of srcset.split(',')) {
    const [url, desc] = part.trim().split(/\s+/)
    if (!url) continue
    const score = desc ? parseFloat(desc) * (desc.endsWith('x') ? 1000 : 1) : 1
    if (!best || score > best.score) best = { url, score }
  }
  return best?.url || null
}

function attrSize(el: Element, name: 'width' | 'height'): number | null {
  const v = parseInt(el.getAttribute(name) || '', 10)
  return Number.isFinite(v) ? v : null
}

// 从页面元信息 + Readability 抽出的正文 HTML 里收集候选图，按出现顺序去重
export function extractImageCandidates(document: Document, articleHtml: string | null, pageUrl: string, max: number): ImageCandidate[] {
  const out: ImageCandidate[] = []
  const seen = new Set<string>()
  const push = (c: ImageCandidate) => {
    if (out.length >= max || JUNK_URL.test(c.url)) return
    const key = c.url.replace(/[?#].*$/, '')
    if (seen.has(key)) return
    seen.add(key)
    out.push(c)
  }

  // 正文图在前：比 og:image（常是站点通用分享图）更可能是有信息量的图表/截图
  if (articleHtml) {
    const frag = new JSDOM(articleHtml, { url: pageUrl, virtualConsole: new VirtualConsole() }).window.document
    frag.querySelectorAll('img').forEach(img => {
      const w = attrSize(img, 'width')
      const h = attrSize(img, 'height')
      if ((w !== null && w < 120) || (h !== null && h < 80)) return
      const picture = img.closest('picture')
      const src = largestFromSrcset(picture?.querySelector('source')?.getAttribute('srcset') || null)
        || largestFromSrcset(img.getAttribute('srcset') || img.getAttribute('data-srcset'))
        || img.getAttribute('data-src') || img.getAttribute('data-original') || img.getAttribute('src')
      const url = absolutize(src, pageUrl)
      if (!url) return
      const caption = img.closest('figure')?.querySelector('figcaption')?.textContent?.replace(/\s+/g, ' ').trim()
      push({
        url,
        alt: (img.getAttribute('alt') || img.getAttribute('title') || '').trim().substring(0, 200) || undefined,
        caption: caption?.substring(0, 300) || undefined,
        source: 'article',
      })
    })
  }

  const meta = (sel: string) => document.querySelector(sel)?.getAttribute('content') || null
  const og = absolutize(meta('meta[property="og:image:secure_url"]') || meta('meta[property="og:image"]') || meta('meta[name="twitter:image"]') || meta('meta[name="twitter:image:src"]'), pageUrl)
  if (og) {
    push({ url: og, alt: meta('meta[property="og:image:alt"]')?.substring(0, 200) || undefined, source: 'og' })
  }

  return out
}

export async function downloadImage(url: string, referer?: string, maxBytes = 15 * 1024 * 1024, timeoutMs = 12000): Promise<Buffer> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      ...(referer ? { Referer: referer } : {}),
    },
    signal: AbortSignal.timeout(timeoutMs),
    redirect: 'follow',
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const type = res.headers.get('content-type') || ''
  if (type && !type.startsWith('image/') && !type.includes('octet-stream')) {
    throw new Error(`not an image: ${type}`)
  }
  const len = parseInt(res.headers.get('content-length') || '0', 10)
  if (len > maxBytes) throw new Error(`too large: ${len}`)
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length > maxBytes) throw new Error(`too large: ${buf.length}`)
  return buf
}

// 下载候选图、丢掉太小/太扁的，压到长边 1024 的 JPEG 转 data URL（DeepSeek 不能自己拉外链图）
export async function prepareImagesForLLM(candidates: ImageCandidate[], pageUrl: string): Promise<PreparedImage[]> {
  if (candidates.length === 0) return []
  const sharp = (await import('sharp')).default

  const results = await Promise.all(candidates.map(async (c): Promise<PreparedImage | null> => {
    try {
      const buf = await downloadImage(c.url, pageUrl)
      const img = sharp(buf, { animated: false, limitInputPixels: 80_000_000 })
      const meta = await img.metadata()
      const width = meta.width || 0
      const height = meta.height || 0
      const ratio = width / Math.max(1, height)
      if (width < 240 || height < 140 || ratio > 4 || ratio < 0.25) return null
      const jpeg = await img.rotate().resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
        .flatten({ background: '#ffffff' }).jpeg({ quality: 78 }).toBuffer()
      return { ...c, width, height, dataUrl: `data:image/jpeg;base64,${jpeg.toString('base64')}` }
    } catch (error) {
      log.debug('Image candidate dropped', { url: c.url, reason: error instanceof Error ? error.message : String(error) })
      return null
    }
  }))

  return results.filter((r): r is PreparedImage => r !== null)
}

// 图片代理签名：只代理我们自己存过的图，防止 /api/img 被当成开放代理
function secret(): string {
  return process.env.IMAGE_PROXY_SECRET || process.env.ADMIN_SECRET || 'xhn-image-proxy'
}

export function signImageUrl(url: string): string {
  return createHmac('sha256', secret()).update(url).digest('base64url').substring(0, 22)
}

export function verifyImageUrl(url: string, sig: string): boolean {
  const expected = Buffer.from(signImageUrl(url))
  const given = Buffer.from(sig)
  return expected.length === given.length && timingSafeEqual(expected, given)
}

export function proxiedImageUrl(url: string, width?: number): string {
  const params = new URLSearchParams({ u: url, s: signImageUrl(url) })
  if (width) params.set('w', String(width))
  return `/api/img?${params}`
}

// 给前端的配图：原图 URL 换成签名后的站内代理地址（国内直连外站图经常挂/防盗链）
export function toClientImages(images: unknown): StoryImage[] | undefined {
  if (!Array.isArray(images) || images.length === 0) return undefined
  return images
    .filter((img: any) => img && typeof img.url === 'string')
    .map((img: any) => ({
      url: proxiedImageUrl(img.url),
      caption: img.caption || undefined,
      width: img.width || undefined,
      height: img.height || undefined,
    }))
}
