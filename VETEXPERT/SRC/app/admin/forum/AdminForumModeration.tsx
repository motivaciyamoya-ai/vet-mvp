import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { apiFetch } from "../../../lib/api";

type Report = {
  id: string;
  targetType: string;
  reason: string;
  status: string;
  createdAt: string;
  reporter: { id: string; email: string };
  thread: { id: string; title: string } | null;
  post: { id: string; body: string; thread: { id: string; title: string } } | null;
};

function clip(s: string | undefined | null, n = 220) {
  if (!s) return "—";
  const t = s.replace(/\s+/g, " ").trim();
  return t.length <= n ? t : `${t.slice(0, n)}…`;
}

const STATUS_RU: Record<string, string> = {
  OPEN: "Новая",
  REVIEWED: "Просмотрена",
  DISMISSED: "Отклонена",
  ACTION_TAKEN: "Приняты меры",
};

/** Очередь модерации MyBB для форума: жалобы по темам и постам со статусом OPEN. */
export default function AdminForumModeration() {
  const [items, setItems] = useState<Report[] | null>(null);
  const [err, setErr] = useState("");

  const load = () => {
    setErr("");
    apiFetch<Report[]>("/api/admin/reports")
      .then(setItems)
      .catch((e) => setErr(String(e.message)));
  };

  useEffect(() => {
    load();
  }, []);

  const queue = useMemo(() => {
    if (!items) return [];
    return items.filter((r) => r.status === "OPEN" && (r.targetType === "THREAD" || r.targetType === "POST"));
  }, [items]);

  const setStatus = async (id: string, status: string) => {
    try {
      await apiFetch(`/api/admin/reports/${id}`, { method: "PATCH", json: { status } });
      load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Ошибка");
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
        <p className="font-semibold">Очередь модерации (форум)</p>
        <p className="mt-1 text-amber-900/90">
          Показываются только жалобы со статусом «Новая» на темы и посты. Полный список всех жалоб (
          профили, личные сообщения, статьи и т.д.) и выдача санкций — в разделе{" "}
          <Link to="/admin/reports" className="font-medium text-emerald-800 underline">
            Жалобы
          </Link>
          .
        </p>
      </div>

      {err ? <p className="text-red-600 text-sm">{err}</p> : null}

      <div className="flex justify-between items-center flex-wrap gap-2">
        <p className="text-sm text-slate-600">
          В очереди: <span className="font-semibold tabular-nums text-slate-900">{queue.length}</span>
        </p>
        <button type="button" className="text-sm text-slate-600 underline" onClick={load}>
          Обновить
        </button>
      </div>

      {!items ? (
        <p className="text-slate-600">Загрузка…</p>
      ) : queue.length === 0 ? (
        <p className="text-slate-600 text-sm rounded-lg border border-slate-200 bg-white px-4 py-6">Открытых жалоб по форуму нет.</p>
      ) : (
        <div className="space-y-3">
          {queue.map((r) => (
            <div key={r.id} className="bg-white rounded-lg border border-slate-200 p-4 text-sm shadow-sm">
              <div className="flex flex-wrap justify-between gap-2 mb-2">
                <span className="font-mono text-xs text-slate-500">{r.id}</span>
                <span className="text-xs text-slate-500">{new Date(r.createdAt).toLocaleString("ru-RU")}</span>
              </div>
              <span className="inline-flex px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 text-xs font-semibold border border-amber-200">
                {r.targetType === "THREAD" ? "Тема форума" : "Пост в теме"}
              </span>
              <span className="ml-2 inline-flex px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 text-xs">
                {STATUS_RU[r.status] ?? r.status}
              </span>
              <p className="mt-2 text-slate-700">
                <span className="font-semibold">От:</span> {r.reporter.email}
              </p>
              <p className="mt-2 text-slate-800 whitespace-pre-wrap border-l-2 border-red-200 pl-3 py-1 bg-red-50/40 rounded-r">
                {r.reason}
              </p>
              {r.thread && (
                <p className="mt-3">
                  <span className="font-semibold text-slate-800">Тема:</span> {clip(r.thread.title, 120)}{" "}
                  <Link
                    to={`/forum/topic/${encodeURIComponent(r.thread.id)}`}
                    className="text-emerald-700 font-medium hover:underline"
                  >
                    открыть
                  </Link>
                </p>
              )}
              {r.post && (
                <p className="mt-2 text-slate-600">
                  <span className="font-semibold text-slate-800">Пост:</span> {clip(r.post.body)}{" "}
                  <Link
                    to={`/forum/topic/${encodeURIComponent(r.post.thread.id)}`}
                    className="text-emerald-700 font-medium hover:underline"
                  >
                    в теме
                  </Link>
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="text-xs px-3 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 border border-slate-200"
                  onClick={() => setStatus(r.id, "REVIEWED")}
                >
                  Просмотрена
                </button>
                <button
                  type="button"
                  className="text-xs px-3 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 border border-slate-200"
                  onClick={() => setStatus(r.id, "DISMISSED")}
                >
                  Отклонить
                </button>
                <Link
                  to="/admin/reports"
                  className="text-xs px-3 py-1.5 rounded-md bg-emerald-700 text-white hover:bg-emerald-800 inline-flex items-center"
                >
                  Санкции в «Жалобы»
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
