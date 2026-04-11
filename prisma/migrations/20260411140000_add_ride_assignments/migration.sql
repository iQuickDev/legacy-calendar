-- CreateTable
CREATE TABLE "RideAssignment" (
    "id" SERIAL NOT NULL,
    "eventId" INTEGER NOT NULL,
    "driverId" INTEGER NOT NULL,
    "passengerId" INTEGER NOT NULL,

    CONSTRAINT "RideAssignment_pkey" PRIMARY KEY ("id")
);

-- Copy existing ride assignments from Attendance into the new table
INSERT INTO "RideAssignment" ("eventId", "driverId", "passengerId")
SELECT "eventId", "driverId", "userId"
FROM "Attendance"
WHERE "driverId" IS NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "RideAssignment_eventId_passengerId_key" ON "RideAssignment"("eventId", "passengerId");
CREATE INDEX "RideAssignment_eventId_driverId_idx" ON "RideAssignment"("eventId", "driverId");

-- AddForeignKey
ALTER TABLE "RideAssignment" ADD CONSTRAINT "RideAssignment_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RideAssignment" ADD CONSTRAINT "RideAssignment_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RideAssignment" ADD CONSTRAINT "RideAssignment_passengerId_fkey" FOREIGN KEY ("passengerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DropForeignKey
ALTER TABLE "Attendance" DROP CONSTRAINT "Attendance_driverId_fkey";

-- DropColumn
ALTER TABLE "Attendance" DROP COLUMN "driverId";
