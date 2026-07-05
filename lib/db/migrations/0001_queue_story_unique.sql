DROP INDEX IF EXISTS "story_id_idx";--> statement-breakpoint
DELETE FROM "processing_queue" a USING "processing_queue" b WHERE a."story_id" = b."story_id" AND a."id" < b."id";--> statement-breakpoint
ALTER TABLE "processing_queue" ADD CONSTRAINT "processing_queue_story_id_unique" UNIQUE("story_id");
