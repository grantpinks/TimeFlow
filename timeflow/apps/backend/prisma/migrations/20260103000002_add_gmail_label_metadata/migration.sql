-- AlterTable
ALTER TABLE "EmailCategoryConfig" ADD COLUMN     "gmailLabelName" TEXT;
ALTER TABLE "EmailCategoryConfig" ADD COLUMN     "gmailLabelColor" TEXT;

-- AlterTable
ALTER TABLE "GmailLabelSyncState" ADD COLUMN     "lastHistoryId" TEXT;
ALTER TABLE "GmailLabelSyncState" ADD COLUMN     "watchExpiration" TIMESTAMP(3);
