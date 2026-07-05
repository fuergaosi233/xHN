import { NextRequest, NextResponse } from 'next/server'
import { log } from './logger'

// 管理端点鉴权：通过 ADMIN_SECRET 环境变量配置共享密钥
// 请求需携带 Authorization: Bearer <secret> 或 x-admin-secret: <secret>
export function requireAdmin(request: NextRequest): NextResponse | null {
  const secret = process.env.ADMIN_SECRET

  if (!secret) {
    // 未配置密钥时拒绝所有管理请求，避免裸奔
    log.security('admin_endpoint_blocked_no_secret', { url: request.url })
    return NextResponse.json({
      success: false,
      error: 'Admin endpoints are disabled. Set ADMIN_SECRET to enable.'
    }, { status: 503 })
  }

  const authHeader = request.headers.get('authorization')
  const secretHeader = request.headers.get('x-admin-secret')
  const provided = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : secretHeader

  if (provided !== secret) {
    log.security('admin_endpoint_unauthorized', { url: request.url })
    return NextResponse.json({
      success: false,
      error: 'Unauthorized'
    }, { status: 401 })
  }

  return null
}
