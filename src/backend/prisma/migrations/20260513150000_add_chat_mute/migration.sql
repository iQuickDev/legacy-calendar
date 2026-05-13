-- CreateTable
CREATE TABLE "ChatMute" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "eventId" INTEGER NOT NULL,

    CONSTRAINT "ChatMute_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChatMute_userId_eventId_key" ON "ChatMute"("userId", "eventId");

-- CreateIndex
CREATE INDEX "ChatMute_eventId_idx" ON "ChatMute"("eventId");

-- AddForeignKey
ALTER TABLE "ChatMute" ADD CONSTRAINT "ChatMute_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMute" ADD CONSTRAINT "ChatMute_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
