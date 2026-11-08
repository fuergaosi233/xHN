/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['axios', 'jsdom', 'winston', 'pg', 'sharp'],
    instrumentationHook: true
  },
  async rewrites() {
    return [
      {
        source: '/api/hn/:path*',
        destination: 'https://hacker-news.firebaseio.com/v0/:path*'
      }
    ]
  }
}

module.exports = nextConfig