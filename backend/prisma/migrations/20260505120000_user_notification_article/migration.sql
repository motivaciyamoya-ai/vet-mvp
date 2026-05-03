-- Optional link from notification to article (комментарии к статьям).
ALTER TABLE "UserNotification" ADD COLUMN "articleId" TEXT;

CREATE INDEX "UserNotification_articleId_idx" ON "UserNotification"("articleId");

ALTER TABLE "UserNotification"
  ADD CONSTRAINT "UserNotification_articleId_fkey"
  FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE SET NULL ON UPDATE CASCADE;
