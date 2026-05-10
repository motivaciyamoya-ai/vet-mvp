import { ArticleModerationStatus, PrismaClient } from '@prisma/client';

/**
 * Считает опубликованные статьи автора с учётом модерации.
 * Если миграция с `moderationStatus` ещё не применена к БД, падает запрос с фильтром — тогда используем только `published`.
 */
export async function countPublishedArticlesForAuthor(
  prisma: PrismaClient,
  authorId: string,
): Promise<number> {
  try {
    return await prisma.article.count({
      where: {
        authorId,
        published: true,
        moderationStatus: { in: [ArticleModerationStatus.NONE, ArticleModerationStatus.APPROVED] },
      },
    });
  } catch {
    return prisma.article.count({
      where: { authorId, published: true },
    });
  }
}
