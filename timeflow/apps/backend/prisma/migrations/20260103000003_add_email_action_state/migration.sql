-- Create EmailActionState table
CREATE TABLE "EmailActionState" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "actionState" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailActionState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmailActionState_userId_threadId_key" ON "EmailActionState"("userId", "threadId");
CREATE INDEX "EmailActionState_userId_idx" ON "EmailActionState"("userId");
CREATE INDEX "EmailActionState_threadId_idx" ON "EmailActionState"("threadId");

ALTER TABLE "EmailActionState"
  ADD CONSTRAINT "EmailActionState_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
