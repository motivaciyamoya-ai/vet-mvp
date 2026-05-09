import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import {
  apiAdminLiveTraffic,
  apiAdminLiveTrafficHistory,
  apiAdminLiveTrafficSummary,
  apiAdminLiveTrafficTopPaths,
  apiFetch,
  type AdminLiveTrafficHistory,
  type AdminLiveTrafficHistoryRange,
  type AdminLiveTrafficSnapshot,
  type AdminLiveTrafficSummary,
  type AdminLiveTrafficTopPaths,
} from "../../lib/api";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";

type Summary = {
  users: number;
  forumCategories: number;
  forumThreads: number;
  forumPosts: number;
  articles: number;
  listings: number;
  reports: number;
  sosOpen: number;
  sosTotal: number;
  pushTokens: number;
};

type Analytics = {
  summary: Summary;
  usersByRole: { role: string; count: number }[];
  listingsByType: { type: string; count: number }[];
  sosByStatus: { status: string; count: number }[];
  forumCategoryBreakdown: {
    categoryId: string;
    count: number;
    category: { name: string; slug: string; iconEmoji: string } | null;
  }[];
  series: {
    users: { date: string; count: number }[];
    threads: { date: string; count: number }[];
    posts: { date: string; count: number }[];
    articles: { date: string; count: number }[];
  };
  recentUsers: { id: string; email: string; role: string; createdAt: string }[];
};

const PIE_COLORS = ["#059669", "#0d9488", "#6366f1", "#d97706", "#dc2626", "#7c3aed"];

function fmtDay(d: string | Date) {
  try {
    return new Date(d).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  } catch {
    return String(d);
  }
}

const LIVE_POLL_MS = 4000;
const HISTORY_POLL_MS = 30000;

export default function AdminDashboard() {
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState("");
  const [liveWindowSec, setLiveWindowSec] = useState(300);
  const [live, setLive] = useState<AdminLiveTrafficSnapshot | null>(null);
  const [liveErr, setLiveErr] = useState("");
  const [histRange, setHistRange] = useState<AdminLiveTrafficHistoryRange>("day");
  const [hist, setHist] = useState<AdminLiveTrafficHistory | null>(null);
  const [histErr, setHistErr] = useState("");
  const [histSummary, setHistSummary] = useState<AdminLiveTrafficSummary | null>(null);
  const [histSummaryErr, setHistSummaryErr] = useState("");
  const [topPaths, setTopPaths] = useState<AdminLiveTrafficTopPaths | null>(null);
  const [topPathsErr, setTopPathsErr] = useState("");

  useEffect(() => {
    apiFetch<Analytics>("/api/admin/analytics")
      .then(setData)
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("Unauthorized") || msg.includes("401")) {
          setError("Требуется вход (JWT). Выйдите и войдите снова под ADMIN.");
          return;
        }
        if (msg.includes("Forbidden") || msg.includes("403")) {
          setError("Нужна роль ADMIN для /api/admin/analytics.");
          return;
        }
        if (msg === "Failed to fetch" || msg.includes("NetworkError")) {
          setError(
            import.meta.env.DEV
              ? "Нет связи с сервером. Для локальной разработки убедитесь, что API запущено и dev-прокси /api настроен."
              : "Нет связи с сервером. Проверьте подключение и попробуйте обновить страницу через минуту.",
          );
          return;
        }
        setError(`Не удалось загрузить аналитику: ${msg}`);
      });
  }, []);

  useEffect(() => {
    if (!data) return;
    let cancelled = false;
    const load = () => {
      apiAdminLiveTraffic(liveWindowSec)
        .then((r) => {
          if (!cancelled) {
            setLive(r);
            setLiveErr("");
          }
        })
        .catch((e: unknown) => {
          if (!cancelled) {
            setLive(null);
            setLiveErr(e instanceof Error ? e.message : String(e));
          }
        });
    };
    load();
    const id = window.setInterval(load, LIVE_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [liveWindowSec, data]);

  useEffect(() => {
    if (!data) return;
    let cancelled = false;
    const load = () => {
      apiAdminLiveTrafficHistory(histRange)
        .then((r) => {
          if (!cancelled) {
            setHist(r);
            setHistErr("");
          }
        })
        .catch((e: unknown) => {
          if (!cancelled) {
            setHist(null);
            setHistErr(e instanceof Error ? e.message : String(e));
          }
        });
    };
    load();
    const id = window.setInterval(load, HISTORY_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [histRange, data]);

  useEffect(() => {
    if (!data) return;
    let cancelled = false;
    const load = () => {
      Promise.all([
        apiAdminLiveTrafficSummary(histRange),
        apiAdminLiveTrafficTopPaths(histRange, 20),
      ])
        .then(([s, top]) => {
          if (!cancelled) {
            setHistSummary(s);
            setHistSummaryErr("");
            setTopPaths(top);
            setTopPathsErr("");
          }
        })
        .catch((e: unknown) => {
          if (!cancelled) {
            const msg = e instanceof Error ? e.message : String(e);
            setHistSummary(null);
            setTopPaths(null);
            setHistSummaryErr(msg);
            setTopPathsErr(msg);
          }
        });
    };
    load();
    const id = window.setInterval(load, HISTORY_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [histRange, data]);

  const roleChart = useMemo(
    () =>
      (data?.usersByRole ?? []).map((r) => ({
        name: r.role,
        value: r.count,
      })),
    [data],
  );

  const forumBar = useMemo(
    () =>
      (data?.forumCategoryBreakdown ?? [])
        .filter((x) => x.category)
        .map((x) => ({
          name: `${x.category!.iconEmoji} ${x.category!.name}`.slice(0, 28),
          темы: x.count,
        })),
    [data],
  );

  const histChart = useMemo(() => {
    const pts = hist?.points ?? [];
    const bucket = hist?.bucket ?? "minute";
    const fmt = (iso: string) => {
      const d = new Date(iso);
      if (bucket === "day") return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "short" });
      return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    };
    return pts.map((p) => ({
      t: fmt(p.at),
      "Хиты": p.totalHits,
      "Люди (уник.)": p.uniqueHumanIps,
      "Боты (уник.)": p.uniqueBotIps,
    }));
  }, [hist]);

  const botSharePie = useMemo(() => {
    const s = histSummary;
    if (!s) return [];
    return [
      { name: `Люди ${s.humanSharePct}%`, value: s.humanHits },
      { name: `Боты ${s.botSharePct}%`, value: s.botHits },
    ];
  }, [histSummary]);

  const topPathsBar = useMemo(() => {
    const rows = topPaths?.rows ?? [];
    return rows.map((r) => ({
      name: String(r.path).slice(0, 44),
      hits: r.hits,
      people: r.humanHits,
      bots: r.botHits,
    }));
  }, [topPaths]);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!data) return <p className="text-slate-600">Загрузка аналитики…</p>;

  const { summary, series, recentUsers } = data;

  const lineData = (() => {
    const keys = new Set<string>();
    series.users.forEach((x) => keys.add(String(x.date)));
    series.threads.forEach((x) => keys.add(String(x.date)));
    series.posts.forEach((x) => keys.add(String(x.date)));
    const sorted = [...keys].sort();
    return sorted.map((d) => ({
      day: fmtDay(d),
      Пользователи: series.users.find((x) => String(x.date) === d)?.count ?? 0,
      Темы: series.threads.find((x) => String(x.date) === d)?.count ?? 0,
      Посты: series.posts.find((x) => String(x.date) === d)?.count ?? 0,
    }));
  })();

  const cards: [string, number][] = [
    ["Пользователи", summary.users],
    ["Категории форума", summary.forumCategories],
    ["Темы", summary.forumThreads],
    ["Посты", summary.forumPosts],
    ["Статьи", summary.articles],
    ["Объявления", summary.listings],
    ["Жалобы", summary.reports],
    ["SOS открыто", summary.sosOpen],
    ["Push-токены", summary.pushTokens],
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Аналитика и обзор</h1>
        <p className="text-slate-600 text-sm mt-1">
          Сводка за 14 дней: распределения и последние регистрации.
        </p>
        <p className="text-sm mt-2">
          <Link to="/admin/mail" className="text-emerald-700 font-semibold hover:underline">
            Почта и SMTP (рассылки, тест)
          </Link>
        </p>
      </div>

      <section className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-white to-indigo-50/60 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              Посетители в реальном времени
              <span className="text-xs font-semibold uppercase tracking-wide text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                обновление ~{Math.round(LIVE_POLL_MS / 1000)} с
              </span>
            </h2>
            <p className="text-slate-600 text-xs sm:text-sm mt-1 max-w-3xl">
              Уникальные IP за выбранное окно среди запросов к API (SPA ходит в <code className="text-[11px] bg-white/80 px-1 rounded">/api/*</code>
              ). Админка и Swagger не считаются. По User-Agent распознаются поисковые и прочие боты (эвристика). За
              reverse‑proxy задайте <code className="text-[11px] bg-white/80 px-1 rounded">TRUST_PROXY=1</code>, чтобы видеть реальный клиентский IP из{" "}
              <code className="text-[11px] bg-white/80 px-1 rounded">X‑Forwarded‑For</code>.
            </p>
            <p className="text-slate-700 text-xs mt-2 max-w-3xl rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              <span className="font-semibold">История (день / неделя / месяц)</span> хранится в БД. Если графики пустые
              и текст ошибки про <code className="font-mono text-[11px]">AdminTrafficHit</code>: на сервере выполните{" "}
              <code className="font-mono text-[11px]">docker compose exec backend npx prisma migrate deploy</code>,
              затем <code className="font-mono text-[11px]">docker compose restart backend</code>. После обновления
              кода обязательно пересоберите и <code className="font-mono text-[11px]">web</code>, и{" "}
              <code className="font-mono text-[11px]">backend</code>.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <label className="flex flex-col gap-1 shrink-0 text-sm">
              <span className="text-slate-600 font-medium">Окно live, сек</span>
              <select
                value={liveWindowSec}
                onChange={(e) => setLiveWindowSec(Number(e.target.value))}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900"
              >
                <option value={120}>120</option>
                <option value={300}>300 (5 мин)</option>
                <option value={600}>600</option>
                <option value={900}>900 (15 мин)</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 shrink-0 text-sm">
              <span className="text-slate-600 font-medium">Период истории</span>
              <select
                value={histRange}
                onChange={(e) => setHistRange(e.target.value as AdminLiveTrafficHistoryRange)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 min-w-[11rem]"
              >
                <option value="day">День</option>
                <option value="week">Неделя</option>
                <option value="month">Месяц</option>
                <option value="3m">3 месяца</option>
              </select>
            </label>
          </div>
        </div>

        {liveErr ? (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{liveErr}</p>
        ) : null}

        {!liveErr && live ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-xl bg-white/90 border border-slate-200 p-4">
                <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Люди (уник. IP)</p>
                <p className="text-2xl font-bold text-emerald-700 mt-1">{live.uniqueHumanIps}</p>
              </div>
              <div className="rounded-xl bg-white/90 border border-slate-200 p-4">
                <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Боты (уник. IP)</p>
                <p className="text-2xl font-bold text-indigo-700 mt-1">{live.uniqueBotIps}</p>
              </div>
              <div className="rounded-xl bg-white/90 border border-slate-200 p-4">
                <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Все обращения</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{live.totalHits}</p>
              </div>
              <div className="rounded-xl bg-white/90 border border-slate-200 p-4">
                <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Снимок</p>
                <p className="text-xs font-mono text-slate-600 mt-2 leading-snug">{new Date(live.generatedAt).toLocaleString("ru-RU")}</p>
              </div>
            </div>

            {live.searchBotHitsByFamily.length > 0 ? (
              <div className="rounded-xl bg-white/90 border border-slate-200 p-4">
                <p className="font-semibold text-slate-800 text-sm mb-2">Запросы от роботов по типу (за окно)</p>
                <ul className="flex flex-wrap gap-2">
                  {live.searchBotHitsByFamily.map((x) => (
                    <li
                      key={x.family}
                      className="text-xs px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-900 border border-indigo-100"
                    >
                      {x.family}: <span className="font-bold">{x.hits}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-slate-500 italic">За это окно запросов от распознанных ботов не было.</p>
            )}

            <div className="rounded-xl bg-white border border-slate-200 overflow-hidden">
              <div className="px-4 py-2 border-b border-slate-100 text-sm font-semibold text-slate-800">
                Последние события (до 100 в окне)
              </div>
              <div className="overflow-x-auto max-h-[min(28rem,50vh)]">
                <table className="w-full text-xs sm:text-sm">
                  <thead className="bg-slate-50 text-left text-slate-600 sticky top-0">
                    <tr>
                      <th className="p-2 whitespace-nowrap">Время</th>
                      <th className="p-2 whitespace-nowrap">IP</th>
                      <th className="p-2 whitespace-nowrap">Тип</th>
                      <th className="p-2 whitespace-nowrap">Бот</th>
                      <th className="p-2">Запрос</th>
                      <th className="p-2 min-w-[8rem]">User-Agent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {live.recent.map((row, i) => (
                      <tr key={`${row.at}-${row.ip}-${i}`} className="border-t border-slate-100 align-top hover:bg-slate-50/80">
                        <td className="p-2 text-slate-600 whitespace-nowrap font-mono text-[11px]">
                          {new Date(row.at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </td>
                        <td className="p-2 font-mono text-[11px] text-slate-800">{row.ip}</td>
                        <td className="p-2">
                          <span
                            className={`inline-flex px-1.5 py-0.5 rounded font-semibold ${
                              row.isBot ? "bg-indigo-100 text-indigo-900" : "bg-emerald-100 text-emerald-900"
                            }`}
                          >
                            {row.isBot ? "Бот" : "Человек"}
                          </span>
                        </td>
                        <td className="p-2 text-slate-600">{row.botFamily ?? "—"}</td>
                        <td className="p-2 font-mono text-[11px] text-slate-800 break-all max-w-[18rem] sm:max-w-xs">
                          {row.method} {row.path}
                        </td>
                        <td className="p-2 text-slate-600 break-all max-w-xs">{row.userAgent || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : liveErr ? null : (
          <p className="text-slate-600 text-sm">Загрузка живой статистики…</p>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">История посещений</h2>
            <p className="text-slate-600 text-xs sm:text-sm mt-1">
              Хранится в базе до 3 месяцев. IP сохраняются в виде хеша.
            </p>
          </div>
          <label className="flex flex-col gap-1 shrink-0 text-sm">
            <span className="text-slate-600 font-medium">Период</span>
            <select
              value={histRange}
              onChange={(e) => setHistRange(e.target.value as AdminLiveTrafficHistoryRange)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900"
            >
              <option value="day">День</option>
              <option value="week">Неделя</option>
              <option value="month">Месяц</option>
              <option value="3m">3 месяца</option>
            </select>
          </label>
        </div>

        {histErr ? (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            {histErr}
          </p>
        ) : null}

        {!histErr && hist ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="rounded-xl border border-slate-200 bg-white p-3 lg:col-span-2">
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={histChart}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="t" tick={{ fontSize: 12 }} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="Хиты" stroke="#0f172a" dot={false} strokeWidth={2} />
                    <Line type="monotone" dataKey="Люди (уник.)" stroke="#059669" dot={false} />
                    <Line type="monotone" dataKey="Боты (уник.)" stroke="#4f46e5" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                Обновление ~{Math.round(HISTORY_POLL_MS / 1000)} с. Бакет: {hist.bucket}.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-slate-800 text-sm">Люди vs боты</p>
                {histSummary ? (
                  <p className="text-[11px] text-slate-500 whitespace-nowrap">
                    хиты: {histSummary.humanHits} / {histSummary.botHits}
                  </p>
                ) : null}
              </div>

              {histSummaryErr ? (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 mt-2">
                  {histSummaryErr}
                </p>
              ) : null}

              {histSummary ? (
                <div className="h-[240px] mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={botSharePie}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={82}
                        label
                      >
                        {botSharePie.map((_, i) => (
                          <Cell key={i} fill={i === 0 ? "#059669" : "#4f46e5"} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-slate-500 italic mt-3">Сводка пока недоступна.</p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500 italic">История пока недоступна.</p>
        )}

        {!topPathsErr && topPaths ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="font-semibold text-slate-800 text-sm mb-2">
                Топ страниц/эндпоинтов (hits)
              </p>
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topPathsBar} margin={{ top: 8, right: 8, left: 0, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-20} textAnchor="end" interval={0} height={60} tick={{ fontSize: 10 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="hits" fill="#0f172a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                Показано: {topPaths.rows.length} (лимит {topPaths.limit}).
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <div className="px-3 py-2 border-b border-slate-100 text-sm font-semibold text-slate-800">
                Таблица: топ эндпоинтов
              </div>
              <div className="overflow-x-auto max-h-[360px]">
                <table className="w-full text-xs sm:text-sm">
                  <thead className="bg-slate-50 text-left text-slate-600 sticky top-0">
                    <tr>
                      <th className="p-2">Путь</th>
                      <th className="p-2 whitespace-nowrap">Hits</th>
                      <th className="p-2 whitespace-nowrap">Люди</th>
                      <th className="p-2 whitespace-nowrap">Боты</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topPaths.rows.map((r) => (
                      <tr key={r.path} className="border-t border-slate-100 hover:bg-slate-50/80 align-top">
                        <td className="p-2 font-mono text-[11px] text-slate-800 break-all">{r.path}</td>
                        <td className="p-2 font-semibold text-slate-900 whitespace-nowrap">{r.hits}</td>
                        <td className="p-2 text-emerald-800 whitespace-nowrap">{r.humanHits}</td>
                        <td className="p-2 text-indigo-800 whitespace-nowrap">{r.botHits}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : topPathsErr ? (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            {topPathsErr}
          </p>
        ) : null}
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map(([label, value]) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="text-3xl font-semibold text-emerald-700 mt-1">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4 h-80">
          <h2 className="font-semibold text-slate-800 mb-2">Пользователи по ролям</h2>
          <ResponsiveContainer width="100%" height="90%">
            <PieChart>
              <Pie data={roleChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                {roleChart.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 h-80">
          <h2 className="font-semibold text-slate-800 mb-2">Темы форума по разделам</h2>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={forumBar} margin={{ top: 8, right: 8, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-25} textAnchor="end" interval={0} height={60} tick={{ fontSize: 10 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="темы" fill="#059669" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 h-96">
        <h2 className="font-semibold text-slate-800 mb-2">Активность по дням (14 дней)</h2>
        <ResponsiveContainer width="100%" height="90%">
          <LineChart data={lineData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" tick={{ fontSize: 11 }} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="Пользователи" stroke="#6366f1" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Темы" stroke="#059669" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Посты" stroke="#d97706" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4 h-72">
          <h2 className="font-semibold text-slate-800 mb-2">Объявления по типу</h2>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart
              data={(data.listingsByType ?? []).map((x) => ({ name: x.type, count: x.count }))}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#0d9488" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 h-72">
          <h2 className="font-semibold text-slate-800 mb-2">SOS по статусу</h2>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart
              data={(data.sosByStatus ?? []).map((x) => ({ name: x.status, count: x.count }))}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#dc2626" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 font-semibold text-slate-800">
          Последние регистрации
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="p-3">Email</th>
              <th className="p-3">Роль</th>
              <th className="p-3">Дата</th>
            </tr>
          </thead>
          <tbody>
            {recentUsers.map((u) => (
              <tr key={u.id} className="border-t border-slate-100">
                <td className="p-3 font-mono text-xs">{u.email}</td>
                <td className="p-3">{u.role}</td>
                <td className="p-3 text-slate-600">{new Date(u.createdAt).toLocaleString("ru-RU")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
