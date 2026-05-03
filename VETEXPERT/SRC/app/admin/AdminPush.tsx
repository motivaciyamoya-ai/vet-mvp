import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";

type Row = {
  id: string;
  token: string;
  platform: string;
  createdAt: string;
  user: { id: string; email: string };
};

export default function AdminPush() {
  const [data, setData] = useState<{ items: Row[]; total: number } | null>(null);
  const [err, setErr] = useState("");

  const load = useCallback(() => {
    setErr("");
    apiFetch<{ items: Row[]; total: number }>("/api/admin/push-tokens?page=1&pageSize=200")
      .then(setData)
      .catch((e) => setErr(String(e.message)));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const del = async (id: string) => {
    if (!confirm("Удалить токен?")) return;
    try {
      await apiFetch(`/api/admin/push-tokens/${id}`, { method: "DELETE" });
      load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Ошибка");
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Push-токены</h1>
      {err && <p className="text-red-600">{err}</p>}
      {!data ? (
        <p>Загрузка…</p>
      ) : (
        <div className="bg-white rounded-xl border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left p-3">Пользователь</th>
                <th className="text-left p-3">Платформа</th>
                <th className="text-left p-3">Токен</th>
                <th className="text-left p-3">Создан</th>
                <th className="text-right p-3"></th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-3 font-mono text-xs">{r.user.email}</td>
                  <td className="p-3">{r.platform}</td>
                  <td className="p-3 font-mono text-xs max-w-xs truncate" title={r.token}>
                    {r.token}
                  </td>
                  <td className="p-3 text-xs">{new Date(r.createdAt).toLocaleString()}</td>
                  <td className="p-3 text-right">
                    <button type="button" className="text-red-600 underline" onClick={() => del(r.id)}>
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="p-3 text-sm text-slate-600">Всего: {data.total}</p>
        </div>
      )}
    </div>
  );
}
