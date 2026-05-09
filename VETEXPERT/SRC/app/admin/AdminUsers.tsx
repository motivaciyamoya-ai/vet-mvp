import { useCallback, useEffect, useState } from "react";
import { Coins, Pencil, Search, Shield, Trash2, UserRound } from "lucide-react";
import { apiFetch } from "../../lib/api";

type UserRow = {
  id: string;
  email: string;
  role: string;
  vetCoinBalance: number;
  profile: {
    displayName: string;
    city: string;
    verification: string;
    country: { nameRu: string };
    jobTitle: { nameRu: string };
  } | null;
};

const ROLES = ["SPECIALIST", "MODERATOR", "ADMIN"] as const;
const VER = ["NONE", "PENDING", "VERIFIED", "REJECTED"] as const;

function formatCoins(n: number) {
  return Number.isFinite(n) ? n.toLocaleString("ru-RU") : "0";
}

export default function AdminUsers() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{
    items: UserRow[];
    total: number;
    page: number;
    pageSize: number;
  } | null>(null);
  const [err, setErr] = useState("");
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [form, setForm] = useState({
    email: "",
    role: "SPECIALIST",
    newPassword: "",
    displayName: "",
    city: "",
    verification: "NONE",
  });

  const load = useCallback(() => {
    setErr("");
    const params = new URLSearchParams({ page: String(page), pageSize: "20" });
    if (q.trim()) params.set("q", q.trim());
    return apiFetch<NonNullable<typeof data>>(`/api/admin/users?${params}`)
      .then(setData)
      .catch((e) => setErr(String(e.message)));
  }, [page, q]);

  useEffect(() => {
    load();
  }, [load]);

  const searchFresh = () => {
    setPage(1);
    setErr("");
    const params = new URLSearchParams({ page: "1", pageSize: "20" });
    if (q.trim()) params.set("q", q.trim());
    apiFetch<NonNullable<typeof data>>(`/api/admin/users?${params}`)
      .then(setData)
      .catch((e) => setErr(String(e.message)));
  };

  const openEdit = (u: UserRow) => {
    setEditing(u);
    setForm({
      email: u.email,
      role: u.role,
      newPassword: "",
      displayName: u.profile?.displayName ?? "",
      city: u.profile?.city ?? "",
      verification: u.profile?.verification ?? "NONE",
    });
  };

  const save = async () => {
    if (!editing) return;
    try {
      await apiFetch(`/api/admin/users/${editing.id}`, {
        method: "PATCH",
        json: {
          email: form.email,
          role: form.role,
          ...(form.newPassword ? { newPassword: form.newPassword } : {}),
          displayName: form.displayName,
          city: form.city,
          verification: form.verification,
        },
      });
      setEditing(null);
      load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Ошибка");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Удалить пользователя? Связанный контент может помешать.")) return;
    try {
      await apiFetch(`/api/admin/users/${id}`, { method: "DELETE" });
      load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Ошибка");
    }
  };

  return (
    <div className="space-y-6 lg:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 text-emerald-900 px-3 py-1 text-xs font-bold uppercase tracking-wide mb-2">
            <Shield className="w-3.5 h-3.5" aria-hidden />
            Администрирование
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Пользователи</h1>
          <p className="text-slate-600 mt-1 text-sm sm:text-base max-w-2xl">
            Поиск по email и имени, роли и профиль. Баланс VetCoin в таблице — только для просмотра; начисления и списания — в разделе «VetCoin».
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm ring-1 ring-emerald-900/5 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden />
            <input
              className="w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400"
              placeholder="Поиск: email или отображаемое имя"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchFresh()}
            />
          </div>
          <button
            type="button"
            className="inline-flex justify-center items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold px-5 py-2.5 text-sm shadow-md shadow-emerald-900/15 hover:from-emerald-700 hover:to-teal-700 transition-all"
            onClick={searchFresh}
          >
            <Search className="w-4 h-4" />
            Найти
          </button>
        </div>
      </div>

      {err && (
        <div className="rounded-xl border border-red-200 bg-red-50 text-red-800 px-4 py-3 text-sm">{err}</div>
      )}

      {!data ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-600">Загрузка…</div>
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm ring-1 ring-emerald-900/5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[720px]">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-50 to-emerald-50/40 border-b border-slate-200">
                    <th className="text-left p-3 sm:p-4 font-semibold text-slate-700">Пользователь</th>
                    <th className="text-left p-3 sm:p-4 font-semibold text-slate-700">Роль</th>
                    <th className="text-left p-3 sm:p-4 font-semibold text-slate-700">Имя / город</th>
                    <th className="text-right p-3 sm:p-4 font-semibold text-slate-700">
                      <span className="inline-flex items-center justify-end gap-1">
                        <Coins className="w-4 h-4 text-amber-600" aria-hidden />
                        VetCoin
                      </span>
                    </th>
                    <th className="text-right p-3 sm:p-4 font-semibold text-slate-700">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((u) => (
                    <tr key={u.id} className="border-t border-slate-100 hover:bg-emerald-50/30 transition-colors">
                      <td className="p-3 sm:p-4 align-top">
                        <div className="font-mono text-xs text-slate-800 break-all">{u.email}</div>
                      </td>
                      <td className="p-3 sm:p-4 align-top">
                        <span className="inline-flex rounded-lg bg-slate-100 text-slate-800 px-2 py-0.5 text-xs font-semibold">
                          {u.role}
                        </span>
                      </td>
                      <td className="p-3 sm:p-4 align-top text-slate-700">
                        <div className="flex items-start gap-2">
                          <UserRound className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" aria-hidden />
                          <div>
                            <div className="font-medium text-slate-900">{u.profile?.displayName ?? "—"}</div>
                            <div className="text-xs text-slate-500 mt-0.5">{u.profile?.city ?? "—"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 sm:p-4 align-top text-right">
                        <span className="inline-flex items-center justify-end gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold tabular-nums px-3 py-1.5 text-xs sm:text-sm shadow-sm">
                          <Coins className="w-3.5 h-3.5 opacity-90" aria-hidden />
                          {formatCoins(u.vetCoinBalance ?? 0)}
                        </span>
                      </td>
                      <td className="p-3 sm:p-4 align-top text-right whitespace-nowrap">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-emerald-700 font-semibold hover:text-emerald-900 text-xs sm:text-sm mr-3"
                          onClick={() => openEdit(u)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Изменить
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-red-600 font-semibold hover:text-red-800 text-xs sm:text-sm"
                          onClick={() => remove(u.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Удалить
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 text-sm text-slate-600">
            <span>
              Всего записей: <strong className="text-slate-900">{data.total}</strong>, страница{" "}
              <strong className="text-slate-900">{data.page}</strong>
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none"
                onClick={() => setPage((p) => p - 1)}
              >
                Назад
              </button>
              <button
                type="button"
                disabled={data.items.length < data.pageSize}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none"
                onClick={() => setPage((p) => p + 1)}
              >
                Вперёд
              </button>
            </div>
          </div>
        </>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-2xl ring-1 ring-slate-200/80 border border-white/80">
            <div className="sticky top-0 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 px-5 py-4 text-white">
              <h2 className="text-lg font-bold">Редактирование пользователя</h2>
              <p className="text-sm text-white/85 font-mono truncate mt-0.5">{editing.email}</p>
            </div>
            <div className="p-5 sm:p-6 space-y-5">
              <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                <span className="text-xs font-semibold text-slate-600">VetCoin (только просмотр)</span>
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold tabular-nums px-3 py-1 text-sm">
                  <Coins className="w-3.5 h-3.5" aria-hidden />
                  {formatCoins(editing.vetCoinBalance ?? 0)}
                </span>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Учётная запись и профиль</h3>
                <label className="block text-sm">
                  <span className="text-slate-600 font-medium">Email</span>
                  <input
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-slate-600 font-medium">Роль</span>
                  <select
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    value={form.role}
                    onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="text-slate-600 font-medium">Новый пароль пользователя (необязательно)</span>
                  <input
                    type="password"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    value={form.newPassword}
                    onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))}
                    placeholder="Оставьте пустым, чтобы не менять"
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-slate-600 font-medium">Отображаемое имя</span>
                  <input
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    value={form.displayName}
                    onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-slate-600 font-medium">Город</span>
                  <input
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    value={form.city}
                    onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-slate-600 font-medium">Верификация профиля</span>
                  <select
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    value={form.verification}
                    onChange={(e) => setForm((f) => ({ ...f, verification: e.target.value }))}
                  >
                    {VER.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-2 pt-1">
                <button
                  type="button"
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 font-semibold text-slate-700 hover:bg-slate-50"
                  onClick={() => setEditing(null)}
                >
                  Закрыть
                </button>
                <button
                  type="button"
                  className="flex-1 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold py-2.5 shadow-md hover:from-emerald-700 hover:to-teal-700"
                  onClick={() => void save()}
                >
                  Сохранить профиль
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
