-- CreateTable
CREATE TABLE "InboxCache" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InboxCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InboxCache_userId_cacheKey_key" ON "InboxCache"("userId", "cacheKey");

-- CreateIndex
CREATE INDEX "InboxCache_userId_idx" ON "InboxCache"("userId");

-- AddForeignKey
ALTER TABLE "InboxCache" ADD CONSTRAINT "InboxCache_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
