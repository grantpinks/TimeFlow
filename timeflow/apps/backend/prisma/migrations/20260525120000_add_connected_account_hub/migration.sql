-- CreateEnum
CREATE TYPE "ConnectedAccountProvider" AS ENUM ('google', 'apple_caldav');

-- CreateTable
CREATE TABLE "ConnectedAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "ConnectedAccountProvider" NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "googleAccessToken" TEXT,
    "googleAccessTokenExpiry" TIMESTAMP(3),
    "googleRefreshToken" TEXT,
    "caldavBaseUrl" TEXT,
    "caldavPrincipalUrl" TEXT,
    "caldavCalendarHomeUrl" TEXT,
    "caldavAppPasswordEncrypted" TEXT,
    "lastSuccessAt" TIMESTAMP(3),
    "lastErrorAt" TIMESTAMP(3),
    "lastErrorCode" TEXT,
    "lastErrorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConnectedAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConnectedCalendar" (
    "id" TEXT NOT NULL,
    "connectedAccountId" TEXT NOT NULL,
    "externalCalendarId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "useForAvailability" BOOLEAN NOT NULL DEFAULT true,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConnectedCalendar_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConnectedAccount_userId_idx" ON "ConnectedAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ConnectedAccount_userId_provider_providerAccountId_key" ON "ConnectedAccount"("userId", "provider", "providerAccountId");

-- CreateIndex
CREATE INDEX "ConnectedCalendar_connectedAccountId_idx" ON "ConnectedCalendar"("connectedAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "ConnectedCalendar_connectedAccountId_externalCalendarId_key" ON "ConnectedCalendar"("connectedAccountId", "externalCalendarId");

-- AddForeignKey
ALTER TABLE "ConnectedAccount" ADD CONSTRAINT "ConnectedAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConnectedCalendar" ADD CONSTRAINT "ConnectedCalendar_connectedAccountId_fkey" FOREIGN KEY ("connectedAccountId") REFERENCES "ConnectedAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
