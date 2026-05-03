-- AlterTable
ALTER TABLE "ForumThread" ADD COLUMN "uniqueViewCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ForumThreadViewer" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "viewerKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ForumThreadViewer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ForumThreadViewer_threadId_idx" ON "ForumThreadViewer"("threadId");

-- CreateIndex
CREATE UNIQUE INDEX "ForumThreadViewer_threadId_viewerKey_key" ON "ForumThreadViewer"("threadId", "viewerKey");

-- AddForeignKey
ALTER TABLE "ForumThreadViewer" ADD CONSTRAINT "ForumThreadViewer_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "ForumThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
