-- AlterTable
ALTER TABLE "GmailLabelSyncState" ADD COLUMN     "watchEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "watchResourceId" TEXT,
ADD COLUMN     "watchTopicName" TEXT;
