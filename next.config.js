/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['axios']
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