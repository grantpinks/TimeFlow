-- AlterTable
ALTER TABLE "User" ADD COLUMN "notifyStreakAtRisk" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "notifyMissedHighPriority" BOOLEAN NOT NULL DEFAULT false;
