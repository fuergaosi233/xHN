import { sql, lt } from 'drizzle-orm'
import * as schema from './schema'

// 动态导入和连接配置
let db: any
let dbType: 'vercel' | 'local' = 'local'

// 检测运行环境
function detectEnvironment() {
  // 如果在 Vercel 环境
  if (process.env.VERCEL) {
    return 'vercel'
  }
  
  // 如果有 POSTGRES_PRISMA_URL 并且它不指向本地主机，则是 Vercel
  if (process.env.POSTGRES_PRISMA_URL && !process.env.POSTGRES_PRISMA_URL.includes('localhost')) {
    return 'vercel'
  }
  
  return 'local'
}

// 初始化数据库连接
async function initializeDb() {
  if (db) return db

  dbType = detectEnvironment()
  
  try {
    if (dbType === 'vercel') {
      // Vercel 环境
      const { drizzle } = await import('drizzle-orm/vercel-postgres')
      const { sql: vercelSql } = await import('@vercel/postgres')
      db = drizzle(vercelSql, { schema })
    } else {
      // 本地开发环境
      const { drizzle } = await import('drizzle-orm/node-postgres')
      const { Pool } = await import('pg')
      
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      })
      
      db = drizzle(pool, { schema })
    }
  } catch (error) {
    console.error('Failed to initialize database:', error)
    throw error
  }
  
  return db
}

// 获取数据库实例
export async function getDb() {
  return await initializeDb()
}

// 兼容性导出
export { getDb as db }

// 数据库连接检查
export async function checkDbConnection() {
  try {
    const database = await getDb()
    
    if (dbType === 'vercel') {
      const { sql: vercelSql } = await import('@vercel/postgres')
      const result = await vercelSql`SELECT 1 as test`
      return { success: true, data: result }
    } else {
      const result = await database.execute(sql`SELECT 1 as test`)
      return { success: true, data: result }
    }
  } catch (error) {
    console.error('Database connection failed:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// 清理过期缓存
export async function cleanupExpiredCache() {
  try {
    const database = await getDb()
    const now = new Date()
    const result = await database.delete(schema.processedStories)
      .where(lt(schema.processedStories.expiresAt, now))
    
    console.log(`Cleaned up ${result.rowCount || 0} expired cache entries`)
    return result.rowCount || 0
  } catch (error) {
    console.error('Cache cleanup failed:', error)
    return 0
  }
}