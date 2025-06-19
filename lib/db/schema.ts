import { pgTable, serial, text, integer, timestamp, boolean, jsonb, index } from 'drizzle-orm/pg-core'

// 任务队列表
export const processingQueue = pgTable('processing_queue', {
  id: serial('id').primaryKey(),
  storyId: integer('story_id').notNull(),
  title: text('title').notNull(),
  url: text('url'),
  status: text('status').notNull().default('pending'), // pending, processing, completed, failed
  priority: integer('priority').default(0),
  attempts: integer('attempts').default(0),
  maxAttempts: integer('max_attempts').default(3),
  error: text('error'),
  result: jsonb('result'), // AI处理结果
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  processingStartedAt: timestamp('processing_started_at'),
  completedAt: timestamp('completed_at'),
}, (table) => ({
  statusIdx: index('status_idx').on(table.status),
  createdAtIdx: index('created_at_idx').on(table.createdAt),
  priorityIdx: index('priority_idx').on(table.priority),
}))

// 处理结果缓存表
export const processedStories = pgTable('processed_stories', {
  id: serial('id').primaryKey(),
  storyId: integer('story_id').notNull().unique(),
  title: text('title').notNull(),
  url: text('url'),
  chineseTitle: text('chinese_title'),
  summary: text('summary'),
  content: text('content'), // 文章正文内容，用于向量搜索
  tags: jsonb('tags'), // 从内容提取的标签
  category: text('category'), // 文章分类
  originalData: jsonb('original_data'), // 原始HN数据
  processingTime: integer('processing_time'), // 处理耗时(ms)
  modelUsed: text('model_used'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at').notNull(), // 缓存过期时间
}, (table) => ({
  storyIdIdx: index('story_id_idx').on(table.storyId),
  expiresAtIdx: index('expires_at_idx').on(table.expiresAt),
  categoryIdx: index('category_idx').on(table.category),
}))

// 系统配置表
export const systemConfig = pgTable('system_config', {
  id: serial('id').primaryKey(),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// 处理统计表
export const processingStats = pgTable('processing_stats', {
  id: serial('id').primaryKey(),
  date: text('date').notNull(), // YYYY-MM-DD格式
  totalProcessed: integer('total_processed').default(0),
  totalFailed: integer('total_failed').default(0),
  avgProcessingTime: integer('avg_processing_time').default(0),
  modelBreakdown: jsonb('model_breakdown'), // 各模型使用统计
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  dateIdx: index('date_idx').on(table.date),
}))

// 文章相关性表（为向量搜索做准备）
export const storyRelations = pgTable('story_relations', {
  id: serial('id').primaryKey(),
  storyId1: integer('story_id_1').notNull(),
  storyId2: integer('story_id_2').notNull(),
  similarity: text('similarity').notNull(), // 相似度分数
  relationType: text('relation_type').notNull(), // 相关类型：similar, related, duplicate
  description: text('description'), // 相关性描述
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  storyIdIdx: index('story_relations_idx').on(table.storyId1, table.storyId2),
  similarityIdx: index('similarity_idx').on(table.similarity),
}))

export type ProcessingQueue = typeof processingQueue.$inferSelect
export type NewProcessingQueue = typeof processingQueue.$inferInsert
export type ProcessedStory = typeof processedStories.$inferSelect
export type NewProcessedStory = typeof processedStories.$inferInsert
export type StoryRelation = typeof storyRelations.$inferSelect
export type NewStoryRelation = typeof storyRelations.$inferInsert