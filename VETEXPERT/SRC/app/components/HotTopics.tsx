import { CheckCircle, Clock, MessageSquare, Sparkles, TrendingUp } from "lucide-react";
import { Link } from "react-router";
import { useEffect, useState } from "react";
import TranslatedContent from "./TranslatedContent";
import UserAvatar from "./UserAvatar";
import { ForumUrgencyBadge, ForumUrgencyDisc, ForumUrgencyIcon } from "./ForumUrgencyVisual";
import { apiFetch, assetUrl } from "../../lib/api";
import { tagsLookHot, urgencyFromTags } from "../../lib/forumTags";
import { formatRelativeRu, type FeedThreadFromApi } from "../../lib/forumFeedMapping";

export default function HotTopics({ limit }: { limit?: number }) {
  const [rows, setRows] = useState<
    Array<{
      id: string;
      title: string;
      author: string;
      location: string;
      replies: number;
      time: string;
      urgency: "critical" | "high" | "medium";
      originalLang: string;
      solved: boolean;
      solverName?: string;
      solverAvatarUrl?: string | null;
      coverThumb?: string | null;
      latestCommentBody?: string | null;
      latestCommentAuthor?: string | null;
      latestCommentTime?: string | null;
    }>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ items: FeedThreadFromApi[] }>("/api/forum/threads/feed?page=1&pageSize=80")
      .then((r) => {
        const items = Array.isArray(r.items) ? r.items : [];
        const hot = items.filter((t) => tagsLookHot(t.tags || ""));
        const mapped = hot.map((t) => {
          const p = t.author.profile;
          const author = p?.displayName?.trim() || t.author.email;
          const loc = [p?.city?.trim(), p?.country?.nameRu].filter(Boolean).join(", ") || "—";
          const replies = Math.max(0, (t._count?.posts ?? 1) - 1);
          const parsed = urgencyFromTags(t.tags || "");
          const solved = !!(t.acceptedPostId && t.solvedAt);
          const sap = solved ? t.acceptedPost?.author : undefined;
          const solverName =
            sap ? sap.profile?.displayName?.trim() || sap.email : undefined;
          const solverAvatarUrl = sap?.profile?.avatarUrl;
          const coverThumb = t.coverImageUrls?.length ? (t.coverImageUrls[0] ?? null) : null;
          const lc = replies > 0 ? t.latestComment : null;
          return {
            id: t.id,
            title: t.title,
            author,
            location: loc,
            replies,
            time: formatRelativeRu(t.updatedAt),
            urgency: (parsed ?? "medium") as "critical" | "high" | "medium",
            originalLang: "ru",
            solved,
            solverName,
            solverAvatarUrl,
            coverThumb,
            latestCommentBody: lc ? lc.body : null,
            latestCommentAuthor: lc
              ? lc.author.profile?.displayName?.trim() || lc.author.email
              : null,
            latestCommentTime: lc ? formatRelativeRu(lc.createdAt) : null,
          };
        });
        setRows(limit ? mapped.slice(0, limit) : mapped);
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [limit]);

  const displayTopics = rows;

  return (
    <div className="bg-white rounded-lg lg:rounded-xl border-2 border-red-200 overflow-hidden">
      <div className="bg-gradient-to-r from-red-50 to-orange-50 p-4 sm:p-5 lg:p-6 border-b-2 border-red-200">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            <ForumUrgencyIcon level="critical" className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8" />
            <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-orange-600 absolute -top-1 -right-1" aria-hidden />
          </div>
          <div>
            <h2 className="font-bold text-lg sm:text-xl lg:text-2xl text-red-900 flex items-center gap-2">
              Горячие темы
              <span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded-full">
                {loading ? "…" : displayTopics.length}
              </span>
            </h2>
            <p className="text-red-700 text-xs sm:text-sm lg:text-base">
              Темы с пометкой «горячая» из базы данных (лента форума)
            </p>
          </div>
        </div>
      </div>

      <div className="divide-y divide-gray-200">
        {!loading && displayTopics.length === 0 && (
          <div className="p-6 text-center text-gray-600 text-sm">Пока нет горячих тем — создайте через «Срочная тема» на странице форума.</div>
        )}
        {displayTopics.map((topic) => (
          <Link
            key={topic.id}
            to={`/forum/topic/${topic.id}`}
            className={`block p-4 sm:p-5 lg:p-6 transition-colors group ${
              topic.solved ? "hover:bg-emerald-50/50 bg-emerald-50/15" : "hover:bg-red-50/50"
            }`}
          >
            <div className="flex items-start gap-3 lg:gap-4">
              <div className="flex-shrink-0">
                {topic.solved ? (
                  <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-full flex items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md group-hover:scale-105 transition-transform">
                    <CheckCircle className="w-5 h-5 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-white" aria-hidden />
                  </div>
                ) : (
                  <ForumUrgencyDisc
                    level={topic.urgency}
                    className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 group-hover:scale-110 transition-transform"
                  />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 mb-2 flex-wrap">
                  {topic.solved ? (
                    <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-600 text-white shadow-sm">
                      <CheckCircle className="w-3 h-3" />
                      Решено
                    </span>
                  ) : (
                    <ForumUrgencyBadge level={topic.urgency} />
                  )}
                  <span className="flex items-center gap-1 text-xs sm:text-sm text-gray-500">
                    <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                    {topic.time}
                  </span>
                </div>

                <TranslatedContent
                  text={topic.title}
                  originalLang={topic.originalLang}
                  className={`font-semibold text-sm sm:text-base lg:text-lg text-gray-900 mb-2 line-clamp-2 leading-snug ${
                    topic.solved ? "group-hover:text-emerald-800 transition-colors" : "group-hover:text-red-700 transition-colors"
                  }`}
                />

                {topic.latestCommentBody && topic.latestCommentAuthor ? (
                  <div className="mb-3 rounded-lg border border-slate-200/90 bg-slate-50 px-3 py-2">
                    <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
                      Последний комментарий
                    </p>
                    <p className="text-xs sm:text-sm text-slate-800 line-clamp-2">{topic.latestCommentBody}</p>
                    <p className="mt-1.5 text-[11px] sm:text-xs text-slate-600">
                      <span className="font-medium text-slate-800">{topic.latestCommentAuthor}</span>
                      {topic.latestCommentTime ? (
                        <>
                          {" "}
                          · {topic.latestCommentTime}
                        </>
                      ) : null}
                    </p>
                  </div>
                ) : null}

                {topic.solved && topic.solverName && (
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <div className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 px-3 py-2 shadow-sm max-w-full">
                      <Sparkles className="w-4 h-4 text-amber-500 shrink-0" aria-hidden />
                      <UserAvatar
                        avatarUrl={topic.solverAvatarUrl}
                        label={topic.solverName}
                        className="w-9 h-9 sm:w-10 sm:h-10"
                        ringClassName="ring-2 ring-emerald-200"
                      />
                      <div className="min-w-0 text-xs sm:text-sm leading-tight">
                        <span className="text-emerald-800 font-semibold block">Помог разобраться</span>
                        <span className="font-bold text-emerald-950 truncate block">{topic.solverName}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 min-w-0">
                    <span className="font-medium truncate">{topic.author}</span>
                    <span className="text-gray-400">•</span>
                    <span className="truncate">{topic.location}</span>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                      <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="font-medium">{topic.replies}</span>
                    </div>
                    {topic.coverThumb && (
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden border-2 border-white shadow-md ring-1 ring-gray-200">
                        <img
                          src={assetUrl(topic.coverThumb)}
                          alt=""
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="p-4 sm:p-5 bg-gray-50 border-t border-gray-200">
        <Link to="/forum?filter=hot" className="block text-center text-sm lg:text-base font-medium text-red-700 hover:text-red-800 transition-colors">
          Перейти к форуму →
        </Link>
      </div>
    </div>
  );
}
