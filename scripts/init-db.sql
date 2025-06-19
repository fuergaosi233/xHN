-- 创建数据库表 (仅在手动设置时使用)
-- Vercel Postgres 会自动处理 Drizzle migrations

-- 任务队列表
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
);

-- 索引
CREATE INDEX IF NOT EXISTS status_idx ON processing_queue(status);
CREATE INDEX IF NOT EXISTS created_at_idx ON processing_queue(created_at);
CREATE INDEX IF NOT EXISTS priority_idx ON processing_queue(priority);

-- 处理结果缓存表
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
);

-- 索引
CREATE INDEX IF NOT EXISTS story_id_idx ON processed_stories(story_id);
CREATE INDEX IF NOT EXISTS expires_at_idx ON processed_stories(expires_at);

-- 系统配置表
CREATE TABLE IF NOT EXISTS system_config (
  id SERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 处理统计表
CREATE TABLE IF NOT EXISTS processing_stats (
  id SERIAL PRIMARY KEY,
  date TEXT NOT NULL,
  total_processed INTEGER DEFAULT 0,
  total_failed INTEGER DEFAULT 0,
  avg_processing_time INTEGER DEFAULT 0,
  model_breakdown JSONB,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS date_idx ON processing_stats(date);

-- 插入默认配置
INSERT INTO system_config (key, value, description) VALUES
  ('cache_duration_hours', '24', '缓存持续时间（小时）'),
  ('max_concurrent_processing', '3', '最大并发处理数'),
  ('default_retry_attempts', '3', '默认重试次数')
ON CONFLICT (key) DO NOTHING;