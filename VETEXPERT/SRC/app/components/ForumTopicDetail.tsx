import {
  ArrowLeft,
  MessageSquare,
  ThumbsUp,
  Eye,
  Clock,
  MapPin,
  Share2,
  Bookmark,
  Send,
  CheckCircle,
  Award,
  Pencil,
  Flag,
  CornerDownLeft,
  ImagePlus,
  Paperclip,
  Trash2,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import TranslatedContent from "./TranslatedContent";
import ForumRenderedBody, { FORUM_EMBEDDED_IMAGE_LINE } from "./ForumRenderedBody";
import { ForumUrgencyBadgeOnGradient, ForumUrgencyIcon } from "./ForumUrgencyVisual";
import UserAvatar from "./UserAvatar";
import {
  apiAttachmentsPolicy,
  apiFetch,
  apiUploadMessageAttachment,
  apiUploadThreadImage,
  assetUrl,
  getOrCreateForumVisitorId,
  type AttachmentsPolicyDto,
} from "../../lib/api";
import { applyRoutePageSeo, getCachedSiteSeo, plainTextExcerpt } from "../../lib/documentSeo";
import { creatorForumTagLabels, tagsLookHot, urgencyFromTags } from "../../lib/forumTags";
import ReportAbuseTrigger from "./ReportAbuseModal";
import type { PublicModerationDto } from "../../lib/moderationUi";

type ApiProfileMini = {
  displayName?: string | null;
  city?: string | null;
  country?: { nameRu?: string | null } | null;
  avatarUrl?: string | null;
};

type ApiForumThread = {
  id: string;
  title: string;
  tags: string;
  updatedAt: string;
  /** Уникальные посетители (берётся из API после открытия темы). */
  uniqueViewCount?: number;
  likeCount?: number;
  /** Учитывается Bearer или anonVisitorId в query при загрузке темы. */
  likedByMe?: boolean;
  acceptedPostId?: string | null;
  solvedAt?: string | null;
  coverImageUrls?: string[];
  category: { name: string; slug: string };
  author: {
    id: string;
    email: string;
    profile?: ApiProfileMini | null;
  };
  authorModeration?: PublicModerationDto | null;
  posts: Array<{
    id: string;
    body: string;
    createdAt: string;
    author: {
      id: string;
      email: string;
      profile?: ApiProfileMini | null;
    };
    authorModeration?: PublicModerationDto | null;
  }>;
};

function displayName(profile: ApiProfileMini | null | undefined, email: string) {
  return profile?.displayName?.trim() || email;
}

function displayLocation(profile: ApiProfileMini | null | undefined) {
  const loc = [profile?.city?.trim(), profile?.country?.nameRu].filter(Boolean).join(", ");
  return loc || "—";
}

function isForumImageAttachmentUrl(url: string): boolean {
  const t = url.trim();
  if (FORUM_EMBEDDED_IMAGE_LINE.test(t)) return true;
  const tl = t.toLowerCase();
  return tl.startsWith("/uploads/messages/") && /\.(jpe?g|png|webp|gif)$/i.test(tl);
}

function formatRelativeRu(iso: string): string {
  const d = new Date(iso);
  const ms = Date.now() - d.getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "только что";
  if (m < 60) return `${m} мин назад`;
  const h = Math.floor(m / 60);
  if (h < 36) return `${h} ч назад`;
  const days = Math.floor(h / 24);
  if (days < 14) return `${days} дн. назад`;
  return d.toLocaleDateString("ru-RU");
}

function getUrgencyConfig(urgency?: string) {
  switch (urgency) {
    case "critical":
      return {
        color: "from-red-500 to-red-600",
        bgColor: "bg-red-50",
        borderColor: "border-red-300",
        textColor: "text-red-700",
      };
    case "high":
      return {
        color: "from-orange-500 to-orange-600",
        bgColor: "bg-orange-50",
        borderColor: "border-orange-300",
        textColor: "text-orange-700",
      };
    case "medium":
      return {
        color: "from-yellow-500 to-yellow-600",
        bgColor: "bg-yellow-50",
        borderColor: "border-yellow-300",
        textColor: "text-yellow-700",
      };
    default:
      return {
        color: "from-emerald-500 to-teal-600",
        bgColor: "bg-gray-50",
        borderColor: "border-gray-300",
        textColor: "text-gray-700",
      };
  }
}

export default function ForumTopicDetail() {
  const rawId = useParams().id ?? "";
  const navigate = useNavigate();
  const { user } = useAuth();

  const [replyText, setReplyText] = useState("");
  /** URL вида /uploads/thread/… после успешной загрузки на сервер */
  const [replyAttachmentUrls, setReplyAttachmentUrls] = useState<string[]>([]);
  const [replyUploading, setReplyUploading] = useState(false);
  const [attachPolicy, setAttachPolicy] = useState<AttachmentsPolicyDto | null>(null);
  const [likeBusy, setLikeBusy] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [submittingReply, setSubmittingReply] = useState(false);
  const [replyToUserId, setReplyToUserId] = useState<string | null>(null);
  const [acceptingPostId, setAcceptingPostId] = useState<string | null>(null);
  const [editingOpener, setEditingOpener] = useState(false);
  const [openerDraftTitle, setOpenerDraftTitle] = useState("");
  const [openerDraftBody, setOpenerDraftBody] = useState("");
  const [openerSaveErr, setOpenerSaveErr] = useState("");
  const [savingOpener, setSavingOpener] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [postDraftBody, setPostDraftBody] = useState("");
  const [postEditErr, setPostEditErr] = useState("");
  const [savingPostId, setSavingPostId] = useState<string | null>(null);

  const [apiThread, setApiThread] = useState<ApiForumThread | null>(null);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiErr, setApiErr] = useState("");

  const isLegacyNumericId = /^[0-9]+$/.test(rawId);

  const loadApiThread = useCallback(() => {
    if (isLegacyNumericId || !rawId) return Promise.resolve(null);
    const anonQs = user
      ? ""
      : `?anonVisitorId=${encodeURIComponent(getOrCreateForumVisitorId())}`;
    return apiFetch<ApiForumThread>(`/api/forum/threads/${encodeURIComponent(rawId)}${anonQs}`)
      .then((t) => {
        setApiThread(t);
        setApiErr("");
        return t;
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e);
        setApiErr(msg);
        setApiThread(null);
        return null;
      });
  }, [isLegacyNumericId, rawId, user]);

  useEffect(() => {
    if (isLegacyNumericId || !rawId) {
      setApiThread(null);
      setApiLoading(false);
      return;
    }
    setApiLoading(true);
    setApiErr("");
    loadApiThread().finally(() => setApiLoading(false));
  }, [isLegacyNumericId, rawId, loadApiThread]);

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

  useEffect(() => {
    if (!apiThread?.solvedAt) return;
    setEditingOpener(false);
    setEditingPostId(null);
  }, [apiThread?.solvedAt, apiThread?.id]);

  /** Один запрос на открытие карточки: сервер засчитывает не более одного просмотра на u:{id} или a:{uuid}. */
  useEffect(() => {
    if (isLegacyNumericId || !apiThread?.id) return;
    const threadId = apiThread.id;
    const json = user ? {} : { anonVisitorId: getOrCreateForumVisitorId() };
    let cancelled = false;
    apiFetch<{ uniqueViewCount: number; counted: boolean }>(
      `/api/forum/threads/${encodeURIComponent(threadId)}/register-view`,
      { method: "POST", json },
    )
      .then((r) => {
        if (cancelled || typeof r?.uniqueViewCount !== "number") return;
        setApiThread((prev) => (prev?.id === threadId ? { ...prev, uniqueViewCount: r.uniqueViewCount } : prev));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isLegacyNumericId, apiThread?.id, user?.id]);

  useEffect(() => {
    if (!apiThread || isLegacyNumericId || !rawId) return;
    const path = `/forum/topic/${rawId}`;
    const opener = apiThread.posts[0]?.body ?? "";
    const desc = plainTextExcerpt(`Раздел «${apiThread.category.name}». ${apiThread.title}. ${opener}`, 300);
    applyRoutePageSeo(path, getCachedSiteSeo(), { title: apiThread.title, description: desc });
  }, [apiThread, rawId, isLegacyNumericId]);

  useEffect(() => {
    const sid = "ld-json-forum-thread-page";
    if (!apiThread || isLegacyNumericId || !rawId) {
      document.getElementById(sid)?.remove();
      return;
    }
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/forum/topic/${encodeURIComponent(rawId)}`;
    const openerText = plainTextExcerpt(apiThread.posts[0]?.body ?? "", 450);
    const replyCount = Math.max(0, apiThread.posts.length - 1);
    const payload = {
      "@context": "https://schema.org",
      "@type": "DiscussionForumPosting",
      headline: apiThread.title,
      articleSection: apiThread.category.name,
      inLanguage: "ru",
      url,
      ...(openerText ? { text: openerText } : {}),
      commentCount: replyCount,
    };
    document.getElementById(sid)?.remove();
    const el = document.createElement("script");
    el.id = sid;
    el.type = "application/ld+json";
    el.textContent = JSON.stringify(payload);
    document.head.appendChild(el);
    return () => {
      document.getElementById(sid)?.remove();
    };
  }, [apiThread, rawId, isLegacyNumericId]);

  const toggleTopicLike = useCallback(() => {
    if (isLegacyNumericId || !apiThread?.id || likeBusy) return;
    const threadId = apiThread.id;
    setLikeBusy(true);
    const json = user ? {} : { anonVisitorId: getOrCreateForumVisitorId() };
    apiFetch<{ likeCount: number; liked: boolean }>(
      `/api/forum/threads/${encodeURIComponent(threadId)}/toggle-like`,
      { method: "POST", json },
    )
      .then((r) => {
        if (typeof r?.likeCount !== "number" || typeof r?.liked !== "boolean") return;
        setApiThread((prev) =>
          prev?.id === threadId ? { ...prev, likeCount: r.likeCount, likedByMe: r.liked } : prev,
        );
      })
      .catch(() => {})
      .finally(() => setLikeBusy(false));
  }, [apiThread?.id, isLegacyNumericId, likeBusy, user]);

  if (!rawId.trim()) {
    return (
      <div className="space-y-4">
        <button type="button" onClick={() => navigate("/forum")} className="flex items-center gap-2 text-gray-600">
          <ArrowLeft className="w-4 h-4" />
          Назад к форуму
        </button>
        <p className="text-gray-600">Тема не указана.</p>
      </div>
    );
  }

  if (isLegacyNumericId) {
    return (
      <div className="space-y-4 lg:space-y-6">
        <button
          type="button"
          onClick={() => navigate("/forum")}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm lg:text-base"
        >
          <ArrowLeft className="w-4 h-4 lg:w-5 lg:h-5" />
          Назад к форуму
        </button>
        <div className="bg-white rounded-xl border border-amber-200 p-8 text-center text-amber-900">
          Ссылка в старом формате (локальный демо-id). Откройте тему из{" "}
          <button type="button" className="underline font-semibold" onClick={() => navigate("/forum")}>
            общей ленты форума
          </button>
          — там используются идентификаторы из базы данных.
        </div>
      </div>
    );
  }

  if (apiLoading) {
    return (
      <div className="space-y-4 lg:space-y-6">
        <button
          type="button"
          onClick={() => navigate("/forum")}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm lg:text-base"
        >
          <ArrowLeft className="w-4 h-4 lg:w-5 lg:h-5" />
          Назад к форуму
        </button>
        <p className="text-gray-600">Загрузка темы…</p>
      </div>
    );
  }

  if (apiErr) {
    return (
      <div className="space-y-4 lg:space-y-6">
        <button
          type="button"
          onClick={() => navigate("/forum")}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm lg:text-base"
        >
          <ArrowLeft className="w-4 h-4 lg:w-5 lg:h-5" />
          Назад к форуму
        </button>
        <div className="bg-white rounded-xl border border-red-200 p-8 text-center text-red-700">
          {apiErr.includes("404") ? "Тема не найдена" : `Ошибка: ${apiErr}`}
        </div>
      </div>
    );
  }

  if (!apiThread || apiThread.posts.length === 0) {
    return (
      <div className="space-y-4 lg:space-y-6">
        <button
          type="button"
          onClick={() => navigate("/forum")}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm lg:text-base"
        >
          <ArrowLeft className="w-4 h-4 lg:w-5 lg:h-5" />
          Назад к форуму
        </button>
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-600">Тема пустая</div>
      </div>
    );
  }

  const t = apiThread;
  const opener = t.posts[0];
  const threadHeaderModeration = t.authorModeration ?? opener.authorModeration ?? null;
  const replies = t.posts.slice(1);
  const isHotUi = tagsLookHot(t.tags);
  const urg = urgencyFromTags(t.tags);
  const creatorTags = creatorForumTagLabels(t.tags || "");
  const urgencyConfig = getUrgencyConfig(urg);
  /** Для горячих тем без тега URGENCY — показываем «Срочно» как минимальный уровень */
  const displayUrg =
    urg ?? (isHotUi ? ("medium" as const) : undefined);

  const solved = Boolean(t.acceptedPostId && t.solvedAt);
  /** После выбора решения (и для любых сценариев с заполненным solvedAt): без новых ответов и правок. */
  const threadLocked = Boolean(t.solvedAt);

  const beginEditOpener = () => {
    setEditingPostId(null);
    setPostEditErr("");
    setEditingOpener(true);
    setOpenerDraftTitle(t.title);
    setOpenerDraftBody(opener.body);
    setOpenerSaveErr("");
  };

  const cancelEditOpener = () => {
    setEditingOpener(false);
    setOpenerSaveErr("");
  };

  const saveOpenerEdits = async () => {
    setOpenerSaveErr("");
    const titleTrim = openerDraftTitle.trim();
    const bodyTrim = openerDraftBody.trim();
    if (titleTrim.length < 3) {
      setOpenerSaveErr("Заголовок не короче 3 символов.");
      return;
    }
    if (bodyTrim.length < 1) {
      setOpenerSaveErr("Текст открытого сообщения не может быть пустым.");
      return;
    }
    setSavingOpener(true);
    try {
      await apiFetch(`/api/forum/threads/${encodeURIComponent(t.id)}`, {
        method: "PATCH",
        json: { title: titleTrim, body: bodyTrim },
      });
      await loadApiThread();
      setEditingOpener(false);
    } catch (e: unknown) {
      setOpenerSaveErr(e instanceof Error ? e.message : "Не удалось сохранить тему");
    } finally {
      setSavingOpener(false);
    }
  };

  const saveReplyPatch = async (postId: string) => {
    const b = postDraftBody.trim();
    if (b.length < 1) {
      setPostEditErr("Текст не может быть пустым.");
      return;
    }
    setPostEditErr("");
    setSavingPostId(postId);
    try {
      await apiFetch(`/api/forum/posts/${encodeURIComponent(postId)}`, {
        method: "PATCH",
        json: { body: b },
      });
      await loadApiThread();
      setEditingPostId(null);
    } catch (e: unknown) {
      setPostEditErr(e instanceof Error ? e.message : "Не удалось сохранить");
    } finally {
      setSavingPostId(null);
    }
  };

  /** Кнопка «решение» только для сообщений других пользователей, не своих доп. постов автора темы */
  function replyCanBeChosenAsSolution(reply: (typeof replies)[number]): boolean {
    const threadAuthor = t.author;
    const replyAuthor = reply.author;
    if (!threadAuthor || !replyAuthor) return false;
    if (threadAuthor.id && replyAuthor.id) {
      return replyAuthor.id !== threadAuthor.id;
    }
    const replyEmail = replyAuthor.email?.trim().toLowerCase() ?? "";
    const threadEmail = threadAuthor.email?.trim().toLowerCase() ?? "";
    if (!replyEmail || !threadEmail) return false;
    return replyEmail !== threadEmail;
  }
  const hasOthersReplies = replies.some(replyCanBeChosenAsSolution);
  const authorCanPickSolution =
    Boolean(user?.id === t.author.id) && isHotUi && !solved && hasOthersReplies;

  const submitReply = async () => {
    const text = replyText.trim();
    if (!text && replyAttachmentUrls.length === 0) return;
    if (!user) {
      navigate("/login");
      return;
    }
    setSubmittingReply(true);
    try {
      await apiFetch(`/api/forum/threads/${encodeURIComponent(t.id)}/posts`, {
        method: "POST",
        json: {
          body: text,
          ...(replyAttachmentUrls.length > 0 ? { attachmentUrls: replyAttachmentUrls } : {}),
        },
      });
      setReplyText("");
      setReplyAttachmentUrls([]);
      await loadApiThread();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Не удалось отправить ответ");
    } finally {
      setSubmittingReply(false);
    }
  };

  const acceptSolution = async (postId: string) => {
    if (!user) {
      navigate("/login");
      return;
    }
    setAcceptingPostId(postId);
    try {
      await apiFetch(`/api/forum/threads/${encodeURIComponent(t.id)}/solution`, {
        method: "POST",
        json: { postId },
      });
      await loadApiThread();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Не удалось отметить решение");
    } finally {
      setAcceptingPostId(null);
    }
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      <button
        type="button"
        onClick={() => navigate("/forum")}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm lg:text-base"
      >
        <ArrowLeft className="w-4 h-4 lg:w-5 lg:h-5" />
        Назад к форуму
      </button>

      <div
        className={`bg-gradient-to-br ${
          isHotUi && solved
            ? "from-emerald-700 via-teal-700 to-cyan-900"
            : isHotUi
              ? "from-orange-600 to-red-600"
              : urgencyConfig.color
        } text-white rounded-xl lg:rounded-2xl p-5 lg:p-8 shadow-xl`}
      >
        {isHotUi && solved && (
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="px-3 py-1.5 rounded-lg bg-white/25 backdrop-blur-sm border border-white/40 text-sm font-bold inline-flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Решено
            </span>
            <span className="text-sm text-white/90 font-medium">Горячая тема сохранена в ленте</span>
          </div>
        )}
        {isHotUi && !solved && (
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="px-3 py-1.5 rounded-lg bg-white/20 backdrop-blur-sm border border-white/30 text-sm font-bold inline-flex items-center gap-2">
              <ForumUrgencyIcon level="critical" accent="onDark" className="w-4 h-4" />
              Горячая тема
            </span>
            {displayUrg && <ForumUrgencyBadgeOnGradient level={displayUrg} iconClassName="w-4 h-4" />}
          </div>
        )}
        {!isHotUi && displayUrg && (
          <div className="mb-3">
            <ForumUrgencyBadgeOnGradient level={displayUrg} iconClassName="w-4 h-4" />
          </div>
        )}
        {editingOpener && user?.id === t.author.id && !threadLocked ? (
          <input
            type="text"
            value={openerDraftTitle}
            onChange={(e) => setOpenerDraftTitle(e.target.value)}
            maxLength={200}
            aria-label="Заголовок темы"
            className="mb-4 w-full max-w-full rounded-xl border border-white/40 bg-white/95 px-4 py-3 text-lg sm:text-xl lg:text-3xl font-bold text-gray-900 shadow-inner focus:outline-none focus:ring-2 focus:ring-white/80"
          />
        ) : (
          <TranslatedContent text={t.title} originalLang="ru" className="font-bold text-xl sm:text-2xl lg:text-3xl mb-4 leading-tight" />
        )}
        <div className="flex flex-wrap items-center gap-3 text-sm lg:text-base text-white/90">
          <Link
            to={`/users/${t.author.id}`}
            className="flex flex-wrap items-center gap-3 min-w-0 rounded-xl pr-3 -ml-1 pl-1 py-1 hover:bg-white/10 transition-colors"
          >
            <UserAvatar
              avatarUrl={t.author.profile?.avatarUrl}
              label={displayName(t.author.profile, t.author.email)}
              className="w-11 h-11 sm:w-12 sm:h-12 shrink-0"
              ringClassName="ring-2 ring-white/50"
              moderation={threadHeaderModeration ?? undefined}
            />
            <span className="font-semibold text-white truncate max-w-[12rem] sm:max-w-md">
              {displayName(t.author.profile, t.author.email)}
            </span>
          </Link>
          <span className="flex items-center gap-1 shrink-0">
            <MapPin className="w-4 h-4" />
            {displayLocation(t.author.profile)}
          </span>
          <span className="bg-white/20 px-3 py-1 rounded-lg font-medium shrink-0">{t.category.name}</span>
        </div>
      </div>

      {t.coverImageUrls && t.coverImageUrls.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 lg:p-5">
          <p className="text-xs uppercase tracking-wide font-semibold text-teal-800 mb-3">Иллюстрации к теме</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 lg:gap-3">
            {t.coverImageUrls.map((u) => (
              <a
                key={u}
                href={assetUrl(u)}
                target="_blank"
                rel="noopener noreferrer"
                className="block aspect-video rounded-xl overflow-hidden border border-gray-200 shadow-sm hover:ring-2 hover:ring-teal-400 transition-shadow bg-gray-50"
              >
                <img src={assetUrl(u)} alt="" loading="lazy" className="w-full h-full object-cover" />
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-4 lg:p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4 text-sm lg:text-base text-gray-600">
            <span className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              <span className="font-semibold">{typeof t.uniqueViewCount === "number" ? t.uniqueViewCount : "—"}</span>{" "}
              просмотров
            </span>
            <span className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              <span className="font-semibold">{replies.length}</span> комментариев и ответов
            </span>
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {formatRelativeRu(t.updatedAt)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => toggleTopicLike()}
              disabled={likeBusy}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm cursor-pointer disabled:opacity-60 disabled:cursor-wait select-none touch-manipulation ${
                t.likedByMe
                  ? "bg-emerald-100 text-emerald-700 border-2 border-emerald-300"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
              aria-pressed={t.likedByMe === true}
            >
              <ThumbsUp className={`w-4 h-4 ${t.likedByMe ? "fill-current" : ""}`} />
              {typeof t.likeCount === "number" ? t.likeCount : 0}
            </button>
            <button type="button" onClick={() => setBookmarked(!bookmarked)} className="p-2 bg-gray-100 rounded-lg">
              <Bookmark className={`w-5 h-5 ${bookmarked ? "fill-current text-amber-700" : ""}`} />
            </button>
            <button type="button" className="p-2 bg-gray-100 rounded-lg">
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>
        {creatorTags.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-2">
            <span className="text-xs font-medium text-gray-500 shrink-0">Теги</span>
            <ul className="flex flex-wrap gap-2 list-none m-0 p-0">
              {creatorTags.map((label) => (
                <li key={label}>
                  <span className="inline-flex max-w-[14rem] sm:max-w-xs truncate px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-900 border border-emerald-200/80 shadow-sm">
                    {label}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 lg:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <p className="text-xs uppercase tracking-wide text-emerald-700 font-semibold m-0">Открытое сообщение</p>
          {user?.id === t.author.id && !threadLocked && !editingOpener && (
            <button
              type="button"
              onClick={beginEditOpener}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-900 text-xs font-semibold hover:bg-emerald-100"
            >
              <Pencil className="w-3.5 h-3.5" />
              Изменить тему
            </button>
          )}
          {user?.id === t.author.id && !threadLocked && editingOpener && (
            <span className="text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">Редактирование</span>
          )}
        </div>
        {authorCanPickSolution && (
          <p className="text-sm text-gray-700 bg-violet-50 border border-violet-200 rounded-lg px-4 py-3 mb-4">
            Есть ответы от других коллег — отметьте одно сообщение ниже как{" "}
            <span className="font-semibold">решение</span>: автор получит VetCoin. Собственные уточнения под темой выбрать
            решением нельзя.
          </p>
        )}
        {editingOpener && user?.id === t.author.id && !threadLocked ? (
          <div className="space-y-3">
            <textarea
              value={openerDraftBody}
              onChange={(e) => setOpenerDraftBody(e.target.value)}
              maxLength={20000}
              aria-label="Текст первого сообщения темы"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm lg:text-base min-h-[180px]"
            />
            {openerSaveErr ? <p className="text-sm text-red-600">{openerSaveErr}</p> : null}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={savingOpener}
                onClick={() => void saveOpenerEdits()}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
              >
                {savingOpener ? "Сохранение…" : "Сохранить"}
              </button>
              <button
                type="button"
                disabled={savingOpener}
                onClick={cancelEditOpener}
                className="px-5 py-2.5 rounded-lg border border-gray-300 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-50"
              >
                Отмена
              </button>
            </div>
          </div>
        ) : (
          <ForumRenderedBody
            text={opener.body}
            originalLang="ru"
            className="text-gray-800 text-sm lg:text-base xl:text-lg leading-relaxed"
          />
        )}
        <div className="mt-4 text-xs text-gray-500 flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="inline-flex items-center gap-2">
            <Clock className="w-3 h-3" />
            {formatRelativeRu(opener.createdAt)}
          </span>
          {user && user.id !== opener.author.id ? (
            <ReportAbuseTrigger
              modalLabel={`Первое сообщение темы «${t.title.slice(0, 80)}${t.title.length > 80 ? "…" : ""}»`}
              payload={{ targetType: "POST", postId: opener.id }}
            />
          ) : null}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-bold text-lg lg:text-xl flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-emerald-600" />
          Комментарии ({replies.length})
        </h3>
        {replies.map((reply) => {
          const pn = reply.author.profile;
          const name = displayName(pn, reply.author.email);
          const isChosen = solved && reply.id === t.acceptedPostId;
          return (
            <div
              key={reply.id}
              className={
                isChosen
                  ? "relative rounded-xl lg:rounded-2xl overflow-hidden shadow-[0_0_42px_-4px_rgba(245,158,11,0.55)] ring-4 ring-amber-400/90 border border-amber-300 bg-gradient-to-br from-amber-50 via-orange-50/80 to-yellow-50 p-4 lg:p-6"
                  : `bg-white rounded-xl border p-4 lg:p-6 ${replyToUserId === reply.author.id ? "border-amber-200 ring-2 ring-amber-100" : "border-gray-200"}`
              }
            >
              {isChosen && (
                <div className="flex items-center gap-2 mb-4 text-amber-900 font-bold">
                  <span
                    className="text-2xl leading-none shrink-0 select-none motion-safe:animate-pulse"
                    role="img"
                    aria-label="Аплодисменты"
                  >
                    👏
                  </span>
                  <Award className="w-6 h-6 text-amber-600 shrink-0" aria-hidden />
                  <span className="text-sm sm:text-base">Лучший ответ по выбору автора темы</span>
                </div>
              )}
              <div className="flex items-start gap-3 lg:gap-4 mb-3">
                <Link
                  to={`/users/${reply.author.id}`}
                  className="shrink-0 rounded-full inline-flex"
                  title="Профиль автора"
                >
                  <UserAvatar
                    avatarUrl={pn?.avatarUrl}
                    label={name}
                    className="w-10 h-10 lg:w-12 lg:h-12"
                    ringClassName={isChosen ? "ring-[3px] ring-amber-400 shadow-md" : "ring-2 ring-gray-100"}
                    moderation={reply.authorModeration ?? undefined}
                  />
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <Link to={`/users/${reply.author.id}`} className="font-semibold text-gray-900 hover:text-emerald-800 hover:underline">
                      {name}
                    </Link>
                    {isChosen && (
                      <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wide text-amber-900 bg-amber-200/70 px-2 py-0.5 rounded-full">
                        Решение
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                    <MapPin className="w-3 h-3" />
                    {displayLocation(pn)}
                    <span>•</span>
                    <Clock className="w-3 h-3" />
                    {formatRelativeRu(reply.createdAt)}
                  </div>
                </div>
              </div>
              {editingPostId === reply.id ? (
                <div className="space-y-2">
                  <textarea
                    value={postDraftBody}
                    onChange={(e) => setPostDraftBody(e.target.value)}
                    maxLength={20000}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm lg:text-base min-h-[120px]"
                  />
                  {postEditErr ? <p className="text-sm text-red-600">{postEditErr}</p> : null}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={savingPostId !== null}
                      onClick={() => void saveReplyPatch(reply.id)}
                      className="inline-flex items-center px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {savingPostId === reply.id ? "Сохранение…" : "Сохранить"}
                    </button>
                    <button
                      type="button"
                      disabled={savingPostId !== null}
                      onClick={() => {
                        setEditingPostId(null);
                        setPostEditErr("");
                      }}
                      className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <ForumRenderedBody
                    text={reply.body}
                    originalLang="ru"
                    className="text-gray-700 text-sm lg:text-base leading-relaxed"
                  />
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    {user && user.id !== reply.author.id && !threadLocked ? (
                      <button
                        type="button"
                        onClick={() => {
                          setReplyToUserId(reply.author.id);
                          setReplyText((prev) => {
                            const mention = `@${name}, `;
                            const t0 = prev.trimStart();
                            if (t0.toLowerCase().startsWith(`@${name}`.toLowerCase())) return prev;
                            return prev ? `${mention}${prev}` : mention;
                          });
                          requestAnimationFrame(() => {
                            const el = document.querySelector<HTMLTextAreaElement>("#forum-reply-textarea");
                            el?.focus();
                          });
                        }}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:text-emerald-900"
                        title="Ответить"
                      >
                        <CornerDownLeft className="w-3.5 h-3.5" aria-hidden />
                        Ответить
                      </button>
                    ) : null}
                    {user?.id === reply.author.id && !threadLocked && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingOpener(false);
                          setOpenerSaveErr("");
                          setEditingPostId(reply.id);
                          setPostDraftBody(reply.body);
                          setPostEditErr("");
                        }}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:text-emerald-900"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Изменить сообщение
                      </button>
                    )}
                    {user && user.id !== reply.author.id ? (
                      <ReportAbuseTrigger
                        modalLabel={`Ответ в теме «${t.title.slice(0, 60)}${t.title.length > 60 ? "…" : ""}»`}
                        payload={{ targetType: "POST", postId: reply.id }}
                      />
                    ) : null}
                  </div>
                </>
              )}
              {authorCanPickSolution && replyCanBeChosenAsSolution(reply) && (
                <div className="mt-4 pt-4 border-t border-gray-200/80">
                  <button
                    type="button"
                    onClick={() => void acceptSolution(reply.id)}
                    disabled={acceptingPostId !== null}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 font-semibold text-white bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 shadow-md disabled:opacity-50 disabled:cursor-not-allowed text-sm lg:text-base"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {acceptingPostId === reply.id ? "Сохранение…" : "Это решение моей проблемы"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 lg:p-6">
        <h3 className="font-bold text-base lg:text-lg mb-4">Ваш комментарий</h3>
        {threadLocked ? (
          <p className="text-sm text-gray-600 py-6 text-center bg-gray-50 rounded-lg border border-gray-100 px-4">
            Тема закрыта (выбрано решение): новые ответы недоступны, тексты сообщений нельзя изменить.
          </p>
        ) : !user ? (
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">Войдите, чтобы ответить в теме</p>
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-3 rounded-lg font-semibold"
            >
              Войти
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <textarea
              id="forum-reply-textarea"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Поделитесь опытом…"
              className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm lg:text-base min-h-[120px]"
              maxLength={20000}
            />
            <div>
              <p className="text-sm font-medium text-gray-900 mb-2">Вложения</p>
              {attachPolicy === null ? (
                <p className="text-xs text-gray-500 mb-2">Загрузка настроек вложений…</p>
              ) : attachPolicy.messagesEnabled ? (
                <p className="text-xs text-gray-600 mb-2">
                  До {attachPolicy.forumMaxAttachmentLines} файлов, до {attachPolicy.maxMb} МБ каждый: PDF, изображения,
                  TXT, DOCX (настраивается в админке → Форум → Вложения).
                </p>
              ) : (
                <p className="text-xs text-gray-600 mb-2">
                  Загрузка файлов отключена администратором. Доступны только изображения JPEG/PNG/WebP/GIF до 8 МБ.
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {replyAttachmentUrls.map((url) =>
                  isForumImageAttachmentUrl(url) ? (
                    <div key={url} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 group/rp">
                      <img src={assetUrl(url)} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        aria-label="Убрать вложение"
                        onClick={() => setReplyAttachmentUrls((prev) => prev.filter((u) => u !== url))}
                        className="absolute inset-x-0 bottom-0 py-0.5 bg-black/55 text-white text-[10px]"
                      >
                        <Trash2 className="w-3 h-3 mx-auto" />
                      </button>
                    </div>
                  ) : (
                    <div
                      key={url}
                      className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/90 px-2 py-1.5 text-xs text-emerald-900 max-w-[220px]"
                    >
                      <Paperclip className="w-4 h-4 shrink-0" aria-hidden />
                      <span className="truncate min-w-0">{url.split("/").pop()}</span>
                      <button
                        type="button"
                        aria-label="Убрать вложение"
                        onClick={() => setReplyAttachmentUrls((prev) => prev.filter((u) => u !== url))}
                        className="shrink-0 p-1 rounded hover:bg-emerald-100 text-emerald-800"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ),
                )}
                {attachPolicy !== null &&
                  replyAttachmentUrls.length < attachPolicy.forumMaxAttachmentLines && (
                  <label className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 text-gray-600">
                    {attachPolicy.messagesEnabled ? (
                      <Paperclip className="w-5 h-5" />
                    ) : (
                      <ImagePlus className="w-5 h-5" />
                    )}
                    <span className="text-[9px] px-0.5 text-center mt-0.5">Файл</span>
                    <input
                      type="file"
                      accept={
                        attachPolicy.messagesEnabled
                          ? attachPolicy.allowedMimeTypes.join(",")
                          : "image/jpeg,image/png,image/webp,image/gif"
                      }
                      className="sr-only"
                      disabled={replyUploading || submittingReply}
                      onChange={(e) => {
                        const list = e.target.files;
                        e.target.value = "";
                        if (!list?.length || !user) return;
                        const cap = attachPolicy.forumMaxAttachmentLines;
                        setReplyUploading(true);
                        void (async () => {
                          try {
                            for (const file of Array.from(list)) {
                              const { url } = attachPolicy.messagesEnabled
                                ? await apiUploadMessageAttachment(file)
                                : await apiUploadThreadImage(file);
                              setReplyAttachmentUrls((prev) => (prev.length >= cap ? prev : [...prev, url]));
                            }
                          } catch (err) {
                            alert(err instanceof Error ? err.message : "Не удалось загрузить файл");
                          } finally {
                            setReplyUploading(false);
                          }
                        })();
                      }}
                    />
                  </label>
                )}
              </div>
              {replyUploading ? <p className="text-xs text-gray-500 mt-1">Загрузка…</p> : null}
            </div>
            <div className="flex justify-between items-center gap-3 flex-wrap">
              <span className="text-xs text-gray-500">{replyText.length}/20000</span>
              <button
                type="button"
                onClick={() => void submitReply()}
                disabled={(!replyText.trim() && replyAttachmentUrls.length === 0) || submittingReply}
                className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-2.5 rounded-lg font-semibold disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {submittingReply ? "Отправка…" : "Отправить"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
