import { MessageCircle, Paperclip, Pencil, Send, CornerDownLeft, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import {
  apiArticleComments,
  apiAttachmentsPolicy,
  apiDeleteArticleComment,
  apiPatchArticleComment,
  apiPostArticleComment,
  apiUploadMessageAttachment,
  type ArticleCommentDto,
  type AttachmentsPolicyDto,
} from "../../lib/api";
import ForumRenderedBody from "./ForumRenderedBody";
import CommentAttachmentsGallery from "./CommentAttachmentsGallery";
import { useAuth } from "../contexts/AuthContext";
import ReportAbuseTrigger from "./ReportAbuseModal";
import UserAvatar from "./UserAvatar";

type Props = {
  articleId: string;
};

export default function ArticleCommentsSection({ articleId }: Props) {
  const { isAuthenticated, authReady, user } = useAuth();
  const [comments, setComments] = useState<ArticleCommentDto[] | null>(null);
  const [loadErr, setLoadErr] = useState("");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [postErr, setPostErr] = useState("");
  const [replyTo, setReplyTo] = useState<{ userId: string; name: string } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [commentAttachUrls, setCommentAttachUrls] = useState<string[]>([]);
  const [commentUploading, setCommentUploading] = useState(false);
  const [attachPolicy, setAttachPolicy] = useState<AttachmentsPolicyDto | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editUrls, setEditUrls] = useState<string[]>([]);
  const [editBusy, setEditBusy] = useState(false);

  const load = useCallback(() => {
    setLoadErr("");
    apiArticleComments(articleId)
      .then(setComments)
      .catch((e: unknown) => setLoadErr(e instanceof Error ? e.message : "Не удалось загрузить комментарии"));
  }, [articleId]);

  useEffect(() => {
    load();
  }, [load]);

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

  const startEdit = (c: ArticleCommentDto) => {
    setEditingId(c.id);
    setEditText(c.body ?? "");
    setEditUrls([...(c.attachmentUrls ?? [])]);
    setPostErr("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText("");
    setEditUrls([]);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const t = editText.trim();
    if (!t && editUrls.length === 0) {
      setPostErr("Комментарий не может быть пустым");
      return;
    }
    setEditBusy(true);
    setPostErr("");
    try {
      const row = await apiPatchArticleComment(editingId, { body: t, attachmentUrls: editUrls });
      setComments((prev) => (prev ?? []).map((x) => (x.id === row.id ? row : x)));
      cancelEdit();
    } catch (e: unknown) {
      setPostErr(e instanceof Error ? e.message : "Ошибка сохранения");
    } finally {
      setEditBusy(false);
    }
  };

  const removeComment = async (id: string) => {
    if (!confirm("Удалить комментарий и вложения?")) return;
    setPostErr("");
    try {
      await apiDeleteArticleComment(id);
      setComments((prev) => (prev ?? []).filter((x) => x.id !== id));
      if (editingId === id) cancelEdit();
    } catch (e: unknown) {
      setPostErr(e instanceof Error ? e.message : "Ошибка удаления");
    }
  };

  const submit = async () => {
    const b = text.trim();
    if (!b && commentAttachUrls.length === 0) return;
    setPostErr("");
    setSending(true);
    try {
      const row = await apiPostArticleComment(articleId, {
        body: b,
        ...(commentAttachUrls.length > 0 ? { attachmentUrls: commentAttachUrls } : {}),
      });
      setText("");
      setCommentAttachUrls([]);
      setReplyTo(null);
      setComments((prev) => [...(prev ?? []), row]);
    } catch (e: unknown) {
      setPostErr(e instanceof Error ? e.message : "Ошибка отправки");
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="mt-10 pt-8 border-t border-gray-200 space-y-6">
      <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
        <MessageCircle className="w-6 h-6 text-emerald-600" />
        Комментарии
        {comments != null ? (
          <span className="text-sm font-normal text-gray-500">({comments.length})</span>
        ) : null}
      </h2>

      {loadErr && <p className="text-sm text-red-600">{loadErr}</p>}

      {!loadErr && comments && comments.length === 0 && (
        <p className="text-gray-600 text-sm">Пока нет комментариев — будьте первым.</p>
      )}

      {comments && comments.length > 0 && (
        <ul className="space-y-4">
          {comments.map((c) => {
            const name = c.author.profile?.displayName?.trim() || c.author.email;
            const highlighted = replyTo?.userId === c.author.id;
            const isMine = Boolean(user && user.id === c.author.id);
            const urls = c.attachmentUrls ?? [];
            const isEditing = editingId === c.id;

            return (
              <li
                key={c.id}
                className={`rounded-xl border bg-gray-50/80 p-4 flex gap-3 ${
                  highlighted ? "border-amber-200 ring-2 ring-amber-100" : "border-gray-100"
                }`}
              >
                <Link to={`/users/${encodeURIComponent(c.author.id)}`} className="shrink-0 inline-flex rounded-full">
                  <UserAvatar
                    avatarUrl={c.author.profile?.avatarUrl}
                    label={name}
                    className="w-10 h-10"
                    ringClassName="ring-2 ring-emerald-100"
                    moderation={c.authorModeration ?? undefined}
                  />
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                    <Link to={`/users/${encodeURIComponent(c.author.id)}`} className="font-semibold text-gray-900">
                      {name}
                    </Link>
                    <span className="text-gray-400 text-xs">
                      {new Date(c.createdAt).toLocaleString("ru-RU", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                      {c.updatedAt && c.updatedAt !== c.createdAt ? (
                        <span className="ml-1 text-gray-400">(изм.)</span>
                      ) : null}
                    </span>
                    {isMine && !isEditing ? (
                      <div className="flex items-center gap-2 ml-auto sm:ml-0">
                        <button
                          type="button"
                          onClick={() => startEdit(c)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-emerald-800"
                        >
                          <Pencil className="w-3.5 h-3.5" aria-hidden />
                          Изменить
                        </button>
                        <button
                          type="button"
                          onClick={() => void removeComment(c.id)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden />
                          Удалить
                        </button>
                      </div>
                    ) : null}
                    {user && user.id !== c.author.id ? (
                      <ReportAbuseTrigger
                        modalLabel={`Комментарий к статье (id ${articleId.slice(0, 8)}…)`}
                        payload={{ targetType: "ARTICLE_COMMENT", articleCommentId: c.id }}
                        className="text-[11px] font-medium text-gray-400 hover:text-red-700 ml-auto sm:ml-0"
                      >
                        Жалоба
                      </ReportAbuseTrigger>
                    ) : null}
                    {authReady && isAuthenticated && user && user.id !== c.author.id ? (
                      <button
                        type="button"
                        onClick={() => {
                          setReplyTo({ userId: c.author.id, name });
                          setText((prev) => {
                            const mention = `@${name}, `;
                            const t = prev.trimStart();
                            if (t.toLowerCase().startsWith(`@${name}`.toLowerCase())) return prev;
                            return prev ? `${mention}${prev}` : mention;
                          });
                          requestAnimationFrame(() => textareaRef.current?.focus());
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 ml-auto sm:ml-0"
                        title="Ответить"
                      >
                        <CornerDownLeft className="w-3.5 h-3.5" aria-hidden />
                        Ответить
                      </button>
                    ) : null}
                  </div>

                  {isEditing ? (
                    <div className="mt-2 space-y-2">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={4}
                        maxLength={8000}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                      {attachPolicy?.messagesEnabled ? (
                        <div className="flex flex-wrap items-center gap-2">
                          {editUrls.map((url) => (
                            <span
                              key={url}
                              className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-white px-2 py-1 text-xs text-emerald-900 max-w-[200px]"
                            >
                              <Paperclip className="w-3.5 h-3.5 shrink-0" aria-hidden />
                              <span className="truncate">{url.split("/").pop()}</span>
                              <button
                                type="button"
                                className="shrink-0 text-gray-500 hover:text-red-600"
                                aria-label="Убрать файл"
                                onClick={() => setEditUrls((p) => p.filter((u) => u !== url))}
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </span>
                          ))}
                          {editUrls.length < (attachPolicy?.maxFilesPerComment ?? 5) && (
                            <label className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-50">
                              <Paperclip className="w-3.5 h-3.5" />
                              Файл
                              <input
                                type="file"
                                className="sr-only"
                                accept={attachPolicy.allowedMimeTypes.join(",")}
                                disabled={commentUploading || editBusy}
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  e.target.value = "";
                                  if (!f) return;
                                  setCommentUploading(true);
                                  void (async () => {
                                    try {
                                      const { url } = await apiUploadMessageAttachment(f);
                                      setEditUrls((p) =>
                                        p.length >= (attachPolicy?.maxFilesPerComment ?? 5) ? p : [...p, url],
                                      );
                                    } catch (err) {
                                      setPostErr(err instanceof Error ? err.message : "Ошибка загрузки");
                                    } finally {
                                      setCommentUploading(false);
                                    }
                                  })();
                                }}
                              />
                            </label>
                          )}
                        </div>
                      ) : null}
                      {editUrls.length > 0 ? <CommentAttachmentsGallery urls={editUrls} /> : null}
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={editBusy}
                          onClick={() => void saveEdit()}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50"
                        >
                          Сохранить
                        </button>
                        <button
                          type="button"
                          disabled={editBusy}
                          onClick={cancelEdit}
                          className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Отмена
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <ForumRenderedBody text={c.body} originalLang="ru" className="text-gray-800 text-sm mt-1" />
                      {urls.length > 0 ? <CommentAttachmentsGallery urls={urls} /> : null}
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 space-y-3">
        {!authReady ? (
          <p className="text-sm text-gray-600">Загрузка сессии…</p>
        ) : !isAuthenticated ? (
          <p className="text-sm text-gray-700">
            <Link className="text-emerald-700 font-medium hover:underline" to="/login">
              Войдите
            </Link>
            , чтобы обсуждать статью с коллегами.
          </p>
        ) : (
          <>
            {replyTo ? (
              <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wide text-amber-700/90">Ответ пользователю</p>
                  <p className="text-sm font-semibold text-amber-900 truncate">{replyTo.name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setReplyTo(null)}
                  className="shrink-0 h-9 w-9 inline-flex items-center justify-center rounded-lg border border-amber-200 bg-white text-amber-800 hover:bg-amber-100"
                  title="Сбросить ответ"
                  aria-label="Сбросить ответ"
                >
                  <X className="w-4 h-4" aria-hidden />
                </button>
              </div>
            ) : null}
            <label className="block text-sm font-medium text-gray-800" htmlFor="article-comment">
              Ваш комментарий {user && !user.emailVerified ? "(нужен подтверждённый email)" : ""}
            </label>
            <textarea
              id="article-comment"
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              maxLength={8000}
              placeholder="Корректно и по делу: клинический опыт, ссылки на источники, вопросы автору…"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
            {attachPolicy === null ? (
              <p className="text-xs text-gray-500">Загрузка настроек вложений…</p>
            ) : attachPolicy.messagesEnabled ? (
              <div className="space-y-2">
                <p className="text-xs text-gray-600">
                  Вложения: до {attachPolicy.maxFilesPerComment} файлов, до {attachPolicy.maxMb} МБ (PDF, изображения,
                  TXT, DOCX). Пустой текст допустим, если есть файл.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {commentAttachUrls.map((url) => (
                    <span
                      key={url}
                      className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-white px-2 py-1 text-xs text-emerald-900 max-w-[200px]"
                    >
                      <Paperclip className="w-3.5 h-3.5 shrink-0" aria-hidden />
                      <span className="truncate">{url.split("/").pop()}</span>
                      <button
                        type="button"
                        className="shrink-0 text-gray-500 hover:text-red-600"
                        aria-label="Удалить вложение"
                        onClick={() => setCommentAttachUrls((p) => p.filter((u) => u !== url))}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                  {commentAttachUrls.length < attachPolicy.maxFilesPerComment && (
                    <label className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-50">
                      <Paperclip className="w-3.5 h-3.5" />
                      Прикрепить файл
                      <input
                        type="file"
                        className="sr-only"
                        accept={attachPolicy.allowedMimeTypes.join(",")}
                        disabled={commentUploading || sending}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          e.target.value = "";
                          if (!f) return;
                          setCommentUploading(true);
                          void (async () => {
                            try {
                              const { url } = await apiUploadMessageAttachment(f);
                              setCommentAttachUrls((p) =>
                                p.length >= (attachPolicy?.maxFilesPerComment ?? 5) ? p : [...p, url],
                              );
                            } catch (err) {
                              setPostErr(err instanceof Error ? err.message : "Ошибка загрузки");
                            } finally {
                              setCommentUploading(false);
                            }
                          })();
                        }}
                      />
                    </label>
                  )}
                </div>
                {commentAttachUrls.length > 0 ? (
                  <div className="pt-1">
                    <CommentAttachmentsGallery urls={commentAttachUrls} />
                  </div>
                ) : null}
                {commentUploading ? <p className="text-xs text-gray-500">Загрузка файла…</p> : null}
              </div>
            ) : (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1.5">
                Загрузка вложений отключена администратором (ключ <code className="font-mono">uploads.messages.enabled</code>
                ).
              </p>
            )}
            {postErr && <p className="text-sm text-red-600">{postErr}</p>}
            <button
              type="button"
              disabled={
                sending ||
                (!text.trim() && commentAttachUrls.length === 0) ||
                !!(user && !user.emailVerified)
              }
              onClick={() => void submit()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {sending ? "Отправка…" : "Отправить"}
            </button>
          </>
        )}
      </div>
    </section>
  );
}
