import { MessageSquare } from "lucide-react";
import { Link } from "react-router";
import { useEffect, useState } from "react";
import ForumDiscussionList from "./ForumDiscussionList";
import { apiFetch } from "../../lib/api";
import { tagsLookHot } from "../../lib/forumTags";
import { discussionFromFeedThread, type FeedThreadFromApi, type ForumDiscussionRow } from "../../lib/forumFeedMapping";

export default function RecentTopics({ limit }: { limit?: number }) {
  const [rows, setRows] = useState<ForumDiscussionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ items: FeedThreadFromApi[] }>("/api/forum/threads/feed?page=1&pageSize=80")
      .then((r) => {
        const items = Array.isArray(r.items) ? r.items : [];
        const regular = items.filter((t) => !tagsLookHot(t.tags || ""));
        regular.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        const take = limit ? regular.slice(0, limit) : regular;
        setRows(take.map(discussionFromFeedThread));
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [limit]);

  return (
    <div className="rounded-xl lg:rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden ring-1 ring-emerald-900/5">
      <div className="bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-700 px-4 sm:px-6 py-4 sm:py-5 text-white">
        <div className="flex flex-wrap items-center gap-4 justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-2 ring-white/30 shadow-inner">
              <MessageSquare className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-lg sm:text-xl lg:text-2xl tracking-tight">Новые темы форума</h2>
              <p className="text-sm text-emerald-50/95 mt-0.5">
                {loading ? "Загрузка…" : "Активность сообщества — компактная таблица тем"}
              </p>
            </div>
          </div>
          <Link
            to="/forum"
            className="shrink-0 text-sm font-semibold text-white/95 hover:text-white underline-offset-4 hover:underline hidden sm:inline"
          >
            Все темы →
          </Link>
        </div>
      </div>

      {!loading && rows.length === 0 ? (
        <div className="px-6 py-10 text-center text-slate-600 text-sm">Тем пока нет — станьте первым автором.</div>
      ) : loading ? (
        <div className="px-6 py-10 text-center text-slate-600 text-sm">Загрузка…</div>
      ) : (
        <ForumDiscussionList discussions={rows} variant="compact" tone="emerald" />
      )}

      <div className="border-t border-slate-100 bg-slate-50/90 px-4 py-3 sm:hidden">
        <Link to="/forum" className="block text-center text-sm font-semibold text-emerald-700 hover:text-emerald-800">
          Смотреть все темы →
        </Link>
      </div>
    </div>
  );
}
