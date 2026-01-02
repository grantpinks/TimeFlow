-- AlterTable
ALTER TABLE "ScheduledTask" ADD COLUMN     "blocksAvailability" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "ScheduledHabit" ADD COLUMN     "blocksAvailability" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "SchedulingLink" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "durationsMinutes" INTEGER[],
    "bufferBeforeMinutes" INTEGER NOT NULL DEFAULT 10,
    "bufferAfterMinutes" INTEGER NOT NULL DEFAULT 10,
    "maxBookingHorizonDays" INTEGER NOT NULL DEFAULT 60,
    "dailyCap" INTEGER NOT NULL DEFAULT 6,
    "calendarProvider" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,
    "googleMeetEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchedulingLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Meeting" (
    "id" TEXT NOT NULL,
    "schedulingLinkId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "inviteeName" TEXT NOT NULL,
    "inviteeEmail" TEXT NOT NULL,
    "notes" TEXT,
    "startDateTime" TIMESTAMP(3) NOT NULL,
    "endDateTime" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "googleEventId" TEXT,
    "googleMeetLink" TEXT,
    "appleEventUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "rescheduledAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),

    CONSTRAINT "Meeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingActionToken" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MeetingActionToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppleCalendarAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "appPasswordEncrypted" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL DEFAULT 'https://caldav.icloud.com',
    "principalUrl" TEXT,
    "calendarHomeUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppleCalendarAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SchedulingLink_slug_key" ON "SchedulingLink"("slug");

-- CreateIndex
CREATE INDEX "SchedulingLink_userId_idx" ON "SchedulingLink"("userId");

-- CreateIndex
CREATE INDEX "Meeting_userId_idx" ON "Meeting"("userId");

-- CreateIndex
CREATE INDEX "Meeting_schedulingLinkId_idx" ON "Meeting"("schedulingLinkId");

-- CreateIndex
CREATE UNIQUE INDEX "MeetingActionToken_tokenHash_key" ON "MeetingActionToken"("tokenHash");

-- CreateIndex
CREATE INDEX "MeetingActionToken_meetingId_idx" ON "MeetingActionToken"("meetingId");

-- CreateIndex
CREATE UNIQUE INDEX "AppleCalendarAccount_userId_key" ON "AppleCalendarAccount"("userId");

-- AddForeignKey
ALTER TABLE "SchedulingLink" ADD CONSTRAINT "SchedulingLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_schedulingLinkId_fkey" FOREIGN KEY ("schedulingLinkId") REFERENCES "SchedulingLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingActionToken" ADD CONSTRAINT "MeetingActionToken_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppleCalendarAccount" ADD CONSTRAINT "AppleCalendarAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
