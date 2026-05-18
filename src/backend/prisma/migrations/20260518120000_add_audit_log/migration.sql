-- CreateEnum
CREATE TYPE "ActionType" AS ENUM (
    'EVENT_CREATED',
    'EVENT_UPDATED',
    'EVENT_DELETED',
    'PARTICIPANT_JOINED',
    'PARTICIPANT_DECLINED',
    'PARTICIPANT_REMOVED',
    'PARTICIPANT_UPDATED',
    'PARTICIPANT_INVITED',
    'RIDE_ASSIGNED',
    'RIDE_UNASSIGNED'
);

-- AlterTable
ALTER TABLE "Attendance"
ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "AuditLogEntry" (
    "id" SERIAL NOT NULL,
    "eventId" INTEGER NOT NULL,
    "actorId" INTEGER NOT NULL,
    "impersonatorId" INTEGER,
    "actionType" "ActionType" NOT NULL,
    "payloadDiff" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLogEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLogEntry_eventId_createdAt_idx" ON "AuditLogEntry"("eventId", "createdAt");

-- AddForeignKey
ALTER TABLE "AuditLogEntry" ADD CONSTRAINT "AuditLogEntry_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLogEntry" ADD CONSTRAINT "AuditLogEntry_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLogEntry" ADD CONSTRAINT "AuditLogEntry_impersonatorId_fkey" FOREIGN KEY ("impersonatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
