-- AlterTable
ALTER TABLE "ForumThread" ADD COLUMN "coverImageUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
