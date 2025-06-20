import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://xhn.vercel.app'),
  title: 'xHN - 智能科技新闻聚合平台',
  description: '获取 Hacker News 最新资讯，AI 生成中文摘要，一键追踪全球科技动态',
  keywords: 'Hacker News, 科技新闻, AI摘要, 技术资讯, xHN',
  authors: [{ name: 'xHN Team' }],
  creator: 'xHN',
  publisher: 'xHN',
  openGraph: {
    title: 'xHN - 智能科技新闻聚合平台',
    description: '获取 Hacker News 最新资讯，AI 生成中文摘要，一键追踪全球科技动态',
    url: 'https://xhn.vercel.app',
    siteName: 'xHN',
    images: [
      {
        url: '/og-image.svg',
        width: 1200,
        height: 630,
        alt: 'xHN - 智能科技新闻聚合平台',
      },
    ],
    locale: 'zh_CN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'xHN - 智能科技新闻聚合平台',
    description: '获取 Hacker News 最新资讯，AI 生成中文摘要',
    images: ['/og-image.svg'],
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      { rel: 'mask-icon', url: '/safari-pinned-tab.svg', color: '#5bbad5' },
    ],
  },
  manifest: '/site.webmanifest',
}

export const viewport: Viewport = {
  themeColor: '#ffffff',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body>
        <header className="border-b bg-card">
          <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="text-center space-y-3">
              <div className="flex items-center justify-center gap-3">
                <span className="text-3xl">🧠</span>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                  xHN
                </h1>
              </div>
              <p className="text-sm text-muted-foreground">
                智能科技新闻聚合平台 · AI 驱动的全球技术资讯中文摘要
              </p>
              <div className="flex items-center justify-center gap-2 pt-1">
                <div className="px-3 py-1 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-200/30 rounded-full">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse"></div>
                    <span className="text-xs font-medium bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      Powered by Doubao 1.6
                    </span>
                    <span className="text-xs">🚀</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  )
}