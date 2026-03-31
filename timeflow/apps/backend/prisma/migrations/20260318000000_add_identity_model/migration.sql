-- CreateTable: Identity model
CREATE TABLE "Identity" (
    "id"          TEXT NOT NULL,
    "userId"      TEXT NOT NULL,
    "name"        TEXT NOT NULL,
    "description" TEXT,
    "color"       TEXT NOT NULL,
    "icon"        TEXT NOT NULL,
    "sortOrder"   INTEGER NOT NULL DEFAULT 0,
    "isActive"    BOOLEAN NOT NULL DEFAULT true,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Identity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Identity_userId_name_key" ON "Identity"("userId", "name");
CREATE INDEX "Identity_userId_idx" ON "Identity"("userId");
CREATE INDEX "Identity_userId_sortOrder_idx" ON "Identity"("userId", "sortOrder");

-- AddForeignKey: Identity → User
ALTER TABLE "Identity" ADD CONSTRAINT "Identity_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: Add identityId to Task
ALTER TABLE "Task" ADD COLUMN "identityId" TEXT;
CREATE INDEX "Task_identityId_idx" ON "Task"("identityId");

-- AddForeignKey: Task → Identity
ALTER TABLE "Task" ADD CONSTRAINT "Task_identityId_fkey"
    FOREIGN KEY ("identityId") REFERENCES "Identity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: Add identityId to Habit
ALTER TABLE "Habit" ADD COLUMN "identityId" TEXT;
CREATE INDEX "Habit_identityId_idx" ON "Habit"("identityId");

-- AddForeignKey: Habit → Identity
ALTER TABLE "Habit" ADD CONSTRAINT "Habit_identityId_fkey"
    FOREIGN KEY ("identityId") REFERENCES "Identity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
