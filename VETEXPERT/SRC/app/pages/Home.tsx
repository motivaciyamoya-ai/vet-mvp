import { Users, Globe, MessageSquare, Loader2, Calendar } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { FORUM_NEW_HOT_PATH } from "../../lib/forumHotTopicPath";
import { ForumUrgencyIcon } from "../components/ForumUrgencyVisual";
import GuestPublishGate from "../components/GuestPublishGate";
import HotTopics from "../components/HotTopics";
import RecentTopics from "../components/RecentTopics";
import RecentArticles from "../components/RecentArticles";
import Marketplace from "../components/Marketplace";
import BirthdayBanner from "../components/BirthdayBanner";
import HomeLobbyChat from "../components/HomeLobbyChat";
import { apiFetch } from "../../lib/api";
import { flagEmojiFromAlpha2, pluralRuNoun } from "../../lib/countryEmoji";

type ByCountryRow = {
  countryId: string;
  code: string;
  nameRu: string;
  specialists: number;
  citiesRepresented: number;
};

type ByCountryResponse = {
  totalSpecialists: number;
  items: ByCountryRow[];
};

function formatInt(n: number) {
  return n.toLocaleString("ru-RU");
}

export default function Home() {
  const [byCountry, setByCountry] = useState<ByCountryResponse | null>(null);
  const [loadErr, setLoadErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoadErr("");
    apiFetch<ByCountryResponse>("/api/reference/specialists/by-country")
      .then((b) => {
        if (!cancelled) setByCountry(b);
      })
      .catch((e: unknown) => {
        if (!cancelled) setLoadErr(e instanceof Error ? e.message : "Не удалось загрузить данные");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6 lg:space-y-8">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl lg:rounded-2xl px-5 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-9 text-white shadow-sm">
        <h1 className="font-bold text-2xl sm:text-3xl lg:text-4xl tracking-tight">
          Добро пожаловать в VetConnect
        </h1>
        <p className="text-emerald-50/95 text-sm sm:text-base mt-2 max-w-2xl leading-relaxed">
          Профессиональная платформа для ветеринарных специалистов. При регистрации укажите страну и город — это
          помогает сообществу видеть географию участников.
        </p>
        <div className="mt-5 flex flex-col sm:flex-row flex-wrap gap-3 items-stretch">
          <GuestPublishGate tone="hero" promptClassName="max-w-xl">
            <Link
              to={FORUM_NEW_HOT_PATH}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-black/15 transition hover:from-red-700 hover:to-orange-700 hover:shadow-xl sm:self-start"
            >
              <ForumUrgencyIcon level="critical" accent="onDark" className="h-5 w-5 shrink-0" />
              Создать горячую тему на форуме
            </Link>
          </GuestPublishGate>
          <Link
            to="/forum"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/40 bg-white/10 px-5 py-3 text-sm font-medium text-white backdrop-blur-[2px] transition hover:bg-white/20 sm:self-start"
          >
            <MessageSquare className="h-5 w-5 shrink-0 opacity-95" />
            Все темы форума
          </Link>
        </div>
      </div>

      <BirthdayBanner />

      <div className="lg:hidden">
        <HomeLobbyChat />
      </div>

      {loadErr && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{loadErr}</div>
      )}

      <HotTopics limit={3} />
      <RecentTopics limit={4} />
      <RecentArticles limit={4} />
      <Marketplace limit={6} />

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-5 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
              <Globe className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold text-slate-900 text-base sm:text-lg">Специалисты по странам</h2>
              <p className="text-xs sm:text-sm text-slate-600 truncate">
                Данные профилей после регистрации (страна и город)
              </p>
            </div>
          </div>
        </div>

        {byCountry == null && !loadErr ? (
          <div className="flex items-center gap-2 text-slate-500 text-sm px-5 py-10">
            <Loader2 className="w-5 h-5 animate-spin" />
            Загружаем география…
          </div>
        ) : byCountry != null && byCountry.items.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-600">
            Пока никто не зарегистрирован. Станьте первым участником платформы.
          </p>
        ) : byCountry != null ? (
          <>
            <div className="max-h-[min(22rem,52vh)] overflow-y-auto divide-y divide-slate-100">
              {byCountry.items.slice(0, 10).map((row) => (
                <div
                  key={row.countryId}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/90 transition-colors"
                >
                  <span className="text-xl shrink-0 tabular-nums" aria-hidden>
                    {flagEmojiFromAlpha2(row.code)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{row.nameRu}</p>
                    <p className="text-xs text-slate-500">
                      {pluralRuNoun(row.citiesRepresented, {
                        one: "город",
                        few: "города",
                        many: "городов",
                      })}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-slate-900 tabular-nums">{row.specialists}</p>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">спец.</p>
                  </div>
                </div>
              ))}
            </div>
            {byCountry.items.length > 10 && (
              <div className="px-5 py-2 text-center border-t border-slate-100 bg-slate-50/50">
                <p className="text-xs text-slate-600">
                  Показаны 10 из {byCountry.items.length} стран с зарегистрированными участниками.
                </p>
              </div>
            )}
          </>
        ) : null}

        {byCountry != null && byCountry.totalSpecialists > 0 && (
          <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
            <span className="inline-flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-400" />
              Зарегистрировано: <strong className="text-slate-900">{formatInt(byCountry.totalSpecialists)}</strong>{" "}
              специалистов
            </span>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        <Link
          to="/forum"
          className="rounded-xl border border-slate-200 bg-white p-5 hover:border-emerald-200 hover:bg-emerald-50/40 transition-colors"
        >
          <h3 className="font-semibold text-slate-900 text-sm mb-1">Форум</h3>
          <p className="text-slate-600 text-xs leading-relaxed mb-3">Обсуждения и обмен опытом</p>
          <span className="text-xs font-medium text-emerald-700">Перейти →</span>
        </Link>
        <Link
          to="/articles"
          className="rounded-xl border border-slate-200 bg-white p-5 hover:border-violet-200 hover:bg-violet-50/40 transition-colors"
        >
          <h3 className="font-semibold text-slate-900 text-sm mb-1">Статьи</h3>
          <p className="text-slate-600 text-xs leading-relaxed mb-3">Публикации участников</p>
          <span className="text-xs font-medium text-violet-700">Читать →</span>
        </Link>
        <Link
          to="/events"
          className="rounded-xl border border-slate-200 bg-white p-5 hover:border-amber-200 hover:bg-amber-50/40 transition-colors"
        >
          <h3 className="font-semibold text-slate-900 text-sm mb-1 inline-flex items-center gap-2">
            <Calendar className="h-4 w-4 text-amber-700 shrink-0" aria-hidden />
            Мероприятия
          </h3>
          <p className="text-slate-600 text-xs leading-relaxed mb-3">Календарь вебинаров и встреч</p>
          <span className="text-xs font-medium text-amber-800">Открыть →</span>
        </Link>
      </div>
    </div>
  );
}
