-- CreateEnum
CREATE TYPE "AiMedicalAnalyzerRunStatus" AS ENUM ('SUCCESS', 'EMPTY', 'ERROR');

-- CreateTable
CREATE TABLE "AiMedicalAnalyzerRun" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "imagesCount" INTEGER NOT NULL DEFAULT 0,
    "status" "AiMedicalAnalyzerRunStatus" NOT NULL,
    "errorMessage" TEXT,
    "resultJson" JSONB,
    "cost" INTEGER NOT NULL DEFAULT 0,
    "charged" BOOLEAN NOT NULL DEFAULT false,
    "balanceAfter" INTEGER,

    CONSTRAINT "AiMedicalAnalyzerRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiMedicalAnalyzerRun_userId_createdAt_idx" ON "AiMedicalAnalyzerRun"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "AiMedicalAnalyzerRun" ADD CONSTRAINT "AiMedicalAnalyzerRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

