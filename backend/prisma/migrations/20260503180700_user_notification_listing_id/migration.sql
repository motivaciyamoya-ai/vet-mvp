-- AlterTable
ALTER TABLE "UserNotification" ADD COLUMN "listingId" TEXT;

-- CreateIndex
CREATE INDEX "UserNotification_listingId_idx" ON "UserNotification"("listingId");

-- AddForeignKey
ALTER TABLE "UserNotification"
ADD CONSTRAINT "UserNotification_listingId_fkey"
FOREIGN KEY ("listingId") REFERENCES "Listing"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

