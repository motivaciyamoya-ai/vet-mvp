import { Globe, Loader2, MapPin, MessageSquare, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import { apiFetch } from "../../lib/api";
import HomeLobbyChat from "./HomeLobbyChat";
import ForumHeroAsideCard from "./ForumHeroAsideCard";

type SpecialistsOverview = {
  specialists: number;
  countries: number;
  cities: number;
  forumTopics: number;
};

function formatInt(n: number) {
  return n.toLocaleString("ru-RU");
}

export default function SiteAside() {
  const location = useLocation();
  const [overview, setOverview] = useState<SpecialistsOverview | null>(null);
  const [loadErr, setLoadErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    apiFetch<SpecialistsOverview>("/api/reference/specialists/overview")
      .then((o) => {
        if (!cancelled) setOverview(o);
      })
      .catch((e: unknown) => {
        if (!cancelled) setLoadErr(e instanceof Error ? e.message : "Ошибка");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const tiles =
    overview != null
      ? [
          {
            label: "Специалистов",
            value: overview.specialists,
            icon: Users,
            iconBox: "bg-emerald-100 text-emerald-700",
          },
          {
            label: "Стран",
            value: overview.countries,
            icon: Globe,
            iconBox: "bg-blue-100 text-blue-700",
          },
          {
            label: "Городов",
            value: overview.cities,
            icon: MapPin,
            iconBox: "bg-violet-100 text-violet-700",
          },
          {
            label: "Тем на форуме",
            value: overview.forumTopics,
            icon: MessageSquare,
            iconBox: "bg-amber-100 text-amber-800",
          },
        ]
      : [];

  return (
    <div className="space-y-4">
      {location.pathname === "/" && <ForumHeroAsideCard />}
      <HomeLobbyChat />

      <section className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50/90">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-600">
            О платформе
          </h2>
          <Link
            to="/specialists"
            className="text-[11px] font-medium text-emerald-700 hover:text-emerald-800 shrink-0"
          >
            Каталог
          </Link>
        </div>
        <div className="p-3 space-y-2">
          {loadErr ? (
            <p className="text-xs text-amber-800 bg-amber-50 rounded-lg px-2 py-1.5">{loadErr}</p>
          ) : overview == null ? (
            <div className="flex items-center gap-2 text-slate-500 text-xs py-2">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              Загрузка…
            </div>
          ) : (
            <ul className="space-y-1.5">
              {tiles.map((t) => (
                <li
                  key={t.label}
                  className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50/70 px-2.5 py-2"
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${t.iconBox}`}
                  >
                    <t.icon className="w-3.5 h-3.5" aria-hidden />
                  </div>
                  <div className="min-w-0 leading-tight">
                    <div className="text-sm font-bold text-slate-900 tabular-nums">
                      {formatInt(t.value)}
                    </div>
                    <div className="text-[10px] text-slate-600 leading-snug">{t.label}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
