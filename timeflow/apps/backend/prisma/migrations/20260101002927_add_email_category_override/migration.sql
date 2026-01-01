-- CreateTable
CREATE TABLE "EmailCategoryOverride" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "overrideType" TEXT NOT NULL,
    "overrideValue" TEXT NOT NULL,
    "categoryName" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailCategoryOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailCategoryOverride_userId_idx" ON "EmailCategoryOverride"("userId");

-- CreateIndex
CREATE INDEX "EmailCategoryOverride_overrideType_overrideValue_idx" ON "EmailCategoryOverride"("overrideType", "overrideValue");

-- CreateIndex
CREATE UNIQUE INDEX "EmailCategoryOverride_userId_overrideType_overrideValue_key" ON "EmailCategoryOverride"("userId", "overrideType", "overrideValue");

-- AddForeignKey
ALTER TABLE "EmailCategoryOverride" ADD CONSTRAINT "EmailCategoryOverride_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
