import {
  MessageSquare,
  Filter as FilterIcon,
  Plus,
  CheckCircle,
  ChevronRight,
} from "lucide-react";
import CreateHotTopic from "../components/CreateHotTopic";
import GuestPublishGate from "../components/GuestPublishGate";
import ForumDiscussionList from "../components/ForumDiscussionList";
import { ForumUrgencyIcon } from "../components/ForumUrgencyVisual";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { apiFetch } from "../../lib/api";
import { useAuth } from "../contexts/AuthContext";
import type { FeedThreadFromApi, ForumDiscussionRow } from "../../lib/forumFeedMapping";
import { discussionFromFeedThread } from "../../lib/forumFeedMapping";
import { approximateReplySumInFeed, lastActivityForCategorySlug } from "../../lib/forumIndexHelpers";

type ApiForumCategory = {
  id: string;
  name: string;
  slug: string;
  iconEmoji: string;
  description?: string | null;
  sortOrder?: number;
  _count?: { threads: number };
};

export default function Forum() {
  const { authReady, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeFilter, setActiveFilter] = useState<"all" | "hot" | "closed">("all");
  const [showCreateHot, setShowCreateHot] = useState(false);
  const [createTopicKind, setCreateTopicKind] = useState<"hot" | "standard">("hot");
  const [hotTopicInitialUrgency, setHotTopicInitialUrgency] = useState<"critical" | "high" | "medium" | undefined>();
  const [apiCategories, setApiCategories] = useState<ApiForumCategory[] | null>(null);
  const [feedItems, setFeedItems] = useState<FeedThreadFromApi[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);

  useEffect(() => {
    apiFetch<ApiForumCategory[]>("/api/forum/categories")
      .then((rows) => setApiCategories(Array.isArray(rows) ? rows : []))
      .catch(() => setApiCategories([]));
  }, []);

  useEffect(() => {
    apiFetch<{ items: FeedThreadFromApi[] }>("/api/forum/threads/feed?page=1&pageSize=50")
      .then((r) => setFeedItems(Array.isArray(r.items) ? r.items : []))
      .catch(() => setFeedItems([]))
      .finally(() => setFeedLoading(false));
  }, []);

  useEffect(() => {
    if (searchParams.get("newHot") !== "1") return;
    if (!authReady) return;
    if (!isAuthenticated) {
      const next = new URLSearchParams(searchParams);
      next.delete("newHot");
      next.delete("urgency");
      setSearchParams(next, { replace: true });
      return;
    }
    const u = searchParams.get("urgency");
    const valid: "critical" | "high" | "medium" =
      u === "critical" || u === "high" || u === "medium" ? u : "high";
    setCreateTopicKind("hot");
    setHotTopicInitialUrgency(valid);
    setShowCreateHot(true);
    const next = new URLSearchParams(searchParams);
    next.delete("newHot");
    next.delete("urgency");
    setSearchParams(next, { replace: true });
  }, [authReady, isAuthenticated, searchParams, setSearchParams]);

  const categoryTiles = useMemo(() => {
    if (!apiCategories?.length) return [];
    return [...apiCategories].sort((a, b) => {
      const oa = a.sortOrder ?? 9999;
      const ob = b.sortOrder ?? 9999;
      if (oa !== ob) return oa - ob;
      return a.name.localeCompare(b.name, "ru");
    });
  }, [apiCategories]);

  const feedDiscussions = useMemo(
    () => feedItems.map(discussionFromFeedThread),
    [feedItems],
  );

  const hotFeedDiscussions = useMemo(() => feedDiscussions.filter((d) => d.isHot), [feedDiscussions]);

  const closedDiscussions = useMemo(
    () => feedDiscussions.filter((d) => d.isHot && d.isClosed),
    [feedDiscussions],
  );

  const discussions: ForumDiscussionRow[] =
    activeFilter === "hot"
      ? hotFeedDiscussions
      : activeFilter === "closed"
        ? closedDiscussions
        : feedDiscussions;

  return (
    <div className="space-y-5 lg:space-y-6 xl:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-bold text-xl sm:text-2xl lg:text-3xl mb-1">Форум</h1>
          <p className="text-gray-600 text-sm lg:text-base">Обсуждения и обмен опытом с коллегами</p>
        </div>
        <GuestPublishGate promptClassName="w-full max-w-xl">
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                setCreateTopicKind("hot");
                setHotTopicInitialUrgency(undefined);
                setShowCreateHot(true);
              }}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-orange-600 text-white px-5 py-2.5 lg:px-6 lg:py-3 rounded-lg hover:from-red-700 hover:to-orange-700 transition-all font-medium text-sm lg:text-base shadow-lg hover:shadow-xl"
            >
              <ForumUrgencyIcon level="critical" accent="onDark" className="w-4 h-4 lg:w-5 lg:h-5" />
              Срочная тема
            </button>
            <button
              type="button"
              onClick={() => {
                setCreateTopicKind("standard");
                setHotTopicInitialUrgency(undefined);
                setShowCreateHot(true);
              }}
              className="flex items-center justify-center gap-2 bg-emerald-600 text-white px-5 py-2.5 lg:px-6 lg:py-3 rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm lg:text-base"
            >
              <Plus className="w-4 h-4 lg:w-5 lg:h-5" />
              Обычная тема
            </button>
          </div>
        </GuestPublishGate>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 sm:gap-3 border-b border-gray-200 overflow-x-auto">
        <button
          onClick={() => setActiveFilter("all")}
          className={`flex items-center gap-2 px-3 sm:px-4 py-3 font-medium text-sm lg:text-base border-b-2 transition-colors whitespace-nowrap ${
            activeFilter === "all"
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          <FilterIcon className="w-4 h-4 lg:w-5 lg:h-5" />
          Все темы
        </button>
        <button
          onClick={() => setActiveFilter("hot")}
          className={`flex items-center gap-2 px-3 sm:px-4 py-3 font-medium text-sm lg:text-base border-b-2 transition-colors whitespace-nowrap ${
            activeFilter === "hot"
              ? "border-red-600 text-red-700"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          <ForumUrgencyIcon level="critical" className="w-4 h-4 lg:w-5 lg:h-5" />
          Горячие
          <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-bold">
            {hotFeedDiscussions.length}
          </span>
        </button>
        <button
          onClick={() => setActiveFilter("closed")}
          className={`flex items-center gap-2 px-3 sm:px-4 py-3 font-medium text-sm lg:text-base border-b-2 transition-colors whitespace-nowrap ${
            activeFilter === "closed"
              ? "border-green-600 text-green-700"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          <CheckCircle className="w-4 h-4 lg:w-5 lg:h-5" />
          Закрытые
          <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-bold">
            {closedDiscussions.length}
          </span>
        </button>
      </div>

      {/* Индекс разделов в стиле MyBB: шапка категории + таблица строк */}
      <section className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2.5 bg-gradient-to-r from-emerald-700 via-emerald-700 to-teal-700 text-white">
          <h2 className="text-sm sm:text-base font-semibold tracking-tight">Разделы сообщества</h2>
          <span className="text-[11px] sm:text-xs text-emerald-100/95 tabular-nums hidden sm:inline">
            {categoryTiles.length} разделов
          </span>
        </div>

        <div className="hidden sm:grid sm:grid-cols-[40px_minmax(0,1fr)_6.5rem_minmax(0,13rem)] gap-2 px-3 py-2 bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          <span className="sr-only">Статус</span>
          <span>Форум</span>
          <span className="text-right pr-0.5">Темы / ответы</span>
          <span>Последнее</span>
        </div>

        {categoryTiles.length === 0 ? (
          <p className="text-sm text-slate-600 px-4 py-6">
            Разделы подгружаются с сервера. Если список пуст — администратор может добавить их в панели управления.
          </p>
        ) : (
          <div className="divide-y divide-slate-200">
            {categoryTiles.map((c) => {
              const icon = c.iconEmoji?.trim() || "💬";
              const threads = c._count?.threads ?? 0;
              const repliesApprox = approximateReplySumInFeed(c.slug, feedItems);
              const last = lastActivityForCategorySlug(c.slug, feedItems);
              return (
                <div
                  key={c.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/forum/category/${encodeURIComponent(c.slug)}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigate(`/forum/category/${encodeURIComponent(c.slug)}`);
                    }
                  }}
                  className="grid grid-cols-[36px_1fr] sm:grid-cols-[40px_minmax(0,1fr)_6.5rem_minmax(0,13rem)] gap-x-2 gap-y-1.5 px-3 py-2.5 sm:py-2 sm:items-start text-sm hover:bg-emerald-50/40 transition-colors group cursor-pointer"
                >
                  <div className="col-start-1 row-start-1 flex justify-center sm:justify-start pt-0.5">
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 border border-emerald-200/90 text-base leading-none group-hover:bg-white group-hover:border-emerald-300"
                      aria-hidden
                    >
                      {icon}
                    </span>
                  </div>
                  <div className="col-start-2 row-start-1 min-w-0 sm:col-start-2">
                    <div className="font-semibold text-slate-900 text-[15px] sm:text-sm group-hover:text-emerald-800 leading-snug">
                      {c.name}
                    </div>
                    <p className="text-[11px] sm:text-xs text-slate-600 mt-0.5 leading-snug">
                      {c.description?.trim()
                        ? c.description.trim()
                        : `Темы и обсуждения раздела «${c.name}». Откройте, чтобы увидеть все темы и создать новую.`}
                    </p>
                  </div>
                  <div className="col-span-2 col-start-1 row-start-2 text-xs text-slate-700 tabular-nums sm:col-span-1 sm:col-start-3 sm:row-start-1 sm:text-right border-t border-slate-100 sm:border-0 pt-2 sm:pt-0">
                    <div className="font-medium text-slate-900">{threads}</div>
                    <div className="text-[11px] text-slate-500">
                      {repliesApprox > 0 ? (
                        <>
                          ответов в ленте: <span className="tabular-nums">{repliesApprox}</span>
                        </>
                      ) : (
                        "ответов: —"
                      )}
                    </div>
                  </div>
                  <div
                    className="col-span-2 col-start-1 row-start-3 text-xs text-slate-600 min-w-0 sm:col-span-1 sm:col-start-4 sm:row-start-1 border-t border-slate-100 sm:border-0 pt-2 sm:pt-0"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    {last ? (
                      <Link
                        to={`/forum/topic/${encodeURIComponent(last.threadId)}`}
                        className="block rounded-md -mx-1 px-1 py-0.5 hover:bg-white/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <p className="text-slate-800 line-clamp-2 leading-snug">{last.excerpt}</p>
                        <p className="mt-1 text-[11px] text-slate-500 flex flex-wrap items-center gap-x-1 gap-y-0.5">
                          <span className="font-medium text-slate-700">{last.author}</span>
                          <span className="text-slate-400">·</span>
                          <span>{last.time}</span>
                          <ChevronRight className="w-3.5 h-3.5 text-emerald-600 shrink-0 ml-auto sm:ml-0" aria-hidden />
                        </p>
                      </Link>
                    ) : (
                      <p className="text-slate-500">Нет тем в текущей ленте — зайдите в раздел.</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Discussions */}
      <div className="bg-white rounded-lg lg:rounded-xl border border-gray-200 overflow-hidden">
        {activeFilter === "all" && feedLoading ? (
          <div className="text-center py-12 text-gray-600">Загрузка тем…</div>
        ) : discussions.length === 0 ? (
          <div className="text-center py-12 lg:py-16">
            <div className="w-16 h-16 lg:w-20 lg:h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              {activeFilter === "closed" ? (
                <CheckCircle className="w-8 h-8 lg:w-10 lg:h-10 text-gray-400" />
              ) : activeFilter === "hot" ? (
                <ForumUrgencyIcon level="critical" className="w-8 h-8 lg:w-10 lg:h-10 opacity-35" />
              ) : (
                <MessageSquare className="w-8 h-8 lg:w-10 lg:h-10 text-gray-400" />
              )}
            </div>
            <p className="text-gray-600 font-medium text-base lg:text-lg mb-2">
              {activeFilter === "closed" ? "Нет закрытых тем" :
               activeFilter === "hot" ? "Нет горячих тем" :
               "Нет тем"}
            </p>
            <p className="text-sm lg:text-base text-gray-500">
              {activeFilter === "closed"
                ? "Здесь отображаются горячие темы, где автор отметил лучший ответ."
                :                 activeFilter === "hot"
                  ? "Пометьте тему как горячую при создании — она попадёт в этот фильтр"
                  : "Создайте тему через кнопки выше — после публикации она появится в этом списке"}
            </p>
          </div>
        ) : (
          <ForumDiscussionList discussions={discussions} variant="mybb" />
        )}
      </div>

      {/* Create Hot Topic Modal */}
      {showCreateHot && (
        <CreateHotTopic
          key={`${createTopicKind}-${hotTopicInitialUrgency ?? "u"}`}
          topicKind={createTopicKind}
          initialUrgency={hotTopicInitialUrgency}
          onClose={() => {
            setShowCreateHot(false);
            setHotTopicInitialUrgency(undefined);
            setCreateTopicKind("hot");
          }}
        />
      )}
    </div>
  );
}
