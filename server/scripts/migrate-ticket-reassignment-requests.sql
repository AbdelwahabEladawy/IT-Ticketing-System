DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'TicketReassignmentRequestStatus'
  ) THEN
    CREATE TYPE "TicketReassignmentRequestStatus" AS ENUM (
      'PENDING',
      'APPROVED',
      'REJECTED',
      'AUTO_APPROVED'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "TicketReassignmentRequest" (
  "id" TEXT PRIMARY KEY,
  "ticketId" TEXT NOT NULL,
  "requestedById" TEXT NOT NULL,
  "fromEngineerId" TEXT,
  "toEngineerId" TEXT NOT NULL,
  "status" "TicketReassignmentRequestStatus" NOT NULL DEFAULT 'PENDING',
  "reason" TEXT,
  "rejectionReason" TEXT,
  "autoApproveAt" TIMESTAMP(3) NOT NULL,
  "decidedAt" TIMESTAMP(3),
  "autoApprovedAt" TIMESTAMP(3),
  "processedAt" TIMESTAMP(3),
  "decidedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'TicketReassignmentRequest_ticketId_fkey'
  ) THEN
    ALTER TABLE "TicketReassignmentRequest"
      ADD CONSTRAINT "TicketReassignmentRequest_ticketId_fkey"
        FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'TicketReassignmentRequest_requestedById_fkey'
  ) THEN
    ALTER TABLE "TicketReassignmentRequest"
      ADD CONSTRAINT "TicketReassignmentRequest_requestedById_fkey"
        FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'TicketReassignmentRequest_fromEngineerId_fkey'
  ) THEN
    ALTER TABLE "TicketReassignmentRequest"
      ADD CONSTRAINT "TicketReassignmentRequest_fromEngineerId_fkey"
        FOREIGN KEY ("fromEngineerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'TicketReassignmentRequest_toEngineerId_fkey'
  ) THEN
    ALTER TABLE "TicketReassignmentRequest"
      ADD CONSTRAINT "TicketReassignmentRequest_toEngineerId_fkey"
        FOREIGN KEY ("toEngineerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'TicketReassignmentRequest_decidedById_fkey'
  ) THEN
    ALTER TABLE "TicketReassignmentRequest"
      ADD CONSTRAINT "TicketReassignmentRequest_decidedById_fkey"
        FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "TicketReassignmentRequest_ticketId_createdAt_idx"
  ON "TicketReassignmentRequest"("ticketId", "createdAt");

CREATE INDEX IF NOT EXISTS "TicketReassignmentRequest_requestedById_createdAt_idx"
  ON "TicketReassignmentRequest"("requestedById", "createdAt");

CREATE INDEX IF NOT EXISTS "TicketReassignmentRequest_status_autoApproveAt_idx"
  ON "TicketReassignmentRequest"("status", "autoApproveAt");

CREATE INDEX IF NOT EXISTS "TicketReassignmentRequest_toEngineerId_createdAt_idx"
  ON "TicketReassignmentRequest"("toEngineerId", "createdAt");

CREATE UNIQUE INDEX IF NOT EXISTS "TicketReassignmentRequest_one_pending_per_ticket_idx"
  ON "TicketReassignmentRequest"("ticketId")
  WHERE "status" = 'PENDING';
