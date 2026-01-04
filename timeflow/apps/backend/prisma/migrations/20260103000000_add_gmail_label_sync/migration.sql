-- AlterTable
ALTER TABLE "EmailCategoryConfig" ADD COLUMN     "gmailLabelId" TEXT;
ALTER TABLE "EmailCategoryConfig" ADD COLUMN     "gmailSyncEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "GmailLabelSyncState" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastSyncedAt" TIMESTAMP(3),
    "lastSyncThreadCount" INTEGER NOT NULL DEFAULT 0,
    "lastSyncError" TEXT,
    "watchEnabled" BOOLEAN NOT NULL DEFAULT false,
    "watchResourceId" TEXT,
    "watchTopicName" TEXT,
    "backfillDays" INTEGER NOT NULL DEFAULT 7,
    "backfillMaxThreads" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GmailLabelSyncState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GmailLabelSyncState_userId_key" ON "GmailLabelSyncState"("userId");

-- CreateIndex
CREATE INDEX "GmailLabelSyncState_userId_idx" ON "GmailLabelSyncState"("userId");

-- AddForeignKey
ALTER TABLE "GmailLabelSyncState" ADD CONSTRAINT "GmailLabelSyncState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
