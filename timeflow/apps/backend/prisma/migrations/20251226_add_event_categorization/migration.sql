-- CreateTable
CREATE TABLE IF NOT EXISTS "EventCategorization" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "isManual" BOOLEAN NOT NULL DEFAULT false,
    "eventSummary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventCategorization_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "EventCategorization_userId_eventId_provider_key" ON "EventCategorization"("userId", "eventId", "provider");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EventCategorization_userId_idx" ON "EventCategorization"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EventCategorization_categoryId_idx" ON "EventCategorization"("categoryId");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'EventCategorization_userId_fkey'
    ) THEN
        ALTER TABLE "EventCategorization" ADD CONSTRAINT "EventCategorization_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END
$$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'EventCategorization_categoryId_fkey'
    ) THEN
        ALTER TABLE "EventCategorization" ADD CONSTRAINT "EventCategorization_categoryId_fkey"
        FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END
$$;
