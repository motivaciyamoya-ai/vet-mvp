import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { sendLocalNotification, requestNotificationPermission } from "../../utils/pushNotifications";
import { useAuth } from "./AuthContext";
import { apiFetch } from "../../lib/api";

export type NotificationType =
  | "hot_topic"
  | "message"
  | "system"
  | "pick_solution"
  | "solution_reward"
  | "profile_thank"
  | "forum_reply"
  | "article_comment"
  | "listing_message";

export interface Notification {
  /** `lc:*` — локально созданные; иначе cuid сервера. */
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  urgency?: "critical" | "high" | "medium";
  author?: string;
  location?: string;
  timestamp: string;
  read: boolean;
  /** Легаси локальных демо-уведомлений с числовым id темы */
  topicId?: number;
  threadId?: string;
  /** Личные сообщения: id диалога для маршрута `/messages/:conversationId`. */
  conversationId?: string;
  /** Благодарность на профиле: кто поблагодарил — `/users/:actorUserId`. */
  actorUserId?: string;
  /** Комментарий к статье: маршрут `/articles/:articleId`. */
  articleId?: string;
  /** Сообщение по объявлению: маршрут `/marketplace/:listingId`. */
  listingId?: string;
}

interface ServerNotificationDto {
  id: string;
  type: string;
  threadId: string | null;
  conversationId?: string | null;
  articleId?: string | null;
  listingId?: string | null;
  actorUserId?: string | null;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

const POLL_MS = 30_000;
const DESKTOP_DIGEST_MIN_MS = 45_000;

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, "id" | "timestamp" | "read">) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearNotification: (id: string) => Promise<void>;
  refreshServerNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const STORAGE_KEY = "vetmvp_notifications_v1";

function serverTypeToClient(raw: string): NotificationType {
  if (raw === "HOT_TOPIC_PICK_SOLUTION") return "pick_solution";
  if (raw === "HOT_TOPIC_SOLUTION_CREDIT") return "solution_reward";
  if (raw === "DIRECT_MESSAGE") return "message";
  if (raw === "PROFILE_THANK_RECEIVED") return "profile_thank";
  if (raw === "FORUM_THREAD_REPLY") return "forum_reply";
  if (raw === "ARTICLE_COMMENT") return "article_comment";
  if (raw === "LISTING_MESSAGE") return "listing_message";
  return "system";
}

function mapServerNotification(row: ServerNotificationDto): Notification {
  const ts =
    typeof row.createdAt === "string"
      ? row.createdAt.endsWith("Z") || row.createdAt.includes("+")
        ? row.createdAt
        : new Date(row.createdAt).toISOString()
      : new Date(row.createdAt).toISOString();
  return {
    id: row.id,
    type: serverTypeToClient(row.type),
    title: row.title,
    message: row.body,
    timestamp: ts,
    read: Boolean(row.read),
    threadId: row.threadId ?? undefined,
    conversationId: row.conversationId ?? undefined,
    actorUserId: row.actorUserId ?? undefined,
    articleId: row.articleId ?? undefined,
    listingId: row.listingId ?? undefined,
  };
}

/** Нормализуем сохранённые ранее объекты (id мог быть number). */
function loadNotificationsFromStorage(): Notification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null || raw === "") return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return (parsed as Notification[]).map((n) => {
      const idRaw = (n as { id?: unknown }).id;
      const id =
        typeof idRaw === "number"
          ? `lc:legacy-num:${idRaw}`
          : typeof idRaw === "string" && idRaw.length > 0
            ? idRaw
            : "";
      return {
        ...n,
        id,
        read: Boolean(n.read),
      };
    });
  } catch {
    return [];
  }
}

function saveNotificationsToStorage(items: Notification[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* ignore */
  }
}

function mergeByTime(server: Notification[], locals: Notification[]): Notification[] {
  const seen = new Set(server.map((n) => n.id));
  const localOnly = locals.filter((n) => n.id.startsWith("lc:") && !seen.has(n.id));
  return [...server, ...localOnly].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, authReady } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>(loadNotificationsFromStorage);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const wasAuthedRef = useRef(false);
  const notificationsHydratedRef = useRef(false);
  const knownServerNotificationIdsRef = useRef<Set<string>>(new Set());
  const lastDesktopDigestRef = useRef(0);

  const refreshServerNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const rows = await apiFetch<ServerNotificationDto[]>("/api/users/me/notifications");
      if (!Array.isArray(rows)) return;

      if (!notificationsHydratedRef.current) {
        knownServerNotificationIdsRef.current = new Set(rows.map((r) => r.id));
        notificationsHydratedRef.current = true;
      } else {
        let firstNewUnread: ServerNotificationDto | null = null;
        for (const row of rows) {
          if (knownServerNotificationIdsRef.current.has(row.id)) continue;
          knownServerNotificationIdsRef.current.add(row.id);
          if (!row.read && !firstNewUnread) firstNewUnread = row;
        }
        const now = Date.now();
        if (
          firstNewUnread &&
          now - lastDesktopDigestRef.current >= DESKTOP_DIGEST_MIN_MS &&
          typeof window !== "undefined" &&
          "Notification" in window &&
          Notification.permission === "granted"
        ) {
          lastDesktopDigestRef.current = now;
          const preview = [firstNewUnread.title, firstNewUnread.body].filter(Boolean).join(" — ");
          sendLocalNotification("VetConnect", {
            body: preview.length > 180 ? `${preview.slice(0, 177)}…` : preview,
            tag: `server-${firstNewUnread.id}`,
            requireInteraction: false,
            vibrate: [120],
          });
        }
      }

      const mapped = rows.map(mapServerNotification);
      setNotifications((prev) => {
        const locals = prev.filter((n) => n.id.startsWith("lc:"));
        return mergeByTime(mapped, locals);
      });
    } catch {
      /* сеть — оставляем локальное состояние */
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!authReady) return;
    if (wasAuthedRef.current && !isAuthenticated) {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
      setNotifications([]);
      notificationsHydratedRef.current = false;
      knownServerNotificationIdsRef.current = new Set();
      lastDesktopDigestRef.current = 0;
    }
    wasAuthedRef.current = isAuthenticated;
  }, [authReady, isAuthenticated]);

  useEffect(() => {
    saveNotificationsToStorage(notifications);
  }, [notifications]);

  useEffect(() => {
    if (!authReady || !isAuthenticated) return;
    void refreshServerNotifications();
    const iv = window.setInterval(() => void refreshServerNotifications(), POLL_MS);
    return () => window.clearInterval(iv);
  }, [authReady, isAuthenticated, refreshServerNotifications]);

  useEffect(() => {
    const onFocus = () => {
      if (isAuthenticated) void refreshServerNotifications();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [isAuthenticated, refreshServerNotifications]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || e.newValue == null) return;
      try {
        const parsed = JSON.parse(e.newValue) as unknown;
        if (!Array.isArray(parsed)) return;
        setNotifications(
          (parsed as Notification[]).map((n) => ({
            ...n,
            id: typeof n.id === "number" ? `lc:legacy-num:${n.id}` : String(n.id),
            read: Boolean(n.read),
          })),
        );
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      void requestNotificationPermission();
    }
  }, []);

  const addNotification = useCallback((notification: Omit<Notification, "id" | "timestamp" | "read">) => {
    const newNotification: Notification = {
      ...notification,
      id: `lc:${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      timestamp: new Date().toISOString(),
      read: false,
    };

    setNotifications((prev) => [newNotification, ...prev]);

    if (notification.urgency) {
      const urgencyLabel =
        notification.urgency === "critical"
          ? "🔥 КРИТИЧНО"
          : notification.urgency === "high"
            ? "⚠️ ОЧЕНЬ ВАЖНО"
            : "💡 СРОЧНО";
      sendLocalNotification(`VetConnect - ${urgencyLabel}`, {
        body: notification.title,
        tag: `notification-${newNotification.id}`,
        requireInteraction: notification.urgency === "critical",
        vibrate: notification.urgency === "critical" ? [200, 100, 200] : [200],
      });
    } else {
      sendLocalNotification("VetConnect", {
        body: [notification.title, notification.message].filter(Boolean).join(" — "),
        tag: `notification-${newNotification.id}`,
        requireInteraction: false,
        vibrate: [120],
      });
    }
  }, []);

  const markAsRead = useCallback(
    async (id: string) => {
      if (!id.startsWith("lc:")) {
        try {
          await apiFetch(`/api/users/me/notifications/${encodeURIComponent(id)}/read`, {
            method: "PATCH",
          });
        } catch {
          /* всё равно помечаем локально */
        }
      }
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    },
    [],
  );

  const markAllAsRead = useCallback(async () => {
    if (isAuthenticated) {
      try {
        await apiFetch("/api/users/me/notifications/read-all", { method: "POST" });
      } catch {
        /* ignore */
      }
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, [isAuthenticated]);

  const clearNotification = useCallback(
    async (id: string) => {
      if (!id.startsWith("lc:") && isAuthenticated) {
        try {
          await apiFetch(`/api/users/me/notifications/${encodeURIComponent(id)}`, { method: "DELETE" });
        } catch {
          /* ignore */
        }
      }
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    },
    [isAuthenticated],
  );

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearNotification,
        refreshServerNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return context;
}
