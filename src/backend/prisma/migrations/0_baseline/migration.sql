-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "profilePicture" TEXT,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FcmToken" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FcmToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "color" TEXT DEFAULT '#ffffff',
    "description" TEXT,
    "location" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "hostId" INTEGER NOT NULL,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "hasAlcohol" BOOLEAN NOT NULL DEFAULT false,
    "hasFood" BOOLEAN NOT NULL DEFAULT false,
    "hasSleep" BOOLEAN NOT NULL DEFAULT false,
    "hasWeed" BOOLEAN NOT NULL DEFAULT false,
    "alcoholPrice" DOUBLE PRECISION,
    "beerPrice" DOUBLE PRECISION,
    "foodPrice" DOUBLE PRECISION,
    "hasBeer" BOOLEAN NOT NULL DEFAULT false,
    "sleepPrice" DOUBLE PRECISION,
    "weedPrice" DOUBLE PRECISION,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "participationDeadline" TIMESTAMP(3),

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "eventId" INTEGER NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "wantsAlcohol" BOOLEAN NOT NULL DEFAULT false,
    "wantsFood" BOOLEAN NOT NULL DEFAULT false,
    "wantsSleep" BOOLEAN NOT NULL DEFAULT false,
    "wantsWeed" BOOLEAN NOT NULL DEFAULT false,
    "wantsBeer" BOOLEAN NOT NULL DEFAULT false,
    "hasVehicle" BOOLEAN NOT NULL DEFAULT false,
    "vehicleSeats" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RideAssignment" (
    "id" SERIAL NOT NULL,
    "eventId" INTEGER NOT NULL,
    "driverId" INTEGER NOT NULL,
    "passengerId" INTEGER NOT NULL,

    CONSTRAINT "RideAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "FcmToken_token_key" ON "FcmToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_userId_eventId_key" ON "Attendance"("userId", "eventId");

-- CreateIndex
CREATE INDEX "RideAssignment_eventId_driverId_idx" ON "RideAssignment"("eventId", "driverId");

-- CreateIndex
CREATE UNIQUE INDEX "RideAssignment_eventId_passengerId_key" ON "RideAssignment"("eventId", "passengerId");

-- AddForeignKey
ALTER TABLE "FcmToken" ADD CONSTRAINT "FcmToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RideAssignment" ADD CONSTRAINT "RideAssignment_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RideAssignment" ADD CONSTRAINT "RideAssignment_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RideAssignment" ADD CONSTRAINT "RideAssignment_passengerId_fkey" FOREIGN KEY ("passengerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
