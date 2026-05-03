-- AlterTable
ALTER TABLE "Profile" ADD COLUMN "birthDate" DATE;

-- CreateTable
CREATE TABLE "LobbyMessage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" VARCHAR(1600) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LobbyMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LobbyMessageReaction" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" VARCHAR(24) NOT NULL,

    CONSTRAINT "LobbyMessageReaction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LobbyMessage_createdAt_idx" ON "LobbyMessage"("createdAt" DESC);

CREATE INDEX "LobbyMessageReaction_messageId_idx" ON "LobbyMessageReaction"("messageId");

CREATE UNIQUE INDEX "LobbyMessageReaction_messageId_userId_emoji_key" ON "LobbyMessageReaction"("messageId", "userId", "emoji");

ALTER TABLE "LobbyMessage" ADD CONSTRAINT "LobbyMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LobbyMessageReaction" ADD CONSTRAINT "LobbyMessageReaction_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "LobbyMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LobbyMessageReaction" ADD CONSTRAINT "LobbyMessageReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
