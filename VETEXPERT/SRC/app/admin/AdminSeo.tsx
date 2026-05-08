import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch, apiReferenceSiteSeo, type PublicSiteSeoDto } from "../../lib/api";

type SettingRow = { id: string; key: string; value: string; updatedAt: string };

const K = {
  SITE_NAME: "seo.site_name",
  HOME_PAGE_TITLE: "seo.home_page_title",
  META_DESCRIPTION: "seo.meta_description",
  META_KEYWORDS: "seo.meta_keywords",
  OG_SITE_NAME: "seo.og_site_name",
  OG_TITLE: "seo.og_title",
  OG_DESCRIPTION: "seo.og_description",
  OG_IMAGE: "seo.og_image",
  CANONICAL_ORIGIN: "seo.canonical_origin",
  THEME_COLOR: "seo.theme_color",
  TWITTER_CARD: "seo.twitter_card",
} as const;

type FormState = Record<(typeof K)[keyof typeof K], string>;

function emptyForm(): FormState {
  return {
    [K.SITE_NAME]: "",
    [K.HOME_PAGE_TITLE]: "",
    [K.META_DESCRIPTION]: "",
    [K.META_KEYWORDS]: "",
    [K.OG_SITE_NAME]: "",
    [K.OG_TITLE]: "",
    [K.OG_DESCRIPTION]: "",
    [K.OG_IMAGE]: "",
    [K.CANONICAL_ORIGIN]: "",
    [K.THEME_COLOR]: "",
    [K.TWITTER_CARD]: "",
  };
}

function formFromRows(rows: SettingRow[]): FormState {
  const m = Object.fromEntries(rows.filter((r) => r.key.startsWith("seo.")).map((r) => [r.key, r.value]));
  const next = emptyForm();
  (Object.keys(K) as (keyof typeof K)[]).forEach((nk) => {
    const dbKey = K[nk];
    if (typeof m[dbKey] === "string") next[dbKey] = m[dbKey];
  });
  return next;
}

export default function AdminSeo() {
  const [form, setForm] = useState<FormState>(() => emptyForm());
  const [preview, setPreview] = useState<PublicSiteSeoDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const fieldList = useMemo(
    () =>
      [
        { key: K.SITE_NAME, label: "Короткое имя сайта (бренд)", rows: 1, hint: "Используется в суффиксе заголовков: «Раздел · бренд»." },
        {
          key: K.HOME_PAGE_TITLE,
          label: "Заголовок главной (<title>)",
          rows: 2,
          hint: "Полный текст для главной страницы. Пусто — собрать из типового слогана и бренда.",
        },
        { key: K.META_DESCRIPTION, label: "Meta description (по умолчанию)", rows: 4, hint: "Основное описание для поисковиков и главной." },
        { key: K.META_KEYWORDS, label: "Meta keywords", rows: 2, hint: "Через запятую." },
        { key: K.OG_SITE_NAME, label: "Open Graph: site_name", rows: 1, hint: "Пусто — как бренд." },
        {
          key: K.OG_TITLE,
          label: "Open Graph: title (только главная)",
          rows: 2,
          hint: "Пусто — берётся фактический заголовок главной страницы.",
        },
        { key: K.OG_DESCRIPTION, label: "Open Graph / Twitter: description (главная)", rows: 4, hint: "Короткий текст для превью в соцсетях на главной." },
        {
          key: K.OG_IMAGE,
          label: "Картинка для превью (URL или путь)",
          rows: 2,
          hint: "Можно `/favicon.svg` или абсолютный https://… Рекомендуется PNG/JPG ~1200×630.",
        },
        {
          key: K.CANONICAL_ORIGIN,
          label: "Канонический origin",
          rows: 1,
          hint: "Например https://vetconnect.online без слэша в конце. Пусто — на сайте берётся текущий домен браузера.",
        },
        { key: K.THEME_COLOR, label: "Theme color (#RRGGBB)", rows: 1, hint: "Пусто — цвет по умолчанию." },
      ] as const,
    [],
  );

  const load = useCallback(async () => {
    setErr("");
    setOk("");
    setLoading(true);
    try {
      const [seo, rows] = await Promise.all([
        apiReferenceSiteSeo(),
        apiFetch<SettingRow[]>("/api/admin/settings"),
      ]);
      setPreview(seo);
      setForm(formFromRows(rows));
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const update = (key: string, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const save = async () => {
    setSaving(true);
    setErr("");
    setOk("");
    try {
      const entries: [string, string][] = [
        [K.SITE_NAME, form[K.SITE_NAME]],
        [K.HOME_PAGE_TITLE, form[K.HOME_PAGE_TITLE]],
        [K.META_DESCRIPTION, form[K.META_DESCRIPTION]],
        [K.META_KEYWORDS, form[K.META_KEYWORDS]],
        [K.OG_SITE_NAME, form[K.OG_SITE_NAME]],
        [K.OG_TITLE, form[K.OG_TITLE]],
        [K.OG_DESCRIPTION, form[K.OG_DESCRIPTION]],
        [K.OG_IMAGE, form[K.OG_IMAGE]],
        [K.CANONICAL_ORIGIN, form[K.CANONICAL_ORIGIN]],
        [K.THEME_COLOR, form[K.THEME_COLOR]],
        [K.TWITTER_CARD, form[K.TWITTER_CARD] || "summary"],
      ];
      for (const [key, value] of entries) {
        await apiFetch(`/api/admin/settings/${encodeURIComponent(key)}`, {
          method: "PUT",
          json: { value: value.trim() },
        });
      }
      setOk("Сохранено. На открытых вкладках сайта заголовки обновятся при возврате на вкладку.");
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">SEO и метаданные</h1>
        <p className="text-slate-600 text-sm mt-1">
          Значения хранятся в настройках сайта с префиксом <code className="bg-slate-100 px-1 rounded">seo.</code> и
          применяются на публичных страницах через <code className="bg-slate-100 px-1 rounded">GET /api/reference/seo</code>.
        </p>
      </div>

      {err ? <p className="text-red-600 text-sm">{err}</p> : null}
      {ok ? <p className="text-emerald-700 text-sm">{ok}</p> : null}

      {loading ? (
        <p className="text-slate-600 text-sm">Загрузка…</p>
      ) : (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
            <h2 className="text-lg font-semibold text-slate-900">Редактирование</h2>
            <div className="space-y-4">
              {fieldList.map((f) => (
                <label key={f.key} className="block space-y-1">
                  <span className="text-sm font-medium text-slate-800">{f.label}</span>
                  <textarea
                    value={form[f.key]}
                    onChange={(e) => update(f.key, e.target.value)}
                    rows={f.rows}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                  <span className="text-xs text-slate-500">{f.hint}</span>
                </label>
              ))}

              <label className="block space-y-1">
                <span className="text-sm font-medium text-slate-800">Twitter card</span>
                <select
                  value={form[K.TWITTER_CARD] || "summary"}
                  onChange={(e) => update(K.TWITTER_CARD, e.target.value)}
                  className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="summary">summary</option>
                  <option value="summary_large_image">summary_large_image</option>
                </select>
              </label>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
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
                Сбросить из сервера
              </button>
            </div>
          </section>

          {preview ? (
            <section className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-6 space-y-3">
              <h2 className="text-lg font-semibold text-slate-900">Эффективные значения (после умолчаний)</h2>
              <p className="text-xs text-slate-600">
                Так ответит публичный API — удобно проверить, что пустые поля заполнились запасными вариантами.
              </p>
              <pre className="text-xs bg-white border border-slate-200 rounded-lg p-4 overflow-x-auto whitespace-pre-wrap break-words">
                {JSON.stringify(preview, null, 2)}
              </pre>
              <p className="text-sm text-slate-700">
                <span className="font-medium">Главная · title:</span> {preview.homeDocumentTitle}
              </p>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
