-- AlterTable
ALTER TABLE "Habit" ADD COLUMN     "priorityRank" INTEGER;

-- AlterTable
ALTER TABLE "HabitCompletion" ADD COLUMN     "actualDurationMinutes" INTEGER;

-- CreateIndex
CREATE INDEX "Habit_userId_priorityRank_idx" ON "Habit"("userId", "priorityRank");
