-- CreateEnum
CREATE TYPE "ArticleModerationStatus" AS ENUM ('NONE', 'PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Article" ADD COLUMN "attachmentUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Article" ADD COLUMN "moderationStatus" "ArticleModerationStatus" NOT NULL DEFAULT 'NONE';

CREATE INDEX "Article_moderationStatus_published_idx" ON "Article"("moderationStatus", "published");

-- AlterTable
ALTER TABLE "ArticleComment" ADD COLUMN "attachmentUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "ArticleComment" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
