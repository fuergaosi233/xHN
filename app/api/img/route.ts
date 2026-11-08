import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { mkdir, readFile, writeFile, readdir, stat, unlink } from 'fs/promises'
import path from 'path'
import { downloadImage, verifyImageUrl } from '@/lib/images'
import { log } from '@/lib/logger'

// 配图代理：国内直连外站图片经常超时或被防盗链拦截，统一由服务端拉取、压成 webp 并落盘缓存。
// 只接受带有效签名的 URL（签名在 /api/stories 下发时生成），不是开放代理。
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const CACHE_DIR = process.env.IMAGE_CACHE_DIR || '/tmp/xhn-img-cache'
const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000
const WIDTHS = [480, 960, 1600]

const inflight = new Map<string, Promise<Buffer>>()
let lastCleanup = 0

// 按需清理超过 7 天的缓存文件，最多每小时一次
async function cleanupCache() {
  if (Date.now() - lastCleanup < 60 * 60 * 1000) return
  lastCleanup = Date.now()
  try {
    for (const name of await readdir(CACHE_DIR)) {
      const file = path.join(CACHE_DIR, name)
      const st = await stat(file).catch(() => null)
      if (st && Date.now() - st.mtimeMs > CACHE_MAX_AGE_MS) await unlink(file).catch(() => {})
    }
  } catch {
    // 目录还不存在
  }
}

async function render(url: string, width: number, file: string): Promise<Buffer> {
  const sharp = (await import('sharp')).default
  const origin = (() => { try { return new URL(url).origin + '/' } catch { return undefined } })()
  const source = await downloadImage(url, origin, 25 * 1024 * 1024, 20000)
  const out = await sharp(source, { animated: false, limitInputPixels: 100_000_000 })
    .rotate()
    .resize(width, null, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer()
  await mkdir(CACHE_DIR, { recursive: true })
  await writeFile(file, out)
  cleanupCache().catch(() => {})
  return out
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get('u') || ''
  const sig = searchParams.get('s') || ''
  const requested = parseInt(searchParams.get('w') || '960', 10)
  const width = WIDTHS.find(w => w >= requested) || WIDTHS[WIDTHS.length - 1]

  if (!url || !sig || !verifyImageUrl(url, sig)) {
    return new NextResponse('forbidden', { status: 403 })
  }

  const key = createHash('sha256').update(url).digest('hex').substring(0, 32)
  const file = path.join(CACHE_DIR, `${key}-${width}.webp`)

  try {
    let body = await readFile(file).catch(() => null)
    if (!body) {
      const id = `${key}-${width}`
      let job = inflight.get(id)
      if (!job) {
        job = render(url, width, file).finally(() => inflight.delete(id))
        inflight.set(id, job)
      }
      body = await job
    }
    return new NextResponse(body, {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=604800, immutable',
      },
    })
  } catch (error) {
    log.warn('Image proxy failed', { url, error: error instanceof Error ? error : new Error(String(error)) })
    return new NextResponse('upstream image unavailable', {
      status: 502,
      headers: { 'Cache-Control': 'public, max-age=600' },
    })
  }
}
