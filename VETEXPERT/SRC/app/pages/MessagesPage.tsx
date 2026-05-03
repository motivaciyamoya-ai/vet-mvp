import { ArrowLeft, Loader2, Send } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNotifications } from "../contexts/NotificationContext";
import UserAvatar from "../components/UserAvatar";
import RichMessageBody from "../components/RichMessageBody";
import RichMessageComposer from "../components/RichMessageComposer";
import ReportAbuseTrigger from "../components/ReportAbuseModal";
import {
  apiDirectMessages,
  apiDirectConversations,
  apiMarkDirectRead,
  apiSendDirectMessage,
  type DirectConversationRow,
  type DirectMessageDto,
} from "../../lib/api";

export default function MessagesPage() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, authReady, user } = useAuth();
  const { refreshServerNotifications } = useNotifications();
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const [conversations, setConversations] = useState<DirectConversationRow[]>([]);
  const [messages, setMessages] = useState<DirectMessageDto[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [compose, setCompose] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!authReady || !isAuthenticated) return;
    let cancelled = false;
    setLoadingList(true);
    apiDirectConversations()
      .then((r) => {
        if (!cancelled) setConversations(r.conversations);
      })
      .catch(() => {
        if (!cancelled) setConversations([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingList(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authReady, isAuthenticated]);

  useEffect(() => {
    if (!authReady) return;
    if (!isAuthenticated) {
      navigate("/login", { state: { from: conversationId ? `/messages/${conversationId}` : "/messages" } });
    }
  }, [authReady, isAuthenticated, navigate, conversationId]);

  useEffect(() => {
    if (!conversationId || !isAuthenticated || !user) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    setLoadingThread(true);
    Promise.all([
      apiDirectMessages(conversationId),
      apiMarkDirectRead(conversationId).catch(() => undefined),
    ])
      .then(([m]) => {
        if (!cancelled) setMessages(m.messages);
      })
      .catch(() => {
        if (!cancelled) setMessages([]);
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingThread(false);
          void refreshServerNotifications();
        }
      });
    void apiDirectConversations().then((r) => setConversations(r.conversations));
    return () => {
      cancelled = true;
    };
  }, [conversationId, isAuthenticated, user, refreshServerNotifications]);

  useEffect(() => {
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, [messages, conversationId]);

  const activePeer = conversations.find((c) => c.id === conversationId)?.peer ?? null;

  const sendNow = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!conversationId || !compose.trim() || sending || !user) return;
    setSending(true);
    try {
      const msg = await apiSendDirectMessage(conversationId, compose.trim());
      setCompose("");
      setMessages((prev) => [...prev, msg]);
      void apiDirectConversations().then((r) => setConversations(r.conversations));
    } catch {
      alert("Не удалось отправить");
    } finally {
      setSending(false);
    }
  };

  if (!authReady) {
    return (
      <div className="flex justify-center py-16 text-gray-600 gap-2">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <Link to="/" className="text-sm text-emerald-700 font-medium hover:underline">
          Главная
        </Link>
        <span className="text-slate-300">/</span>
        <h1 className="font-bold text-xl text-slate-900">Личные сообщения</h1>
      </div>

      <div className="flex flex-col md:flex-row gap-4 rounded-2xl border border-slate-200 bg-white shadow-sm min-h-[min(70vh,640px)] overflow-hidden">
        <aside className="md:w-[300px] border-b md:border-b-0 md:border-r border-slate-100 flex flex-col max-h-[40vh] md:max-h-none">
          <div className="p-4 border-b border-slate-100 font-semibold text-slate-800 text-sm bg-slate-50/90">Диалоги</div>
          <div className="overflow-y-auto flex-1">
            {loadingList ? (
              <div className="p-6 text-center text-slate-500 flex justify-center gap-2 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Загрузка…
              </div>
            ) : conversations.length === 0 ? (
              <p className="p-6 text-sm text-slate-600">Пока нет диалогов. Откройте профиль участника и нажмите «Написать».</p>
            ) : (
              conversations.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => navigate(`/messages/${c.id}`)}
                  className={`w-full flex items-start gap-3 px-4 py-3 text-left transition hover:bg-emerald-50/60 border-l-4 ${
                    c.id === conversationId ? "border-emerald-600 bg-emerald-50/40" : "border-transparent"
                  }`}
                >
                  <UserAvatar
                    avatarUrl={c.peer.avatarUrl}
                    label={c.peer.displayName}
                    className="w-10 h-10 shrink-0"
                    moderation={c.peer.moderation}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900 truncate text-sm">{c.peer.displayName}</span>
                      {c.unreadCount > 0 && (
                        <span className="bg-red-600 text-white text-[10px] font-bold rounded-full px-1.5 min-w-[18px] text-center leading-4">
                          {c.unreadCount > 9 ? "9+" : c.unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{c.lastMessage?.bodyPreview ?? "Нет сообщений"}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        <section className="flex-1 flex flex-col bg-slate-50/40 min-h-[320px]">
          {!conversationId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-10 text-center text-sm gap-2">
              <p className="max-w-xs">Выберите диалог слева или начните переписку со страницы пользователя.</p>
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-slate-200 bg-white flex items-center gap-3">
                <button
                  type="button"
                  className="md:hidden p-2 rounded-lg hover:bg-slate-100"
                  aria-label="Назад к списку"
                  onClick={() => navigate("/messages")}
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                {activePeer && (
                  <>
                    <UserAvatar
                      avatarUrl={activePeer.avatarUrl}
                      label={activePeer.displayName}
                      className="w-10 h-10"
                      moderation={activePeer.moderation}
                    />
                    <div className="min-w-0">
                      <Link to={`/users/${activePeer.id}`} className="font-semibold text-slate-900 hover:text-emerald-800 truncate block">
                        {activePeer.displayName}
                      </Link>
                      <p className="text-xs text-slate-500 truncate">
                        {activePeer.city}
                        {activePeer.country?.nameRu ? `, ${activePeer.country.nameRu}` : ""}
                      </p>
                    </div>
                  </>
                )}
              </div>

              <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-3">
                {loadingThread ? (
                  <div className="flex justify-center py-12 text-slate-500 gap-2 text-sm">
                    <Loader2 className="w-5 h-5 animate-spin" /> Загрузка…
                  </div>
                ) : messages.length === 0 ? (
                  <p className="text-center text-slate-500 text-sm py-10 px-2">
                    Напишите первое сообщение. В диалоге хранятся только последние 500 сообщений; старые удаляются автоматически.
                  </p>
                ) : (
                  messages.map((m) => {
                    const mine = m.senderId === user?.id;
                    return (
                      <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div className={`flex flex-col gap-1 max-w-[85%] ${mine ? "items-end" : "items-start"}`}>
                          <div
                            className={`rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap shadow-sm ${
                              mine
                                ? "bg-emerald-600 text-white rounded-br-md"
                                : "bg-white border border-slate-200 text-slate-800 rounded-bl-md"
                            }`}
                          >
                            <RichMessageBody body={m.body} variant={mine ? "mine" : "theirs"} />
                            <div className={`text-[10px] mt-1 ${mine ? "text-emerald-100" : "text-slate-400"}`}>
                              {new Date(m.createdAt).toLocaleString("ru-RU", {
                                hour: "2-digit",
                                minute: "2-digit",
                                day: "numeric",
                                month: "short",
                              })}
                            </div>
                          </div>
                          {!mine && conversationId ? (
                            <ReportAbuseTrigger
                              modalLabel="Входящее личное сообщение"
                              payload={{ targetType: "DIRECT_MESSAGE", directMessageId: m.id }}
                              className="text-[10px] font-semibold text-slate-400 hover:text-red-700 px-1"
                            >
                              Пожаловаться
                            </ReportAbuseTrigger>
                          ) : null}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <form onSubmit={(e) => void sendNow(e)} className="p-4 border-t border-slate-200 bg-white flex flex-col gap-2">
                <p className="text-[10px] text-slate-500 order-first">
                  В этом диалоге сохраняются только последние 500 сообщений; более старые удаляются автоматически.
                </p>
                <div className="flex gap-3 items-end">
                <RichMessageComposer
                  className="min-w-0 flex-1"
                  value={compose}
                  onChange={setCompose}
                  rows={3}
                  maxLength={8000}
                  placeholder="Личное сообщение… поддерживаются эмодзи и Markdown (панель выше)."
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={sending || !compose.trim()}
                  className="shrink-0 inline-flex items-center justify-center self-end rounded-xl bg-emerald-600 text-white p-3 hover:bg-emerald-700 disabled:opacity-40"
                  aria-label="Отправить"
                >
                  {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
                </div>
              </form>
            </>
          )}
        </section>
      </div>

      <p className="mt-4 text-xs text-slate-500">
        Переписка видна только участникам диалога; она не отображается в ленте форума и не доступна остальным пользователям.
      </p>
    </div>
  );
}
