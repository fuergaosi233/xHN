import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Hacker News 中文版',
  description: '获取 Hacker News 最新资讯，AI 生成中文摘要',
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
              <h1 className="text-2xl font-normal text-foreground">
                Hacker News 中文版
              </h1>
              <p className="text-sm text-muted-foreground">
                AI 驱动的技术新闻中文摘要
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