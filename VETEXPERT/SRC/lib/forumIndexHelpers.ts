import type { FeedThreadFromApi } from "./forumFeedMapping";
import { formatRelativeRu } from "./forumFeedMapping";

export type CategoryLastActivity = {
  excerpt: string;
  author: string;
  time: string;
  threadId: string;
};

/** Последняя активность по темам из ленты (до pageSize) — без отдельного API по разделу. */
export function lastActivityForCategorySlug(
  slug: string,
  feed: FeedThreadFromApi[],
): CategoryLastActivity | null {
  const inCat = feed.filter((t) => t.category?.slug === slug);
  if (inCat.length === 0) return null;
  const sorted = [...inCat].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
  const t = sorted[0];
  if (!t) return null;
  const lc = t.latestComment;
  const replies = Math.max(0, (t._count?.posts ?? 1) - 1);
  if (lc && replies > 0) {
    const excerpt = lc.body.replace(/\s+/g, " ").trim().slice(0, 72);
    const author = lc.author.profile?.displayName?.trim() || lc.author.email;
    return {
      excerpt: excerpt.length < lc.body.length ? `${excerpt}…` : excerpt,
      author,
      time: formatRelativeRu(lc.createdAt),
      threadId: t.id,
    };
  }
  const author = t.author.profile?.displayName?.trim() || t.author.email;
  return {
    excerpt: t.title.replace(/\s+/g, " ").trim().slice(0, 72),
    author,
    time: formatRelativeRu(t.updatedAt),
    threadId: t.id,
  };
}

export function approximateReplySumInFeed(slug: string, feed: FeedThreadFromApi[]): number {
  return feed
    .filter((t) => t.category?.slug === slug)
    .reduce((sum, t) => sum + Math.max(0, (t._count?.posts ?? 1) - 1), 0);
}
