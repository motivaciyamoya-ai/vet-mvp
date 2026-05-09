-- CreateTable
CREATE TABLE "AiRoleAssistantMessage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "role" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "provider" TEXT,
    "model" TEXT,
    "jobTitle" TEXT,

    CONSTRAINT "AiRoleAssistantMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiRoleAssistantMessage_userId_createdAt_idx" ON "AiRoleAssistantMessage"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "AiRoleAssistantMessage" ADD CONSTRAINT "AiRoleAssistantMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

