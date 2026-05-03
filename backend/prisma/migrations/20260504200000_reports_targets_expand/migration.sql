ALTER TYPE "ReportTargetType" ADD VALUE 'USER';
ALTER TYPE "ReportTargetType" ADD VALUE 'DIRECT_MESSAGE';
ALTER TYPE "ReportTargetType" ADD VALUE 'ARTICLE';
ALTER TYPE "ReportTargetType" ADD VALUE 'ARTICLE_COMMENT';
ALTER TYPE "ReportTargetType" ADD VALUE 'LISTING_MESSAGE';
ALTER TYPE "ReportTargetType" ADD VALUE 'LOBBY_MESSAGE';

ALTER TABLE "Report" ADD COLUMN "reportedUserId" TEXT,
ADD COLUMN "directMessageId" TEXT,
ADD COLUMN "articleId" TEXT,
ADD COLUMN "articleCommentId" TEXT,
ADD COLUMN "listingMessageId" TEXT,
ADD COLUMN "lobbyMessageId" TEXT;

ALTER TABLE "Report" ADD CONSTRAINT "Report_reportedUserId_fkey"
  FOREIGN KEY ("reportedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_directMessageId_fkey"
  FOREIGN KEY ("directMessageId") REFERENCES "DirectMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_articleId_fkey"
  FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_articleCommentId_fkey"
  FOREIGN KEY ("articleCommentId") REFERENCES "ArticleComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_listingMessageId_fkey"
  FOREIGN KEY ("listingMessageId") REFERENCES "ListingMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_lobbyMessageId_fkey"
  FOREIGN KEY ("lobbyMessageId") REFERENCES "LobbyMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Report_reportedUserId_idx" ON "Report"("reportedUserId");
CREATE INDEX "Report_status_createdAt_idx" ON "Report"("status", "createdAt");
