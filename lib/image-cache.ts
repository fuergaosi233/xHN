import { createHash } from 'crypto'
import { mkdir, readFile, writeFile, readdir, stat, unlink } from 'fs/promises'
import path from 'path'
import { downloadImage } from './images'
import { log } from './logger'

// 配图代理的渲染与落盘缓存：原图由服务端拉取、压成 webp。/api/img 读它，
// 队列处理完文章后也用它预热，用户第一次打开时缩略图已经在盘上了
const CACHE_DIR = process.env.IMAGE_CACHE_DIR || '/tmp/xhn-img-cache'
const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000
export const IMAGE_WIDTHS = [480, 960, 1600]

const inflight = new Map<string, Promise<Buffer>>()
let lastCleanup = 0

export function normalizeWidth(requested: number) {
  return IMAGE_WIDTHS.find(w => w >= requested) || IMAGE_WIDTHS[IMAGE_WIDTHS.length - 1]
}

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

export async function getProxiedImage(url: string, width: number): Promise<Buffer> {
  const key = `${createHash('sha256').update(url).digest('hex').substring(0, 32)}-${width}`
  const file = path.join(CACHE_DIR, `${key}.webp`)
  const cached = await readFile(file).catch(() => null)
  if (cached) return cached
  let job = inflight.get(key)
  if (!job) {
    job = render(url, width, file).finally(() => inflight.delete(key))
    inflight.set(key, job)
  }
  return job
}

// 预热卡片/列表/详情用到的两档宽度；失败无所谓，用户访问时还会再试
export function warmImages(urls: string[]) {
  for (const url of urls) {
    for (const w of [480, 960]) {
      getProxiedImage(url, w).catch(error => {
        log.debug('Image warm failed', { url, reason: error instanceof Error ? error.message : String(error) })
      })
    }
  }
}
