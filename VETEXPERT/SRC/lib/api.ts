import type { ApiListingSummary } from "./marketplaceListingsMap";
import type { PublicModerationDto } from "./moderationUi";

/**
 * HTTP-клиент VetConnect для REST API того же домена или override через `VITE_API_BASE_URL`.
 *
 * Локально Vite может проксировать `/api` на ваш экземпляр API — см. `vite.config.ts`.
 */

const ACCESS_KEY = "vetmvp_access";
const REFRESH_KEY = "vetmvp_refresh";
const FORUM_VISITOR_KEY = "vetmvp_forum_visitor";

/**
 * UUID v4 без `crypto.randomUUID()`: на HTTP (не localhost) часто нет secure context,
 * и `randomUUID` в браузере отсутствует — тогда гостю падает тема форума.
 */
function randomUuidV4Browser(): string {
  const c = typeof globalThis !== "undefined" ? (globalThis.crypto as Crypto | undefined) : undefined;
  if (c && typeof c.randomUUID === "function") {
    return c.randomUUID();
  }
  if (c && typeof c.getRandomValues === "function") {
    const buf = new Uint8Array(16);
    c.getRandomValues(buf);
    buf[6] = (buf[6] & 0x0f) | 0x40;
    buf[8] = (buf[8] & 0x3f) | 0x80;
    const h = Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
  }
  /* Редкий край: без crypto — но формат всё равно v4, иначе API отклонит лайк гостя. */
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    const v = ch === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Стабильный UUID для учёта уникальных просмотров тем без авторизации. */
export function getOrCreateForumVisitorId(): string {
  try {
    const existing = localStorage.getItem(FORUM_VISITOR_KEY);
    if (
      existing &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(existing)
    ) {
      return existing;
    }
  } catch {
    /* SSR / запрет storage */
  }
  const id = randomUuidV4Browser();
  try {
    localStorage.setItem(FORUM_VISITOR_KEY, id);
  } catch {
    /* no-op */
  }
  return id;
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY);
}

export function setAccessToken(access: string) {
  localStorage.setItem(ACCESS_KEY, access);
}

export function setTokens(access: string, refresh: string) {
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const raw = import.meta.env.VITE_API_BASE_URL as string | undefined;
  const baseNoSlash = raw?.trim().replace(/\/+$/, "") ?? "";
  if (!baseNoSlash) return normalizedPath;

  /**
   * Частый баг конфигурации: VITE_API_BASE_URL=http://host:3000/api при путях вида /api/forum/...
   * Без этого получается /api/api/... и Nest отвечает 404 «Cannot POST…».
   */
  const baseEndsWithApi = /\/api$/i.test(baseNoSlash);
  if (
    baseEndsWithApi &&
    (normalizedPath === "/api" || normalizedPath.startsWith("/api/"))
  ) {
    const rest =
      normalizedPath === "/api" ? "/" : normalizedPath.slice("/api".length); // `/api/foo` → `/foo`
    return `${baseNoSlash}${rest}`;
  }

  return `${baseNoSlash}${normalizedPath}`;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const { json, headers, ...rest } = options;
  const h = new Headers(headers);
  if (json !== undefined) {
    h.set("Content-Type", "application/json");
  }
  const token = getAccessToken();
  if (token) {
    h.set("Authorization", `Bearer ${token}`);
  }
  const res = await fetch(apiUrl(path), {
    ...rest,
    credentials: rest.credentials ?? "include",
    headers: h,
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(extractApiErrorMessage(res, text) || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  const ct = res.headers.get("content-type");
  if (!ct?.includes("application/json")) return undefined as T;
  return res.json() as Promise<T>;
}

/**
 * Если фронт и API на разных доменах, задайте VITE_ASSET_ORIGIN=https://backend.example.com —
 * чтобы <img src> для `/uploads/...` резолвились правильно. В dev с Vite-прокси достаточно относительного пути.
 */
export function assetUrl(path: string | null | undefined): string {
  if (path == null || path === "") return "";
  if (/^https?:\/\//i.test(path)) return path;
  const base = (import.meta.env.VITE_ASSET_ORIGIN as string | undefined)?.trim()?.replace(/\/+$/, "") ?? "";
  return base ? `${base}${path.startsWith("/") ? path : `/${path}`}` : path;
}

export async function apiUploadThreadImage(file: File): Promise<{ url: string }> {
  return apiMultipartJson<{ url: string }>("/api/uploads/thread-image", file);
}

export async function apiUploadListingImage(file: File): Promise<{ url: string }> {
  return apiMultipartJson<{ url: string }>("/api/uploads/listing-image", file);
}

export async function apiUploadAvatar(file: File): Promise<{ url: string }> {
  return apiMultipartJson<{ url: string }>("/api/uploads/avatar", file);
}

async function apiMultipartJson<T extends { url: string }>(
  path: string,
  file: File,
): Promise<T> {
  const fd = new FormData();
  fd.append("file", file);
  const token = getAccessToken();
  const h = new Headers();
  if (token) {
    h.set("Authorization", `Bearer ${token}`);
  }
  const res = await fetch(apiUrl(path), { method: "POST", headers: h, body: fd, credentials: "include" });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(extractApiErrorMessage(res, text) || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

function extractApiErrorMessage(res: Response, text: string): string {
  const raw = (text ?? "").trim();
  const ct = (res.headers.get("content-type") ?? "").toLowerCase();

  // Типичный случай на проде: nginx отдаёт HTML-страницу 502/504, а UI печатает её как текст.
  if (
    (ct.includes("text/html") || raw.startsWith("<!doctype") || raw.startsWith("<html")) &&
    (res.status === 502 || res.status === 503 || res.status === 504)
  ) {
    return "Сервер временно недоступен (502/503/504). Обновите страницу через несколько секунд.";
  }

  // Nest обычно отвечает JSON вида { message, statusCode }.
  try {
    const parsed = JSON.parse(raw) as { message?: string | string[] };
    if (typeof parsed?.message === "string") {
      if (res.status === 403 && parsed.message === "TOTP_REQUIRED") return "TOTP_REQUIRED";
      return parsed.message;
    }
    if (Array.isArray(parsed?.message)) return parsed.message.join(", ");
  } catch {
    /* keep raw */
  }

  return raw;
}

/** Публичная карточка участника (GET /profiles/:id без секретных полей). */
export type PublicProfileResponse = {
  userId: string;
  joinedAt: string;
  moderation: PublicModerationDto;
  profile: {
    displayName: string;
    city: string;
    avatarUrl: string | null;
    verification: string;
    country: { nameRu: string };
    jobTitle: { nameRu: string };
  };
  stats: {
    forumThreadsCreated: number;
    forumPostsCreated: number;
    acceptedSolutionsCount: number;
    thanksReceivedCount: number;
    articlesPublished: number;
  };
};

export type ViewerRelationResponse = {
  isSelf: boolean;
  thanked: boolean;
  conversationId: string | null;
};

export async function apiPublicProfile(userId: string) {
  return apiFetch<PublicProfileResponse>(`/api/profiles/${encodeURIComponent(userId)}`);
}

export async function apiProfileViewerRelation(userId: string) {
  return apiFetch<ViewerRelationResponse>(`/api/profiles/${encodeURIComponent(userId)}/viewer-relation`);
}

export async function apiThankUser(userId: string) {
  return apiFetch<{ ok: boolean; thanksReceivedCount: number }>(
    `/api/profiles/${encodeURIComponent(userId)}/thank`,
    { method: "POST" },
  );
}

export type DirectConversationRow = {
  id: string;
  peer: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    city: string;
    country: { nameRu: string };
    moderation?: PublicModerationDto;
  };
  lastMessage: { bodyPreview: string; createdAt: string; senderId: string; readAt: string | null } | null;
  unreadCount: number;
  updatedAt: string;
};

export async function apiDirectUnreadSummary() {
  return apiFetch<{ unreadCount: number }>("/api/messages/unread-summary");
}

export async function apiDirectConversations() {
  return apiFetch<{ conversations: DirectConversationRow[] }>("/api/messages/conversations");
}

export async function apiOpenDirectConversation(peerUserId: string, initialBody?: string) {
  return apiFetch<{
    conversationId: string;
    peerUserId: string;
    firstMessageSent: boolean;
    peer: PublicProfileResponse["profile"] & { id: string };
  }>(`/api/messages/conversations/with/${encodeURIComponent(peerUserId)}`, {
    method: "POST",
    json: initialBody?.trim() ? { initialBody: initialBody.trim() } : {},
  });
}

export type DirectMessageDto = {
  id: string;
  senderId: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  senderModeration?: PublicModerationDto;
};

export async function apiDirectMessages(conversationId: string) {
  return apiFetch<{ messages: DirectMessageDto[] }>(
    `/api/messages/conversations/${encodeURIComponent(conversationId)}/messages`,
  );
}

export async function apiSendDirectMessage(conversationId: string, body: string) {
  return apiFetch<DirectMessageDto>(`/api/messages/conversations/${encodeURIComponent(conversationId)}/messages`, {
    method: "POST",
    json: { body },
  });
}

export async function apiMarkDirectRead(conversationId: string) {
  return apiFetch<{ ok: boolean }>(`/api/messages/conversations/${encodeURIComponent(conversationId)}/read`, {
    method: "PATCH",
  });
}

/** Общий чат на главной (JWT). */
export type LobbyReactionDto = { emoji: string; count: number; reactedByMe: boolean };

export type LobbyMessageDto = {
  id: string;
  body: string;
  createdAt: string;
  sender: { id: string; displayName: string; avatarUrl: string | null; moderation?: PublicModerationDto };
  reactions: LobbyReactionDto[];
};

export async function apiLobbyMessages() {
  return apiFetch<{ messages: LobbyMessageDto[] }>("/api/home-chat/messages");
}

export async function apiLobbyPostMessage(body: string) {
  return apiFetch<LobbyMessageDto>("/api/home-chat/messages", {
    method: "POST",
    json: { body },
  });
}

export async function apiLobbyToggleReaction(messageId: string, emoji: string) {
  return apiFetch<{ reactions: LobbyReactionDto[] }>(
    `/api/home-chat/messages/${encodeURIComponent(messageId)}/react`,
    { method: "POST", json: { emoji } },
  );
}

/** Публичные статьи (список / детали) */
export type ArticleCategoryDto = {
  id: string;
  name: string;
  slug: string;
  iconEmoji?: string;
  sortOrder?: number;
};

export type ArticleListAuthor = {
  id: string;
  email: string;
  profile?: {
    displayName?: string | null;
    avatarUrl?: string | null;
  } | null;
};

export type ArticleListItem = {
  id: string;
  title: string;
  excerpt: string;
  createdAt: string;
  category: { name: string; slug: string };
  author: ArticleListAuthor;
};

export async function apiArticleCategories() {
  return apiFetch<ArticleCategoryDto[]>("/api/articles/categories");
}

export async function apiArticlesList(params?: { q?: string; categorySlug?: string; page?: number; pageSize?: number }) {
  const sp = new URLSearchParams();
  if (params?.q?.trim()) sp.set("q", params.q.trim());
  if (params?.categorySlug) sp.set("categorySlug", params.categorySlug);
  sp.set("page", String(params?.page ?? 1));
  sp.set("pageSize", String(params?.pageSize ?? 20));
  return apiFetch<{ items: ArticleListItem[]; total: number }>(`/api/articles?${sp.toString()}`);
}

export type ArticleCommentDto = {
  id: string;
  body: string;
  createdAt: string;
  author: ArticleListAuthor;
  authorModeration?: PublicModerationDto;
};

export async function apiArticleComments(articleId: string) {
  return apiFetch<ArticleCommentDto[]>(
    `/api/articles/comments/${encodeURIComponent(articleId)}`,
  );
}

export async function apiPostArticleComment(articleId: string, body: string) {
  return apiFetch<ArticleCommentDto>(`/api/articles/comments/${encodeURIComponent(articleId)}`, {
    method: "POST",
    json: { body },
  });
}

/** Главная страница: последний автор ответа, отмеченного автором темы как решение */
export type ForumHeroLatestSpotlightDto = {
  threadId: string;
  threadTitle: string;
  solvedAt: string;
  category: { id: string; name: string; slug: string; iconEmoji: string };
  answerExcerpt: string;
  helper: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    city: string | null;
    jobTitleRu: string | null;
    countryRu: string | null;
  };
};

export async function apiForumHeroLatestSpotlight(): Promise<ForumHeroLatestSpotlightDto | null> {
  const r = await apiFetch<ForumHeroLatestSpotlightDto | null>("/api/reference/forum-heroes/latest");
  return r;
}

/** Сводка решённых тем и уникальных «героев» по разделам форума */
export type ForumHeroCategoryStatDto = {
  id: string;
  name: string;
  slug: string;
  iconEmoji: string;
  solvedTopicsCount: number;
  uniqueHelpersCount: number;
};

export type ForumHeroesByCategoryStatsDto = {
  categories: ForumHeroCategoryStatDto[];
  totals: { solvedTopicsTotal: number; uniqueHelpersTotal: number };
};

export async function apiForumHeroesByCategoryStats() {
  return apiFetch<ForumHeroesByCategoryStatsDto>("/api/reference/forum-heroes/by-category-stats");
}

/** Публичная SEO-конфигурация (`GET /api/reference/seo`). */
export type PublicSiteSeoDto = {
  siteName: string;
  homeDocumentTitle: string;
  metaDescription: string;
  metaKeywords: string;
  ogSiteName: string;
  ogTitle: string | null;
  ogDescription: string;
  ogImageAbsolute: string | null;
  canonicalOrigin: string | null;
  themeColor: string;
  twitterCard: "summary" | "summary_large_image";
};

export async function apiReferenceSiteSeo(): Promise<PublicSiteSeoDto> {
  return apiFetch<PublicSiteSeoDto>("/api/reference/seo");
}

export type PublicMaintenanceDto = {
  enabled: boolean;
  title: string;
  message: string;
  updatedAt: string | null;
};

export async function apiReferenceMaintenance(): Promise<PublicMaintenanceDto> {
  return apiFetch<PublicMaintenanceDto>("/api/reference/maintenance");
}

export async function apiListingsList(pageSize = 100) {
  return apiFetch<{ items: ApiListingSummary[]; total: number }>(
    `/api/listings?page=1&pageSize=${encodeURIComponent(String(pageSize))}`,
  );
}

export type VetEventDto = {
  id: string;
  slugKey: string;
  title: string;
  description: string;
  location: string;
  organizers: string;
  audience: string;
  eventFormat: string;
  url: string | null;
  startsAt: string;
  endsAt: string | null;
  timezone: string | null;
  source: string;
  sourceFeed: string;
  externalUid: string;
  createdAt: string;
  updatedAt: string;
};

export async function apiVetEvents(range: { from: string; to: string }) {
  const sp = new URLSearchParams();
  sp.set("from", range.from);
  sp.set("to", range.to);
  return apiFetch<{ from: string; to: string; items: VetEventDto[] }>(`/api/events?${sp.toString()}`);
}

export async function apiVetEventById(id: string) {
  return apiFetch<VetEventDto>(`/api/events/${encodeURIComponent(id)}`);
}

export type VetEventCommentDto = {
  id: string;
  vetEventId: string;
  body: string;
  createdAt: string;
  author: ArticleListAuthor;
  authorModeration?: PublicModerationDto;
};

export async function apiVetEventComments(eventId: string) {
  return apiFetch<VetEventCommentDto[]>(`/api/events/comments/${encodeURIComponent(eventId)}`);
}

export async function apiPostVetEventComment(eventId: string, body: string) {
  return apiFetch<VetEventCommentDto>(`/api/events/comments/${encodeURIComponent(eventId)}`, {
    method: "POST",
    json: { body },
  });
}

export type VetEventSyncSummary = {
  ranAt: string;
  feeds: { feedUrl: string; kind: "ics" | "rss"; upserted: number; error?: string }[];
};

export async function apiAdminVetEventsSync() {
  return apiFetch<VetEventSyncSummary>("/api/admin/events/sync", { method: "POST" });
}

export type VetEventsSourcesConfig = {
  icsText: string;
  rssText: string;
};

export async function apiAdminVetEventsSourcesGet() {
  return apiFetch<VetEventsSourcesConfig>("/api/admin/events/sources");
}

export async function apiAdminVetEventsSourcesPut(body: VetEventsSourcesConfig) {
  return apiFetch<VetEventsSourcesConfig>("/api/admin/events/sources", {
    method: "PUT",
    json: body,
  });
}

export type AdminManualVetEventBody = {
  title: string;
  description?: string;
  location?: string;
  organizers?: string;
  audience?: string;
  eventFormat?: string;
  url?: string;
  startsAt: string;
  endsAt?: string;
};

export async function apiAdminVetEventManualCreate(body: AdminManualVetEventBody) {
  return apiFetch<VetEventDto>("/api/admin/events/manual", { method: "POST", json: body });
}

export type VetEventAdminRow = Pick<
  VetEventDto,
  "id" | "title" | "startsAt" | "endsAt" | "source" | "sourceFeed" | "url" | "location" | "createdAt"
>;

export async function apiAdminVetEventsRecent(take = 80) {
  const sp = new URLSearchParams();
  sp.set("take", String(take));
  return apiFetch<VetEventAdminRow[]>(`/api/admin/events/recent?${sp.toString()}`);
}

export async function apiAdminVetEventDelete(id: string) {
  return apiFetch<{ ok: boolean }>(`/api/admin/events/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export type ReportTargetApi =
  | "THREAD"
  | "POST"
  | "USER"
  | "DIRECT_MESSAGE"
  | "ARTICLE"
  | "ARTICLE_COMMENT"
  | "VET_EVENT_COMMENT"
  | "LISTING_MESSAGE"
  | "LOBBY_MESSAGE";

export type CreateReportBody = {
  targetType: ReportTargetApi;
  reason: string;
  threadId?: string;
  postId?: string;
  reportedUserId?: string;
  directMessageId?: string;
  articleId?: string;
  articleCommentId?: string;
  vetEventCommentId?: string;
  listingMessageId?: string;
  lobbyMessageId?: string;
};

export async function apiCreateReport(body: CreateReportBody) {
  return apiFetch<{ id: string }>("/api/reports", {
    method: "POST",
    json: body,
  });
}

/** Снимок «живого» трафика (быстрый кольцевой буфер в памяти процесса API). */
export type AdminLiveTrafficEvent = {
  at: string;
  ip: string;
  method: string;
  path: string;
  userAgent: string;
  isBot: boolean;
  botFamily: string | null;
};

export type AdminLiveTrafficSnapshot = {
  windowSec: number;
  generatedAt: string;
  uniqueHumanIps: number;
  uniqueBotIps: number;
  totalHits: number;
  searchBotHitsByFamily: { family: string; hits: number }[];
  recent: AdminLiveTrafficEvent[];
};

export async function apiAdminLiveTraffic(windowSec = 300) {
  const sp = new URLSearchParams();
  sp.set("windowSec", String(windowSec));
  return apiFetch<AdminLiveTrafficSnapshot>(`/api/admin/analytics/live-traffic?${sp.toString()}`);
}

export type MedicalAnalyzerKind = "anamnesis" | "imaging";

export type MedicalAnalyzerResultDto = {
  kind: MedicalAnalyzerKind;
  confidence: number;
  urgency: "low" | "medium" | "high";
  diagnosis: string[];
  recommendations: string[];
  additionalTests: string[];
  notesForDoctor: string[];
  disclaimer: string;
};

export async function apiMedicalAnalyzerAnalyze(input: {
  kind: MedicalAnalyzerKind;
  anamnesisText?: string;
  notes?: string;
  files?: File[];
}) {
  const fd = new FormData();
  fd.set("kind", input.kind);
  if (input.anamnesisText?.trim()) fd.set("anamnesisText", input.anamnesisText.trim());
  if (input.notes?.trim()) fd.set("notes", input.notes.trim());
  for (const f of input.files ?? []) {
    fd.append("files", f, f.name);
  }

  const token = getAccessToken();
  const h = new Headers();
  if (token) h.set("Authorization", `Bearer ${token}`);
  const res = await fetch(apiUrl("/api/ai/medical-analyzer"), {
    method: "POST",
    headers: h,
    body: fd,
    credentials: "include",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(extractApiErrorMessage(res, text) || `HTTP ${res.status}`);
  }
  return (await res.json()) as MedicalAnalyzerResultDto;
}
