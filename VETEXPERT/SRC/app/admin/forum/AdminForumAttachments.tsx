import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { apiFetch, assetUrl } from "../../../lib/api";

const UPLOAD_SETTINGS_KEYS = [
  {
    key: "uploads.messages.enabled",
    label: "Вложения к сообщениям включены",
    hint: "true / false — при false пользователи не смогут загружать файлы в ответах и комментариях к статьям.",
    placeholder: "true",
  },
  {
    key: "uploads.messages.max_mb",
    label: "Максимальный размер одного файла (МБ)",
    hint: "1–50, по умолчанию 12.",
    placeholder: "12",
  },
  {
    key: "uploads.messages.max_per_message",
    label: "Макс. файлов в одном комментарии к статье",
    hint: "1–10, по умолчанию 5.",
    placeholder: "5",
  },
  {
    key: "uploads.forum.max_attachment_lines",
    label: "Макс. строк-вложений в одном ответе на форуме",
    hint: "Картинки /uploads/thread/… и файлы /uploads/messages/…, 4–25, по умолчанию 10.",
    placeholder: "10",
  },
] as const;

type ThreadCoverRow = {
  id: string;
  title: string;
  updatedAt: string;
  coverImageUrls: string[];
};

type PostRow = {
  id: string;
  body: string;
  createdAt: string;
  threadId: string;
  thread: { title: string };
};

type Overview = {
  threadCovers: ThreadCoverRow[];
  postsWithAttachments: { post: PostRow; urls: string[] }[];
};

export default function AdminForumAttachments() {
  const [data, setData] = useState<Overview | null>(null);
  const [err, setErr] = useState("");
  const [settingVals, setSettingVals] = useState<Record<string, string>>({});
  const [settingsMsg, setSettingsMsg] = useState("");
  const [settingsBusy, setSettingsBusy] = useState(false);

  const load = useCallback(() => {
    setErr("");
    apiFetch<Overview>("/api/admin/forum/attachments-overview")
      .then(setData)
      .catch((e) => setErr(String(e.message)));
  }, []);

  const loadSettings = useCallback(() => {
    setSettingsMsg("");
    apiFetch<Array<{ key: string; value: string }>>("/api/admin/settings")
      .then((rows) => {
        const m: Record<string, string> = {};
        for (const k of UPLOAD_SETTINGS_KEYS) {
          const row = rows.find((r) => r.key === k.key);
          m[k.key] = row?.value ?? "";
        }
        setSettingVals(m);
      })
      .catch((e) => setSettingsMsg(String(e.message)));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 bg-gradient-to-r from-emerald-800 to-teal-800 text-white text-sm font-semibold flex flex-wrap justify-between gap-2">
          <span>Вложения форума</span>
          <button type="button" onClick={load} className="text-xs text-emerald-100 hover:text-white underline">
            Обновить
          </button>
        </div>
        <div className="p-4 text-sm text-slate-700 space-y-2">
          <p>
            Изображения к темам хранятся в поле <code className="text-xs bg-slate-100 px-1 rounded">coverImageUrls</code>.
            В ответах и комментариях к статьям вложения сохраняются в теле сообщения отдельными строками:{" "}
            <code className="text-xs bg-slate-100 px-1 rounded">/uploads/thread/…</code> (иллюстрации темы) и{" "}
            <code className="text-xs bg-slate-100 px-1 rounded">/uploads/messages/…</code> (файлы PDF, TXT, DOCX,
            изображения через POST <code className="text-xs">/api/uploads/message-attachment</code>).
          </p>
          <p className="text-xs text-slate-500">
            Удаление файла с диска вручную не обновит БД — правьте тему или пост в разделе «Темы и посты».
          </p>
        </div>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 text-sm font-semibold text-slate-800 flex flex-wrap justify-between gap-2">
          <span>Настройки файлов (SiteSetting)</span>
          <button type="button" onClick={loadSettings} className="text-xs text-emerald-700 hover:underline font-medium">
            Обновить поля
          </button>
        </div>
        <div className="p-4 space-y-4 text-sm text-slate-700">
          <p className="text-xs text-slate-500">
            Значения пишутся в те же ключи, что и в разделе «Настройки сайта». После сохранения пользователям
            достаточно обновить страницу.
          </p>
          {UPLOAD_SETTINGS_KEYS.map((row) => (
            <div key={row.key} className="space-y-1">
              <label className="block font-medium text-slate-800" htmlFor={`sett-${row.key}`}>
                {row.label}
              </label>
              <p className="text-xs text-slate-500">{row.hint}</p>
              <div className="flex flex-wrap gap-2 items-center">
                <input
                  id={`sett-${row.key}`}
                  className="min-w-[12rem] flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono"
                  value={settingVals[row.key] ?? ""}
                  placeholder={row.placeholder}
                  onChange={(e) => setSettingVals((prev) => ({ ...prev, [row.key]: e.target.value }))}
                />
                <button
                  type="button"
                  className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                  disabled={settingsBusy}
                  onClick={async () => {
                    setSettingsBusy(true);
                    setSettingsMsg("");
                    try {
                      await apiFetch(`/api/admin/settings/${encodeURIComponent(row.key)}`, {
                        method: "PUT",
                        json: { value: settingVals[row.key] ?? "" },
                      });
                      setSettingsMsg(`Сохранено: ${row.key}`);
                      await loadSettings();
                    } catch (e: unknown) {
                      setSettingsMsg(e instanceof Error ? e.message : String(e));
                    } finally {
                      setSettingsBusy(false);
                    }
                  }}
                >
                  Сохранить
                </button>
              </div>
            </div>
          ))}
          {settingsMsg ? <p className="text-xs text-slate-600">{settingsMsg}</p> : null}
        </div>
      </section>

      {err ? <p className="text-red-600 text-sm">{err}</p> : null}
      {!data ? (
        <p className="text-slate-600">Загрузка…</p>
      ) : (
        <>
          <section className="rounded-lg border border-slate-200 bg-white overflow-hidden">
            <h2 className="px-4 py-2 bg-slate-100 text-sm font-semibold text-slate-800 border-b border-slate-200">
              Иллюстрации у тем ({data.threadCovers.length})
            </h2>
            {data.threadCovers.length === 0 ? (
              <p className="p-4 text-sm text-slate-600">Нет тем с загруженными обложками.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase text-slate-500 border-b border-slate-200">
                      <th className="p-3">Тема</th>
                      <th className="p-3">Файлы</th>
                      <th className="p-3 whitespace-nowrap">Обновлено</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.threadCovers.map((row) => (
                      <tr key={row.id} className="border-t border-slate-100">
                        <td className="p-3">
                          <Link to={`/forum/topic/${encodeURIComponent(row.id)}`} className="font-medium text-emerald-800 hover:underline">
                            {row.title}
                          </Link>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {row.coverImageUrls.map((u) => (
                              <a
                                key={u}
                                href={assetUrl(u)}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs font-mono text-slate-600 hover:text-emerald-800 break-all"
                              >
                                {u}
                              </a>
                            ))}
                          </div>
                        </td>
                        <td className="p-3 text-xs text-slate-500 whitespace-nowrap">
                          {new Date(row.updatedAt).toLocaleString("ru-RU")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-lg border border-slate-200 bg-white overflow-hidden">
            <h2 className="px-4 py-2 bg-slate-100 text-sm font-semibold text-slate-800 border-b border-slate-200">
              Вложения в постах (последние, до 80)
            </h2>
            {data.postsWithAttachments.length === 0 ? (
              <p className="p-4 text-sm text-slate-600">В последних постах вложенных изображений не найдено.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase text-slate-500 border-b border-slate-200">
                      <th className="p-3">Тема</th>
                      <th className="p-3">Пост</th>
                      <th className="p-3">Файлы</th>
                      <th className="p-3 whitespace-nowrap">Создан</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.postsWithAttachments.map(({ post, urls }) => (
                      <tr key={post.id} className="border-t border-slate-100 align-top">
                        <td className="p-3">
                          <Link
                            to={`/forum/topic/${encodeURIComponent(post.threadId)}`}
                            className="font-medium text-emerald-800 hover:underline"
                          >
                            {post.thread.title}
                          </Link>
                        </td>
                        <td className="p-3 font-mono text-xs text-slate-500">{post.id.slice(0, 12)}…</td>
                        <td className="p-3">
                          <div className="flex flex-col gap-1">
                            {urls.map((u) => (
                              <a
                                key={u}
                                href={assetUrl(u)}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs font-mono text-slate-600 hover:text-emerald-800 break-all"
                              >
                                {u}
                              </a>
                            ))}
                          </div>
                        </td>
                        <td className="p-3 text-xs text-slate-500 whitespace-nowrap">
                          {new Date(post.createdAt).toLocaleString("ru-RU")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
