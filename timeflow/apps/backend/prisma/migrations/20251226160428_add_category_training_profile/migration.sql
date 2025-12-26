-- CreateTable
CREATE TABLE "CategoryTrainingProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "description" TEXT,
    "includeKeywords" TEXT[],
    "excludeKeywords" TEXT[],
    "exampleEventIds" TEXT[],
    "exampleEventsSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategoryTrainingProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CategoryTrainingProfile_categoryId_key" ON "CategoryTrainingProfile"("categoryId");

-- CreateIndex
CREATE INDEX "CategoryTrainingProfile_userId_idx" ON "CategoryTrainingProfile"("userId");

-- AddForeignKey
ALTER TABLE "CategoryTrainingProfile" ADD CONSTRAINT "CategoryTrainingProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryTrainingProfile" ADD CONSTRAINT "CategoryTrainingProfile_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

