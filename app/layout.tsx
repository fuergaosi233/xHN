import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://xhn.holegots.com'),
  title: 'xHN · Hacker News 中文速读',
  description: '实时聚合 Hacker News，AI 翻译标题、提炼中文摘要，让你几分钟读懂全球科技圈在讨论什么。',
  keywords: 'Hacker News, 科技新闻, AI摘要, 技术资讯, 中文, xHN',
  authors: [{ name: 'xHN' }],
  creator: 'xHN',
  publisher: 'xHN',
  openGraph: {
    title: 'xHN · Hacker News 中文速读',
    description: '实时聚合 Hacker News，AI 翻译标题、提炼中文摘要，让你几分钟读懂全球科技圈在讨论什么。',
    url: 'https://xhn.holegots.com',
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
    title: 'xHN · Hacker News 中文速读',
    description: '实时聚合 Hacker News，AI 翻译标题、提炼中文摘要。',
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
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
}

import { ThemeProvider } from '@/lib/hooks/useTheme'
import { ThemeToggle } from '@/components/ThemeToggle'
import Analytics from '@/components/Analytics'
import { WebSocketProvider } from '@/components/WebSocketProvider'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="prevent-horizontal-scroll">
        <ThemeProvider>
          <WebSocketProvider>
            {/* 顶部毛玻璃细导航栏（Apple 同款） */}
            <header className="sticky top-0 z-40 glass border-b border-hairline">
              <div className="max-w-feed mx-auto px-5 h-14 flex items-center justify-between">
                <a href="/" className="flex items-baseline gap-2 group">
                  <span className="text-[1.35rem] font-semibold tracking-[-0.03em] text-foreground">xHN</span>
                  <span className="hidden sm:inline text-[0.8rem] text-muted-foreground tracking-tight">
                    Hacker News · 中文
                  </span>
                </a>
                <div className="flex items-center gap-0.5">
                  <a
                    href="/api/rss"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="RSS 订阅"
                    className="h-9 w-9 inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  >
                    <svg className="w-[1.05rem] h-[1.05rem] fill-current" viewBox="0 0 24 24">
                      <path d="M6.18 15.64a2.18 2.18 0 1 1 0 4.36 2.18 2.18 0 0 1 0-4.36zM4 4.44A15.56 15.56 0 0 1 19.56 20h-2.83A12.73 12.73 0 0 0 4 7.27V4.44zm0 5.66a9.9 9.9 0 0 1 9.9 9.9h-2.83A7.07 7.07 0 0 0 4 12.93V10.1z"/>
                    </svg>
                  </a>
                  <a
                    href="https://github.com/fuergaosi233/xhn"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="GitHub"
                    className="h-9 w-9 inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  >
                    <svg className="w-[1.1rem] h-[1.1rem] fill-current" viewBox="0 0 24 24">
                      <path d="M12 0C5.374 0 0 5.373 0 12 0 17.302 3.438 21.8 8.207 23.387c.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                    </svg>
                  </a>
                  <ThemeToggle />
                </div>
              </div>
            </header>
            <main className="max-w-feed mx-auto px-5">
              {children}
            </main>
            <footer className="max-w-feed mx-auto px-5 py-10 mt-8 border-t border-hairline">
              <p className="text-[0.8rem] text-muted-foreground">
                实时聚合 Hacker News，AI 生成中文标题与摘要 ·{' '}
                <a
                  href="https://www.volcengine.com/product/ark"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                >
                  Powered by Doubao
                </a>
              </p>
            </footer>
          </WebSocketProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}