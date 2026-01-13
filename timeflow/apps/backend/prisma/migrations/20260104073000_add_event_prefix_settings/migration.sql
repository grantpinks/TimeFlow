-- AlterTable
ALTER TABLE "User" ADD COLUMN     "eventPrefixEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN     "eventPrefix" TEXT NOT NULL DEFAULT 'TF|';
