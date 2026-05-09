import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router";
import { useEffect, useMemo, useState } from "react";
import ForumDiscussionList from "../components/ForumDiscussionList";
import { apiFetch } from "../../lib/api";
import type { FeedThreadFromApi, ForumDiscussionRow } from "../../lib/forumFeedMapping";
import { discussionFromFeedThread } from "../../lib/forumFeedMapping";

type ForumCategoryLite = {
  id: string;
  name: string;
  slug: string;
};

export default function ForumCategoryPage() {
  const slug = useParams<{ slug: string }>().slug?.trim() ?? "";
  const [categoryName, setCategoryName] = useState("");
  const [threads, setThreads] = useState<FeedThreadFromApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setErr("");

    const loadName = apiFetch<ForumCategoryLite[]>("/api/forum/categories")
      .then((rows) => {
        const c = Array.isArray(rows) ? rows.find((x) => x.slug === slug) : undefined;
        setCategoryName(c?.name ?? slug);
      })
      .catch(() => setCategoryName(slug));

    const loadThreads = apiFetch<{ items: FeedThreadFromApi[] }>(
      `/api/forum/categories/${encodeURIComponent(slug)}/threads?page=1&pageSize=80`,
    )
      .then((r) => setThreads(Array.isArray(r.items) ? r.items : []))
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : "";
        setErr(msg.includes("404") ? "Раздел не найден" : msg || "Не удалось загрузить темы");
        setThreads([]);
      });

    void Promise.all([loadName, loadThreads]).finally(() => setLoading(false));
  }, [slug]);

  const discussions: ForumDiscussionRow[] = useMemo(
    () => threads.map((t) => discussionFromFeedThread(t)),
    [threads],
  );

  if (!slug) {
    return (
      <div className="text-center py-12 text-gray-600">
        <p>Не указан раздел форума.</p>
        <Link to="/forum" className="text-emerald-700 font-semibold hover:underline mt-2 inline-block">
          На страницу форума
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5 lg:space-y-6">
      <div className="flex flex-col gap-2">
        <Link
          to="/forum"
          className="inline-flex items-center gap-2 text-sm text-emerald-800 hover:text-emerald-900 font-medium w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          Все разделы
        </Link>
        <div>
          <h1 className="font-bold text-xl sm:text-2xl lg:text-3xl text-gray-900">{categoryName || "Раздел"}</h1>
          <p className="text-gray-600 text-sm lg:text-base mt-1">Темы из этой категории</p>
        </div>
      </div>

      <div className="bg-white rounded-lg lg:rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-gray-600">Загрузка тем…</div>
        ) : err ? (
          <div className="text-center py-12 px-4 text-red-700 text-sm">{err}</div>
        ) : (
          <ForumDiscussionList discussions={discussions} variant="mybb" />
        )}
      </div>
    </div>
  );
}
