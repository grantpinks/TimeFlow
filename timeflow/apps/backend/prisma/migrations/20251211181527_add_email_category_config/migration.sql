-- CreateTable
CREATE TABLE "EmailCategoryConfig" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "color" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "name" TEXT,
    "description" TEXT,
    "emoji" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailCategoryConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailCategoryConfig_userId_idx" ON "EmailCategoryConfig"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailCategoryConfig_userId_categoryId_key" ON "EmailCategoryConfig"("userId", "categoryId");

-- AddForeignKey
ALTER TABLE "EmailCategoryConfig" ADD CONSTRAINT "EmailCategoryConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
