import { ArrowLeft, Paperclip, Send, X } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { useEffect, useState } from "react";
import {
  apiArticleCategories,
  apiArticleSubmit,
  apiAttachmentsPolicy,
  apiUploadMessageAttachment,
  type ArticleCategoryDto,
  type AttachmentsPolicyDto,
} from "../../lib/api";
import { useAuth } from "../contexts/AuthContext";
import CommentAttachmentsGallery from "../components/CommentAttachmentsGallery";

export default function ArticleSubmit() {
  const navigate = useNavigate();
  const { user, authReady, isAuthenticated } = useAuth();
  const [cats, setCats] = useState<ArticleCategoryDto[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [body, setBody] = useState("");
  const [attachUrls, setAttachUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [attachPolicy, setAttachPolicy] = useState<AttachmentsPolicyDto | null>(null);
  const [err, setErr] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    apiArticleCategories().then(setCats).catch(() => setCats([]));
  }, []);

  useEffect(() => {
    apiAttachmentsPolicy()
      .then(setAttachPolicy)
      .catch(() =>
        setAttachPolicy({
          messagesEnabled: true,
          maxMb: 12,
          maxFilesPerComment: 5,
          forumMaxAttachmentLines: 10,
          allowedMimeTypes: [
            "application/pdf",
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
            "text/plain",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          ],
        }),
      );
  }, []);

  const role = user?.role?.toUpperCase();
  const canSubmit = role === "SPECIALIST" || role === "MODERATOR";

  const submit = async () => {
    setErr("");
    if (!categoryId || !title.trim() || !excerpt.trim() || !body.trim()) {
      setErr("Заполните категорию, заголовок, краткое описание и текст.");
      return;
    }
    setSending(true);
    try {
      const created = await apiArticleSubmit({
        categoryId,
        title: title.trim(),
        excerpt: excerpt.trim(),
        body: body.trim(),
        ...(attachUrls.length > 0 ? { attachmentUrls: attachUrls } : {}),
      });
      navigate(`/articles/${encodeURIComponent(created.id)}`, { replace: true });
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Не удалось отправить");
    } finally {
      setSending(false);
    }
  };

  if (!authReady) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center text-gray-600 border border-gray-200 rounded-xl bg-white">
        Загрузка…
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-lg mx-auto space-y-4 p-6">
        <h1 className="text-xl font-bold">Написать статью</h1>
        <p className="text-gray-600 text-sm">
          <Link className="text-emerald-700 font-medium hover:underline" to="/login">
            Войдите
          </Link>
          , чтобы отправить материал на модерацию.
        </p>
        <Link to="/articles" className="text-emerald-700 text-sm hover:underline inline-flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> К списку статей
        </Link>
      </div>
    );
  }

  if (!canSubmit) {
    return (
      <div className="max-w-lg mx-auto space-y-4 p-6">
        <h1 className="text-xl font-bold">Написать статью</h1>
        <p className="text-gray-600 text-sm">
          Публикация статей в каталог доступна специалистам и модераторам. Обратитесь к администратору для смены роли
          или воспользуйтесь разделом форума.
        </p>
        <Link to="/articles" className="text-emerald-700 text-sm hover:underline inline-flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Назад
        </Link>
      </div>
    );
  }

  if (user && !user.emailVerified) {
    return (
      <div className="max-w-lg mx-auto space-y-4 p-6">
        <h1 className="text-xl font-bold">Подтвердите email</h1>
        <p className="text-gray-600 text-sm">После подтверждения адреса вы сможете отправить статью на модерацию.</p>
        <Link to="/verify-email" className="text-emerald-700 font-medium hover:underline">
          Страница подтверждения
        </Link>
      </div>
    );
  }

  const maxArt = 15;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <Link
        to="/articles"
        className="inline-flex items-center gap-2 text-sm text-emerald-700 hover:text-emerald-800 font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        К списку статей
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Новая статья</h1>
        <p className="text-gray-600 text-sm mt-1">
          Материал уйдёт администратору на проверку и появится в каталоге только после одобрения.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6 space-y-4 shadow-sm">
        <label className="block text-sm font-medium text-gray-800">Категория</label>
        <select
          className="w-full border rounded-lg px-3 py-2 text-sm"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          <option value="">Выберите категорию</option>
          {cats.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <label className="block text-sm font-medium text-gray-800">Заголовок</label>
        <input
          className="w-full border rounded-lg px-3 py-2 text-sm"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
        />

        <label className="block text-sm font-medium text-gray-800">Краткое описание</label>
        <input
          className="w-full border rounded-lg px-3 py-2 text-sm"
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          maxLength={500}
        />

        <label className="block text-sm font-medium text-gray-800">Текст (markdown)</label>
        <textarea
          className="w-full border rounded-lg px-3 py-2 text-sm font-mono min-h-[220px]"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={100000}
        />

        {attachPolicy?.messagesEnabled ? (
          <div className="space-y-2">
            <p className="text-xs text-gray-600">
              Вложения: до {maxArt} файлов (PDF, изображения, TXT, DOCX). Превью — после публикации на странице статьи.
            </p>
            <div className="flex flex-wrap gap-2">
              {attachUrls.map((url) => (
                <span
                  key={url}
                  className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50/80 px-2 py-1 text-xs text-emerald-900 max-w-[220px]"
                >
                  <Paperclip className="w-3.5 h-3.5 shrink-0" aria-hidden />
                  <span className="truncate">{url.split("/").pop()}</span>
                  <button
                    type="button"
                    className="shrink-0 text-gray-500 hover:text-red-600"
                    aria-label="Удалить файл"
                    onClick={() => setAttachUrls((p) => p.filter((u) => u !== url))}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
              {attachUrls.length < maxArt && (
                <label className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-50">
                  <Paperclip className="w-3.5 h-3.5" />
                  Прикрепить файл
                  <input
                    type="file"
                    className="sr-only"
                    accept={attachPolicy.allowedMimeTypes.join(",")}
                    disabled={uploading || sending}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (!f) return;
                      setUploading(true);
                      void (async () => {
                        try {
                          const { url } = await apiUploadMessageAttachment(f);
                          setAttachUrls((p) => (p.length >= maxArt ? p : [...p, url]));
                        } catch (ex) {
                          setErr(ex instanceof Error ? ex.message : "Ошибка загрузки");
                        } finally {
                          setUploading(false);
                        }
                      })();
                    }}
                  />
                </label>
              )}
            </div>
            {attachUrls.length > 0 ? (
              <div className="pt-2">
                <p className="text-xs text-gray-500 mb-2">Предпросмотр</p>
                <CommentAttachmentsGallery urls={attachUrls} />
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1.5">
            Загрузка файлов отключена администратором.
          </p>
        )}

        {uploading ? <p className="text-xs text-gray-500">Загрузка файла…</p> : null}
        {err ? <p className="text-sm text-red-600">{err}</p> : null}

        <button
          type="button"
          disabled={sending}
          onClick={() => void submit()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
          {sending ? "Отправка…" : "Отправить на модерацию"}
        </button>
      </div>
    </div>
  );
}
