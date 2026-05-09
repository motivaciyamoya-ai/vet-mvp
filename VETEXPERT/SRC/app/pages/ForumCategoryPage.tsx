import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router";
import { useEffect, useMemo, useState } from "react";
import ForumDiscussionList from "../components/ForumDiscussionList";
import { apiFetch } from "../../lib/api";
import { applyRoutePageSeo, getCachedSiteSeo, plainTextExcerpt } from "../../lib/documentSeo";
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

  useEffect(() => {
    if (!slug || !categoryName) return;
    const path = `/forum/category/${slug}`;
    const desc = plainTextExcerpt(
      `Ветеринарный форум VetConnect — раздел «${categoryName}»: темы, комментарии коллег и клинические обсуждения.`,
      300,
    );
    applyRoutePageSeo(path, getCachedSiteSeo(), {
      title: `${categoryName} — темы форума`,
      description: desc,
    });
  }, [slug, categoryName]);

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
          <p className="text-gray-600 text-sm lg:text-base mt-1">
            Темы и комментарии коллег по направлению «{categoryName || "форум"}»: обсуждения для ветспециалистов.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl lg:rounded-2xl border border-slate-200 overflow-hidden shadow-sm ring-1 ring-emerald-900/5">
        {!loading && !err ? (
          <div className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2.5 bg-gradient-to-r from-emerald-700 via-emerald-700 to-teal-700 text-white border-b border-white/10">
            <span className="text-sm font-semibold">Темы раздела</span>
            <span className="text-[11px] text-emerald-100/95 tabular-nums">{discussions.length} тем</span>
          </div>
        ) : null}
        {loading ? (
          <div className="text-center py-12 text-gray-600">Загрузка тем…</div>
        ) : err ? (
          <div className="text-center py-12 px-4 text-red-700 text-sm">{err}</div>
        ) : (
          <ForumDiscussionList discussions={discussions} variant="compact" tone="emerald" />
        )}
      </div>
    </div>
  );
}
