import { useCallback, useEffect, useState } from "react";
import { apiAdminVetEventsSync, apiFetch } from "../../lib/api";

type Row = { id: string; key: string; value: string; updatedAt: string };

export default function AdminSettings() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [newKey, setNewKey] = useState("");
  const [newVal, setNewVal] = useState("");
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [eventsSyncBusy, setEventsSyncBusy] = useState(false);
  const [eventsSyncMessage, setEventsSyncMessage] = useState("");

  const load = useCallback(() => {
    setErr("");
    setLoading(true);
    apiFetch<Row[]>("/api/admin/settings")
      .then((r) => {
        setRows(r);
        const m: Record<string, string> = {};
        r.forEach((x) => {
          m[x.key] = x.value;
        });
        setEdits(m);
      })
      .catch((e) => setErr(String(e.message)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (key: string) => {
    try {
      await apiFetch(`/api/admin/settings/${encodeURIComponent(key)}`, {
        method: "PUT",
        json: { value: edits[key] ?? "" },
      });
      load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Ошибка");
    }
  };

  const add = async () => {
    if (!newKey.trim()) return;
    try {
      await apiFetch(`/api/admin/settings/${encodeURIComponent(newKey.trim())}`, {
        method: "PUT",
        json: { value: newVal },
      });
      setNewKey("");
      setNewVal("");
      load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Ошибка");
    }
  };

  const del = async (key: string) => {
    if (!confirm(`Удалить настройку «${key}»?`)) return;
    try {
      await apiFetch(`/api/admin/settings/${encodeURIComponent(key)}`, { method: "DELETE" });
      load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Ошибка");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Настройки сайта</h1>
        <p className="text-slate-600 text-sm mt-1">
          Произвольные ключи (например <code className="bg-slate-100 px-1 rounded">site.title</code>, баннеры,
          JSON-флаги). Значения до 50 000 символов.
        </p>
        <p className="text-slate-600 text-sm mt-2">
          <span className="font-medium text-slate-800">Календарь мероприятий:</span> создайте или отредактируйте
          ключи <code className="bg-emerald-50 px-1 rounded text-emerald-900">events.sources.ics</code> и при
          необходимости{" "}
          <code className="bg-emerald-50 px-1 rounded text-emerald-900">events.sources.rss</code> (по одному URL открытой ленты
          на строку, строки с <span className="font-mono">#</span> — комментарии). После этого подтяните события
          ниже или дождитесь фонового обновления.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={eventsSyncBusy}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            onClick={async () => {
              setEventsSyncBusy(true);
              setEventsSyncMessage("");
              try {
                const r = await apiAdminVetEventsSync();
                const lines = r.feeds.map((f) => `${f.kind} ${f.feedUrl}: ${f.error ?? `записей ${f.upserted}`}`);
                setEventsSyncMessage(lines.length ? lines.join("\n") : "Нет настроенных лент ICS/RSS.");
              } catch (e: unknown) {
                setEventsSyncMessage(e instanceof Error ? e.message : String(e));
              } finally {
                setEventsSyncBusy(false);
              }
            }}
          >
            {eventsSyncBusy ? "Синхронизация…" : "Подтянуть мероприятия сейчас"}
          </button>
          <span className="text-xs text-slate-500">POST /api/admin/events/sync</span>
        </div>
        {eventsSyncMessage ? (
          <pre className="mt-2 whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800 font-mono max-h-48 overflow-y-auto">
            {eventsSyncMessage}
          </pre>
        ) : null}
      </div>

      {err && <p className="text-red-600">{err}</p>}

      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="font-semibold">Новая настройка</h2>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            className="border rounded-lg px-3 py-2 flex-1 font-mono text-sm"
            placeholder="ключ, напр. marketing.banner_html"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
          />
          <button type="button" className="bg-emerald-600 text-white px-4 py-2 rounded-lg shrink-0" onClick={add}>
            Создать / обновить
          </button>
        </div>
        <textarea
          className="w-full border rounded-lg px-3 py-2 font-mono text-xs min-h-[100px]"
          placeholder="Значение (текст, HTML, JSON…)"
          value={newVal}
          onChange={(e) => setNewVal(e.target.value)}
        />
      </div>

      {loading ? (
        <p>Загрузка…</p>
      ) : (
        <div className="space-y-4">
          {rows.map((r) => (
            <div key={r.id} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap justify-between gap-2 mb-2">
                <code className="text-sm font-semibold text-emerald-800">{r.key}</code>
                <span className="text-xs text-slate-500">
                  обновлено {new Date(r.updatedAt).toLocaleString("ru-RU")}
                </span>
              </div>
              <textarea
                className="w-full border rounded-lg px-3 py-2 font-mono text-xs min-h-[80px] mb-2"
                value={edits[r.key] ?? ""}
                onChange={(e) => setEdits((m) => ({ ...m, [r.key]: e.target.value }))}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  className="bg-slate-900 text-white text-sm px-4 py-1.5 rounded-lg"
                  onClick={() => save(r.key)}
                >
                  Сохранить
                </button>
                <button type="button" className="text-red-600 text-sm underline" onClick={() => del(r.key)}>
                  Удалить
                </button>
              </div>
            </div>
          ))}
          {rows.length === 0 && <p className="text-slate-600">Нет записей. Запустите seed или добавьте ключ выше.</p>}
        </div>
      )}
    </div>
  );
}
