import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { apiFetch, assetUrl } from "../../../lib/api";

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

  const load = useCallback(() => {
    setErr("");
    apiFetch<Overview>("/api/admin/forum/attachments-overview")
      .then(setData)
      .catch((e) => setErr(String(e.message)));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
            Изображения в ответах сохраняются в теле поста отдельными строками с путём{" "}
            <code className="text-xs bg-slate-100 px-1 rounded">/uploads/thread/…</code> после загрузки через API.
          </p>
          <p className="text-xs text-slate-500">
            Удаление файла с диска вручную не обновит БД — правьте тему или пост в разделе «Темы и посты».
          </p>
        </div>
      </div>

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
