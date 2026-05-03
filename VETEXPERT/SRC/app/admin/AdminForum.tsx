import { useCallback, useEffect, useState, type ReactNode } from "react";
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

type Cat = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  iconEmoji: string;
  sortOrder: number;
  _count?: { threads: number };
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
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60" role="dialog">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
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

export default function AdminForum() {
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

  const loadCats = useCallback(() => {
    apiFetch<Cat[]>("/api/admin/forum/categories")
      .then((rows) => {
        const r = Array.isArray(rows) ? rows : [];
        r.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name, "ru"));
        setCats(r);
      })
      .catch((e) => setErr(String(e.message)));
  }, []);

  const loadThreads = useCallback(() => {
    const params = new URLSearchParams({ page: "1", pageSize: "50" });
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
      t.posts.forEach((p) => {
        pe[p.id] = p.body;
      });
      setPostEdits(pe);
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
    if (!confirm("Удалить категорию?")) return;
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
    try {
      await apiFetch(`/api/admin/forum/posts/${postId}`, {
        method: "PATCH",
        json: { body: postEdits[postId] ?? "" },
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

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold mb-2 text-slate-900">Форум</h1>
        <p className="text-slate-600 text-sm mb-4">
          Категории: эмодзи, порядок <code className="text-xs bg-slate-100 px-1 rounded">sortOrder</code> и{" "}
          <code className="text-xs bg-slate-100 px-1 rounded">slug</code>. Этот же список и порядок отображаются на
          публичной странице «Форум» — данные из одной таблицы. Темы и посты: правка текста, перенос в другой раздел,
          смена автора.
        </p>
        {err && <p className="text-red-600 mb-2">{err}</p>}

        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4 space-y-3">
          <h2 className="font-semibold text-slate-800">Новая категория</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <input
              className="border rounded-lg px-3 py-2 text-sm"
              placeholder="Название"
              value={newCat.name}
              onChange={(e) => setNewCat((c) => ({ ...c, name: e.target.value }))}
            />
            <input
              className="border rounded-lg px-3 py-2 text-sm font-mono"
              placeholder="slug (латиница)"
              value={newCat.slug}
              onChange={(e) => setNewCat((c) => ({ ...c, slug: e.target.value }))}
            />
            <input
              type="number"
              className="border rounded-lg px-3 py-2 text-sm"
              placeholder="Порядок"
              value={newCat.sortOrder}
              onChange={(e) => setNewCat((c) => ({ ...c, sortOrder: parseInt(e.target.value, 10) || 0 }))}
            />
            <div className="flex items-center gap-2">
              <span className="text-2xl shrink-0" title="Иконка">
                {newCat.iconEmoji}
              </span>
              <input
                className="border rounded-lg px-2 py-2 text-sm flex-1 font-mono"
                maxLength={16}
                placeholder="эмодзи"
                value={newCat.iconEmoji}
                onChange={(e) => setNewCat((c) => ({ ...c, iconEmoji: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Быстрый выбор иконки</p>
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
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm"
            placeholder="Описание (необязательно)"
            value={newCat.description}
            onChange={(e) => setNewCat((c) => ({ ...c, description: e.target.value }))}
          />
          <button type="button" className="bg-emerald-600 text-white rounded-lg px-4 py-2 text-sm font-medium" onClick={addCategory}>
            Добавить категорию
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left p-3 w-14">Иконка</th>
                <th className="text-left p-3">Название</th>
                <th className="text-left p-3">slug</th>
                <th className="text-left p-3">Порядок</th>
                <th className="text-left p-3">Тем</th>
                <th className="text-right p-3">Действия</th>
              </tr>
            </thead>
            <tbody>
              {cats.map((c) => (
                <tr key={c.id} className="border-t border-slate-100">
                  <td className="p-3 text-2xl">{c.iconEmoji || "💬"}</td>
                  <td className="p-3 font-medium">{c.name}</td>
                  <td className="p-3 font-mono text-xs">{c.slug}</td>
                  <td className="p-3">{c.sortOrder ?? 0}</td>
                  <td className="p-3">{c._count?.threads ?? "—"}</td>
                  <td className="p-3 text-right space-x-2 whitespace-nowrap">
                    <button type="button" className="text-emerald-700 underline text-xs" onClick={() => openCatEdit(c)}>
                      Изменить
                    </button>
                    <button type="button" className="text-red-600 underline text-xs" onClick={() => delCat(c.id)}>
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold mb-2 text-slate-900">Темы</h2>
        <div className="flex gap-2 mb-4 flex-wrap">
          <input
            className="border rounded-lg px-3 py-2 flex-1 min-w-[200px]"
            placeholder="Поиск (от 2 символов)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button type="button" className="bg-slate-200 px-4 py-2 rounded-lg text-sm" onClick={loadThreads}>
            Обновить
          </button>
        </div>
        {!threads ? (
          <p>Загрузка…</p>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left p-3">Заголовок</th>
                  <th className="text-left p-3">Категория</th>
                  <th className="text-left p-3">Автор</th>
                  <th className="text-left p-3">Постов</th>
                  <th className="text-right p-3">Действия</th>
                </tr>
              </thead>
              <tbody>
                {threads.items.map((t) => (
                  <tr key={t.id} className="border-t">
                    <td className="p-3 max-w-xs truncate font-medium">{t.title}</td>
                    <td className="p-3">{t.category.name}</td>
                    <td className="p-3 font-mono text-xs">{t.author.email}</td>
                    <td className="p-3">{t._count?.posts ?? "—"}</td>
                    <td className="p-3 text-right space-x-2 whitespace-nowrap">
                      <button type="button" className="text-emerald-700 underline text-xs" onClick={() => openThreadModal(t.id)}>
                        Редактор
                      </button>
                      <button type="button" className="text-red-600 underline text-xs" onClick={() => delThread(t.id)}>
                        Удалить
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="p-3 text-sm text-slate-600">Всего тем (с учётом поиска): {threads.total}</p>
          </div>
        )}
      </div>

      {editCat && (
        <Modal title="Категория форума" onClose={() => setEditCat(null)}>
          <div className="space-y-3">
            <label className="block text-xs text-slate-500">Название</label>
            <input
              className="w-full border rounded-lg px-3 py-2"
              value={editCatForm.name}
              onChange={(e) => setEditCatForm((f) => ({ ...f, name: e.target.value }))}
            />
            <label className="block text-xs text-slate-500">slug</label>
            <input
              className="w-full border rounded-lg px-3 py-2 font-mono text-sm"
              value={editCatForm.slug}
              onChange={(e) => setEditCatForm((f) => ({ ...f, slug: e.target.value }))}
            />
            <label className="block text-xs text-slate-500">Порядок (sortOrder)</label>
            <input
              type="number"
              className="w-full border rounded-lg px-3 py-2"
              value={editCatForm.sortOrder}
              onChange={(e) => setEditCatForm((f) => ({ ...f, sortOrder: parseInt(e.target.value, 10) || 0 }))}
            />
            <label className="block text-xs text-slate-500">Иконка (эмодзи)</label>
            <div className="flex gap-2 items-center">
              <span className="text-3xl">{editCatForm.iconEmoji}</span>
              <input
                className="flex-1 border rounded-lg px-3 py-2 font-mono"
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
            <label className="block text-xs text-slate-500">Описание</label>
            <textarea
              className="w-full border rounded-lg px-3 py-2 min-h-[80px]"
              value={editCatForm.description}
              onChange={(e) => setEditCatForm((f) => ({ ...f, description: e.target.value }))}
            />
            <div className="flex gap-2 pt-2">
              <button type="button" className="bg-emerald-600 text-white px-4 py-2 rounded-lg" onClick={saveCategoryEdit}>
                Сохранить
              </button>
              <button type="button" className="border border-slate-300 px-4 py-2 rounded-lg" onClick={() => setEditCat(null)}>
                Отмена
              </button>
            </div>
          </div>
        </Modal>
      )}

      {threadModalId && (
        <Modal title={threadDetail ? threadDetail.title : "Тема"} onClose={() => setThreadModalId(null)}>
          {!threadDetail ? (
            <p>Загрузка…</p>
          ) : (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs text-slate-500">Заголовок</label>
                <input
                  className="w-full border rounded-lg px-3 py-2"
                  value={threadForm.title}
                  onChange={(e) => setThreadForm((f) => ({ ...f, title: e.target.value }))}
                />
                <label className="text-xs text-slate-500">Теги</label>
                <input
                  className="w-full border rounded-lg px-3 py-2"
                  value={threadForm.tags}
                  onChange={(e) => setThreadForm((f) => ({ ...f, tags: e.target.value }))}
                />
                <label className="text-xs text-slate-500">Категория</label>
                <select
                  className="w-full border rounded-lg px-3 py-2"
                  value={threadForm.categoryId}
                  onChange={(e) => setThreadForm((f) => ({ ...f, categoryId: e.target.value }))}
                >
                  {cats.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.iconEmoji} {c.name}
                    </option>
                  ))}
                </select>
                <label className="text-xs text-slate-500">Автор темы (user id)</label>
                <input
                  className="w-full border rounded-lg px-3 py-2 font-mono text-xs"
                  value={threadForm.authorId}
                  onChange={(e) => setThreadForm((f) => ({ ...f, authorId: e.target.value }))}
                />
                <button type="button" className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm" onClick={saveThread}>
                  Сохранить тему
                </button>
              </div>

              <div>
                <h3 className="font-semibold text-slate-800 mb-2">Сообщения ({threadDetail.posts.length})</h3>
                <div className="space-y-4">
                  {threadDetail.posts.map((p, idx) => (
                    <div key={p.id} className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                      <div className="flex justify-between text-xs text-slate-600 mb-1">
                        <span>
                          #{idx + 1} · {p.author.email}
                        </span>
                        <span>{new Date(p.createdAt).toLocaleString("ru-RU")}</span>
                      </div>
                      <textarea
                        className="w-full border rounded-lg px-2 py-2 text-sm font-mono min-h-[100px] bg-white"
                        value={postEdits[p.id] ?? ""}
                        onChange={(e) => setPostEdits((m) => ({ ...m, [p.id]: e.target.value }))}
                      />
                      <div className="flex gap-2 mt-2">
                        <button type="button" className="text-sm bg-emerald-600 text-white px-3 py-1 rounded" onClick={() => savePost(p.id)}>
                          Сохранить пост
                        </button>
                        <button type="button" className="text-sm text-red-600 underline" onClick={() => delPost(p.id)}>
                          Удалить пост
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button type="button" className="text-red-700 underline text-sm" onClick={() => delThread(threadDetail.id)}>
                Удалить всю тему
              </button>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
