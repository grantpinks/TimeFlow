-- AlterTable
ALTER TABLE "User" ADD COLUMN     "blockedDaysOfWeek" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "dailyMeetingSchedule" JSONB,
ADD COLUMN     "meetingEndTime" TEXT,
ADD COLUMN     "meetingStartTime" TEXT;
