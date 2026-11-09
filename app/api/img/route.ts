import { NextRequest, NextResponse } from 'next/server'
import { verifyImageUrl } from '@/lib/images'
import { getProxiedImage, normalizeWidth } from '@/lib/image-cache'
import { log } from '@/lib/logger'

// 配图代理：国内直连外站图片经常超时或被防盗链拦截，统一由服务端拉取、压成 webp 并落盘缓存。
// 只接受带有效签名的 URL（签名在 /api/stories 下发时生成），不是开放代理。
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get('u') || ''
  const sig = searchParams.get('s') || ''
  const width = normalizeWidth(parseInt(searchParams.get('w') || '960', 10))

  if (!url || !sig || !verifyImageUrl(url, sig)) {
    return new NextResponse('forbidden', { status: 403 })
  }

  try {
    const body = await getProxiedImage(url, width)
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
