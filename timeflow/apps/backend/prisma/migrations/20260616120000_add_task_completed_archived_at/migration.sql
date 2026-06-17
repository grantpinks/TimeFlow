-- Add completion and archive timestamps for tasks
ALTER TABLE "Task" ADD COLUMN "completedAt" TIMESTAMP(3);
ALTER TABLE "Task" ADD COLUMN "archivedAt" TIMESTAMP(3);

-- Backfill completedAt from updatedAt for existing completed tasks
UPDATE "Task"
SET "completedAt" = "updatedAt"
WHERE "status" = 'completed' AND "completedAt" IS NULL;
