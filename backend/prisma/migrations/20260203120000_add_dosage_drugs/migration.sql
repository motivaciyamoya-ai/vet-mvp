-- CreateTable
CREATE TABLE "DosageDrug" (
    "id" TEXT NOT NULL,
    "nameRu" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "instruction" TEXT NOT NULL,
    "warnings" TEXT,
    "dosing" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DosageDrug_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DosageDrug_category_idx" ON "DosageDrug"("category");

-- CreateIndex
CREATE INDEX "DosageDrug_active_sortOrder_idx" ON "DosageDrug"("active", "sortOrder");
