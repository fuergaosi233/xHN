CREATE TABLE IF NOT EXISTS "processed_stories" (
	"id" serial PRIMARY KEY NOT NULL,
	"story_id" integer NOT NULL,
	"title" text NOT NULL,
	"url" text,
	"chinese_title" text,
	"summary" text,
	"content" text,
	"tags" jsonb,
	"category" text,
	"original_data" jsonb,
	"processing_time" integer,
	"model_used" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	CONSTRAINT "processed_stories_story_id_unique" UNIQUE("story_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "processing_queue" (
	"id" serial PRIMARY KEY NOT NULL,
	"story_id" integer NOT NULL,
	"title" text NOT NULL,
	"url" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"priority" integer DEFAULT 0,
	"attempts" integer DEFAULT 0,
	"max_attempts" integer DEFAULT 3,
	"error" text,
	"result" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"processing_started_at" timestamp,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "processing_stats" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" text NOT NULL,
	"total_processed" integer DEFAULT 0,
	"total_failed" integer DEFAULT 0,
	"avg_processing_time" integer DEFAULT 0,
	"model_breakdown" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "story_relations" (
	"id" serial PRIMARY KEY NOT NULL,
	"story_id_1" integer NOT NULL,
	"story_id_2" integer NOT NULL,
	"similarity" text NOT NULL,
	"relation_type" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "system_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "system_config_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "story_id_idx" ON "processed_stories" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "expires_at_idx" ON "processed_stories" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "category_idx" ON "processed_stories" USING btree ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "status_idx" ON "processing_queue" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "created_at_idx" ON "processing_queue" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "priority_idx" ON "processing_queue" USING btree ("priority");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "date_idx" ON "processing_stats" USING btree ("date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "story_relations_idx" ON "story_relations" USING btree ("story_id_1","story_id_2");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "similarity_idx" ON "story_relations" USING btree ("similarity");