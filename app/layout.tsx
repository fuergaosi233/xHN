import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://xhn.vercel.app'),
  title: 'xHN - 智能科技新闻聚合平台',
  description: 'Never accept the world as it appears to be. always dare to see it for what it could be.',
  keywords: 'Hacker News, 科技新闻, AI摘要, 技术资讯, xHN',
  authors: [{ name: 'xHN Team' }],
  creator: 'xHN',
  publisher: 'xHN',
  openGraph: {
    title: 'xHN - 智能科技新闻聚合平台',
    description: 'Never accept the world as it appears to be. always dare to see it for what it could be.',
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
    description: 'Never accept the world as it appears to be. always dare to see it for what it could be.',
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

import { ThemeProvider } from '@/lib/hooks/useTheme'
import { ThemeToggle } from '@/components/ThemeToggle'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <header className="border-b bg-card">
            <div className="max-w-4xl mx-auto px-4 py-8">
              <div className="relative">
                <div className="absolute top-0 right-0">
                  <ThemeToggle />
                </div>
                <div className="text-center space-y-3">
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-3xl">🧠</span>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                      xHN
                    </h1>
                  </div>
                <p className="text-sm text-muted-foreground">
                  Never accept the world as it appears to be. always dare to see it for what it could be.
                </p>
                <div className="flex items-center justify-center gap-3 pt-1">
                  <a 
                    href="https://github.com/holegots/hacknews-cn" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="px-2 py-1 bg-gradient-to-r from-gray-500/10 to-gray-600/10 border border-gray-200/30 rounded-full hover:opacity-80 transition-opacity"
                  >
                    <div className="flex items-center gap-1">
                      <svg className="w-3 h-3 fill-current text-gray-600" viewBox="0 0 24 24">
                        <path d="M12 0C5.374 0 0 5.373 0 12 0 17.302 3.438 21.8 8.207 23.387c.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                      </svg>
                      <span className="text-xs text-gray-600">GitHub</span>
                    </div>
                  </a>
                  <div className="px-3 py-1 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-200/30 rounded-full">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse"></div>
                      <a 
                        href="https://www.volcengine.com/product/ark" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs font-medium bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent hover:opacity-80 transition-opacity"
                      >
                        Powered by Doubao 1.6
                      </a>
                      <span className="text-xs">🚀</span>
                    </div>
                  </div>
                </div>
                </div>
              </div>
            </div>
          </header>
          <main className="max-w-4xl mx-auto px-4 py-8">
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  )
}