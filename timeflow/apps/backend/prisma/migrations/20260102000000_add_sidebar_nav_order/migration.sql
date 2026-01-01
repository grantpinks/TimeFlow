-- AlterTable
ALTER TABLE "User" ADD COLUMN     "sidebarNavOrder" TEXT[] DEFAULT ARRAY[]::TEXT[];
