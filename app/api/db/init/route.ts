import { NextResponse } from 'next/server'
import { getDb, checkDbConnection } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { log } from '@/lib/logger'

export async function POST() {
  try {
    // 检查数据库连接
    const connectionCheck = await checkDbConnection()
    if (!connectionCheck.success) {
      return NextResponse.json({
        success: false,
        error: 'Database connection failed',
        details: connectionCheck.error
      }, { status: 500 })
    }

    // 获取数据库实例
    const database = await getDb()

    // 执行数据库初始化脚本
    await database.execute(sql`
      CREATE TABLE IF NOT EXISTS processing_queue (
        id SERIAL PRIMARY KEY,
        story_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        url TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        priority INTEGER DEFAULT 0,
        attempts INTEGER DEFAULT 0,
        max_attempts INTEGER DEFAULT 3,
        error TEXT,
        result JSONB,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
        processing_started_at TIMESTAMP,
        completed_at TIMESTAMP
      )
    `)

    await database.execute(sql`
      CREATE TABLE IF NOT EXISTS processed_stories (
        id SERIAL PRIMARY KEY,
        story_id INTEGER NOT NULL UNIQUE,
        title TEXT NOT NULL,
        url TEXT,
        chinese_title TEXT,
        summary TEXT,
        original_data JSONB,
        processing_time INTEGER,
        model_used TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
        expires_at TIMESTAMP NOT NULL
      )
    `)

    await database.execute(sql`
      CREATE TABLE IF NOT EXISTS system_config (
        id SERIAL PRIMARY KEY,
        key TEXT NOT NULL UNIQUE,
        value TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `)

    await database.execute(sql`
      CREATE TABLE IF NOT EXISTS processing_stats (
        id SERIAL PRIMARY KEY,
        date TEXT NOT NULL,
        total_processed INTEGER DEFAULT 0,
        total_failed INTEGER DEFAULT 0,
        avg_processing_time INTEGER DEFAULT 0,
        model_breakdown JSONB,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `)

    // 创建索引
    await database.execute(sql`CREATE INDEX IF NOT EXISTS status_idx ON processing_queue(status)`)
    await database.execute(sql`CREATE INDEX IF NOT EXISTS created_at_idx ON processing_queue(created_at)`)
    await database.execute(sql`CREATE INDEX IF NOT EXISTS priority_idx ON processing_queue(priority)`)
    await database.execute(sql`CREATE INDEX IF NOT EXISTS story_id_idx ON processed_stories(story_id)`)
    await database.execute(sql`CREATE INDEX IF NOT EXISTS expires_at_idx ON processed_stories(expires_at)`)
    await database.execute(sql`CREATE INDEX IF NOT EXISTS date_idx ON processing_stats(date)`)

    // 插入默认配置
    await database.execute(sql`
      INSERT INTO system_config (key, value, description) VALUES
        ('cache_duration_hours', '24', '缓存持续时间（小时）'),
        ('max_concurrent_processing', '3', '最大并发处理数'),
        ('default_retry_attempts', '3', '默认重试次数')
      ON CONFLICT (key) DO NOTHING
    `)

    return NextResponse.json({
      success: true,
      message: 'Database initialized successfully'
    })

  } catch (error) {
    log.error('Database initialization failed in /api/db/init:', { error: error instanceof Error ? error : undefined })
    return NextResponse.json({
      success: false,
      error: 'Database initialization failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    const connectionCheck = await checkDbConnection()
    
    if (!connectionCheck.success) {
      return NextResponse.json({
        success: false,
        status: 'disconnected',
        error: connectionCheck.error
      })
    }

    // 获取数据库实例并检查表是否存在
    const database = await getDb()
    
    const tables = await database.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('processing_queue', 'processed_stories', 'system_config', 'processing_stats')
    `)

    return NextResponse.json({
      success: true,
      status: 'connected',
      tables: Array.isArray(tables) ? tables.map((row: any) => row.table_name) : tables.rows?.map((row: any) => row.table_name) || [],
      tablesCount: Array.isArray(tables) ? tables.length : tables.rows?.length || 0,
      expectedTables: 4
    })

  } catch (error) {
    log.error('Database status check failed in /api/db/init:', { error: error instanceof Error ? error : undefined })
    return NextResponse.json({
      success: false,
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}