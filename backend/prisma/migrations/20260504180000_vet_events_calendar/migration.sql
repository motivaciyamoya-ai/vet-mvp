-- CreateTable
CREATE TABLE "VetEvent" (
    "id" TEXT NOT NULL,
    "slugKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "location" TEXT NOT NULL DEFAULT '',
    "url" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "timezone" TEXT,
    "source" TEXT NOT NULL,
    "sourceFeed" TEXT NOT NULL,
    "externalUid" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VetEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VetEvent_slugKey_key" ON "VetEvent"("slugKey");

-- CreateIndex
CREATE INDEX "VetEvent_startsAt_idx" ON "VetEvent"("startsAt");

-- CreateIndex
CREATE INDEX "VetEvent_sourceFeed_idx" ON "VetEvent"("sourceFeed");
