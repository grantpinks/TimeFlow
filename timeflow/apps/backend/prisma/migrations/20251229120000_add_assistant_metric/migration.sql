-- CreateTable
CREATE TABLE "AssistantMetric" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "mode" TEXT,
    "conversationId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssistantMetric_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssistantMetric_createdAt_idx" ON "AssistantMetric"("createdAt");

-- CreateIndex
CREATE INDEX "AssistantMetric_type_idx" ON "AssistantMetric"("type");

-- CreateIndex
CREATE INDEX "AssistantMetric_userId_idx" ON "AssistantMetric"("userId");

-- AddForeignKey
ALTER TABLE "AssistantMetric" ADD CONSTRAINT "AssistantMetric_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
