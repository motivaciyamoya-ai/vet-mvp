import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";

type Sos = {
  id: string;
  body: string;
  animalKind: string;
  urgency: string;
  region: string | null;
  status: string;
  createdAt: string;
  author: { email: string };
};

const STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED"] as const;

export default function AdminSos() {
  const [data, setData] = useState<{ items: Sos[]; total: number } | null>(null);
  const [err, setErr] = useState("");

  const load = useCallback(() => {
    setErr("");
    apiFetch<{ items: Sos[]; total: number }>("/api/admin/sos?page=1&pageSize=100")
      .then(setData)
      .catch((e) => setErr(String(e.message)));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const patch = async (id: string, status: string) => {
    try {
      await apiFetch(`/api/admin/sos/${id}`, {
        method: "PATCH",
        json: { status },
      });
      load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Ошибка");
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">SOS</h1>
      {err && <p className="text-red-600">{err}</p>}
      {!data ? (
        <p>Загрузка…</p>
      ) : (
        <div className="space-y-4">
          {data.items.map((s) => (
            <div key={s.id} className="bg-white rounded-xl border p-4 text-sm">
              <div className="flex justify-between flex-wrap gap-2 mb-2">
                <span className="font-semibold">{s.animalKind}</span>
                <span className="text-xs text-slate-500">{new Date(s.createdAt).toLocaleString()}</span>
              </div>
              <p className="text-slate-700 whitespace-pre-wrap">{s.body}</p>
              <p className="mt-2 text-xs">
                {s.author.email} · {s.urgency} · {s.region ?? "—"} ·{" "}
                <strong>{s.status}</strong>
              </p>
              <div className="flex gap-2 mt-3">
                {STATUSES.map((st) => (
                  <button
                    key={st}
                    type="button"
                    className="text-xs bg-slate-100 px-2 py-1 rounded"
                    onClick={() => patch(s.id, st)}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <p className="text-slate-600 text-sm">Всего записей: {data.total}</p>
        </div>
      )}
    </div>
  );
}
