-- AlterTable
ALTER TABLE "ForumThread" ADD COLUMN "likeCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ForumThreadLike" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "likerKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ForumThreadLike_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ForumThreadLike_threadId_idx" ON "ForumThreadLike"("threadId");
CREATE UNIQUE INDEX "ForumThreadLike_threadId_likerKey_key" ON "ForumThreadLike"("threadId", "likerKey");

ALTER TABLE "ForumThreadLike" ADD CONSTRAINT "ForumThreadLike_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "ForumThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
