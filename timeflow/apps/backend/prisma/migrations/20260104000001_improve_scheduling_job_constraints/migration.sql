-- CreateEnum
CREATE TYPE "SchedulingJobStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'FAILED');

-- AlterTable: Convert status column to enum and add default
ALTER TABLE "scheduling_jobs"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "SchedulingJobStatus" USING (
    CASE
      WHEN "status" = 'in_progress' THEN 'IN_PROGRESS'::"SchedulingJobStatus"
      WHEN "status" = 'completed' THEN 'COMPLETED'::"SchedulingJobStatus"
      WHEN "status" = 'cancelled' THEN 'CANCELLED'::"SchedulingJobStatus"
      WHEN "status" = 'failed' THEN 'FAILED'::"SchedulingJobStatus"
      ELSE 'IN_PROGRESS'::"SchedulingJobStatus"
    END
  ),
  ALTER COLUMN "status" SET DEFAULT 'IN_PROGRESS'::"SchedulingJobStatus";

-- AlterTable: Add default empty array for createdEventIds
ALTER TABLE "scheduling_jobs"
  ALTER COLUMN "createdEventIds" SET DEFAULT ARRAY[]::TEXT[];

-- CreateIndex: Add index for status queries
CREATE INDEX "scheduling_jobs_userId_status_idx" ON "scheduling_jobs"("userId", "status");
