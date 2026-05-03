-- CreateEnum
CREATE TYPE "ModerationStatus" AS ENUM ('NONE', 'WARNED', 'TEMP_SUSPENDED', 'BANNED');

-- CreateEnum
CREATE TYPE "ModerationSanction" AS ENUM ('WARN', 'TEMP_SUSPEND', 'LIFETIME_BAN');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "moderationStatus" "ModerationStatus" NOT NULL DEFAULT 'NONE';
ALTER TABLE "User" ADD COLUMN "moderationUntil" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "moderationReasonPublic" TEXT;
ALTER TABLE "User" ADD COLUMN "lastSanctionKind" "ModerationSanction";
ALTER TABLE "User" ADD COLUMN "lastSanctionAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "lastSanctionReportId" TEXT;

-- AlterTable
ALTER TABLE "Report" ADD COLUMN "moderatedUserId" TEXT;
ALTER TABLE "Report" ADD COLUMN "moderatorUserId" TEXT;
ALTER TABLE "Report" ADD COLUMN "sanctionKind" "ModerationSanction";
ALTER TABLE "Report" ADD COLUMN "sanctionEndsAt" TIMESTAMP(3);
ALTER TABLE "Report" ADD COLUMN "sanctionReasonPublic" TEXT;
ALTER TABLE "Report" ADD COLUMN "moderatedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Report_moderatedUserId_idx" ON "Report"("moderatedUserId");

-- CreateIndex
CREATE INDEX "Report_moderatorUserId_idx" ON "Report"("moderatorUserId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_lastSanctionReportId_fkey" FOREIGN KEY ("lastSanctionReportId") REFERENCES "Report"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_moderatedUserId_fkey" FOREIGN KEY ("moderatedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_moderatorUserId_fkey" FOREIGN KEY ("moderatorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
