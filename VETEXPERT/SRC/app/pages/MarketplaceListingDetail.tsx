import {
  ArrowLeft,
  ShoppingBag,
  Gift,
  RefreshCw,
  DollarSign,
  MapPin,
  Clock,
  User,
  MessageSquare,
  Send,
  Lock,
  UserCheck,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../lib/api";
import { useAuth } from "../contexts/AuthContext";
import UserAvatar from "../components/UserAvatar";
import type { PublicModerationDto } from "../../lib/moderationUi";
import type { DemoMarketListing } from "../../lib/demoMarketplace";
import { demoListingApiType, getDemoMarketplaceListing } from "../../lib/demoMarketplace";
import MarketplaceContactSellerButton from "../components/MarketplaceContactSellerButton";
import ReportAbuseTrigger from "../components/ReportAbuseModal";

type ListingTypeEnum = "SELL" | "BUY" | "JOB";

type ApiListingAuthor = {
  id: string;
  email: string;
  profile?: {
    displayName?: string | null;
    avatarUrl?: string | null;
    city?: string | null;
    country?: { nameRu?: string } | null;
  } | null;
};

type ApiListingMessage = {
  id: string;
  body: string;
  createdAt: string;
  sender: ApiListingAuthor;
  senderModeration?: PublicModerationDto | null;
};

type ApiListing = {
  id: string;
  title: string;
  description: string;
  region: string;
  type: ListingTypeEnum;
  imageUrls?: string[];
  createdAt: string;
  author: ApiListingAuthor;
  authorModeration?: PublicModerationDto | null;
  buyerId?: string | null;
  buyer?: ApiListingAuthor | null;
  buyerModeration?: PublicModerationDto | null;
  messages?: ApiListingMessage[];
};

function ZoomLensImage({ src, alt }: { src: string; alt: string }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [rect, setRect] = useState<{ w: number; h: number } | null>(null);
  const lensSize = 160;
  const zoom = 2.4;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-4 items-start">
      <div
        className="relative rounded-2xl overflow-hidden bg-black border border-white/10"
        onMouseLeave={() => setPos(null)}
        onMouseMove={(e) => {
          const r = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
          setRect({ w: r.width, h: r.height });
          const x = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
          const y = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
          setPos({ x, y });
        }}
      >
        <img src={src} alt={alt} className="w-full max-h-[75vh] object-contain bg-black" />
        {pos && rect ? (
          <div
            className="absolute border-2 border-white/70 bg-white/10 pointer-events-none"
            style={{
              width: `${lensSize}px`,
              height: `${lensSize}px`,
              left: `${pos.x * rect.w - lensSize / 2}px`,
              top: `${pos.y * rect.h - lensSize / 2}px`,
              transform: "translateZ(0)",
            }}
          />
        ) : null}
      </div>

      <div className="hidden lg:block">
        <div className="rounded-2xl overflow-hidden bg-black border border-white/10">
          <div
            className="w-full aspect-square"
            style={{
              backgroundImage: `url(${src})`,
              backgroundRepeat: "no-repeat",
              backgroundSize: `${zoom * 100}% ${zoom * 100}%`,
              backgroundPosition: pos ? `${pos.x * 100}% ${pos.y * 100}%` : "50% 50%",
            }}
          />
        </div>
        <p className="mt-2 text-xs text-white/70">Лупа: водите мышью по фото.</p>
      </div>
    </div>
  );
}

function typeLabelApi(t: ListingTypeEnum): { label: string; Icon: typeof ShoppingBag } {
  switch (t) {
    case "SELL":
      return { label: "Продажа", Icon: DollarSign };
    case "BUY":
      return { label: "Куплю", Icon: ShoppingBag };
    case "JOB":
      return { label: "Обмен", Icon: RefreshCw };
    default:
      return { label: t, Icon: ShoppingBag };
  }
}

const demoUi = {
  sale: { label: "Продажа", Icon: DollarSign, bgColor: "bg-emerald-100", textColor: "text-emerald-800", borderColor: "border-emerald-300" },
  free: { label: "Даром", Icon: Gift, bgColor: "bg-blue-100", textColor: "text-blue-800", borderColor: "border-blue-300" },
  exchange: { label: "Обмен", Icon: RefreshCw, bgColor: "bg-purple-100", textColor: "text-purple-800", borderColor: "border-purple-300" },
  wanted: { label: "Куплю", Icon: ShoppingBag, bgColor: "bg-orange-100", textColor: "text-orange-800", borderColor: "border-orange-300" },
} as const;

function senderLabel(sender: ApiListingAuthor): string {
  return sender.profile?.displayName?.trim() || sender.email;
}

/** Детали объявления из API: комментарии, продажа, закрытие обсуждения после сделки */
function MarketplaceApiListingDetail({ listingId, initial }: { listingId: string; initial: ApiListing }) {
  const navigate = useNavigate();
  const { user, authReady } = useAuth();
  const [listing, setListing] = useState(initial);
  const [activeImg, setActiveImg] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [commentErr, setCommentErr] = useState("");
  const [soldChoice, setSoldChoice] = useState<string>("");
  const [soldBusy, setSoldBusy] = useState(false);
  const [soldErr, setSoldErr] = useState("");

  useEffect(() => {
    setListing(initial);
    setActiveImg(0);
  }, [initial]);

  const reloadListing = useCallback(async () => {
    const fresh = await apiFetch<ApiListing>(`/api/listings/${encodeURIComponent(listingId)}`);
    setListing(fresh);
  }, [listingId]);

  const isSold = Boolean(listing.buyerId);
  const isAuthor = Boolean(user?.id === listing.author.id);

  const commentCandidates = useMemo(() => {
    const map = new Map<string, ApiListingAuthor>();
    for (const m of listing.messages ?? []) {
      const sid = m.sender.id;
      if (sid === listing.author.id) continue;
      if (!map.has(sid)) map.set(sid, m.sender);
    }
    return [...map.entries()];
  }, [listing.messages, listing.author.id]);

  const buyerLabel = listing.buyer ? senderLabel(listing.buyer) : "";

  const postComment = async () => {
    setCommentErr("");
    const b = commentText.trim();
    if (!b || !user) return;
    setPostingComment(true);
    try {
      await apiFetch(`/api/listings/${encodeURIComponent(listingId)}/messages`, {
        method: "POST",
        json: { body: b },
      });
      setCommentText("");
      await reloadListing();
    } catch (e: unknown) {
      setCommentErr(e instanceof Error ? e.message : "Не удалось отправить комментарий");
    } finally {
      setPostingComment(false);
    }
  };

  const confirmBuyer = async () => {
    setSoldErr("");
    const bid = soldChoice.trim();
    if (!bid) {
      setSoldErr("Выберите покупателя из списка.");
      return;
    }
    if (
      !window.confirm(
        "Закрыть объявление по сделке? Новые комментарии будет нельзя оставить, покупатель отобразится в карточке.",
      )
    )
      return;
    setSoldBusy(true);
    try {
      await apiFetch(`/api/listings/${encodeURIComponent(listingId)}/mark-sold`, {
        method: "POST",
        json: { buyerUserId: bid },
      });
      await reloadListing();
      setSoldChoice("");
    } catch (e: unknown) {
      setSoldErr(e instanceof Error ? e.message : "Не удалось сохранить");
    } finally {
      setSoldBusy(false);
    }
  };

  const l = listing;
  const { label, Icon } = typeLabelApi(l.type);
  const authorLabel = senderLabel(l.author);
  const when = new Date(l.createdAt);
  const whenStr =
    Number.isFinite(when.getTime())
      ? when.toLocaleString("ru-RU", { dateStyle: "medium", timeStyle: "short" })
      : "—";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-sm text-amber-800 hover:text-amber-900 font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        Назад
      </button>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-100">
          {Array.isArray(l.imageUrls) && l.imageUrls.length > 0 ? (
            <>
              <button
                type="button"
                onClick={() => setLightboxOpen(true)}
                className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden bg-gray-100 border border-gray-200 group"
                title="Открыть фото"
              >
                <img
                  src={l.imageUrls[Math.min(activeImg, l.imageUrls.length - 1)]}
                  alt=""
                  className="w-full h-full object-cover group-hover:scale-[1.01] transition-transform"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                <div
                  className={`absolute top-3 left-3 flex items-center gap-2 px-3 py-2 rounded-xl border-2 bg-white/90 backdrop-blur font-semibold text-sm ${
                    l.type === "SELL"
                      ? "border-emerald-400 text-emerald-800"
                      : l.type === "BUY"
                        ? "border-orange-400 text-orange-900"
                        : "border-purple-400 text-purple-900"
                  }`}
                >
                  <Icon className="w-4 h-4" aria-hidden />
                  {label}
                </div>
                <div className="absolute bottom-3 right-3 px-2 py-1 rounded-lg bg-black/55 text-white text-xs font-semibold">
                  Нажмите для увеличения
                </div>
              </button>
              {l.imageUrls.length > 1 ? (
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                  {l.imageUrls.map((u, i) => (
                    <button
                      key={u + i}
                      type="button"
                      onClick={() => setActiveImg(i)}
                      className={`shrink-0 w-20 h-14 rounded-lg overflow-hidden border ${
                        i === activeImg ? "border-emerald-400 ring-2 ring-emerald-200" : "border-gray-200"
                      }`}
                      title={`Фото ${i + 1}`}
                    >
                      <img src={u} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <div className="relative h-44 sm:h-56 bg-gradient-to-br from-amber-100 via-orange-50 to-amber-200 flex flex-col items-center justify-center gap-3 p-6 rounded-2xl">
              <div
                className={`absolute top-3 left-3 flex items-center gap-2 px-3 py-2 rounded-xl border-2 bg-white/90 backdrop-blur font-semibold text-sm ${
                  l.type === "SELL"
                    ? "border-emerald-400 text-emerald-800"
                    : l.type === "BUY"
                      ? "border-orange-400 text-orange-900"
                      : "border-purple-400 text-purple-900"
                }`}
              >
                <Icon className="w-4 h-4" aria-hidden />
                {label}
              </div>
              <ShoppingBag className="w-14 h-14 text-amber-800/40" aria-hidden />
              <p className="text-sm text-amber-900/70 font-medium">Фото не добавлены</p>
            </div>
          )}
        </div>

        {lightboxOpen && Array.isArray(l.imageUrls) && l.imageUrls.length > 0 ? (
          <div
            className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-[1px] flex items-center justify-center p-3 sm:p-6"
            role="presentation"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setLightboxOpen(false);
            }}
          >
            <div className="w-full max-w-5xl">
              <div className="flex items-center justify-between gap-3 mb-3">
                <p className="text-white/90 text-sm font-semibold">
                  Фото {Math.min(activeImg, l.imageUrls.length - 1) + 1} из {l.imageUrls.length}
                </p>
                <button
                  type="button"
                  onClick={() => setLightboxOpen(false)}
                  className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-semibold"
                >
                  Закрыть
                </button>
              </div>
              <div className="rounded-2xl overflow-hidden bg-black border border-white/10">
                <ZoomLensImage src={l.imageUrls[Math.min(activeImg, l.imageUrls.length - 1)]} alt="" />
              </div>
              {l.imageUrls.length > 1 ? (
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                  {l.imageUrls.map((u, i) => (
                    <button
                      key={u + i}
                      type="button"
                      onClick={() => setActiveImg(i)}
                      className={`shrink-0 w-24 h-16 rounded-lg overflow-hidden border ${
                        i === activeImg ? "border-emerald-300 ring-2 ring-emerald-200/40" : "border-white/15"
                      }`}
                      title={`Фото ${i + 1}`}
                    >
                      <img src={u} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              ) : null}
              <p className="mt-2 text-xs text-white/70">
                Лупу добавлю следующим шагом: при наведении будет увеличенный фрагмент.
              </p>
            </div>
          </div>
        ) : null}

        <div className="p-6 sm:p-8 space-y-4">
          <h1 className="font-bold text-2xl sm:text-3xl text-gray-900 leading-tight">{l.title}</h1>
          <div className="flex flex-wrap gap-3 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4 shrink-0" />
              {l.region}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4 shrink-0" />
              {whenStr}
            </span>
            <span className="inline-flex items-center gap-2 font-medium text-gray-800">
              <Link to={`/users/${l.author.id}`} className="shrink-0" title="Профиль автора объявления">
                <UserAvatar
                  avatarUrl={l.author.profile?.avatarUrl}
                  label={authorLabel}
                  className="w-8 h-8"
                  ringClassName="ring-2 ring-gray-100"
                  moderation={l.authorModeration ?? undefined}
                />
              </Link>
              <Link className="hover:text-emerald-700 hover:underline min-w-0" to={`/users/${l.author.id}`}>
                {authorLabel}
              </Link>
            </span>
          </div>

          {!isSold && !isAuthor ? (
            <div className="pt-2">
              <MarketplaceContactSellerButton
                sellerUserId={l.author.id}
                listingTitle={l.title}
                listingType={l.type}
                listingDescription={l.description}
                className="w-full sm:w-auto"
              />
            </div>
          ) : null}

          {isSold && listing.buyer && (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 flex flex-wrap items-center gap-3">
              <UserCheck className="w-5 h-5 text-emerald-700 shrink-0" aria-hidden />
              <div className="min-w-0 text-sm">
                <p className="font-bold text-emerald-900">Сделка зафиксирована автором объявления</p>
                <p className="text-emerald-800 mt-0.5">
                  Покупатель:{" "}
                  <Link
                    className="font-semibold underline decoration-emerald-600/70 hover:no-underline"
                    to={`/users/${listing.buyer.id}`}
                  >
                    {buyerLabel}
                  </Link>
                </p>
              </div>
              <Lock className="w-5 h-5 text-emerald-600 ml-auto shrink-0" aria-hidden />
            </div>
          )}

          <div className="whitespace-pre-wrap text-gray-800 leading-relaxed border-t border-gray-100 pt-6">
            {l.description}
          </div>

          <div className="border-t border-gray-100 pt-6 space-y-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-amber-700" />
              Комментарии
              {isSold ? (
                <span className="text-xs font-medium text-gray-500 normal-case ml-2">обсуждение закрыто</span>
              ) : null}
            </h2>

            {!isSold && !authReady ? (
              <p className="text-sm text-gray-500">Проверяем авторизацию…</p>
            ) : !isSold && authReady ? (
              !user ? (
                <p className="text-sm text-gray-600">
                  <Link className="text-amber-800 font-semibold hover:underline" to="/login">
                    Войдите
                  </Link>
                  , чтобы оставить комментарий автору объявления.
                </p>
              ) : (
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-gray-600" htmlFor="listing-comment">
                    Ваш комментарий
                  </label>
                  <textarea
                    id="listing-comment"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Вопрос, уточнение цены или готовность купить…"
                    maxLength={8000}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <div className="flex flex-wrap justify-between gap-3 items-center">
                    <span className="text-xs text-gray-500">{commentText.length}/8000</span>
                    <button
                      type="button"
                      disabled={!commentText.trim() || postingComment}
                      onClick={() => void postComment()}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                      {postingComment ? "Отправка…" : "Отправить"}
                    </button>
                  </div>
                  {commentErr ? <p className="text-sm text-red-600">{commentErr}</p> : null}
                </div>
              )
            ) : isSold ? (
              <p className="text-sm text-gray-600 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                По этому объявлению автор отметил сделку — новые комментарии отключены. История переписки выше сохранена.
              </p>
            ) : null}

            {l.messages && l.messages.length > 0 ? (
              <ul className="space-y-3">
                {l.messages.map((m) => {
                  const snd = senderLabel(m.sender);
                  const mw = new Date(m.createdAt);
                  return (
                    <li key={m.id} className="rounded-xl bg-gray-50 border border-gray-100 p-3 sm:p-4 text-sm">
                      <div className="flex gap-3">
                        <Link to={`/users/${m.sender.id}`} className="shrink-0">
                          <UserAvatar
                            avatarUrl={m.sender.profile?.avatarUrl}
                            label={snd}
                            className="w-10 h-10"
                            ringClassName="ring-2 ring-gray-100"
                            moderation={m.senderModeration ?? undefined}
                          />
                        </Link>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap justify-between gap-2 text-xs text-gray-500 mb-1">
                            <Link
                              to={`/users/${m.sender.id}`}
                              className="font-semibold text-gray-800 hover:text-amber-800 hover:underline"
                            >
                              {snd}
                            </Link>
                            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                              <span>
                                {Number.isFinite(mw.getTime())
                                  ? mw.toLocaleString("ru-RU", {
                                      dateStyle: "short",
                                      timeStyle: "short",
                                    })
                                  : ""}
                              </span>
                              {user && user.id !== m.sender.id ? (
                                <ReportAbuseTrigger
                                  modalLabel={`Комментарий к объявлению «${listing.title.slice(0, 56)}${listing.title.length > 56 ? "…" : ""}»`}
                                  payload={{ targetType: "LISTING_MESSAGE", listingMessageId: m.id }}
                                  className="text-[11px] font-semibold text-amber-800/70 hover:text-red-700"
                                >
                                  Жалоба
                                </ReportAbuseTrigger>
                              ) : null}
                            </span>
                          </div>
                          <p className="text-gray-800 whitespace-pre-wrap">{m.body}</p>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              !isSold && (
                <p className="text-xs text-gray-500">Комментариев пока нет — можете стать первым после входа.</p>
              )
            )}
          </div>

          {isAuthor && !isSold && authReady && user && (
            <div className="border-t border-gray-100 pt-6 space-y-3">
              <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                Покупатель и закрытие объявления
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Когда вы договорились о сделке, выберите покупателя из тех, кто{" "}
                <span className="font-medium text-gray-800">оставил хотя бы один комментарий</span> под объявлением (не вы
                сами). После подтверждения добавить сообщения будет нельзя, а покупатель увиден всем на странице.
              </p>
              {commentCandidates.length === 0 ? (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  Дождитесь комментария от другого пользователя — затем здесь появится выбор покупателя.
                </p>
              ) : (
                <>
                  <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                    <label className="text-xs font-medium text-gray-700 shrink-0" htmlFor="buyer-choice">
                      Кто купил
                    </label>
                    <select
                      id="buyer-choice"
                      value={soldChoice}
                      onChange={(e) => {
                        setSoldChoice(e.target.value);
                        setSoldErr("");
                      }}
                      className="flex-1 min-w-0 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                    >
                      <option value="">— Выберите —</option>
                      {commentCandidates.map(([uid, snd]) => (
                        <option key={uid} value={uid}>
                          {senderLabel(snd)}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={soldBusy || !soldChoice.trim()}
                      onClick={() => void confirmBuyer()}
                      className="inline-flex justify-center px-4 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {soldBusy ? "Сохранение…" : "Подтвердить сделку"}
                    </button>
                  </div>
                  {soldErr ? <p className="text-sm text-red-600">{soldErr}</p> : null}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

type ViewState =
  | { status: "loading" }
  | { status: "api"; listing: ApiListing }
  | { status: "demo"; listing: DemoMarketListing }
  | { status: "missing" }
  | { status: "error"; message: string };

/** Карточка объявления: API по cuid или демо по числу в URL (/marketplace/1). */
export default function MarketplaceListingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [state, setState] = useState<ViewState>({ status: "loading" });

  useEffect(() => {
    if (!id?.trim()) {
      setState({ status: "missing" });
      return;
    }

    let cancelled = false;
    setState({ status: "loading" });

    (async () => {
      try {
        const listing = await apiFetch<ApiListing>(`/api/listings/${encodeURIComponent(id)}`);
        if (!cancelled) setState({ status: "api", listing });
      } catch (e: unknown) {
        const demo = getDemoMarketplaceListing(id);
        if (!cancelled) {
          if (demo) setState({ status: "demo", listing: demo });
          else {
            const msg = e instanceof Error ? e.message : "Не удалось открыть объявление.";
            // Если id не найден — показываем «не найдено», иначе — текст ошибки.
            const low = String(msg).toLowerCase();
            if (low.includes("not found") || low.includes("404") || low.includes("не найден")) {
              setState({ status: "missing" });
            } else {
              setState({ status: "error", message: msg });
            }
          }
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (state.status === "loading") {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-12 text-center text-gray-600">
        Загрузка объявления…
      </div>
    );
  }

  if (state.status === "missing") {
    return (
      <div className="max-w-lg mx-auto space-y-6 text-center py-12">
        <h1 className="text-xl font-bold text-gray-900">Объявление не найдено</h1>
        <p className="text-gray-600 text-sm">
          В базе нет записи с таким id или демо-описание с этим номером. Вернитесь в маркетплейс и откройте карточку снова.
        </p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="text-amber-800 font-medium hover:underline"
        >
          Назад
        </button>
        <Link
          to="/marketplace"
          className="inline-block ml-4 text-amber-800 font-medium hover:underline"
        >
          Маркетплейс
        </Link>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="max-w-lg mx-auto space-y-6 text-center py-12">
        <h1 className="text-xl font-bold text-gray-900">Не удалось открыть объявление</h1>
        <p className="text-gray-600 text-sm whitespace-pre-wrap">{state.message}</p>
        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="text-amber-800 font-medium hover:underline"
          >
            Назад
          </button>
          <Link
            to="/marketplace"
            className="text-amber-800 font-medium hover:underline"
          >
            Маркетплейс
          </Link>
        </div>
      </div>
    );
  }

  if (state.status === "api") {
    return (
      <MarketplaceApiListingDetail listingId={id!.trim()} initial={state.listing} />
    );
  }

  const l = state.listing;
  const config = demoUi[l.type];
  const Icon = config.Icon;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link
        to="/marketplace"
        className="inline-flex items-center gap-2 text-sm text-amber-800 hover:text-amber-900 font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        К маркетплейсу
      </Link>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="relative h-52 sm:h-72 bg-gray-200">
          <img src={l.image} alt="" className="w-full h-full object-cover" />
          <div
            className={`absolute top-4 left-4 flex items-center gap-2 px-3 py-2 rounded-lg border-2 ${config.bgColor} ${config.textColor} ${config.borderColor} font-semibold text-sm`}
          >
            <Icon className="w-4 h-4" />
            {config.label}
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-5">
          {l.price ? (
            <p className="text-3xl font-bold text-emerald-700">{l.price}</p>
          ) : l.type === "free" ? (
            <p className="text-3xl font-bold text-blue-700">Бесплатно</p>
          ) : null}

          <h1 className="font-bold text-2xl sm:text-3xl text-gray-900 leading-tight">{l.title}</h1>

          <div className="flex flex-wrap gap-3 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {l.location}
            </span>
            <span className="bg-gray-100 px-2 py-1 rounded">{l.category}</span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {l.time}
            </span>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <User className="w-5 h-5 text-amber-800" />
            </div>
            <span className="font-semibold text-gray-900">{l.author}</span>
          </div>

          <MarketplaceContactSellerButton
            sellerUserId={null}
            listingTitle={l.title}
            listingType={demoListingApiType(l.type)}
            listingDescription={l.description}
            disabledReason="Демо-объявление: автор не зарегистрирован в системе."
            className="w-full sm:w-auto"
          />

          <p className="whitespace-pre-wrap text-gray-800 leading-relaxed">{l.description}</p>

          <p className="text-xs text-gray-500 pt-4 border-t border-gray-100">
            Демо-объявление для интерфейса. Условия и контактные данные не являются реальными.
          </p>
        </div>
      </div>
    </div>
  );
}
