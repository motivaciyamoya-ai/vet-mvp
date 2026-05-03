-- AlterEnum
ALTER TYPE "ReportTargetType" ADD VALUE 'VET_EVENT_COMMENT';

-- AlterTable
ALTER TABLE "VetEvent" ADD COLUMN     "organizers" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "audience" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "eventFormat" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "VetEventComment" (
    "id" TEXT NOT NULL,
    "vetEventId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VetEventComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VetEventComment_vetEventId_idx" ON "VetEventComment"("vetEventId");

-- AddForeignKey
ALTER TABLE "VetEventComment" ADD CONSTRAINT "VetEventComment_vetEventId_fkey" FOREIGN KEY ("vetEventId") REFERENCES "VetEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VetEventComment" ADD CONSTRAINT "VetEventComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "Report" ADD COLUMN "vetEventCommentId" TEXT;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_vetEventCommentId_fkey" FOREIGN KEY ("vetEventCommentId") REFERENCES "VetEventComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
