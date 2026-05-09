import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { apiFetch } from "../../lib/api";

const EMOJI_PRESET = [
  "📌",
  "💬",
  "🩺",
  "🔪",
  "🔬",
  "💊",
  "🦷",
  "🧴",
  "👁️",
  "❤️",
  "🦠",
  "🍼",
  "🦜",
  "🐄",
  "⚗️",
  "🦴",
  "🎗️",
  "🚑",
  "🥩",
  "⚖️",
  "🦎",
  "🧬",
  "🩹",
  "🧠",
  "💉",
  "🛡️",
  "🐍",
  "🐾",
  "⚕️",
  "🏥",
  "🐕",
  "🐈",
  "🌿",
  "📋",
];

/** Транслитерация для URL-slug (как в классических форумах). */
function slugifyFromTitle(title: string): string {
  const pairs: [string, string][] = [
    ["а", "a"],
    ["б", "b"],
    ["в", "v"],
    ["г", "g"],
    ["д", "d"],
    ["е", "e"],
    ["ё", "yo"],
    ["ж", "zh"],
    ["з", "z"],
    ["и", "i"],
    ["й", "y"],
    ["к", "k"],
    ["л", "l"],
    ["м", "m"],
    ["н", "n"],
    ["о", "o"],
    ["п", "p"],
    ["р", "r"],
    ["с", "s"],
    ["т", "t"],
    ["у", "u"],
    ["ф", "f"],
    ["х", "h"],
    ["ц", "ts"],
    ["ч", "ch"],
    ["ш", "sh"],
    ["щ", "sch"],
    ["ъ", ""],
    ["ы", "y"],
    ["ь", ""],
    ["э", "e"],
    ["ю", "yu"],
    ["я", "ya"],
  ];
  let s = title.trim().toLowerCase();
  for (const [cyr, lat] of pairs) {
    s = s.split(cyr).join(lat);
  }
  s = s
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return s || "forum";
}

type Cat = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  iconEmoji: string;
  sortOrder: number;
  _count?: { threads: number };
  postCount?: number;
};

type Thread = {
  id: string;
  title: string;
  tags: string;
  updatedAt: string;
  category: { id: string; name: string; slug: string };
  author: { id: string; email: string };
  _count?: { posts: number };
};

type ThreadDetail = Thread & {
  posts: {
    id: string;
    body: string;
    createdAt: string;
    author: { id: string; email: string };
  }[];
};

function Modal({
  title,
  children,
  onClose,
  wide,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60" role="dialog">
      <div
        className={`bg-white rounded-2xl shadow-xl ${wide ? "max-w-4xl" : "max-w-2xl"} w-full max-h-[90vh] overflow-hidden flex flex-col`}
      >
        <div className="flex justify-between items-center px-5 py-3 border-b border-slate-200">
          <h2 className="font-semibold text-lg text-slate-900">{title}</h2>
          <button type="button" className="text-slate-500 hover:text-slate-800 text-xl leading-none px-2" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

type AdminTab = "structure" | "threads";

export default function AdminForum() {
  const [tab, setTab] = useState<AdminTab>("structure");
  const [cats, setCats] = useState<Cat[]>([]);
  const [threads, setThreads] = useState<{ items: Thread[]; total: number } | null>(null);
  const [q, setQ] = useState("");
  const [newCat, setNewCat] = useState({
    name: "",
    slug: "",
    description: "",
    iconEmoji: "💬",
    sortOrder: 0,
  });
  const [newSlugManual, setNewSlugManual] = useState(false);
  const [err, setErr] = useState("");

  const [editCat, setEditCat] = useState<Cat | null>(null);
  const [editCatForm, setEditCatForm] = useState({
    name: "",
    slug: "",
    description: "",
    iconEmoji: "💬",
    sortOrder: 0,
  });

  const [threadModalId, setThreadModalId] = useState<string | null>(null);
  const [threadDetail, setThreadDetail] = useState<ThreadDetail | null>(null);
  const [threadForm, setThreadForm] = useState({ title: "", tags: "", categoryId: "", authorId: "" });
  const [postEdits, setPostEdits] = useState<Record<string, string>>({});
  const [postAuthorEdits, setPostAuthorEdits] = useState<Record<string, string>>({});

  const loadCats = useCallback(() => {
    apiFetch<Cat[]>("/api/admin/forum/categories")
      .then((rows) => {
        const r = Array.isArray(rows) ? rows : [];
        r.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name, "ru"));
        setCats(r);
        setErr("");
      })
      .catch((e) => setErr(String(e.message)));
  }, []);

  const loadThreads = useCallback(() => {
    const params = new URLSearchParams({ page: "1", pageSize: "100" });
    if (q.trim().length >= 2) params.set("q", q.trim());
    apiFetch<{ items: Thread[]; total: number }>(`/api/admin/forum/threads?${params}`)
      .then(setThreads)
      .catch((e) => setErr(String(e.message)));
  }, [q]);

  const openThreadModal = async (id: string) => {
    setThreadModalId(id);
    setThreadDetail(null);
    try {
      const t = await apiFetch<ThreadDetail>(`/api/admin/forum/threads/${id}`);
      setThreadDetail(t);
      setThreadForm({
        title: t.title,
        tags: t.tags ?? "",
        categoryId: t.category.id,
        authorId: t.author.id,
      });
      const pe: Record<string, string> = {};
      const pa: Record<string, string> = {};
      t.posts.forEach((p) => {
        pe[p.id] = p.body;
        pa[p.id] = p.author.id;
      });
      setPostEdits(pe);
      setPostAuthorEdits(pa);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Ошибка загрузки темы");
      setThreadModalId(null);
    }
  };

  useEffect(() => {
    loadCats();
  }, [loadCats]);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  const swapCategoryOrder = async (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= cats.length) return;
    const a = cats[index];
    const b = cats[j];
    const orderA = a.sortOrder ?? 0;
    const orderB = b.sortOrder ?? 0;
    try {
      await Promise.all([
        apiFetch(`/api/admin/forum/categories/${a.id}`, { method: "PATCH", json: { sortOrder: orderB } }),
        apiFetch(`/api/admin/forum/categories/${b.id}`, { method: "PATCH", json: { sortOrder: orderA } }),
      ]);
      loadCats();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Ошибка смены порядка");
    }
  };

  const addCategory = async () => {
    try {
      await apiFetch("/api/admin/forum/categories", {
        method: "POST",
        json: {
          name: newCat.name,
          slug: newCat.slug,
          description: newCat.description || undefined,
          iconEmoji: newCat.iconEmoji || undefined,
          sortOrder: Number(newCat.sortOrder) || 0,
        },
      });
      setNewCat({ name: "", slug: "", description: "", iconEmoji: "💬", sortOrder: 0 });
      setNewSlugManual(false);
      loadCats();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Ошибка");
    }
  };

  const saveCategoryEdit = async () => {
    if (!editCat) return;
    try {
      await apiFetch(`/api/admin/forum/categories/${editCat.id}`, {
        method: "PATCH",
        json: {
          name: editCatForm.name,
          slug: editCatForm.slug,
          description: editCatForm.description || null,
          iconEmoji: editCatForm.iconEmoji,
          sortOrder: Number(editCatForm.sortOrder) || 0,
        },
      });
      setEditCat(null);
      loadCats();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Ошибка");
    }
  };

  const openCatEdit = (c: Cat) => {
    setEditCat(c);
    setEditCatForm({
      name: c.name,
      slug: c.slug,
      description: c.description ?? "",
      iconEmoji: c.iconEmoji || "💬",
      sortOrder: c.sortOrder ?? 0,
    });
  };

  const delCat = async (id: string) => {
    if (!confirm("Удалить раздел? (только если в нём нет тем)")) return;
    try {
      await apiFetch(`/api/admin/forum/categories/${id}`, { method: "DELETE" });
      loadCats();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Ошибка");
    }
  };

  const saveThread = async () => {
    if (!threadModalId) return;
    try {
      await apiFetch(`/api/admin/forum/threads/${threadModalId}`, {
        method: "PATCH",
        json: {
          title: threadForm.title,
          tags: threadForm.tags,
          categoryId: threadForm.categoryId,
          authorId: threadForm.authorId || undefined,
        },
      });
      await openThreadModal(threadModalId);
      loadThreads();
      loadCats();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Ошибка");
    }
  };

  const savePost = async (postId: string) => {
    const body = postEdits[postId] ?? "";
    const authorId = (postAuthorEdits[postId] ?? "").trim();
    try {
      await apiFetch(`/api/admin/forum/posts/${postId}`, {
        method: "PATCH",
        json: {
          body,
          ...(authorId ? { authorId } : {}),
        },
      });
      if (threadModalId) await openThreadModal(threadModalId);
      loadThreads();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Ошибка");
    }
  };

  const delPost = async (postId: string) => {
    if (!confirm("Удалить это сообщение? (в теме должно остаться минимум 2 поста)")) return;
    try {
      await apiFetch(`/api/admin/forum/posts/${postId}`, { method: "DELETE" });
      if (threadModalId) await openThreadModal(threadModalId);
      loadThreads();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Ошибка");
    }
  };

  const delThread = async (id: string) => {
    if (!confirm("Удалить тему со всеми сообщениями?")) return;
    try {
      await apiFetch(`/api/admin/forum/threads/${id}`, { method: "DELETE" });
      setThreadModalId(null);
      loadThreads();
      loadCats();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Ошибка");
    }
  };

  const tabBtn = (id: AdminTab, label: string) => (
    <button
      type="button"
      key={id}
      onClick={() => setTab(id)}
      className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
        tab === id ? "border-emerald-600 text-emerald-800 bg-white" : "border-transparent text-slate-600 hover:text-slate-900"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Управление форумом</h1>
        <p className="text-slate-600 text-sm mt-1">
          Структура разделов, порядок отображения, описания и иконки — как в панели классического форума. Темы и посты:
          правка текста, перенос в другой раздел, смена автора (ID пользователя).
        </p>
      </div>

      {err ? <p className="text-red-600 text-sm">{err}</p> : null}

      <div className="flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50/80 rounded-t-lg px-1 pt-1">
        {tabBtn("structure", "Форумы и категории")}
        {tabBtn("threads", "Темы и сообщения")}
      </div>

      {tab === "structure" && (
        <div className="space-y-4 -mt-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <Link to="/forum" className="text-emerald-700 font-medium underline-offset-2 hover:underline">
              Открыть индекс форума на сайте
            </Link>
            <button type="button" className="text-slate-600 underline text-sm" onClick={loadCats}>
              Обновить список
            </button>
          </div>

          {/* Блок «Добавить форум» в духе MyBB */}
          <section className="rounded-lg border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-4 py-2.5 bg-gradient-to-r from-emerald-800 to-teal-800 text-white text-sm font-semibold">
              Добавить раздел (категорию форума)
            </div>
            <div className="bg-white p-4 space-y-3">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <input
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  placeholder="Название раздела"
                  value={newCat.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setNewCat((c) => ({
                      ...c,
                      name,
                      slug: newSlugManual ? c.slug : slugifyFromTitle(name),
                    }));
                  }}
                />
                <input
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono"
                  placeholder="slug (URL, латиница)"
                  value={newCat.slug}
                  onChange={(e) => {
                    setNewSlugManual(true);
                    setNewCat((c) => ({ ...c, slug: e.target.value }));
                  }}
                />
                <input
                  type="number"
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  placeholder="Порядок (sortOrder)"
                  value={newCat.sortOrder}
                  onChange={(e) => setNewCat((c) => ({ ...c, sortOrder: parseInt(e.target.value, 10) || 0 }))}
                />
                <div className="flex items-center gap-2">
                  <span className="text-2xl shrink-0">{newCat.iconEmoji}</span>
                  <input
                    className="border border-slate-200 rounded-lg px-2 py-2 text-sm flex-1 font-mono"
                    maxLength={16}
                    placeholder="эмодзи"
                    value={newCat.iconEmoji}
                    onChange={(e) => setNewCat((c) => ({ ...c, iconEmoji: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Иконка раздела</p>
                <div className="flex flex-wrap gap-1">
                  {EMOJI_PRESET.map((em) => (
                    <button
                      key={em}
                      type="button"
                      className={`text-xl p-1.5 rounded border ${newCat.iconEmoji === em ? "border-emerald-600 bg-emerald-50" : "border-slate-200 hover:bg-slate-50"}`}
                      onClick={() => setNewCat((c) => ({ ...c, iconEmoji: em }))}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm min-h-[72px]"
                placeholder="Описание раздела (видно на главной странице форума)"
                value={newCat.description}
                onChange={(e) => setNewCat((c) => ({ ...c, description: e.target.value }))}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg px-4 py-2 text-sm font-medium"
                  onClick={addCategory}
                >
                  Добавить раздел
                </button>
                <button
                  type="button"
                  className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  onClick={() => {
                    setNewSlugManual(false);
                    setNewCat((c) => ({ ...c, slug: slugifyFromTitle(c.name) }));
                  }}
                >
                  Сгенерировать slug из названия
                </button>
              </div>
            </div>
          </section>

          {/* Таблица «Управление форумами» */}
          <section className="rounded-lg border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-4 py-2.5 bg-gradient-to-r from-emerald-800 to-teal-800 text-white flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold">Управление форумами</span>
              <span className="text-xs text-emerald-100/90 tabular-nums">{cats.length} разделов</span>
            </div>
            <div className="overflow-x-auto bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-left text-[11px] uppercase tracking-wide text-slate-600">
                    <th className="p-2 w-20 text-center">Порядок</th>
                    <th className="p-2 min-w-[200px]">Форум</th>
                    <th className="p-2 text-right whitespace-nowrap w-24">Темы</th>
                    <th className="p-2 text-right whitespace-nowrap w-24">Сообщ.</th>
                    <th className="p-2 text-center w-28 hidden md:table-cell">Модераторы</th>
                    <th className="p-2 text-right min-w-[200px]">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {cats.map((c, index) => (
                    <tr key={c.id} className="border-t border-slate-100 hover:bg-emerald-50/30">
                      <td className="p-2 align-top">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-xs text-slate-500 tabular-nums">{c.sortOrder ?? 0}</span>
                          <div className="flex gap-0.5">
                            <button
                              type="button"
                              title="Выше"
                              disabled={index === 0}
                              className="px-1.5 py-0.5 text-xs rounded border border-slate-200 bg-white disabled:opacity-40"
                              onClick={() => swapCategoryOrder(index, -1)}
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              title="Ниже"
                              disabled={index === cats.length - 1}
                              className="px-1.5 py-0.5 text-xs rounded border border-slate-200 bg-white disabled:opacity-40"
                              onClick={() => swapCategoryOrder(index, 1)}
                            >
                              ↓
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="p-2 align-top">
                        <div className="flex gap-2">
                          <span className="text-2xl shrink-0 leading-none pt-0.5">{c.iconEmoji || "💬"}</span>
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900">{c.name}</div>
                            <div className="text-xs font-mono text-slate-500 mt-0.5">/{c.slug}</div>
                            {c.description?.trim() ? (
                              <p className="text-xs text-slate-600 mt-1 line-clamp-2">{c.description.trim()}</p>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="p-2 align-top text-right tabular-nums font-medium text-slate-800">{c._count?.threads ?? 0}</td>
                      <td className="p-2 align-top text-right tabular-nums text-slate-700">{c.postCount ?? 0}</td>
                      <td className="p-2 align-top text-center text-slate-400 text-xs hidden md:table-cell">—</td>
                      <td className="p-2 align-top text-right">
                        <div className="flex flex-wrap justify-end gap-x-2 gap-y-1 text-xs">
                          <button type="button" className="text-emerald-800 font-medium hover:underline" onClick={() => openCatEdit(c)}>
                            Изменить
                          </button>
                          <Link
                            to={`/forum/category/${encodeURIComponent(c.slug)}`}
                            className="text-slate-700 font-medium hover:underline"
                          >
                            На сайте
                          </Link>
                          <button type="button" className="text-red-600 font-medium hover:underline" onClick={() => delCat(c.id)}>
                            Удалить
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {tab === "threads" && (
        <div className="space-y-4 -mt-2">
          <div className="flex flex-wrap gap-2 items-center justify-between">
            <div className="flex gap-2 flex-1 min-w-[240px] max-w-xl">
              <input
                className="border border-slate-200 rounded-lg px-3 py-2 flex-1 text-sm"
                placeholder="Поиск тем (от 2 символов)"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <button type="button" className="bg-slate-200 px-4 py-2 rounded-lg text-sm shrink-0" onClick={loadThreads}>
                Найти
              </button>
            </div>
            <Link to="/forum" className="text-sm text-emerald-700 font-medium underline-offset-2 hover:underline">
              К форуму
            </Link>
          </div>

          <section className="rounded-lg border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-4 py-2.5 bg-gradient-to-r from-emerald-800 to-teal-800 text-white text-sm font-semibold">
              Список тем
            </div>
            {!threads ? (
              <div className="bg-white p-6 text-slate-600">Загрузка…</div>
            ) : (
              <div className="overflow-x-auto bg-white">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-left text-[11px] uppercase tracking-wide text-slate-600">
                      <th className="p-3 min-w-[180px]">Тема</th>
                      <th className="p-3 whitespace-nowrap">Раздел</th>
                      <th className="p-3">Автор</th>
                      <th className="p-3 text-right">Сообщ.</th>
                      <th className="p-3 text-right">Обновлено</th>
                      <th className="p-3 text-right">Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {threads.items.map((t) => (
                      <tr key={t.id} className="border-t border-slate-100 hover:bg-slate-50/80">
                        <td className="p-3 max-w-xs">
                          <div className="font-medium text-slate-900 line-clamp-2">{t.title}</div>
                          {t.tags?.trim() ? <div className="text-[11px] text-slate-500 mt-0.5 truncate">{t.tags}</div> : null}
                        </td>
                        <td className="p-3 whitespace-nowrap text-slate-700">{t.category.name}</td>
                        <td className="p-3 font-mono text-[11px] text-slate-600 max-w-[140px] truncate" title={t.author.email}>
                          {t.author.email}
                        </td>
                        <td className="p-3 text-right tabular-nums">{t._count?.posts ?? "—"}</td>
                        <td className="p-3 text-right text-xs text-slate-500 whitespace-nowrap">
                          {new Date(t.updatedAt).toLocaleString("ru-RU")}
                        </td>
                        <td className="p-3 text-right space-x-2 whitespace-nowrap">
                          <button type="button" className="text-emerald-800 font-medium text-xs hover:underline" onClick={() => openThreadModal(t.id)}>
                            Редактор
                          </button>
                          <button type="button" className="text-red-600 text-xs font-medium hover:underline" onClick={() => delThread(t.id)}>
                            Удалить
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="p-3 text-sm text-slate-600 border-t border-slate-100 bg-slate-50/50">
                  Всего тем (с учётом поиска): <span className="font-semibold tabular-nums">{threads.total}</span>
                </p>
              </div>
            )}
          </section>
        </div>
      )}

      {editCat && (
        <Modal title={`Редактирование раздела: ${editCat.name}`} onClose={() => setEditCat(null)}>
          <div className="space-y-3">
            <label className="block text-xs text-slate-500">Название</label>
            <input
              className="w-full border border-slate-200 rounded-lg px-3 py-2"
              value={editCatForm.name}
              onChange={(e) => setEditCatForm((f) => ({ ...f, name: e.target.value }))}
            />
            <label className="block text-xs text-slate-500">slug (URL)</label>
            <div className="flex gap-2">
              <input
                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 font-mono text-sm"
                value={editCatForm.slug}
                onChange={(e) => setEditCatForm((f) => ({ ...f, slug: e.target.value }))}
              />
              <button
                type="button"
                className="shrink-0 border border-slate-300 rounded-lg px-3 py-2 text-xs"
                onClick={() => setEditCatForm((f) => ({ ...f, slug: slugifyFromTitle(f.name) }))}
              >
                Из названия
              </button>
            </div>
            <label className="block text-xs text-slate-500">Порядок (sortOrder)</label>
            <input
              type="number"
              className="w-full border border-slate-200 rounded-lg px-3 py-2"
              value={editCatForm.sortOrder}
              onChange={(e) => setEditCatForm((f) => ({ ...f, sortOrder: parseInt(e.target.value, 10) || 0 }))}
            />
            <label className="block text-xs text-slate-500">Иконка</label>
            <div className="flex gap-2 items-center">
              <span className="text-3xl">{editCatForm.iconEmoji}</span>
              <input
                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 font-mono"
                maxLength={16}
                value={editCatForm.iconEmoji}
                onChange={(e) => setEditCatForm((f) => ({ ...f, iconEmoji: e.target.value }))}
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {EMOJI_PRESET.map((em) => (
                <button
                  key={em}
                  type="button"
                  className={`text-xl p-1.5 rounded border ${editCatForm.iconEmoji === em ? "border-emerald-600 bg-emerald-50" : "border-slate-200"}`}
                  onClick={() => setEditCatForm((f) => ({ ...f, iconEmoji: em }))}
                >
                  {em}
                </button>
              ))}
            </div>
            <label className="block text-xs text-slate-500">Описание (главная форума)</label>
            <textarea
              className="w-full border border-slate-200 rounded-lg px-3 py-2 min-h-[100px]"
              value={editCatForm.description}
              onChange={(e) => setEditCatForm((f) => ({ ...f, description: e.target.value }))}
            />
            <div className="flex gap-2 pt-2 flex-wrap">
              <button type="button" className="bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium" onClick={saveCategoryEdit}>
                Сохранить
              </button>
              <Link
                to={`/forum/category/${encodeURIComponent(editCatForm.slug || editCat.slug)}`}
                className="inline-flex items-center border border-slate-300 px-4 py-2 rounded-lg text-sm"
              >
                Просмотр на сайте
              </Link>
              <button type="button" className="border border-slate-300 px-4 py-2 rounded-lg text-sm" onClick={() => setEditCat(null)}>
                Отмена
              </button>
            </div>
          </div>
        </Modal>
      )}

      {threadModalId && (
        <Modal title={threadDetail ? `Тема: ${threadDetail.title}` : "Тема"} wide onClose={() => setThreadModalId(null)}>
          {!threadDetail ? (
            <p>Загрузка…</p>
          ) : (
            <div className="space-y-6">
              <div className="space-y-2 border-b border-slate-100 pb-4">
                <label className="text-xs text-slate-500">Заголовок</label>
                <input
                  className="w-full border border-slate-200 rounded-lg px-3 py-2"
                  value={threadForm.title}
                  onChange={(e) => setThreadForm((f) => ({ ...f, title: e.target.value }))}
                />
                <label className="text-xs text-slate-500">Теги</label>
                <input
                  className="w-full border border-slate-200 rounded-lg px-3 py-2"
                  value={threadForm.tags}
                  onChange={(e) => setThreadForm((f) => ({ ...f, tags: e.target.value }))}
                />
                <label className="text-xs text-slate-500">Раздел форума</label>
                <select
                  className="w-full border border-slate-200 rounded-lg px-3 py-2"
                  value={threadForm.categoryId}
                  onChange={(e) => setThreadForm((f) => ({ ...f, categoryId: e.target.value }))}
                >
                  {cats.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.iconEmoji} {c.name}
                    </option>
                  ))}
                </select>
                <label className="text-xs text-slate-500">Автор темы (ID пользователя)</label>
                <input
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 font-mono text-xs"
                  value={threadForm.authorId}
                  onChange={(e) => setThreadForm((f) => ({ ...f, authorId: e.target.value }))}
                />
                <div className="flex flex-wrap gap-2 pt-1">
                  <button type="button" className="bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium" onClick={saveThread}>
                    Сохранить тему
                  </button>
                  <Link
                    to={`/forum/topic/${encodeURIComponent(threadDetail.id)}`}
                    className="inline-flex items-center border border-slate-300 px-4 py-2 rounded-lg text-sm"
                  >
                    Открыть тему на сайте
                  </Link>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2 text-sm uppercase tracking-wide text-slate-600">
                  Сообщения в теме ({threadDetail.posts.length})
                </h3>
                <div className="space-y-4">
                  {threadDetail.posts.map((p, idx) => (
                    <div key={p.id} className="border border-slate-200 rounded-lg p-3 bg-slate-50/80">
                      <div className="flex flex-wrap justify-between gap-2 text-xs text-slate-600 mb-2">
                        <span>
                          Сообщение #{idx + 1} · было: {p.author.email}
                        </span>
                        <span>{new Date(p.createdAt).toLocaleString("ru-RU")}</span>
                      </div>
                      <label className="text-[11px] text-slate-500">Автор поста (user id, необязательно менять)</label>
                      <input
                        className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-mono mb-2 bg-white"
                        value={postAuthorEdits[p.id] ?? ""}
                        onChange={(e) => setPostAuthorEdits((m) => ({ ...m, [p.id]: e.target.value }))}
                      />
                      <textarea
                        className="w-full border border-slate-200 rounded-lg px-2 py-2 text-sm font-mono min-h-[120px] bg-white"
                        value={postEdits[p.id] ?? ""}
                        onChange={(e) => setPostEdits((m) => ({ ...m, [p.id]: e.target.value }))}
                      />
                      <div className="flex gap-2 mt-2 flex-wrap">
                        <button type="button" className="text-sm bg-emerald-700 text-white px-3 py-1.5 rounded-lg" onClick={() => savePost(p.id)}>
                          Сохранить пост
                        </button>
                        <button type="button" className="text-sm text-red-600 font-medium hover:underline" onClick={() => delPost(p.id)}>
                          Удалить пост
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button type="button" className="text-red-700 font-medium text-sm hover:underline" onClick={() => delThread(threadDetail.id)}>
                Удалить всю тему
              </button>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
