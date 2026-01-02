-- DropIndex
DROP INDEX "EventCategorization_categoryId_idx";

-- DropIndex
DROP INDEX "EventCategorization_userId_idx";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "inboxViews" JSONB;
