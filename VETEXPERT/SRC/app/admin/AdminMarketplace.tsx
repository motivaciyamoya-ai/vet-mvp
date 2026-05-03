import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";

type Listing = {
  id: string;
  type: string;
  title: string;
  description: string;
  region: string;
  createdAt: string;
  author: { email: string };
  _count?: { messages: number };
};

const TYPES = ["", "JOB", "BUY", "SELL"] as const;

export default function AdminMarketplace() {
  const [type, setType] = useState<string>("");
  const [q, setQ] = useState("");
  const [data, setData] = useState<{ items: Listing[]; total: number } | null>(null);
  const [err, setErr] = useState("");

  const load = useCallback(() => {
    setErr("");
    const params = new URLSearchParams({ page: "1", pageSize: "100" });
    if (type) params.set("type", type);
    if (q.trim().length >= 2) params.set("q", q.trim());
    apiFetch<{ items: Listing[]; total: number }>(`/api/admin/listings?${params}`)
      .then(setData)
      .catch((e) => setErr(String(e.message)));
  }, [type, q]);

  useEffect(() => {
    load();
  }, [load]);

  const del = async (id: string) => {
    if (!confirm("Удалить объявление и переписку?")) return;
    try {
      await apiFetch(`/api/admin/listings/${id}`, { method: "DELETE" });
      load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Ошибка");
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Маркетплейс</h1>
      {err && <p className="text-red-600 mb-2">{err}</p>}
      <div className="flex flex-wrap gap-2 mb-4">
        <select
          className="border rounded px-3 py-2"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          {TYPES.map((t) => (
            <option key={t || "all"} value={t}>
              {t || "Все типы"}
            </option>
          ))}
        </select>
        <input
          className="border rounded px-3 py-2 flex-1 min-w-[200px]"
          placeholder="Поиск (от 2 символов)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button type="button" className="bg-emerald-600 text-white px-4 py-2 rounded" onClick={load}>
          Обновить
        </button>
      </div>
      {!data ? (
        <p>Загрузка…</p>
      ) : (
        <div className="bg-white rounded-xl border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left p-3">Тип</th>
                <th className="text-left p-3">Заголовок</th>
                <th className="text-left p-3">Регион</th>
                <th className="text-left p-3">Автор</th>
                <th className="text-left p-3">Сообщ.</th>
                <th className="text-right p-3"></th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((l) => (
                <tr key={l.id} className="border-t">
                  <td className="p-3">{l.type}</td>
                  <td className="p-3 max-w-xs truncate">{l.title}</td>
                  <td className="p-3">{l.region}</td>
                  <td className="p-3 font-mono text-xs">{l.author.email}</td>
                  <td className="p-3">{l._count?.messages ?? "—"}</td>
                  <td className="p-3 text-right">
                    <button type="button" className="text-red-600 underline" onClick={() => del(l.id)}>
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
