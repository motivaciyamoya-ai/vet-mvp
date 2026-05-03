import { MessageCircle, Send, CornerDownLeft, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { apiPostVetEventComment, apiVetEventComments, type VetEventCommentDto } from "../../lib/api";
import { useAuth } from "../contexts/AuthContext";
import ReportAbuseTrigger from "./ReportAbuseModal";
import UserAvatar from "./UserAvatar";

type Props = {
  eventId: string;
};

export default function EventCommentsSection({ eventId }: Props) {
  const { isAuthenticated, authReady, user } = useAuth();
  const [comments, setComments] = useState<VetEventCommentDto[] | null>(null);
  const [loadErr, setLoadErr] = useState("");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [postErr, setPostErr] = useState("");
  const [replyTo, setReplyTo] = useState<{ userId: string; name: string } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const load = useCallback(() => {
    setLoadErr("");
    apiVetEventComments(eventId)
      .then(setComments)
      .catch((e: unknown) => setLoadErr(e instanceof Error ? e.message : "Не удалось загрузить комментарии"));
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    const b = text.trim();
    if (!b) return;
    setPostErr("");
    setSending(true);
    try {
      const row = await apiPostVetEventComment(eventId, b);
      setText("");
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
        Обсуждение
        {comments != null ? (
          <span className="text-sm font-normal text-gray-500">({comments.length})</span>
        ) : null}
      </h2>

      {loadErr && <p className="text-sm text-red-600">{loadErr}</p>}

      {!loadErr && comments && comments.length === 0 && (
        <p className="text-gray-600 text-sm">Пока нет сообщений — задайте вопрос организаторам или коллегам.</p>
      )}

      {comments && comments.length > 0 && (
        <ul className="space-y-4">
          {comments.map((c) => {
            const name = c.author.profile?.displayName?.trim() || c.author.email;
            const highlighted = replyTo?.userId === c.author.id;
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
                    </span>
                    {user && user.id !== c.author.id ? (
                      <ReportAbuseTrigger
                        modalLabel={`Комментарий к мероприятию (id ${eventId.slice(0, 8)}…)`}
                        payload={{ targetType: "VET_EVENT_COMMENT", vetEventCommentId: c.id }}
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
                  <p className="text-gray-800 text-sm mt-1 whitespace-pre-wrap break-words">{c.body}</p>
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
            , чтобы участвовать в обсуждении.
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
            <label className="block text-sm font-medium text-gray-800" htmlFor="vet-event-comment">
              Ваше сообщение {user && !user.emailVerified ? "(нужен подтверждённый email)" : ""}
            </label>
            <textarea
              id="vet-event-comment"
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              maxLength={8000}
              placeholder="Вопросы по регистрации, программе, локации — уважительно и по делу."
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
            {postErr && <p className="text-sm text-red-600">{postErr}</p>}
            <button
              type="button"
              disabled={sending || !text.trim() || (user && !user.emailVerified)}
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
