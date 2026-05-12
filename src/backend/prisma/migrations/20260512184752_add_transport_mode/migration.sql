-- CreateEnum
CREATE TYPE "TransportMode" AS ENUM ('NEEDS_RIDE', 'SELF', 'DRIVER');

-- AlterTable: Add transportMode column with default
ALTER TABLE "Attendance" ADD COLUMN "transportMode" "TransportMode" NOT NULL DEFAULT 'NEEDS_RIDE';

-- DataMigration: Map existing hasVehicle/vehicleSeats to transportMode
UPDATE "Attendance"
SET "transportMode" = CASE
    WHEN "hasVehicle" = true AND "vehicleSeats" > 1 THEN 'DRIVER'::"TransportMode"
    WHEN "hasVehicle" = true AND "vehicleSeats" = 1 THEN 'SELF'::"TransportMode"
    ELSE 'NEEDS_RIDE'::"TransportMode"
END;

-- AlterTable: Drop old hasVehicle column
ALTER TABLE "Attendance" DROP COLUMN "hasVehicle";
