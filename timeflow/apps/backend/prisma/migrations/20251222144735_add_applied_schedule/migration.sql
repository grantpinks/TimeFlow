-- CreateTable
CREATE TABLE "AppliedSchedule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "blocks" JSONB NOT NULL,
    "tasksScheduled" INTEGER NOT NULL,
    "habitsScheduled" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppliedSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AppliedSchedule_userId_idx" ON "AppliedSchedule"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AppliedSchedule_userId_requestHash_key" ON "AppliedSchedule"("userId", "requestHash");

-- AddForeignKey
ALTER TABLE "AppliedSchedule" ADD CONSTRAINT "AppliedSchedule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
