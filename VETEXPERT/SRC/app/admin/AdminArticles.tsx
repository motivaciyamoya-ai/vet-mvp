import { useCallback, useEffect, useState, type ReactNode } from "react";
import { apiFetch } from "../../lib/api";

const ART_EMOJI = ["📄", "💊", "🔬", "🐾", "📰", "⚕️", "🧬", "❤️", "🦷", "🌿"];

type ACat = {
  id: string;
  name: string;
  slug: string;
  iconEmoji: string;
  sortOrder: number;
  _count?: { articles: number };
};
type Article = {
  id: string;
  title: string;
  excerpt: string;
  published: boolean;
  createdAt: string;
  category: { name: string };
  author: {
    email: string;
    profile?: { displayName?: string | null } | null;
  };
};

function CatEditModal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold text-lg">{title}</h2>
          <button type="button" className="text-slate-500 text-2xl leading-none px-2" onClick={onClose}>
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function AdminArticles() {
  const [cats, setCats] = useState<ACat[]>([]);
  const [articles, setArticles] = useState<{ items: Article[]; total: number } | null>(null);
  const [newCat, setNewCat] = useState({ name: "", slug: "", iconEmoji: "📄", sortOrder: 0 });
  const [editCat, setEditCat] = useState<ACat | null>(null);
  const [editCatForm, setEditCatForm] = useState({ name: "", slug: "", iconEmoji: "📄", sortOrder: 0 });
  const [newArt, setNewArt] = useState({
    authorId: "",
    categoryId: "",
    title: "",
    excerpt: "",
    body: "",
    published: true,
  });
  const [err, setErr] = useState("");

  const loadCats = useCallback(() => {
    apiFetch<ACat[]>("/api/admin/articles/categories").then(setCats).catch((e) => setErr(String(e.message)));
  }, []);

  const loadArticles = useCallback(() => {
    apiFetch<{ items: Article[]; total: number }>("/api/admin/articles?page=1&pageSize=100")
      .then(setArticles)
      .catch((e) => setErr(String(e.message)));
  }, []);

  useEffect(() => {
    loadCats();
    loadArticles();
  }, [loadCats, loadArticles]);

  const addCat = async () => {
    try {
      await apiFetch("/api/admin/articles/categories", {
        method: "POST",
        json: {
          name: newCat.name,
          slug: newCat.slug,
          iconEmoji: newCat.iconEmoji || undefined,
          sortOrder: Number(newCat.sortOrder) || 0,
        },
      });
      setNewCat({ name: "", slug: "", iconEmoji: "📄", sortOrder: 0 });
      loadCats();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Ошибка");
    }
  };

  const delCat = async (id: string) => {
    if (!confirm("Удалить категорию статей?")) return;
    try {
      await apiFetch(`/api/admin/articles/categories/${id}`, { method: "DELETE" });
      loadCats();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Ошибка");
    }
  };

  const openCatEdit = (c: ACat) => {
    setEditCat(c);
    setEditCatForm({
      name: c.name,
      slug: c.slug,
      iconEmoji: c.iconEmoji || "📄",
      sortOrder: c.sortOrder ?? 0,
    });
  };

  const saveCatEdit = async () => {
    if (!editCat) return;
    try {
      await apiFetch(`/api/admin/articles/categories/${editCat.id}`, {
        method: "PATCH",
        json: {
          name: editCatForm.name,
          slug: editCatForm.slug,
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

  const createArticle = async () => {
    try {
      await apiFetch("/api/admin/articles", {
        method: "POST",
        json: {
          ...newArt,
          published: newArt.published,
        },
      });
      setNewArt({
        authorId: "",
        categoryId: "",
        title: "",
        excerpt: "",
        body: "",
        published: true,
      });
      loadArticles();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Ошибка");
    }
  };

  const togglePublish = async (id: string, published: boolean) => {
    try {
      await apiFetch(`/api/admin/articles/${id}`, {
        method: "PATCH",
        json: { published: !published },
      });
      loadArticles();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Ошибка");
    }
  };

  const delArticle = async (id: string) => {
    if (!confirm("Удалить статью?")) return;
    try {
      await apiFetch(`/api/admin/articles/${id}`, { method: "DELETE" });
      loadArticles();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Ошибка");
    }
  };

  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-bold">Статьи</h1>
      {err && <p className="text-red-600">{err}</p>}

      <section>
        <h2 className="text-lg font-semibold mb-2">Категории</h2>
        <div className="bg-white rounded-xl border p-4 mb-4 space-y-2 max-w-3xl">
          <div className="flex flex-wrap gap-2">
            <input
              className="border rounded px-2 py-1 flex-1 min-w-[120px]"
              placeholder="Название"
              value={newCat.name}
              onChange={(e) => setNewCat((c) => ({ ...c, name: e.target.value }))}
            />
            <input
              className="border rounded px-2 py-1 flex-1 min-w-[100px] font-mono text-xs"
              placeholder="slug"
              value={newCat.slug}
              onChange={(e) => setNewCat((c) => ({ ...c, slug: e.target.value }))}
            />
            <input
              type="number"
              className="border rounded px-2 py-1 w-24"
              placeholder="Порядок"
              value={newCat.sortOrder}
              onChange={(e) => setNewCat((c) => ({ ...c, sortOrder: parseInt(e.target.value, 10) || 0 }))}
            />
            <input
              className="border rounded px-2 py-1 w-20 text-center text-lg"
              maxLength={16}
              title="Эмодзи"
              value={newCat.iconEmoji}
              onChange={(e) => setNewCat((c) => ({ ...c, iconEmoji: e.target.value }))}
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {ART_EMOJI.map((em) => (
              <button
                key={em}
                type="button"
                className={`text-lg p-1 rounded border ${newCat.iconEmoji === em ? "border-emerald-600 bg-emerald-50" : "border-slate-200"}`}
                onClick={() => setNewCat((c) => ({ ...c, iconEmoji: em }))}
              >
                {em}
              </button>
            ))}
          </div>
          <button type="button" className="bg-emerald-600 text-white px-4 py-1 rounded" onClick={addCat}>
            Добавить категорию
          </button>
        </div>
        <div className="bg-white rounded-xl border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left p-3 w-12"></th>
                <th className="text-left p-3">Название</th>
                <th className="text-left p-3">slug</th>
                <th className="text-left p-3">Порядок</th>
                <th className="text-left p-3">Статей</th>
                <th className="text-right p-3"></th>
              </tr>
            </thead>
            <tbody>
              {cats.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="p-3 text-xl">{c.iconEmoji || "📄"}</td>
                  <td className="p-3">{c.name}</td>
                  <td className="p-3 font-mono text-xs">{c.slug}</td>
                  <td className="p-3">{c.sortOrder ?? 0}</td>
                  <td className="p-3">{c._count?.articles ?? "—"}</td>
                  <td className="p-3 text-right space-x-2">
                    <button type="button" className="text-emerald-700 underline" onClick={() => openCatEdit(c)}>
                      Изменить
                    </button>
                    <button type="button" className="text-red-600 underline" onClick={() => delCat(c.id)}>
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {editCat && (
        <CatEditModal title="Категория статей" onClose={() => setEditCat(null)}>
          <div className="space-y-3">
            <label className="text-xs text-slate-500">Название</label>
            <input
              className="w-full border rounded-lg px-3 py-2"
              value={editCatForm.name}
              onChange={(e) => setEditCatForm((f) => ({ ...f, name: e.target.value }))}
            />
            <label className="text-xs text-slate-500">slug</label>
            <input
              className="w-full border rounded-lg px-3 py-2 font-mono text-sm"
              value={editCatForm.slug}
              onChange={(e) => setEditCatForm((f) => ({ ...f, slug: e.target.value }))}
            />
            <label className="text-xs text-slate-500">Порядок</label>
            <input
              type="number"
              className="w-full border rounded-lg px-3 py-2"
              value={editCatForm.sortOrder}
              onChange={(e) => setEditCatForm((f) => ({ ...f, sortOrder: parseInt(e.target.value, 10) || 0 }))}
            />
            <label className="text-xs text-slate-500">Иконка</label>
            <div className="flex flex-wrap gap-1">
              {ART_EMOJI.map((em) => (
                <button
                  key={em}
                  type="button"
                  className={`text-lg p-1 rounded border ${editCatForm.iconEmoji === em ? "border-emerald-600 bg-emerald-50" : "border-slate-200"}`}
                  onClick={() => setEditCatForm((f) => ({ ...f, iconEmoji: em }))}
                >
                  {em}
                </button>
              ))}
            </div>
            <input
              className="w-full border rounded-lg px-3 py-2 font-mono"
              maxLength={16}
              value={editCatForm.iconEmoji}
              onChange={(e) => setEditCatForm((f) => ({ ...f, iconEmoji: e.target.value }))}
            />
            <div className="flex gap-2 pt-2">
              <button type="button" className="bg-emerald-600 text-white px-4 py-2 rounded-lg" onClick={saveCatEdit}>
                Сохранить
              </button>
              <button type="button" className="border px-4 py-2 rounded-lg" onClick={() => setEditCat(null)}>
                Отмена
              </button>
            </div>
          </div>
        </CatEditModal>
      )}

      <section>
        <h2 className="text-lg font-semibold mb-2">Новая статья</h2>
        <div className="bg-white rounded-xl border p-4 grid gap-2 max-w-3xl">
          <input
            className="border rounded px-2 py-1 font-mono text-xs"
            placeholder="authorId (cuid пользователя)"
            value={newArt.authorId}
            onChange={(e) => setNewArt((a) => ({ ...a, authorId: e.target.value }))}
          />
          <select
            className="border rounded px-2 py-1"
            value={newArt.categoryId}
            onChange={(e) => setNewArt((a) => ({ ...a, categoryId: e.target.value }))}
          >
            <option value="">Категория</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            className="border rounded px-2 py-1"
            placeholder="Заголовок"
            value={newArt.title}
            onChange={(e) => setNewArt((a) => ({ ...a, title: e.target.value }))}
          />
          <input
            className="border rounded px-2 py-1"
            placeholder="Краткое описание"
            value={newArt.excerpt}
            onChange={(e) => setNewArt((a) => ({ ...a, excerpt: e.target.value }))}
          />
          <textarea
            className="border rounded px-2 py-1 min-h-[160px] font-mono text-xs"
            placeholder="Тело (markdown)"
            value={newArt.body}
            onChange={(e) => setNewArt((a) => ({ ...a, body: e.target.value }))}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={newArt.published}
              onChange={(e) => setNewArt((a) => ({ ...a, published: e.target.checked }))}
            />
            Опубликовано
          </label>
          <button type="button" className="bg-emerald-600 text-white py-2 rounded" onClick={createArticle}>
            Создать статью
          </button>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">Все статьи</h2>
        {!articles ? (
          <p>Загрузка…</p>
        ) : (
          <div className="bg-white rounded-xl border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-3">Заголовок</th>
                  <th className="text-left p-3">Категория</th>
                  <th className="text-left p-3">Автор</th>
                  <th className="text-left p-3">Статус</th>
                  <th className="text-right p-3"></th>
                </tr>
              </thead>
              <tbody>
                {articles.items.map((a) => (
                  <tr key={a.id} className="border-t">
                    <td className="p-3 max-w-xs truncate">{a.title}</td>
                    <td className="p-3">{a.category.name}</td>
                    <td className="p-3">
                      <div className="font-medium text-slate-900">
                        {a.author.profile?.displayName?.trim() || "—"}
                      </div>
                      <div className="font-mono text-xs text-slate-500">{a.author.email}</div>
                    </td>
                    <td className="p-3">{a.published ? "Да" : "Нет"}</td>
                    <td className="p-3 text-right space-x-2">
                      <button
                        type="button"
                        className="text-emerald-700 underline"
                        onClick={() => togglePublish(a.id, a.published)}
                      >
                        {a.published ? "Скрыть" : "Опубликовать"}
                      </button>
                      <button type="button" className="text-red-600 underline" onClick={() => delArticle(a.id)}>
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
