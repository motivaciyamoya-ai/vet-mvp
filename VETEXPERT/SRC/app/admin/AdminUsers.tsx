import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";

type UserRow = {
  id: string;
  email: string;
  role: string;
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
    <div>
      <h1 className="text-2xl font-bold mb-4">Пользователи</h1>
      <div className="flex gap-2 mb-4 flex-wrap">
        <input
          className="border rounded-lg px-3 py-2 flex-1 min-w-[200px]"
          placeholder="Поиск email / имя"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && searchFresh()}
        />
        <button
          type="button"
          className="bg-emerald-600 text-white px-4 py-2 rounded-lg"
          onClick={searchFresh}
        >
          Найти
        </button>
      </div>
      {err && <p className="text-red-600 mb-2">{err}</p>}
      {!data ? (
        <p>Загрузка…</p>
      ) : (
        <>
          <div className="bg-white rounded-xl border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left p-3">Email</th>
                  <th className="text-left p-3">Роль</th>
                  <th className="text-left p-3">Имя</th>
                  <th className="text-left p-3">Город</th>
                  <th className="text-right p-3">Действия</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((u) => (
                  <tr key={u.id} className="border-t hover:bg-slate-50">
                    <td className="p-3 font-mono text-xs">{u.email}</td>
                    <td className="p-3">{u.role}</td>
                    <td className="p-3">{u.profile?.displayName ?? "—"}</td>
                    <td className="p-3">{u.profile?.city ?? "—"}</td>
                    <td className="p-3 text-right space-x-2">
                      <button
                        type="button"
                        className="text-emerald-700 underline"
                        onClick={() => openEdit(u)}
                      >
                        Изменить
                      </button>
                      <button
                        type="button"
                        className="text-red-600 underline"
                        onClick={() => remove(u.id)}
                      >
                        Удалить
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-between items-center mt-4">
            <span className="text-sm text-slate-600">
              Всего: {data.total}, страница {data.page}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                className="px-3 py-1 border rounded disabled:opacity-50"
                onClick={() => setPage((p) => p - 1)}
              >
                Назад
              </button>
              <button
                type="button"
                disabled={data.items.length < data.pageSize}
                className="px-3 py-1 border rounded disabled:opacity-50"
                onClick={() => setPage((p) => p + 1)}
              >
                Вперёд
              </button>
            </div>
          </div>
        </>
      )}

      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-3 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold">Редактирование</h2>
            <label className="block text-sm">
              <span className="text-slate-600">Email</span>
              <input
                className="w-full border rounded px-2 py-1 mt-1"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-600">Роль</span>
              <select
                className="w-full border rounded px-2 py-1 mt-1"
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
              <span className="text-slate-600">Новый пароль (необязательно)</span>
              <input
                type="password"
                className="w-full border rounded px-2 py-1 mt-1"
                value={form.newPassword}
                onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))}
                placeholder="оставьте пустым, чтобы не менять"
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-600">Отображаемое имя</span>
              <input
                className="w-full border rounded px-2 py-1 mt-1"
                value={form.displayName}
                onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-600">Город</span>
              <input
                className="w-full border rounded px-2 py-1 mt-1"
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-600">Верификация</span>
              <select
                className="w-full border rounded px-2 py-1 mt-1"
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
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                className="flex-1 bg-emerald-600 text-white py-2 rounded-lg"
                onClick={save}
              >
                Сохранить
              </button>
              <button
                type="button"
                className="flex-1 border py-2 rounded-lg"
                onClick={() => setEditing(null)}
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
