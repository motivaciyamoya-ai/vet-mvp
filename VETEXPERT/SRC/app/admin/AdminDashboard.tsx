import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../lib/api";
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

export default function AdminDashboard() {
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState("");

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
            "Нет связи с сервером: запущен ли backend (порт 3000)? В dev Vite должен проксировать /api на него.",
          );
          return;
        }
        setError(`Не удалось загрузить аналитику: ${msg}`);
      });
  }, []);

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
          Сводка за 14 дней, распределения и последние регистрации (данные из БД).
        </p>
      </div>

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
