-- AlterTable
ALTER TABLE IF EXISTS "GmailLabelSyncState" ADD COLUMN     "watchEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "watchResourceId" TEXT,
ADD COLUMN     "watchTopicName" TEXT;
