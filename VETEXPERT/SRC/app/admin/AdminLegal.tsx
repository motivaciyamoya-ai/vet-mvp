import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { Loader, Save, Scale } from "lucide-react";
import { apiFetch } from "../../lib/api";
import { LEGAL_COOKIES_HTML_KEY, LEGAL_PRIVACY_HTML_KEY } from "../../lib/legalSiteKeys";

type Row = { id: string; key: string; value: string; updatedAt: string };

export default function AdminLegal() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [privacyHtml, setPrivacyHtml] = useState("");
  const [cookiesHtml, setCookiesHtml] = useState("");

  const load = useCallback(async () => {
    setErr("");
    setOk("");
    setLoading(true);
    try {
      const rows = await apiFetch<Row[]>("/api/admin/settings");
      const map = new Map(rows.map((r) => [r.key, r.value]));
      setPrivacyHtml(map.get(LEGAL_PRIVACY_HTML_KEY) ?? "");
      setCookiesHtml(map.get(LEGAL_COOKIES_HTML_KEY) ?? "");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    setErr("");
    setOk("");
    try {
      for (const [key, value] of [
        [LEGAL_PRIVACY_HTML_KEY, privacyHtml],
        [LEGAL_COOKIES_HTML_KEY, cookiesHtml],
      ] as const) {
        await apiFetch(`/api/admin/settings/${encodeURIComponent(key)}`, {
          method: "PUT",
          json: { value },
        });
      }
      setOk("Сохранено. Публичные страницы /privacy и /cookies подхватят текст после обновления.");
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 inline-flex items-center gap-2">
            <Scale className="w-7 h-7 text-emerald-700 shrink-0" aria-hidden />
            Политики: конфиденциальность и cookies
          </h1>
          <p className="text-slate-600 text-sm mt-1 max-w-2xl">
            HTML целиком для страниц{" "}
            <Link to="/privacy" className="text-emerald-700 font-semibold hover:underline" target="_blank">
              /privacy
            </Link>{" "}
            и{" "}
            <Link to="/cookies" className="text-emerald-700 font-semibold hover:underline" target="_blank">
              /cookies
            </Link>
            . Пустое поле — на сайте показывается встроенный шаблон из кода. Редактируют только доверенные
            администраторы; не вставляйте скрипты с непроверенных источников.
          </p>
          <p className="text-xs text-slate-500 mt-2 font-mono">
            Ключи: {LEGAL_PRIVACY_HTML_KEY}, {LEGAL_COOKIES_HTML_KEY}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving || loading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50 shrink-0"
        >
          {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Сохранить оба
        </button>
      </div>

      {err ? <p className="text-red-600 text-sm">{err}</p> : null}
      {ok ? <p className="text-emerald-700 text-sm">{ok}</p> : null}

      {loading ? (
        <p className="text-slate-600 text-sm inline-flex items-center gap-2">
          <Loader className="w-4 h-4 animate-spin" />
          Загрузка…
        </p>
      ) : (
        <div className="space-y-8">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
            <h2 className="font-bold text-slate-900">Политика конфиденциальности (HTML)</h2>
            <textarea
              value={privacyHtml}
              onChange={(e) => setPrivacyHtml(e.target.value)}
              rows={18}
              spellCheck={false}
              className="w-full font-mono text-xs sm:text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[14rem]"
              placeholder="Оставьте пустым для шаблона по умолчанию…"
            />
            <p className="text-xs text-slate-500">Символов: {privacyHtml.length}</p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
            <h2 className="font-bold text-slate-900">Политика cookies (HTML)</h2>
            <textarea
              value={cookiesHtml}
              onChange={(e) => setCookiesHtml(e.target.value)}
              rows={18}
              spellCheck={false}
              className="w-full font-mono text-xs sm:text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[14rem]"
              placeholder="Оставьте пустым для шаблона по умолчанию…"
            />
            <p className="text-xs text-slate-500">Символов: {cookiesHtml.length}</p>
          </section>
        </div>
      )}
    </div>
  );
}
