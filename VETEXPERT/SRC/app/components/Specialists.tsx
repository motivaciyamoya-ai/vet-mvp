import { MapPin, Search, Filter, Users, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { apiFetch } from "../../lib/api";
import { flagEmojiFromAlpha2 } from "../../lib/countryEmoji";

type ByCountryRow = {
  countryId: string;
  code: string;
  nameRu: string;
  specialists: number;
  citiesRepresented: number;
};

type SpecialistItem = {
  userId: string;
  displayName: string;
  city: string;
  avatarUrl: string | null;
  country: { id: string; code: string; nameRu: string };
  jobTitle: { id: string; nameRu: string };
};

type SpecialistListResponse = {
  items: SpecialistItem[];
  total: number;
  page: number;
  pageSize: number;
};

function initials(displayName: string) {
  return displayName
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function Specialists() {
  const [searchParams, setSearchParams] = useSearchParams();
  const countryId = searchParams.get("country") ?? "";

  const [viewMode, setViewMode] = useState<"map" | "list">("list");
  const [qInput, setQInput] = useState("");
  const [qDebounced, setQDebounced] = useState("");

  const [sidebar, setSidebar] = useState<ByCountryRow[]>([]);
  const [list, setList] = useState<SpecialistItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 24;
  const [loadingSidebar, setLoadingSidebar] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setQDebounced(qInput.trim()), 350);
    return () => clearTimeout(t);
  }, [qInput]);

  const loadSidebar = useCallback(async () => {
    setLoadingSidebar(true);
    try {
      const res = await apiFetch<{ items: ByCountryRow[] }>("/api/reference/specialists/by-country");
      setSidebar(res.items ?? []);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Ошибка загрузки стран");
    } finally {
      setLoadingSidebar(false);
    }
  }, []);

  const loadCatalog = useCallback(
    async (targetPage: number, append: boolean) => {
      setListLoading(true);
      setErr("");
      try {
        const params = new URLSearchParams();
        params.set("page", String(targetPage));
        params.set("pageSize", String(pageSize));
        if (countryId) params.set("countryId", countryId);
        if (qDebounced) params.set("q", qDebounced);
        const res = await apiFetch<SpecialistListResponse>(`/api/reference/specialists?${params.toString()}`);
        const items = res.items ?? [];
        setTotal(res.total ?? 0);
        setList((prev) => (append ? [...prev, ...items] : items));
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : "Ошибка каталога");
        if (!append) {
          setList([]);
          setTotal(0);
        }
      } finally {
        setListLoading(false);
      }
    },
    [countryId, qDebounced, pageSize],
  );

  useEffect(() => {
    void loadSidebar();
  }, [loadSidebar]);

  /** Смена страны или поиска всегда тянем первую страницу заново */
  useEffect(() => {
    setPage(1);
    void loadCatalog(1, false);
  }, [countryId, qDebounced, loadCatalog]);

  /** Догрузка страниц без смены фильтров */
  useEffect(() => {
    if (page <= 1) return;
    void loadCatalog(page, true);
  }, [page, loadCatalog]);

  const selectCountry = (id: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (!id) {
      next.delete("country");
    } else {
      next.set("country", id);
    }
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="space-y-5 lg:space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="font-bold text-xl sm:text-2xl text-slate-900 tracking-tight">Специалисты</h1>
        <p className="text-slate-600 text-sm mt-1">
          Каталог по данным регистрации: страна, город, должность. Рейтинги и «онлайн» не используются — только
          фактические профили в базе.
        </p>
      </div>

      {err && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">{err}</div>}

      <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="search"
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="Имя, город или должность…"
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => selectCountry(null)}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                !countryId
                  ? "bg-slate-900 text-white border-slate-900"
                  : "border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              Все страны
            </button>
            <div className="flex rounded-lg border border-slate-200 overflow-hidden">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`px-4 py-2.5 text-sm font-medium transition-colors ${viewMode === "list" ? "bg-emerald-600 text-white" : "bg-white text-slate-700 hover:bg-slate-50"}`}
              >
                Список
              </button>
              <button
                type="button"
                onClick={() => setViewMode("map")}
                className={`px-4 py-2.5 text-sm font-medium transition-colors ${viewMode === "map" ? "bg-emerald-600 text-white" : "bg-white text-slate-700 hover:bg-slate-50"}`}
              >
                Карта
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,240px)_1fr] gap-5">
        <aside className="lg:sticky lg:top-24 h-fit">
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2 bg-slate-50/90">
              <Filter className="w-4 h-4 text-slate-500" />
              <h2 className="text-sm font-semibold text-slate-800">По странам</h2>
            </div>
            {loadingSidebar ? (
              <div className="flex items-center gap-2 text-slate-500 text-sm p-6">
                <Loader2 className="w-4 h-4 animate-spin" /> Загрузка…
              </div>
            ) : sidebar.length === 0 ? (
              <p className="text-sm text-slate-600 p-4">Стран пока нет.</p>
            ) : (
              <ul className="max-h-[min(24rem,50vh)] overflow-y-auto divide-y divide-slate-100">
                {sidebar.map((c) => (
                  <li key={c.countryId}>
                    <button
                      type="button"
                      onClick={() => selectCountry(c.countryId)}
                      className={`w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-emerald-50/60 transition-colors ${
                        countryId === c.countryId ? "bg-emerald-50 text-emerald-900 font-medium" : "text-slate-800"
                      }`}
                    >
                      <span className="text-base shrink-0">{flagEmojiFromAlpha2(c.code)}</span>
                      <span className="flex-1 truncate">{c.nameRu}</span>
                      <span className="text-xs tabular-nums text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                        {c.specialists}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        <div>
          {viewMode === "list" ? (
            <>
              <div className="flex items-center justify-between gap-2 mb-3 text-sm text-slate-600">
                <span>
                  {listLoading && page === 1 ? (
                    "Загрузка…"
                  ) : (
                    <>
                      Найдено: <strong className="text-slate-900 tabular-nums">{total}</strong>
                    </>
                  )}
                </span>
                <Link to="/register" className="text-emerald-700 font-medium hover:underline text-sm">
                  + Регистрация
                </Link>
              </div>

              {listLoading && page === 1 ? (
                <div className="flex items-center justify-center py-16 text-slate-500 gap-2 text-sm">
                  <Loader2 className="w-5 h-5 animate-spin" /> Загружаем специалистов…
                </div>
              ) : list.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 py-14 text-center text-sm text-slate-600 px-4">
                  Пока никого не найдено.
                  {(countryId || qDebounced) && (
                    <button
                      type="button"
                      className="block mx-auto mt-3 text-sm font-medium text-emerald-700 hover:underline"
                      onClick={() => {
                        selectCountry(null);
                        setQInput("");
                        setQDebounced("");
                      }}
                    >
                      Сбросить фильтры
                    </button>
                  )}
                </div>
              ) : (
                <ul className="space-y-2">
                  {list.map((s) => (
                    <li key={s.userId}>
                      <Link
                        to={`/users/${encodeURIComponent(s.userId)}`}
                        title={`Профиль: ${s.displayName}`}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-3 sm:py-4 flex gap-3 sm:gap-4 items-start hover:border-emerald-200 hover:bg-emerald-50/35 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-2 block text-left cursor-pointer"
                      >
                      <div className="shrink-0">
                        {s.avatarUrl ? (
                          <img src={s.avatarUrl} alt="" className="w-12 h-12 rounded-full object-cover border border-slate-100" />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm font-semibold">
                            {initials(s.displayName)}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                          <h3 className="font-semibold text-slate-900 text-sm sm:text-base truncate">{s.displayName}</h3>
                          <span className="text-xs text-slate-500">{s.jobTitle.nameRu}</span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-600 mt-1 flex flex-wrap items-center gap-x-1 gap-y-0.5">
                          <MapPin className="w-3.5 h-3.5 inline shrink-0 text-slate-400" />
                          <span className="truncate">
                            {s.city}, {s.country.nameRu}
                          </span>
                        </p>
                      </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}

              {list.length > 0 && list.length < total && (
                <div className="mt-4 flex flex-col items-center gap-2">
                  <button
                    type="button"
                    disabled={listLoading}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-5 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-60"
                  >
                    {listLoading ? "Загрузка…" : `Показать ещё (${total - list.length})`}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-10 text-center">
              <MapPin className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="font-semibold text-slate-900 text-sm mb-1">Карта в разработке</h3>
              <p className="text-slate-600 text-xs max-w-sm mx-auto">
                География уже есть по странам и городам регистрации; интерактивная карта подключится отдельно.
              </p>
            </div>
          )}
        </div>
      </div>

      {!countryId &&
        sidebar.length === 0 &&
        !loadingSidebar &&
        !listLoading &&
        total === 0 &&
        qDebounced === "" && (
          <p className="text-center text-sm text-slate-500 pb-8">
            <Users className="w-10 h-10 mx-auto mb-3 text-slate-300 opacity-70" /> В каталоге пока нет специалистов.
          </p>
        )}
    </div>
  );
}
