-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'IdentityStage') THEN
    CREATE TYPE "IdentityStage" AS ENUM ('Seed', 'Builder', 'Disciplined', 'Embodied', 'FutureSelf');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'IdentityTrialState') THEN
    CREATE TYPE "IdentityTrialState" AS ENUM ('NotStarted', 'Active', 'CheckpointFailed', 'Passed', 'Failed');
  END IF;
END $$;

-- AlterTable Identity: add evolution fields
ALTER TABLE "Identity"
  ADD COLUMN IF NOT EXISTS "level"               INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "stage"               "IdentityStage" NOT NULL DEFAULT 'Seed',
  ADD COLUMN IF NOT EXISTS "xp"                  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "xpThisPeriod"        INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "xpCapResetAt"        TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "trialState"          "IdentityTrialState" NOT NULL DEFAULT 'NotStarted',
  ADD COLUMN IF NOT EXISTS "trialWindowDays"     INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "trialTargetDays"     INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "trialActiveDays"     INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "trialCheckpointDays" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "trialStartedAt"      TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "trialEndsAt"         TIMESTAMP(3);

-- CreateTable IdentityUnlock
CREATE TABLE IF NOT EXISTS "IdentityUnlock" (
    "id"             TEXT NOT NULL,
    "identityId"     TEXT NOT NULL,
    "userId"         TEXT NOT NULL,
    "unlockKey"      TEXT NOT NULL,
    "unlockType"     TEXT NOT NULL,
    "grantedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "grantedByStage" "IdentityStage",
    "grantedByLevel" INTEGER,

    CONSTRAINT "IdentityUnlock_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "IdentityUnlock_identityId_unlockKey_key" ON "IdentityUnlock"("identityId", "unlockKey");
CREATE INDEX IF NOT EXISTS "IdentityUnlock_identityId_idx" ON "IdentityUnlock"("identityId");
CREATE INDEX IF NOT EXISTS "IdentityUnlock_userId_idx" ON "IdentityUnlock"("userId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'IdentityUnlock_identityId_fkey'
  ) THEN
    ALTER TABLE "IdentityUnlock" ADD CONSTRAINT "IdentityUnlock_identityId_fkey"
      FOREIGN KEY ("identityId") REFERENCES "Identity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- CreateTable IdentityXpEvent
CREATE TABLE IF NOT EXISTS "IdentityXpEvent" (
    "id"         TEXT NOT NULL,
    "identityId" TEXT NOT NULL,
    "userId"     TEXT NOT NULL,
    "xpAmount"   INTEGER NOT NULL,
    "reason"     TEXT NOT NULL,
    "metadata"   JSONB,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdentityXpEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "IdentityXpEvent_identityId_createdAt_idx" ON "IdentityXpEvent"("identityId", "createdAt");
CREATE INDEX IF NOT EXISTS "IdentityXpEvent_userId_createdAt_idx" ON "IdentityXpEvent"("userId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'IdentityXpEvent_identityId_fkey'
  ) THEN
    ALTER TABLE "IdentityXpEvent" ADD CONSTRAINT "IdentityXpEvent_identityId_fkey"
      FOREIGN KEY ("identityId") REFERENCES "Identity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- CreateTable UserFlowCustomization
CREATE TABLE IF NOT EXISTS "UserFlowCustomization" (
    "id"                   TEXT NOT NULL,
    "userId"               TEXT NOT NULL,
    "selectedStageVariant" TEXT NOT NULL DEFAULT 'default',
    "selectedPalette"      TEXT NOT NULL DEFAULT 'default',
    "selectedEmote"        TEXT NOT NULL DEFAULT 'default',
    "selectedAnimationPack" TEXT NOT NULL DEFAULT 'default',
    "updatedAt"            TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserFlowCustomization_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserFlowCustomization_userId_key" ON "UserFlowCustomization"("userId");
CREATE INDEX IF NOT EXISTS "UserFlowCustomization_userId_idx" ON "UserFlowCustomization"("userId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'UserFlowCustomization_userId_fkey'
  ) THEN
    ALTER TABLE "UserFlowCustomization" ADD CONSTRAINT "UserFlowCustomization_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
