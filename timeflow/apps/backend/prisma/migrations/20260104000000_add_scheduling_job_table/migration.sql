-- CreateTable
CREATE TABLE "scheduling_jobs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "totalBlocks" INTEGER NOT NULL,
    "completedBlocks" INTEGER NOT NULL DEFAULT 0,
    "createdEventIds" TEXT[],
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scheduling_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scheduling_jobs_userId_createdAt_idx" ON "scheduling_jobs"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "scheduling_jobs" ADD CONSTRAINT "scheduling_jobs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
