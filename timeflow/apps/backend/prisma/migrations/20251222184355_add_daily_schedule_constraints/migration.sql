-- AlterTable
ALTER TABLE "User" ADD COLUMN     "dailyScheduleConstraints" JSONB;

UPDATE "User"
SET "dailyScheduleConstraints" = (
  jsonb_build_object(
    'monday', jsonb_build_object('wakeTime', "wakeTime", 'sleepTime', "sleepTime"),
    'tuesday', jsonb_build_object('wakeTime', "wakeTime", 'sleepTime', "sleepTime"),
    'wednesday', jsonb_build_object('wakeTime', "wakeTime", 'sleepTime', "sleepTime"),
    'thursday', jsonb_build_object('wakeTime', "wakeTime", 'sleepTime', "sleepTime"),
    'friday', jsonb_build_object('wakeTime', "wakeTime", 'sleepTime', "sleepTime"),
    'saturday', jsonb_build_object('wakeTime', "wakeTime", 'sleepTime', "sleepTime"),
    'sunday', jsonb_build_object('wakeTime', "wakeTime", 'sleepTime', "sleepTime")
  ) || COALESCE("dailySchedule", '{}'::jsonb)
)
WHERE "dailyScheduleConstraints" IS NULL;
