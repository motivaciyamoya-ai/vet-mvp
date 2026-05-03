import { tagsLookHot, urgencyFromTags } from "./forumTags";

export function formatRelativeRu(iso: string): string {
  const d = new Date(iso);
  const ms = Date.now() - d.getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "только что";
  if (m < 60) return `${m} мин назад`;
  const h = Math.floor(m / 60);
  if (h < 36) return `${h} ч назад`;
  const days = Math.floor(h / 24);
  if (days < 14) return `${days} дн. назад`;
  return d.toLocaleDateString("ru-RU");
}

export type FeedAuthor = {
  id?: string;
  email: string;
  profile?: {
    displayName?: string | null;
    city?: string | null;
    country?: { nameRu?: string } | null;
  } | null;
};

export type AcceptedPostMini = {
  author?: {
    email: string;
    profile?: {
      displayName?: string | null;
      avatarUrl?: string | null;
    } | null;
  } | null;
} | null;

export type FeedThreadLatestComment = {
  body: string;
  createdAt: string;
  author: {
    id: string;
    email: string;
    profile?: {
      displayName?: string | null;
    } | null;
  };
};

/** Ответ `/api/forum/threads/feed` или `/categories/:slug/threads` после маппинга на сервере. */
export type FeedThreadFromApi = {
  id: string;
  title: string;
  tags: string;
  updatedAt: string;
  category?: { name: string; slug?: string };
  author: FeedAuthor;
  acceptedPost?: AcceptedPostMini;
  acceptedPostId?: string | null;
  solvedAt?: string | null;
  coverImageUrls?: string[];
  _count?: { posts: number };
  latestComment?: FeedThreadLatestComment | null;
  uniqueViewCount?: number;
  likeCount?: number;
};

export type ForumDiscussionRow = {
  id: string;
  title: string;
  author: string;
  location: string;
  category: string;
  replies: number;
  views: number;
  likes: number;
  time: string;
  originalLang: string;
  isHot: boolean;
  isClosed?: boolean;
  urgency?: "critical" | "high" | "medium";
  badges?: undefined;
  solvedBy?: { name: string; avatarUrl?: string | null };
  coverThumb?: string | null;
  /** Превью последнего ответа в теме (если уже есть хотя бы один ответ автору темы). */
  latestComment?: {
    body: string;
    authorLabel: string;
    relativeTime: string;
    authorUserId?: string;
  } | null;
};

export function discussionFromFeedThread(t: FeedThreadFromApi): ForumDiscussionRow {
  const p = t.author.profile;
  const author = p?.displayName?.trim() || t.author.email;
  const loc = [p?.city?.trim(), p?.country?.nameRu].filter(Boolean).join(", ") || "—";
  const replies = Math.max(0, (t._count?.posts ?? 1) - 1);
  const tagsLc = (t.tags || "").toLowerCase();
  const isHot = tagsLookHot(tagsLc);
  const parsedUrgency = urgencyFromTags(t.tags || "");
  const solvedHot = !!(isHot && t.acceptedPostId && t.solvedAt);
  const solverProf = t.acceptedPost?.author;
  const solverName = solverProf
    ? solverProf.profile?.displayName?.trim() || solverProf.email
    : undefined;

  const lc = t.latestComment;
  const latestCommentRow =
    lc && replies > 0
      ? {
          body: lc.body,
          authorLabel: lc.author.profile?.displayName?.trim() || lc.author.email,
          relativeTime: formatRelativeRu(lc.createdAt),
          authorUserId: lc.author.id,
        }
      : null;

  return {
    id: t.id,
    title: t.title,
    author,
    location: loc,
    category: t.category?.name ?? "—",
    replies,
    views: typeof t.uniqueViewCount === "number" ? t.uniqueViewCount : 0,
    likes: typeof t.likeCount === "number" ? t.likeCount : 0,
    time: formatRelativeRu(t.updatedAt),
    originalLang: "ru",
    isHot,
    isClosed: solvedHot,
    urgency: isHot ? parsedUrgency ?? "medium" : parsedUrgency,
    badges: undefined,
    solvedBy: solverName
      ? {
          name: solverName,
          avatarUrl: solverProf?.profile?.avatarUrl ?? null,
        }
      : undefined,
    coverThumb: t.coverImageUrls?.length ? (t.coverImageUrls[0] ?? null) : null,
    latestComment: latestCommentRow,
  };
}
