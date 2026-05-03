-- Forum / articles: иконки и порядок сортировки для админки и публичного API
ALTER TABLE "ForumCategory" ADD COLUMN IF NOT EXISTS "iconEmoji" TEXT NOT NULL DEFAULT '💬';
ALTER TABLE "ForumCategory" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "ArticleCategory" ADD COLUMN IF NOT EXISTS "iconEmoji" TEXT NOT NULL DEFAULT '📄';
ALTER TABLE "ArticleCategory" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- Ключ-значение настройки сайта (баннеры, название, флаги и т.д.)
CREATE TABLE IF NOT EXISTS "SiteSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SiteSetting_key_key" ON "SiteSetting"("key");
