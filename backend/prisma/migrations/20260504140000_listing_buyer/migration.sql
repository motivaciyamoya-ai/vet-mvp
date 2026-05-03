-- AlterTable
ALTER TABLE "Listing" ADD COLUMN "buyerId" TEXT;

-- CreateIndex
CREATE INDEX "Listing_buyerId_idx" ON "Listing"("buyerId");

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
