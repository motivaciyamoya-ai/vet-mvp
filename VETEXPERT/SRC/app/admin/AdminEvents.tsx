import { useCallback, useEffect, useState } from "react";
import {
  apiAdminVetEventsSourcesGet,
  apiAdminVetEventsSourcesPut,
  apiAdminVetEventManualCreate,
  apiAdminVetEventsRecent,
  apiAdminVetEventsSync,
  apiAdminVetEventDelete,
  type VetEventsSourcesConfig,
  type VetEventAdminRow,
  type VetEventSyncSummary,
} from "../../lib/api";

export default function AdminEvents() {
  const [sources, setSources] = useState<VetEventsSourcesConfig>({ icsText: "", rssText: "" });
  const [draft, setDraft] = useState<VetEventsSourcesConfig>({ icsText: "", rssText: "" });
  const [recent, setRecent] = useState<VetEventAdminRow[] | null>(null);
  const [syncResult, setSyncResult] = useState<VetEventSyncSummary | null>(null);
  const [loadErr, setLoadErr] = useState("");
  const [saveBusy, setSaveBusy] = useState(false);
  const [syncBusy, setSyncBusy] = useState(false);
  const [manualErr, setManualErr] = useState("");

  const [title, setTitle] = useState("");
  const [startsLocal, setStartsLocal] = useState("");
  const [endsLocal, setEndsLocal] = useState("");
  const [location, setLocation] = useState("");
  const [organizers, setOrganizers] = useState("");
  const [audience, setAudience] = useState("");
  const [eventFormat, setEventFormat] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [manualBusy, setManualBusy] = useState(false);

  const loadSources = useCallback(() => {
    setLoadErr("");
    apiAdminVetEventsSourcesGet()
      .then((c) => {
        setSources(c);
        setDraft(c);
      })
      .catch((e: unknown) => setLoadErr(e instanceof Error ? e.message : String(e)));
  }, []);

  const loadRecent = useCallback(() => {
    apiAdminVetEventsRecent(100)
      .then(setRecent)
      .catch(() => setRecent([]));
  }, []);

  useEffect(() => {
    loadSources();
    loadRecent();
  }, [loadSources, loadRecent]);

  const saveSources = async () => {
    setSaveBusy(true);
    setLoadErr("");
    try {
      const next = await apiAdminVetEventsSourcesPut({
        icsText: draft.icsText,
        rssText: draft.rssText,
      });
      setSources(next);
      setDraft(next);
    } catch (e: unknown) {
      setLoadErr(e instanceof Error ? e.message : "Ошибка сохранения");
    } finally {
      setSaveBusy(false);
    }
  };

  const syncNow = async () => {
    setSyncBusy(true);
    setSyncResult(null);
    try {
      const r = await apiAdminVetEventsSync();
      setSyncResult(r);
      await loadRecent();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Синхронизация не удалась");
    } finally {
      setSyncBusy(false);
    }
  };

  const submitManual = async () => {
    const ti = title.trim();
    if (!ti) {
      setManualErr("Укажите название");
      return;
    }
    if (!startsLocal) {
      setManualErr("Укажите дату и время начала");
      return;
    }
    const startIso = localInputToIso(startsLocal);
    if (!startIso) {
      setManualErr("Некорректная дата начала");
      return;
    }
    let endsIso: string | undefined;
    if (endsLocal.trim()) {
      endsIso = localInputToIso(endsLocal);
      if (!endsIso) {
        setManualErr("Некорректная дата окончания");
        return;
      }
    }
    setManualErr("");
    setManualBusy(true);
    try {
      await apiAdminVetEventManualCreate({
        title: ti,
        description: description.trim() || undefined,
        location: location.trim() || undefined,
        url: url.trim() || undefined,
        startsAt: startIso,
        endsAt: endsIso,
      });
      setTitle("");
      setStartsLocal("");
      setEndsLocal("");
      setLocation("");
      setUrl("");
      setDescription("");
      await loadRecent();
    } catch (e: unknown) {
      setManualErr(e instanceof Error ? e.message : "Не удалось создать");
    } finally {
      setManualBusy(false);
    }
  };

  const deleteRow = async (id: string) => {
    if (!window.confirm("Удалить это мероприятие из календаря?")) return;
    try {
      await apiAdminVetEventDelete(id);
      await loadRecent();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Ошибка удаления");
    }
  };

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Мероприятия · календарь</h1>
        <p className="text-sm text-slate-600 mt-2 max-w-3xl">
          Подключите публичные ленты ICS и RSS (по одному URL на строку). После сохранения запустите синхронизацию или дождитесь
          автообновления на сервере (~6 ч). Можно добавить событие вручную — оно попадёт на страницу «Мероприятия» у всех
          пользователей.
        </p>
      </div>

      {loadErr ? <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{loadErr}</p> : null}

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Источники (ICS / RSS)</h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saveBusy}
              onClick={() => void saveSources()}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
            >
              {saveBusy ? "Сохранение…" : "Сохранить ленты"}
            </button>
            <button
              type="button"
              disabled={syncBusy}
              onClick={() => void syncNow()}
              className="px-4 py-2 rounded-xl border border-slate-300 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
            >
              {syncBusy ? "Подтягиваем…" : "Синхронизировать сейчас"}
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-500">
          Текущие значения из БД: <span className="font-mono">events.sources.ics</span> и{" "}
          <span className="font-mono">events.sources.rss</span> ({sources.icsText.length + sources.rssText.length}{" "}
          символов всего после последнего сохранения).
        </p>

        <div className="grid md:grid-cols-2 gap-4">
          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-800">ICS (.ics календари)</span>
            <textarea
              value={draft.icsText}
              onChange={(e) => setDraft((d) => ({ ...d, icsText: e.target.value }))}
              rows={10}
              placeholder={"# По одному URL на строку\nhttps://example.com/calendar.ics"}
              className="w-full text-sm font-mono rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-800">RSS (анонсы, ленты мероприятий)</span>
            <textarea
              value={draft.rssText}
              onChange={(e) => setDraft((d) => ({ ...d, rssText: e.target.value }))}
              rows={10}
              placeholder={"# Публичные RSS\nhttps://example.com/events.xml"}
              className="w-full text-sm font-mono rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          </label>
        </div>

        {syncResult ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs space-y-2">
            <p className="font-semibold text-slate-800">
              Последний запуск: {new Date(syncResult.ranAt).toLocaleString("ru-RU")}
            </p>
            <ul className="space-y-1 font-mono text-[11px] text-slate-700">
              {syncResult.feeds.map((f) => (
                <li key={f.feedUrl + f.kind}>
                  [{f.kind.toUpperCase()}] {f.feedUrl} — {f.error ? `ошибка: ${f.error}` : `записей: ${f.upserted}`}
                </li>
              ))}
            </ul>
            {syncResult.feeds.length === 0 ? <p className="text-slate-500">Нет URL в настройках и env.</p> : null}
          </div>
        ) : null}
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Добавить вручную</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block space-y-1 sm:col-span-2">
            <span className="text-sm font-medium text-slate-800">Название</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              maxLength={480}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-800">Начало (локальное время браузера)</span>
            <input
              type="datetime-local"
              value={startsLocal}
              onChange={(e) => setStartsLocal(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-800">Окончание (необязательно)</span>
            <input
              type="datetime-local"
              value={endsLocal}
              onChange={(e) => setEndsLocal(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-800">Место / город</span>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              maxLength={480}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-800">Ссылка (https://)</span>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              maxLength={2000}
            />
          </label>
          <label className="block space-y-1 sm:col-span-2">
            <span className="text-sm font-medium text-slate-800">Организаторы</span>
            <textarea
              value={organizers}
              onChange={(e) => setOrganizers(e.target.value)}
              rows={2}
              placeholder="Название, контакты, сайт организатора…"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              maxLength={8000}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-800">Для кого (аудитория)</span>
            <input
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              maxLength={4000}
              placeholder="Врачи, ординаторы, зоотехники…"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-800">Формат</span>
            <input
              value={eventFormat}
              onChange={(e) => setEventFormat(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              maxLength={1000}
              placeholder="Онлайн, офлайн, гибрид…"
            />
          </label>
          <label className="block space-y-1 sm:col-span-2">
            <span className="text-sm font-medium text-slate-800">Описание</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              maxLength={8000}
            />
          </label>
        </div>
        {manualErr ? <p className="text-sm text-red-600">{manualErr}</p> : null}
        <button
          type="button"
          disabled={manualBusy}
          onClick={() => void submitManual()}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
        >
          {manualBusy ? "Создание…" : "Создать мероприятие"}
        </button>
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <h2 className="text-lg font-semibold text-slate-900 mb-3">Последние записи</h2>
        {!recent ? (
          <p className="text-slate-500 text-sm">Загрузка…</p>
        ) : recent.length === 0 ? (
          <p className="text-slate-500 text-sm">Пока нет событий в базе.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-slate-500 border-b border-slate-200">
                  <th className="py-2 pr-3">Когда</th>
                  <th className="py-2 pr-3">Название</th>
                  <th className="py-2 pr-3">Источник</th>
                  <th className="py-2 pr-3" />
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                    <td className="py-2 pr-3 whitespace-nowrap text-slate-600">
                      {new Date(r.startsAt).toLocaleString("ru-RU", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-2 pr-3 font-medium text-slate-900 max-w-[16rem] truncate">{r.title}</td>
                    <td className="py-2 pr-3">
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700">{r.source}</span>{" "}
                      <span className="text-xs text-slate-500 truncate">{r.sourceFeed}</span>
                    </td>
                    <td className="py-2">
                      <button
                        type="button"
                        onClick={() => void deleteRow(r.id)}
                        className="text-xs font-semibold text-red-700 hover:underline"
                      >
                        Удалить
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

/** datetime-local → ISO UTC для backend */
function localInputToIso(local: string): string | undefined {
  if (!local) return undefined;
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}
