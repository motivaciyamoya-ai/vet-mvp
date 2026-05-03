import { Loader2, MessageSquare, Sparkles, Trophy } from "lucide-react";
import { Link } from "react-router";
import { useEffect, useState } from "react";
import {
  apiForumHeroLatestSpotlight,
  apiForumHeroesByCategoryStats,
  type ForumHeroCategoryStatDto,
  type ForumHeroLatestSpotlightDto,
  type ForumHeroesByCategoryStatsDto,
} from "../../lib/api";
import UserAvatar from "./UserAvatar";

function formatSolvedAt(iso: string) {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  return d.toLocaleString("ru-RU", { dateStyle: "medium", timeStyle: "short" });
}

function StatTile({ cat }: { cat: ForumHeroCategoryStatDto }) {
  if (cat.solvedTopicsCount === 0 && cat.uniqueHelpersCount === 0) {
    return null;
  }
  return (
    <div className="rounded-xl border border-amber-100 bg-gradient-to-br from-amber-50/90 to-orange-50/50 px-3 py-2.5 sm:px-4 sm:py-3 shadow-sm">
      <div className="flex items-start gap-2 min-w-0">
        <span className="text-xl shrink-0" aria-hidden>
          {cat.iconEmoji || "💬"}
        </span>
        <div className="min-w-0 flex-1">
          <Link
            to={`/forum/category/${encodeURIComponent(cat.slug)}`}
            className="font-semibold text-amber-950 text-sm sm:text-base leading-tight hover:text-amber-800 hover:underline block truncate"
          >
            {cat.name}
          </Link>
          <p className="text-[11px] sm:text-xs text-amber-900/85 mt-1 leading-snug">
            Решённые темы: <span className="tabular-nums font-semibold">{cat.solvedTopicsCount}</span>
            {" · "}
            авторов лучших ответов: <span className="tabular-nums font-semibold">{cat.uniqueHelpersCount}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

/** Блок главной: последний «герой» форума и статистика по разделам */
export default function ForumHeroesHighlight() {
  const [hero, setHero] = useState<ForumHeroLatestSpotlightDto | null>(null);
  const [heroLoading, setHeroLoading] = useState(true);
  const [heroErr, setHeroErr] = useState("");
  const [stats, setStats] = useState<ForumHeroesByCategoryStatsDto | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsErr, setStatsErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    setHeroLoading(true);
    setHeroErr("");
    apiForumHeroLatestSpotlight()
      .then((r) => {
        if (!cancelled) setHero(r);
      })
      .catch((e: unknown) => {
        if (!cancelled) setHeroErr(e instanceof Error ? e.message : "Не удалось загрузить «героя»");
      })
      .finally(() => {
        if (!cancelled) setHeroLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setStatsLoading(true);
    setStatsErr("");
    apiForumHeroesByCategoryStats()
      .then((r) => {
        if (!cancelled) setStats(r);
      })
      .catch((e: unknown) => {
        if (!cancelled) setStatsErr(e instanceof Error ? e.message : "Не удалось загрузить статистику");
      })
      .finally(() => {
        if (!cancelled) setStatsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const activeTiles =
    stats?.categories.filter((c) => c.solvedTopicsCount > 0 || c.uniqueHelpersCount > 0) ?? [];

  const showEmptyStats =
    stats && stats.totals.solvedTopicsTotal === 0 && !statsLoading;

  return (
    <section className="rounded-2xl border-2 border-amber-200/80 bg-gradient-to-br from-white via-amber-50/30 to-orange-50/40 shadow-sm overflow-hidden">
      <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-amber-100/90 bg-gradient-to-r from-amber-100/50 to-orange-50/60">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex h-10 w-10 rounded-xl bg-amber-500 text-white items-center justify-center shadow-md shrink-0">
            <Trophy className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 className="font-bold text-lg sm:text-xl text-amber-950 tracking-tight">Герои форума</h2>
            <p className="text-xs sm:text-sm text-amber-900/75">
              Коллеги, которых авторы тем выбрали как тех, чей ответ реально помог
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-6">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3 flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-amber-600" />
            Сейчас на виду
          </h3>

          {heroLoading ? (
            <div className="flex items-center gap-2 text-slate-500 text-sm py-8 justify-center bg-white/60 rounded-xl border border-slate-100">
              <Loader2 className="h-5 w-5 animate-spin" />
              Ищем последнего героя…
            </div>
          ) : heroErr ? (
            <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{heroErr}</p>
          ) : !hero ? (
            <p className="text-sm text-slate-600 bg-white/80 border border-slate-100 rounded-xl px-4 py-6 text-center">
              Здесь появится тот, кого автор темы последним отметил по кнопке «это решение помогло». Помогите коллеге в&nbsp;ответе —
              возможно, это будете&nbsp;вы!
            </p>
          ) : (
            <div className="rounded-2xl border border-amber-200 bg-white shadow-md overflow-hidden ring-1 ring-amber-100/80">
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 text-white flex items-center gap-2">
                <span className="text-2xl select-none animate-pulse" role="img" aria-label="Аплодисменты">
                  👏
                </span>
                <span className="font-bold text-sm sm:text-base leading-tight">
                  Последний отмеченный ответ автором темы
                </span>
              </div>
              <div className="p-4 sm:p-5 flex flex-col sm:flex-row gap-5">
                <div className="flex flex-col items-center sm:items-start shrink-0">
                  <Link
                    to={`/users/${hero.helper.id}`}
                    title="Профиль"
                    className="rounded-full ring-4 ring-amber-200 hover:ring-amber-400 transition-shadow"
                  >
                    <UserAvatar avatarUrl={hero.helper.avatarUrl} label={hero.helper.displayName} className="w-20 h-20 sm:w-24 sm:h-24" />
                  </Link>
                  <Link
                    to={`/users/${hero.helper.id}`}
                    className="mt-2 font-bold text-center sm:text-left text-slate-900 hover:text-emerald-800 hover:underline text-sm sm:text-base"
                  >
                    {hero.helper.displayName}
                  </Link>
                  {(hero.helper.jobTitleRu || hero.helper.city || hero.helper.countryRu) && (
                    <p className="text-xs text-center sm:text-left text-slate-500 mt-0.5 max-w-[220px]">
                      {[hero.helper.jobTitleRu, [hero.helper.city, hero.helper.countryRu].filter(Boolean).join(", ")]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
                </div>

                <div className="min-w-0 flex-1 flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-lg" aria-hidden>
                      {hero.category.iconEmoji}
                    </span>
                    <Link
                      to={`/forum/category/${encodeURIComponent(hero.category.slug)}`}
                      className="text-sm font-semibold text-emerald-800 hover:underline"
                    >
                      {hero.category.name}
                    </Link>
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-xs text-slate-500">{formatSolvedAt(hero.solvedAt)}</span>
                  </div>
                  <Link
                    to={`/forum/topic/${hero.threadId}`}
                    className="font-semibold text-slate-900 hover:text-emerald-700 hover:underline leading-snug text-base sm:text-lg"
                  >
                    {hero.threadTitle}
                  </Link>
                  <blockquote className="text-sm text-slate-700 leading-relaxed border-l-4 border-amber-400 pl-4 py-1 bg-amber-50/50 rounded-r-lg italic">
                    «{hero.answerExcerpt}»
                  </blockquote>
                  <Link
                    to={`/forum/topic/${hero.threadId}`}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:text-emerald-900 w-fit"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Открыть тему →
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3 flex items-center gap-2">
            <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
            По разделам форума
          </h3>

          {statsLoading ? (
            <div className="flex items-center gap-2 text-slate-500 text-sm py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              Считаем статистику…
            </div>
          ) : statsErr ? (
            <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{statsErr}</p>
          ) : showEmptyStats ? (
            <p className="text-sm text-slate-600">Пока нет тем с выбранным лучшим ответом — статистика появится после первых решений.</p>
          ) : stats ? (
            <>
              <p className="text-xs sm:text-sm text-slate-600 mb-3">
                Всего решённых тем:{" "}
                <span className="font-semibold tabular-nums text-slate-900">{stats.totals.solvedTopicsTotal}</span>
                {" · "}уникальных героев по всей площадке:{" "}
                <span className="font-semibold tabular-nums text-slate-900">{stats.totals.uniqueHelpersTotal}</span>
              </p>
              {activeTiles.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                  {activeTiles.map((cat) => (
                    <StatTile key={cat.id} cat={cat} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-600">Нет данных для разбиения по разделам.</p>
              )}
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}
