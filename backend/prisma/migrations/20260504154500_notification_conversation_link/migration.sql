-- AlterTable
ALTER TABLE "UserNotification" ADD COLUMN "conversationId" TEXT;

-- CreateIndex
CREATE INDEX "UserNotification_userId_conversationId_idx" ON "UserNotification"("userId", "conversationId");
