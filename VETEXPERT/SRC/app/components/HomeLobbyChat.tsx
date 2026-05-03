import { ChevronDown, Lock, Loader2, MessageCircle, Send, Smile, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import UserAvatar from "./UserAvatar";
import ReportAbuseTrigger from "./ReportAbuseModal";
import type { LobbyMessageDto } from "../../lib/api";
import { apiLobbyMessages, apiLobbyPostMessage, apiLobbyToggleReaction } from "../../lib/api";

const POLL_MS = 5000;

const CHIP_EMOJIS = ["👍", "❤️", "😂", "🔥", "👏", "🎉", "💬", "😮", "✨", "🙏"] as const;

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

export default function HomeLobbyChat() {
  const { authReady, isAuthenticated, user } = useAuth();
  const [messages, setMessages] = useState<LobbyMessageDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [compose, setCompose] = useState("");
  const [err, setErr] = useState("");
  const [collapsed, setCollapsed] = useState(true);
  const [replyTo, setReplyTo] = useState<{ userId: string; displayName: string } | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  /** Только контейнер ленты; `scrollIntoView` тянул за собой всю страницу. */
  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      const el = listRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, []);

  const load = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const r = await apiLobbyMessages();
      setMessages(Array.isArray(r.messages) ? r.messages : []);
      setErr("");
    } catch {
      setErr("Не удалось загрузить чат.");
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!authReady || !isAuthenticated) return;
    setLoading(true);
    void load().finally(() => setLoading(false));
  }, [authReady, isAuthenticated, load]);

  useEffect(() => {
    if (!authReady || !isAuthenticated) return;
    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void load();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [authReady, isAuthenticated, load]);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  const visibleMessages = collapsed ? messages.slice(-3) : messages;

  const startReply = (target: { userId: string; displayName: string }) => {
    setReplyTo(target);
    setCollapsed(false);
    setCompose((prev) => {
      const mention = `@${target.displayName}, `;
      const t = prev.trimStart();
      if (t.toLowerCase().startsWith(`@${target.displayName}`.toLowerCase())) return prev;
      return prev ? `${mention}${prev}` : mention;
    });
  };

  const send = async () => {
    const t = compose.trim();
    if (!t || sending || !isAuthenticated) return;
    setSending(true);
    setErr("");
    try {
      const msg = await apiLobbyPostMessage(t);
      setCompose("");
      setReplyTo(null);
      setMessages((prev) => [...prev.filter((p) => p.id !== msg.id), msg]);
    } catch {
      setErr("Не отправилось. Проверьте сеть или войдите снова.");
    } finally {
      setSending(false);
    }
  };

  const onToggleReact = async (messageId: string, emoji: string) => {
    if (!isAuthenticated) return;
    try {
      const { reactions } = await apiLobbyToggleReaction(messageId, emoji);
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, reactions } : m)));
    } catch {
      /* ignore */
    }
  };

  const insertChip = (ch: string) => {
    setCompose((prev) => (prev ? `${prev}${ch}` : ch));
  };

  return (
    <section className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-4 sm:px-5 border-b border-slate-100 bg-gradient-to-r from-teal-50/90 to-emerald-50/80">
        <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white flex items-center justify-center shadow-md shrink-0">
          <MessageCircle className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-slate-900 text-base sm:text-lg leading-tight">Чат</h2>
          <p className="text-xs text-slate-600">Лимит: 500 сообщений</p>
        </div>
      </div>

      {!authReady ? (
        <div className="flex items-center justify-center gap-2 py-14 text-slate-500">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : !isAuthenticated ? (
        <div className="relative">
          <div className="max-h-[14rem] overflow-hidden px-4 py-10 opacity-35 blur-[2px] select-none pointer-events-none" aria-hidden>
            {[1, 2, 3].map((k) => (
              <div key={k} className="flex gap-2 mb-3">
                <div className="h-9 w-9 rounded-full bg-slate-200" />
                <div className="flex-1 space-y-1">
                  <div className="h-2 bg-slate-200 rounded w-1/4" />
                  <div className="h-2 bg-slate-100 rounded w-5/6" />
                </div>
              </div>
            ))}
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-white/92 backdrop-blur-[1px] px-6 text-center">
            <Lock className="w-12 h-12 text-emerald-600 shrink-0" aria-hidden />
            <div className="max-w-xs">
              <p className="font-semibold text-slate-900">Чат только для участников</p>
              <p className="text-sm text-slate-600 mt-1">Войдите или зарегистрируйтесь, чтобы общаться с коллегами.</p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              <Link
                to="/login"
                state={{ from: "/" }}
                className="inline-flex px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700"
              >
                Войти
              </Link>
              <Link to="/register" className="inline-flex px-5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-800 hover:bg-slate-50">
                Регистрация
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div
            ref={listRef}
            className={[
              "overflow-y-auto overscroll-contain px-3 py-3 space-y-2 bg-gradient-to-b from-slate-50/40 to-white",
              collapsed ? "max-h-[10.5rem] sm:max-h-[11rem]" : "max-h-[min(22rem,50vh)] sm:max-h-[20rem]",
            ].join(" ")}
          >
            {loading && messages.length === 0 ? (
              <div className="flex justify-center py-10 text-slate-500 gap-2 text-sm">
                <Loader2 className="h-5 w-5 animate-spin" /> Загрузка…
              </div>
            ) : messages.length === 0 ? (
              <p className="text-center text-sm text-slate-500 py-10 px-2">
                Напишите первое сообщение — коллеги увидят его здесь. В истории остаются только последние 500 сообщений.
              </p>
            ) : (
              visibleMessages.map((msg) => {
                const mine = user?.id === msg.sender.id;
                const highlighted = replyTo?.userId === msg.sender.id;
                return (
                  <div key={msg.id} className={`flex gap-2 ${mine ? "flex-row-reverse" : ""}`}>
                    <button
                      type="button"
                      onClick={() => startReply({ userId: msg.sender.id, displayName: msg.sender.displayName })}
                      className="shrink-0 pt-0.5 hover:opacity-90"
                      title={`Ответить ${msg.sender.displayName}`}
                      aria-label={`Ответить ${msg.sender.displayName}`}
                    >
                      <UserAvatar
                        avatarUrl={msg.sender.avatarUrl}
                        label={msg.sender.displayName}
                        className="w-9 h-9 text-xs"
                        ringClassName={`ring-2 ${highlighted ? "ring-amber-300" : mine ? "ring-teal-200" : "ring-white/95"}`}
                        moderation={msg.sender.moderation}
                      />
                    </button>
                    <div className={`min-w-0 max-w-[92%] sm:max-w-[85%]`}>
                      <div
                        className={`rounded-2xl px-3 py-2 shadow-sm border ${
                          mine
                            ? "rounded-tr-sm bg-emerald-700 text-white border-emerald-800/40"
                            : "rounded-tl-sm bg-white border-slate-200"
                        } ${highlighted ? "ring-2 ring-amber-200" : ""}`}
                      >
                        <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
                          <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 min-w-0">
                            <button
                              type="button"
                              onClick={() => startReply({ userId: msg.sender.id, displayName: msg.sender.displayName })}
                              className={`text-xs font-bold truncate hover:underline text-left ${
                                mine ? "text-emerald-100" : "text-slate-800"
                              }`}
                              title={`Ответить ${msg.sender.displayName}`}
                            >
                              {msg.sender.displayName}
                            </button>
                            <span className={`text-[10px] tabular-nums ${mine ? "text-emerald-200/90" : "text-slate-400"}`}>
                              {formatTime(msg.createdAt)}
                            </span>
                          </span>
                          {!mine && isAuthenticated ? (
                            <ReportAbuseTrigger
                              modalLabel="Сообщение в общем чате на главной"
                              payload={{ targetType: "LOBBY_MESSAGE", lobbyMessageId: msg.id }}
                              className="text-[10px] font-semibold text-slate-500 hover:text-red-700"
                            >
                              жалоба
                            </ReportAbuseTrigger>
                          ) : null}
                        </div>
                        <p className={`text-sm whitespace-pre-wrap break-words mt-1 leading-snug ${mine ? "text-white/95" : "text-slate-800"}`}>
                          {msg.body}
                        </p>
                      </div>
                      <div className={`flex flex-wrap gap-1 mt-1.5 ${mine ? "justify-end" : "justify-start"}`}>
                        {CHIP_EMOJIS.map((em) => {
                          const agg = msg.reactions.find((r) => r.emoji === em);
                          const cnt = agg?.count ?? 0;
                          const active = agg?.reactedByMe ?? false;
                          return (
                            <button
                              key={em}
                              type="button"
                              onClick={() => void onToggleReact(msg.id, em)}
                              className={`inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-xs transition-colors touch-manipulation ${
                                active
                                  ? "bg-teal-100 border-teal-300 text-teal-900 shadow-sm"
                                  : "bg-white/95 border-slate-200 text-slate-700 hover:bg-slate-50"
                              } ${cnt === 0 ? "opacity-80" : ""}`}
                              aria-pressed={active}
                              title="Реакция"
                            >
                              <span className="leading-none">{em}</span>
                              {cnt > 0 ? <span className="tabular-nums text-[10px] font-semibold text-slate-600">{cnt}</span> : null}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {err ? <p className="text-xs text-red-600 px-4 py-2 border-t border-red-100 bg-red-50/70">{err}</p> : null}

          {collapsed ? (
            <div className="p-3 sm:p-4 border-t border-slate-100 bg-white">
              <button
                type="button"
                onClick={() => setCollapsed(false)}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors"
              >
                <ChevronDown className="w-5 h-5" aria-hidden />
                Развернуть чат и написать сообщение
              </button>
              <p className="text-[10px] text-slate-500 mt-2 text-center">
                В свернутом виде показываем последние 3 сообщения. Разверните, чтобы открыть поле ввода и смайлики.
              </p>
            </div>
          ) : (
            <div className="p-3 sm:p-4 border-t border-slate-100 bg-white space-y-2">
              {replyTo ? (
                <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-wide text-amber-700/90">Ответ пользователю</p>
                    <p className="text-sm font-semibold text-amber-900 truncate">{replyTo.displayName}</p>
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
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-[10px] uppercase tracking-wide text-slate-500 flex items-center gap-1 shrink-0">
                  <Smile className="w-3.5 h-3.5" /> Смайлы
                </span>
                {CHIP_EMOJIS.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => insertChip(em)}
                    className="h-9 w-9 rounded-lg border border-slate-200 hover:bg-emerald-50 text-lg leading-none flex items-center justify-center transition-colors cursor-pointer touch-manipulation"
                    title={`Вставить ${em}`}
                  >
                    {em}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 items-end">
                <textarea
                  value={compose}
                  onChange={(e) => setCompose(e.target.value)}
                  placeholder="Написать сообщение…"
                  maxLength={1600}
                  rows={2}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void send();
                    }
                  }}
                  className="flex-1 min-h-[2.75rem] max-h-28 resize-y px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/35"
                />
                <button
                  type="button"
                  disabled={sending || !compose.trim()}
                  onClick={() => void send()}
                  className="shrink-0 h-11 w-11 sm:w-auto sm:px-5 rounded-xl bg-emerald-600 text-white flex items-center justify-center gap-2 font-semibold text-sm hover:bg-emerald-700 disabled:opacity-50 cursor-pointer touch-manipulation"
                  title="Отправить"
                >
                  <Send className="w-5 h-5 sm:hidden" />
                  <span className="hidden sm:inline">Отправить</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-500">
                Хранится не более 500 последних сообщений; более старые удаляются автоматически. Enter — отправить • Shift+Enter — новая строка
              </p>
            </div>
          )}
        </>
      )}
    </section>
  );
}
