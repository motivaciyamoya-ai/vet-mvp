import { TrendingUp } from "lucide-react";
import { Link } from "react-router";
import { useEffect, useState } from "react";
import { ForumUrgencyIcon } from "./ForumUrgencyVisual";
import ForumDiscussionList from "./ForumDiscussionList";
import { apiFetch } from "../../lib/api";
import { tagsLookHot } from "../../lib/forumTags";
import { discussionFromFeedThread, type FeedThreadFromApi, type ForumDiscussionRow } from "../../lib/forumFeedMapping";

export default function HotTopics({ limit }: { limit?: number }) {
  const [rows, setRows] = useState<ForumDiscussionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ items: FeedThreadFromApi[] }>("/api/forum/threads/feed?page=1&pageSize=80")
      .then((r) => {
        const items = Array.isArray(r.items) ? r.items : [];
        const hot = items.filter((t) => tagsLookHot(t.tags || ""));
        const mapped = hot.map(discussionFromFeedThread);
        setRows(limit ? mapped.slice(0, limit) : mapped);
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [limit]);

  return (
    <div className="rounded-xl lg:rounded-2xl border-2 border-red-200 shadow-md shadow-red-950/5 overflow-hidden bg-white ring-1 ring-red-100/80">
      <div className="bg-gradient-to-r from-red-600 via-orange-600 to-amber-600 px-4 sm:px-6 py-4 sm:py-5 text-white">
        <div className="flex flex-wrap items-center gap-4 justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-2 ring-white/25 backdrop-blur-sm">
              <ForumUrgencyIcon level="critical" accent="onDark" className="h-6 w-6 sm:h-7 sm:w-7" />
              <TrendingUp className="absolute -top-1 -right-1 h-4 w-4 text-amber-200" aria-hidden />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-bold text-lg sm:text-xl lg:text-2xl tracking-tight">Горячие темы</h2>
                <span className="tabular-nums rounded-full bg-black/25 px-2 py-0.5 text-xs font-bold ring-1 ring-white/30">
                  {loading ? "…" : rows.length}
                </span>
              </div>
              <p className="text-sm text-orange-50/95 mt-0.5 max-w-xl leading-snug">
                Срочные обсуждения из ленты форума — в том же табличном виде, что и на странице «Форум».
              </p>
            </div>
          </div>
          <Link
            to="/forum?filter=hot"
            className="shrink-0 text-sm font-semibold text-white/95 hover:text-white underline-offset-4 hover:underline"
          >
            Все горячие →
          </Link>
        </div>
      </div>

      {!loading && rows.length === 0 ? (
        <div className="px-6 py-10 text-center text-slate-600 text-sm bg-red-50/30">
          Пока нет горячих тем — создайте через «Срочная тема» на странице форума.
        </div>
      ) : loading ? (
        <div className="px-6 py-10 text-center text-slate-600 text-sm">Загрузка…</div>
      ) : (
        <ForumDiscussionList discussions={rows} variant="compact" tone="hot" />
      )}

      <div className="bg-gradient-to-r from-slate-50 to-orange-50/40 border-t border-red-100 px-4 py-3 sm:px-6">
        <Link
          to="/forum"
          className="block text-center text-sm font-semibold text-red-700 hover:text-red-800 transition-colors"
        >
          Открыть форум →
        </Link>
      </div>
    </div>
  );
}
