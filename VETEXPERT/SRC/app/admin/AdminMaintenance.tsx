import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../lib/api";

type Row = { id: string; key: string; value: string; updatedAt: string };

const K = {
  enabled: "site.maintenance.enabled",
  title: "site.maintenance.title",
  message: "site.maintenance.message",
} as const;

function truthy(v: string): boolean {
  const t = v.trim().toLowerCase();
  return t === "1" || t === "true" || t === "yes" || t === "on";
}

export default function AdminMaintenance() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [title, setTitle] = useState("Технические работы");
  const [message, setMessage] = useState("Мы обновляем сервис. Пожалуйста, зайдите чуть позже.");

  const load = useCallback(async () => {
    setErr("");
    setOk("");
    setLoading(true);
    try {
      const rows = await apiFetch<Row[]>("/api/admin/settings");
      const map = new Map(rows.map((r) => [r.key, r.value]));
      setEnabled(truthy(map.get(K.enabled) ?? ""));
      setTitle((map.get(K.title) ?? "").trim() || "Технические работы");
      setMessage(
        (map.get(K.message) ?? "").trim() ||
          "Мы обновляем сервис. Пожалуйста, зайдите чуть позже.",
      );
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const payload = useMemo(
    () => [
      [K.enabled, enabled ? "true" : "false"],
      [K.title, title.trim()],
      [K.message, message.trim()],
    ],
    [enabled, title, message],
  );

  const save = async () => {
    setSaving(true);
    setErr("");
    setOk("");
    try {
      for (const [key, value] of payload) {
        await apiFetch(`/api/admin/settings/${encodeURIComponent(key)}`, {
          method: "PUT",
          json: { value },
        });
      }
      setOk("Сохранено. Посетители увидят объявление сразу после обновления страницы.");
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Технические работы</h1>
        <p className="text-slate-600 text-sm mt-1">
          Включите режим — и публичная часть сайта покажет посетителям заглушку с вашим текстом.
          Админка остаётся доступной.
        </p>
      </div>

      {err ? <p className="text-red-600 text-sm">{err}</p> : null}
      {ok ? <p className="text-emerald-700 text-sm">{ok}</p> : null}

      {loading ? (
        <p className="text-slate-600 text-sm">Загрузка…</p>
      ) : (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-sm font-semibold text-slate-900">Включить режим техработ</span>
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-800">Заголовок</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-800">Текст объявления</span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
            />
          </label>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              disabled={saving}
              onClick={() => void save()}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? "Сохранение…" : "Сохранить"}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void load()}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
            >
              Сбросить
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800">
            <p className="font-semibold">Превью (как увидят посетители)</p>
            <p className="mt-2 font-bold">{title.trim() || "Технические работы"}</p>
            <p className="mt-1 text-slate-700 whitespace-pre-wrap">{message.trim()}</p>
          </div>
        </section>
      )}
    </div>
  );
}

