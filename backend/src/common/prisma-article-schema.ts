import { PrismaClient } from '@prisma/client';

/**
 * Кэш: Prisma-схема уже содержит поля, но в БД после деплоя миграции иногда ещё не накатили.
 * Тогда любой `findMany` без явного `select` тянет все колонки → 500. Проверяем information_schema.
 */
let articleHasModerationColumn: boolean | null = null;
let articleCommentHasAttachmentColumn: boolean | null = null;

export function resetArticleSchemaCache(): void {
  articleHasModerationColumn = null;
  articleCommentHasAttachmentColumn = null;
}

export async function prismaArticleHasModerationColumn(prisma: PrismaClient): Promise<boolean> {
  if (articleHasModerationColumn !== null) return articleHasModerationColumn;
  const rows = await prisma.$queryRawUnsafe<Array<{ ok: boolean }>>(
    `SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'Article'
        AND column_name = 'moderationStatus'
    ) AS ok`,
  );
  articleHasModerationColumn = Boolean(rows[0]?.ok);
  return articleHasModerationColumn;
}

/** Колонка `ArticleComment.attachmentUrls` (миграция вместе с `updatedAt`). */
export async function prismaArticleCommentHasAttachmentColumn(prisma: PrismaClient): Promise<boolean> {
  if (articleCommentHasAttachmentColumn !== null) return articleCommentHasAttachmentColumn;
  const rows = await prisma.$queryRawUnsafe<Array<{ ok: boolean }>>(
    `SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'ArticleComment'
        AND column_name = 'attachmentUrls'
    ) AS ok`,
  );
  articleCommentHasAttachmentColumn = Boolean(rows[0]?.ok);
  return articleCommentHasAttachmentColumn;
}
