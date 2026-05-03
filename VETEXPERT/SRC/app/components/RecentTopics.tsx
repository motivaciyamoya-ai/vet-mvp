import { MessageSquare, Clock, Eye, ThumbsUp } from "lucide-react";
import { Link } from "react-router";
import { useEffect, useState } from "react";
import TranslatedContent from "./TranslatedContent";
import { apiFetch } from "../../lib/api";
import { tagsLookHot } from "../../lib/forumTags";
import { formatRelativeRu, type FeedThreadFromApi } from "../../lib/forumFeedMapping";

export default function RecentTopics({ limit }: { limit?: number }) {
  const [rows, setRows] = useState<
    Array<{
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
        const regular = items.filter((t) => !tagsLookHot(t.tags || ""));
        regular.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        const take = limit ? regular.slice(0, limit) : regular;
        setRows(
          take.map((t) => {
            const p = t.author.profile;
            const author = p?.displayName?.trim() || t.author.email;
            const loc = [p?.city?.trim(), p?.country?.nameRu].filter(Boolean).join(", ") || "—";
            const replies = Math.max(0, (t._count?.posts ?? 1) - 1);
            const lc = replies > 0 ? t.latestComment : null;
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
              latestCommentBody: lc ? lc.body : null,
              latestCommentAuthor: lc
                ? lc.author.profile?.displayName?.trim() || lc.author.email
                : null,
              latestCommentTime: lc ? formatRelativeRu(lc.createdAt) : null,
            };
          }),
        );
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [limit]);

  const categoryColors: Record<string, string> = {
    Профилактика: "bg-green-100 text-green-700",
    Стоматология: "bg-blue-100 text-blue-700",
    Дерматология: "bg-purple-100 text-purple-700",
    Паразитология: "bg-orange-100 text-orange-700",
  };

  const displayTopics = rows;

  return (
    <div className="bg-white rounded-lg lg:rounded-xl border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-4 sm:p-5 lg:p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-600 rounded-xl flex items-center justify-center">
              <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-lg sm:text-xl lg:text-2xl text-gray-900">Новые темы форума</h2>
              <p className="text-emerald-700 text-xs sm:text-sm">{loading ? "Загрузка…" : "Последние темы из PostgreSQL"}</p>
            </div>
          </div>
          <Link to="/forum" className="hidden sm:inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-medium text-sm transition-colors">
            Все темы →
          </Link>
        </div>
      </div>

      <div className="divide-y divide-gray-200">
        {!loading && displayTopics.length === 0 && (
          <div className="p-6 text-center text-gray-600 text-sm">Тем пока нет — станьте первым автором.</div>
        )}
        {displayTopics.map((topic) => (
          <Link
            key={topic.id}
            to={`/forum/topic/${topic.id}`}
            className="block p-4 sm:p-5 lg:p-6 hover:bg-gray-50 transition-colors group"
          >
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold text-sm sm:text-base flex-shrink-0">
                {topic.author[0]}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      categoryColors[topic.category] || "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {topic.category}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    {topic.time}
                  </span>
                </div>

                <TranslatedContent
                  text={topic.title}
                  originalLang={topic.originalLang}
                  className="font-semibold text-sm sm:text-base lg:text-lg text-gray-900 group-hover:text-emerald-700 transition-colors mb-2 line-clamp-2 leading-snug"
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

                <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-600">
                  <span className="font-medium">{topic.author}</span>
                  <span className="text-gray-400">•</span>
                  <span className="truncate">{topic.location}</span>
                  <span className="text-gray-400 hidden sm:inline">•</span>
                  <div className="flex items-center gap-3 sm:gap-4">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4" />
                      {topic.replies}
                    </span>
                    <span className="flex items-center gap-1 opacity-60">
                      <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                      {topic.views}
                    </span>
                    <span className="flex items-center gap-1 opacity-60">
                      <ThumbsUp className="w-3 h-3 sm:w-4 sm:h-4" />
                      {topic.likes}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="p-4 bg-gray-50 border-t border-gray-200 sm:hidden">
        <Link to="/forum" className="block text-center text-sm font-medium text-emerald-700 hover:text-emerald-800 transition-colors">
          Смотреть все темы →
        </Link>
      </div>
    </div>
  );
}
