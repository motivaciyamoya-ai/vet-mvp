import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { apiFetch } from "../../lib/api";

type ModerationSanction = "WARN" | "TEMP_SUSPEND" | "LIFETIME_BAN";

type MiniProfile = { displayName?: string | null } | null | undefined;

type Report = {
  id: string;
  targetType: string;
  reason: string;
  status: string;
  createdAt: string;
  reporter: { id: string; email: string };
  reportedUser?: {
    id: string;
    email: string;
    profile: MiniProfile;
  } | null;
  thread: { id: string; title: string } | null;
  post: { id: string; body: string; thread: { id: string; title: string } } | null;
  directMessage?: {
    id: string;
    body: string;
    conversationId: string;
    senderId: string;
    sender: { id: string; email: string; profile: MiniProfile };
  } | null;
  article?: { id: string; title: string; authorId: string } | null;
  articleComment?: {
    id: string;
    body: string;
    articleId: string;
    article: { id: string; title: string };
    author: { id: string; email: string; profile: MiniProfile };
  } | null;
  listingMessage?: {
    id: string;
    body: string;
    listingId: string;
    senderId: string;
    listing: { id: string; title: string };
    sender: { id: string; email: string; profile: MiniProfile };
  } | null;
  lobbyMessage?: {
    id: string;
    body: string;
    userId: string;
    user: { id: string; email: string; profile: MiniProfile };
  } | null;
  vetEventComment?: {
    id: string;
    body: string;
    vetEventId: string;
    vetEvent: { id: string; title: string };
    author: { id: string; email: string; profile: MiniProfile };
  } | null;
};

const TARGET_RU: Record<string, string> = {
  THREAD: "Тема форума",
  POST: "Пост в теме",
  USER: "Профиль пользователя",
  DIRECT_MESSAGE: "Личное сообщение",
  ARTICLE: "Статья",
  ARTICLE_COMMENT: "Комментарий к статье",
  VET_EVENT_COMMENT: "Комментарий к мероприятию",
  LISTING_MESSAGE: "Комментарий к объявлению",
  LOBBY_MESSAGE: "Общий чат (главная)",
};

const STATUS_RU: Record<string, string> = {
  OPEN: "Новая",
  REVIEWED: "Просмотрена",
  DISMISSED: "Отклонена",
  ACTION_TAKEN: "Приняты меры",
};

function clip(s: string | undefined | null, n = 280) {
  if (!s) return "—";
  const t = s.replace(/\s+/g, " ").trim();
  return t.length <= n ? t : `${t.slice(0, n)}…`;
}

function displayName(p: MiniProfile, email: string) {
  return p?.displayName?.trim() || email;
}

export default function AdminReports() {
  const [items, setItems] = useState<Report[] | null>(null);
  const [err, setErr] = useState("");
  const [modalFor, setModalFor] = useState<Report | null>(null);
  const [sanction, setSanction] = useState<ModerationSanction>("WARN");
  const [reasonPublic, setReasonPublic] = useState("");
  const [temporaryHours, setTemporaryHours] = useState("72");
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setErr("");
    apiFetch<Report[]>("/api/admin/reports")
      .then(setItems)
      .catch((e) => setErr(String(e.message)));
  };

  useEffect(() => {
    load();
  }, []);

  const setStatus = async (id: string, status: string) => {
    try {
      await apiFetch(`/api/admin/reports/${id}`, {
        method: "PATCH",
        json: { status },
      });
      load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Ошибка");
    }
  };

  const openActionModal = (r: Report) => {
    setModalFor(r);
    setSanction("WARN");
    setReasonPublic("");
    setTemporaryHours("72");
  };

  const closeModal = () => {
    if (submitting) return;
    setModalFor(null);
  };

  const submitActionTaken = async () => {
    if (!modalFor) return;
    const reason = reasonPublic.trim();
    if (reason.length < 3) {
      alert("Введите короткий публичный текст для автора санкций (минимум 3 символа).");
      return;
    }

    let hoursNum: number | undefined;
    if (sanction === "TEMP_SUSPEND") {
      const raw = temporaryHours.trim();
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 1 || n > 24 * 365) {
        alert("Для временной блокировки укажите срок от 1 до 8760 часов (365 суток).");
        return;
      }
      hoursNum = Math.floor(n);
    }

    setSubmitting(true);
    try {
      await apiFetch(`/api/admin/reports/${modalFor.id}`, {
        method: "PATCH",
        json: {
          status: "ACTION_TAKEN",
          sanction,
          sanctionReasonPublic: reason,
          ...(sanction === "TEMP_SUSPEND" ? { temporaryHours: hoursNum } : {}),
        },
      });
      setModalFor(null);
      load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSubmitting(false);
    }
  };

  const modalTitle = useMemo(() => (modalFor ? `Меры по жалобе ${modalFor.id}` : ""), [modalFor]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Жалобы</h1>
      <p className="text-sm text-slate-600 mb-6 max-w-2xl">
        Жалобы из форума, профилей, личных сообщений, статей, объявлений и общего чата. Пользователи отправляют их через кнопку
        «Пожаловаться».
      </p>
      {err && <p className="text-red-600 mb-4">{err}</p>}
      {!items ? (
        <p>Загрузка…</p>
      ) : (
        <div className="space-y-4">
          {items.map((r) => (
            <div key={r.id} className="bg-white rounded-xl border border-slate-200 p-4 text-sm shadow-sm">
              <div className="flex flex-wrap justify-between gap-2 mb-2">
                <span className="font-mono text-xs text-slate-500">{r.id}</span>
                <span className="text-xs text-slate-500">{new Date(r.createdAt).toLocaleString("ru-RU")}</span>
              </div>
              <div className="flex flex-wrap gap-2 items-center mb-2">
                <span className="inline-flex px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 text-xs font-semibold">
                  {TARGET_RU[r.targetType] ?? r.targetType}
                </span>
                <span className="inline-flex px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 text-xs font-semibold border border-amber-200">
                  {STATUS_RU[r.status] ?? r.status}
                </span>
              </div>
              <p className="text-slate-700">
                <span className="font-semibold text-slate-900">От:</span> {r.reporter.email}{" "}
                <span className="text-slate-400">({r.reporter.id})</span>
              </p>
              <p className="mt-2 text-slate-800 whitespace-pre-wrap border-l-2 border-red-200 pl-3 py-1 bg-red-50/40 rounded-r">
                {r.reason}
              </p>

              {r.thread && (
                <p className="mt-3 text-slate-700">
                  <span className="font-semibold">Тема:</span> {clip(r.thread.title, 160)}{" "}
                  <Link to={`/forum/topic/${encodeURIComponent(r.thread.id)}`} className="text-emerald-700 font-medium hover:underline ml-1">
                    открыть →
                  </Link>
                </p>
              )}
              {r.post && (
                <p className="mt-2 text-slate-600">
                  <span className="font-semibold text-slate-800">Пост:</span> {clip(r.post.body)}{" "}
                  <Link
                    to={`/forum/topic/${encodeURIComponent(r.post.thread.id)}`}
                    className="text-emerald-700 font-medium hover:underline whitespace-nowrap"
                  >
                    в теме «{clip(r.post.thread.title, 60)}»
                  </Link>
                </p>
              )}
              {r.reportedUser && (
                <p className="mt-2 text-slate-700">
                  <span className="font-semibold">На пользователя:</span>{" "}
                  {displayName(r.reportedUser.profile, r.reportedUser.email)}{" "}
                  <Link to={`/users/${encodeURIComponent(r.reportedUser.id)}`} className="text-emerald-700 hover:underline">
                    профиль
                  </Link>
                </p>
              )}
              {r.directMessage && (
                <p className="mt-2 text-slate-600">
                  <span className="font-semibold text-slate-800">ЛС от</span>{" "}
                  {displayName(r.directMessage.sender.profile, r.directMessage.sender.email)}: {clip(r.directMessage.body)}{" "}
                  <Link
                    to={`/messages/${encodeURIComponent(r.directMessage.conversationId)}`}
                    className="text-emerald-700 font-medium hover:underline"
                  >
                    диалог
                  </Link>
                </p>
              )}
              {r.article && (
                <p className="mt-2 text-slate-700">
                  <span className="font-semibold">Статья:</span> {clip(r.article.title, 120)}{" "}
                  <Link to={`/articles/${encodeURIComponent(r.article.id)}`} className="text-emerald-700 hover:underline">
                    открыть
                  </Link>
                </p>
              )}
              {r.articleComment && (
                <p className="mt-2 text-slate-600">
                  <span className="font-semibold text-slate-800">Комментарий</span> (
                  {displayName(r.articleComment.author.profile, r.articleComment.author.email)}): {clip(r.articleComment.body)}{" "}
                  <Link
                    to={`/articles/${encodeURIComponent(r.articleComment.article.id)}`}
                    className="text-emerald-700 hover:underline"
                  >
                    статья «{clip(r.articleComment.article.title, 40)}»
                  </Link>
                </p>
              )}
              {r.vetEventComment && (
                <p className="mt-2 text-slate-600">
                  <span className="font-semibold text-slate-800">Комментарий к мероприятию</span> (
                  {displayName(r.vetEventComment.author.profile, r.vetEventComment.author.email)}):{" "}
                  {clip(r.vetEventComment.body)}{" "}
                  <Link
                    to={`/events/${encodeURIComponent(r.vetEventComment.vetEvent.id)}`}
                    className="text-emerald-700 hover:underline"
                  >
                    «{clip(r.vetEventComment.vetEvent.title, 40)}»
                  </Link>
                </p>
              )}
              {r.listingMessage && (
                <p className="mt-2 text-slate-600">
                  <span className="font-semibold text-slate-800">Объявление:</span> {clip(r.listingMessage.listing.title, 80)} —{" "}
                  {displayName(r.listingMessage.sender.profile, r.listingMessage.sender.email)}: {clip(r.listingMessage.body)}{" "}
                  <Link to={`/marketplace/${encodeURIComponent(r.listingMessage.listingId)}`} className="text-emerald-700 hover:underline">
                    страница
                  </Link>
                </p>
              )}
              {r.lobbyMessage && (
                <p className="mt-2 text-slate-600">
                  <span className="font-semibold text-slate-800">Общий чат:</span>{" "}
                  {displayName(r.lobbyMessage.user.profile, r.lobbyMessage.user.email)}: {clip(r.lobbyMessage.body)}{" "}
                  <Link to="/" className="text-emerald-700 hover:underline">
                    главная
                  </Link>
                </p>
              )}

              <div className="flex gap-2 mt-4 flex-wrap">
                {(["OPEN", "REVIEWED", "DISMISSED"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="text-xs border border-slate-200 px-2 py-1.5 rounded-lg hover:bg-slate-50 font-medium"
                    onClick={() => setStatus(r.id, s)}
                  >
                    {STATUS_RU[s] ?? s}
                  </button>
                ))}
                <button
                  type="button"
                  className="text-xs border border-rose-200 bg-rose-50 text-rose-900 px-2 py-1.5 rounded-lg hover:bg-rose-100 font-semibold"
                  onClick={() => openActionModal(r)}
                >
                  {STATUS_RU.ACTION_TAKEN}
                </button>
              </div>
            </div>
          ))}
          {items.length === 0 && <p className="text-slate-600">Жалоб пока нет.</p>}
        </div>
      )}

      {modalFor ? (
        <div
          className="fixed inset-0 z-[400] bg-black/50 flex items-end sm:items-center justify-center p-3 sm:p-6"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">{modalTitle}</p>
                <p className="text-xs text-slate-600 mt-1">
                  Текст ниже увидит участник на бейдже у аватарки (и в баннере у себя в аккаунте).
                </p>
              </div>
              <button
                type="button"
                className="shrink-0 h-9 w-9 inline-flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50"
                onClick={closeModal}
                aria-label="Закрыть"
              >
                ×
              </button>
            </div>

            <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="sanction-kind">
              Вид меры
            </label>
            <select
              id="sanction-kind"
              value={sanction}
              onChange={(e) => setSanction(e.target.value as ModerationSanction)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
            >
              <option value="WARN">Предупреждение (24 часа, без ограничений)</option>
              <option value="TEMP_SUSPEND">Временная блокировка (без публикаций и трат VetCoin)</option>
              <option value="LIFETIME_BAN">Пожизненная блокировка (только просмотр)</option>
            </select>

            {sanction === "TEMP_SUSPEND" ? (
              <div className="mt-3">
                <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="temp-hours">
                  Срок (часы)
                </label>
                <input
                  id="temp-hours"
                  inputMode="numeric"
                  value={temporaryHours}
                  onChange={(e) => setTemporaryHours(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                  placeholder="72"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  По умолчанию здесь стоит 72 часа; при необходимости замените на другой допустимый срок.
                </p>
              </div>
            ) : null}

            <div className="mt-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="public-reason">
                Публичное пояснение
              </label>
              <textarea
                id="public-reason"
                value={reasonPublic}
                onChange={(e) => setReasonPublic(e.target.value)}
                rows={4}
                maxLength={800}
                placeholder="Коротко и ясно: что именно не так и какие правила нарушены."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
              <p className="text-[11px] text-slate-500 mt-1">{reasonPublic.trim().length}/800 (минимум 3 символа)</p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 justify-end">
              <button
                type="button"
                disabled={submitting}
                onClick={closeModal}
                className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => void submitActionTaken()}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white text-sm font-bold hover:bg-rose-700 disabled:opacity-50"
              >
                {submitting ? "Применение…" : "Применить меру"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
