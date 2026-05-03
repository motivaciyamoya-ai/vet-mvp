-- AlterTable
ALTER TABLE "Listing" ADD COLUMN "imageUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

