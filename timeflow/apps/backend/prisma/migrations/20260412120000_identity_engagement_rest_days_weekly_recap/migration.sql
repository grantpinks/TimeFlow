-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "notifyWeeklyIdentityRecap" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastWeeklyRecapSentAt" TIMESTAMP(3);

-- AlterTable Identity
ALTER TABLE "Identity" ADD COLUMN IF NOT EXISTS "completionCountTotal" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Identity" ADD COLUMN IF NOT EXISTS "milestoneTier" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Identity" ADD COLUMN IF NOT EXISTS "currentStreak" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Identity" ADD COLUMN IF NOT EXISTS "longestStreak" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE IF NOT EXISTS "UserRestDay" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "localDate" TEXT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT 'rest',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRestDay_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserRestDay_userId_localDate_key" ON "UserRestDay"("userId", "localDate");
CREATE INDEX IF NOT EXISTS "UserRestDay_userId_idx" ON "UserRestDay"("userId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'UserRestDay_userId_fkey'
  ) THEN
    ALTER TABLE "UserRestDay" ADD CONSTRAINT "UserRestDay_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
