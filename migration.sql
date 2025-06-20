-- 创建 xHN 数据库表结构

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

-- 处理结果缓存表
CREATE TABLE IF NOT EXISTS processed_stories (
    id SERIAL PRIMARY KEY,
    story_id INTEGER NOT NULL UNIQUE,
    title TEXT NOT NULL,
    url TEXT,
    chinese_title TEXT,
    summary TEXT,
    content TEXT,
    tags JSONB,
    category TEXT,
    original_data JSONB,
    processing_time INTEGER,
    model_used TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMP NOT NULL
);

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

-- 文章相关性表（为向量搜索做准备）
CREATE TABLE IF NOT EXISTS story_relations (
    id SERIAL PRIMARY KEY,
    story_id_1 INTEGER NOT NULL,
    story_id_2 INTEGER NOT NULL,
    similarity TEXT NOT NULL,
    relation_type TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS status_idx ON processing_queue(status);
CREATE INDEX IF NOT EXISTS created_at_idx ON processing_queue(created_at);
CREATE INDEX IF NOT EXISTS priority_idx ON processing_queue(priority);

CREATE INDEX IF NOT EXISTS story_id_idx ON processed_stories(story_id);
CREATE INDEX IF NOT EXISTS expires_at_idx ON processed_stories(expires_at);
CREATE INDEX IF NOT EXISTS category_idx ON processed_stories(category);

CREATE INDEX IF NOT EXISTS date_idx ON processing_stats(date);

CREATE INDEX IF NOT EXISTS story_relations_idx ON story_relations(story_id_1, story_id_2);
CREATE INDEX IF NOT EXISTS similarity_idx ON story_relations(similarity);

-- 插入一些默认配置
INSERT INTO system_config (key, value, description) VALUES 
    ('app_version', '1.0.0', 'xHN应用版本'),
    ('last_migration', 'initial', '最后执行的迁移'),
    ('ai_model', 'doubao-1.6', '当前使用的AI模型')
ON CONFLICT (key) DO NOTHING;