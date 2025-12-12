-- CreateTable
CREATE TABLE "ScheduledHabit" (
    "id" TEXT NOT NULL,
    "habitId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "startDateTime" TIMESTAMP(3) NOT NULL,
    "endDateTime" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledHabit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScheduledHabit_habitId_idx" ON "ScheduledHabit"("habitId");

-- CreateIndex
CREATE INDEX "ScheduledHabit_userId_idx" ON "ScheduledHabit"("userId");

-- AddForeignKey
ALTER TABLE "ScheduledHabit" ADD CONSTRAINT "ScheduledHabit_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "Habit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledHabit" ADD CONSTRAINT "ScheduledHabit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
