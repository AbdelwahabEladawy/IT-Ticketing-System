ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isOnline" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastSeenAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "presenceUpdatedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "presenceSessionId" TEXT;

CREATE TABLE IF NOT EXISTS "RebalanceJob" (
  "id" TEXT PRIMARY KEY,
  "specializationId" TEXT NOT NULL,
  "trigger" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3)
);

CREATE INDEX IF NOT EXISTS "User_specializationId_isOnline_idx"
  ON "User"("specializationId", "isOnline");
CREATE INDEX IF NOT EXISTS "User_lastSeenAt_idx"
  ON "User"("lastSeenAt");
CREATE INDEX IF NOT EXISTS "RebalanceJob_specializationId_status_idx"
  ON "RebalanceJob"("specializationId", "status");
CREATE INDEX IF NOT EXISTS "RebalanceJob_createdAt_idx"
  ON "RebalanceJob"("createdAt");

