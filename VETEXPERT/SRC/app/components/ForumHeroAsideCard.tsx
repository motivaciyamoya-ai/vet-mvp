import { Loader2, Trophy } from "lucide-react";
import { Link } from "react-router";
import { useEffect, useState } from "react";
import { apiForumHeroLatestSpotlight, type ForumHeroLatestSpotlightDto } from "../../lib/api";
import UserAvatar from "./UserAvatar";

function formatSolvedAt(iso: string) {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  return d.toLocaleString("ru-RU", { dateStyle: "medium", timeStyle: "short" });
}

/** Компактный «герой форума» для правого сайдбара (над чатом). */
export default function ForumHeroAsideCard() {
  const [hero, setHero] = useState<ForumHeroLatestSpotlightDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr("");
    apiForumHeroLatestSpotlight()
      .then((r) => {
        if (!cancelled) setHero(r);
      })
      .catch((e: unknown) => {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Не удалось загрузить героя форума");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-white via-amber-50/30 to-orange-50/40 shadow-sm overflow-hidden">
      <style>{`
        @keyframes vc-hero-ring-pulse {
          0% { box-shadow: 0 0 0 0 rgba(245, 158, 11, .45), 0 0 0 0 rgba(16, 185, 129, .0); }
          40% { box-shadow: 0 0 0 6px rgba(245, 158, 11, .10), 0 0 0 0 rgba(16, 185, 129, .0); }
          55% { box-shadow: 0 0 0 0 rgba(245, 158, 11, .0), 0 0 0 0 rgba(16, 185, 129, .0); }
          70% { box-shadow: 0 0 0 0 rgba(245, 158, 11, .0), 0 0 0 7px rgba(16, 185, 129, .12); }
          100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, .0), 0 0 0 0 rgba(16, 185, 129, .0); }
        }
      `}</style>
      <div className="px-4 py-3 border-b border-amber-100/90 bg-gradient-to-r from-amber-100/60 to-orange-50/70">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm shrink-0">
            <Trophy className="h-4.5 w-4.5" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 className="font-bold text-sm text-amber-950 leading-tight">Герой форума</h2>
            <p className="text-[11px] text-amber-900/75 leading-tight truncate">
              Последний отмеченный «лучший ответ»
            </p>
          </div>
        </div>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            Ищем героя…
          </div>
        ) : err ? (
          <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{err}</p>
        ) : !hero ? (
          <p className="text-xs text-slate-600">Пока нет решённых горячих тем — герои появятся после выбора решения.</p>
        ) : (
          <div className="flex items-start gap-3">
            <div className="relative shrink-0">
              <Link to={`/users/${encodeURIComponent(hero.helper.id)}`} className="block">
                <div
                  className="rounded-full"
                  style={{ animation: "vc-hero-ring-pulse 1.9s ease-in-out infinite" }}
                >
                  <UserAvatar
                    avatarUrl={hero.helper.avatarUrl}
                    label={hero.helper.displayName}
                    className="w-11 h-11"
                    ringClassName="ring-2 ring-amber-200"
                  />
                </div>
              </Link>
            </div>
            <div className="min-w-0 flex-1">
              <Link
                to={`/users/${encodeURIComponent(hero.helper.id)}`}
                className="font-semibold text-sm text-slate-900 hover:underline block truncate"
                title={hero.helper.displayName}
              >
                {hero.helper.displayName}
              </Link>
              <div className="text-[11px] text-slate-600 truncate">
                {[hero.helper.jobTitleRu, [hero.helper.city, hero.helper.countryRu].filter(Boolean).join(", ")]
                  .filter(Boolean)
                  .join(" · ")}
              </div>

              <div className="mt-2 rounded-xl border border-slate-200 bg-white/70 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <Link
                    to={`/forum/category/${encodeURIComponent(hero.category.slug)}`}
                    className="text-[11px] font-semibold text-amber-900 hover:underline truncate"
                    title={hero.category.name}
                  >
                    <span className="mr-1" aria-hidden>
                      {hero.category.iconEmoji}
                    </span>
                    {hero.category.name}
                  </Link>
                  <span className="text-[10px] text-slate-500 shrink-0">{formatSolvedAt(hero.solvedAt)}</span>
                </div>
                <Link
                  to={`/forum/topic/${encodeURIComponent(hero.threadId)}`}
                  className="mt-1 block text-xs font-semibold text-slate-900 hover:text-amber-800 hover:underline line-clamp-2"
                >
                  {hero.threadTitle}
                </Link>
                <div className="mt-1 text-[11px] text-slate-600 line-clamp-2">«{hero.answerExcerpt}»</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

