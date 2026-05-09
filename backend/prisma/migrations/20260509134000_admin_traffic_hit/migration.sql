-- CreateTable
CREATE TABLE "AdminTrafficHit" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipHash" VARCHAR(64) NOT NULL,
    "isBot" BOOLEAN NOT NULL DEFAULT false,
    "botFamily" TEXT,
    "method" VARCHAR(16) NOT NULL,
    "path" VARCHAR(2048) NOT NULL,

    CONSTRAINT "AdminTrafficHit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminTrafficHit_createdAt_idx" ON "AdminTrafficHit"("createdAt");

-- CreateIndex
CREATE INDEX "AdminTrafficHit_ipHash_idx" ON "AdminTrafficHit"("ipHash");

-- CreateIndex
CREATE INDEX "AdminTrafficHit_isBot_createdAt_idx" ON "AdminTrafficHit"("isBot", "createdAt");

