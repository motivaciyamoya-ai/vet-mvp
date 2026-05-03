import {
  X,
  Flame,
  Check,
  Trash2,
  AlertCircle,
  MapPin,
  User,
  Clock,
  Settings,
  Sparkles,
  Award,
  ThumbsUp,
  MessageSquare,
  BookOpen,
} from "lucide-react";
import { useState } from "react";
import { useNotifications } from "../contexts/NotificationContext";
import { useNavigate } from "react-router";
import NotificationSettings from "./NotificationSettings";
import { ForumUrgencyBadge, ForumUrgencyIcon, type ForumUrgencyLevel } from "./ForumUrgencyVisual";

function isForumUrgency(u: string | undefined): u is ForumUrgencyLevel {
  return u === "critical" || u === "high" || u === "medium";
}

interface NotificationPanelProps {
  onClose: () => void;
}

export default function NotificationPanel({ onClose }: NotificationPanelProps) {
  const { notifications, markAsRead, markAllAsRead, clearNotification } = useNotifications();
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const getUrgencyConfig = (urgency?: string) => {
    switch (urgency) {
      case "critical":
        return {
          color: "from-red-500 to-red-600",
          bgColor: "bg-red-50",
          borderColor: "border-red-300",
          textColor: "text-red-700",
          label: "Критично",
        };
      case "high":
        return {
          color: "from-orange-500 to-orange-600",
          bgColor: "bg-orange-50",
          borderColor: "border-orange-300",
          textColor: "text-orange-700",
          label: "Очень важно",
        };
      case "medium":
        return {
          color: "from-yellow-500 to-yellow-600",
          bgColor: "bg-yellow-50",
          borderColor: "border-yellow-300",
          textColor: "text-yellow-700",
          label: "Срочно",
        };
      default:
        return {
          color: "from-gray-500 to-gray-600",
          bgColor: "bg-gray-50",
          borderColor: "border-gray-300",
          textColor: "text-gray-700",
          label: "",
        };
    }
  };

  const getTimeAgo = (timestamp: string) => {
    const now = Date.now();
    const time = new Date(timestamp).getTime();
    const diff = now - time;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Только что";
    if (minutes < 60) return `${minutes} мин назад`;
    if (hours < 24) return `${hours} ч назад`;
    return `${days} дн назад`;
  };

  const handleNotificationClick = async (notification: {
    id: string;
    type: string;
    threadId?: string;
    topicId?: number;
    conversationId?: string;
    actorUserId?: string;
    articleId?: string;
    listingId?: string;
  }) => {
    await markAsRead(notification.id);
    if (notification.type === "message") {
      navigate(
        notification.conversationId
          ? `/messages/${encodeURIComponent(notification.conversationId)}`
          : "/messages",
      );
      onClose();
      return;
    }
    if (notification.type === "profile_thank" && notification.actorUserId) {
      navigate(`/users/${encodeURIComponent(notification.actorUserId)}`);
      onClose();
      return;
    }
    if (notification.type === "article_comment" && notification.articleId) {
      navigate(`/articles/${encodeURIComponent(notification.articleId)}`);
      onClose();
      return;
    }
    if (notification.type === "listing_message" && notification.listingId) {
      navigate(`/marketplace/${encodeURIComponent(notification.listingId)}`);
      onClose();
      return;
    }
    const threadSlug =
      notification.threadId ??
      (notification.type === "hot_topic" && notification.topicId != null ? String(notification.topicId) : undefined);
    if (threadSlug) {
      navigate(`/forum/topic/${threadSlug}`);
      onClose();
    }
  };

  function panelIcon(notification: { type: string; urgency?: string }) {
    if (notification.type === "pick_solution") {
      return <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-white" aria-hidden />;
    }
    if (notification.type === "solution_reward") {
      return <Award className="w-5 h-5 sm:w-6 sm:h-6 text-white" aria-hidden />;
    }
    if (notification.type === "profile_thank") {
      return <ThumbsUp className="w-5 h-5 sm:w-6 sm:h-6 text-white" aria-hidden />;
    }
    if (notification.type === "forum_reply") {
      return <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-white" aria-hidden />;
    }
    if (notification.type === "article_comment") {
      return <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-white" aria-hidden />;
    }
    if (notification.type === "listing_message") {
      return <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-white" aria-hidden />;
    }
    if (isForumUrgency(notification.urgency)) {
      return (
        <ForumUrgencyIcon
          level={notification.urgency}
          accent="onDark"
          className="w-5 h-5 sm:w-6 sm:h-6"
        />
      );
    }
    return <Flame className="w-5 h-5 sm:w-6 sm:h-6 text-white" aria-hidden />;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center sm:justify-end z-50 p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:w-[450px] max-h-[90vh] sm:max-h-[600px] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-4 sm:p-5 rounded-t-2xl flex-shrink-0">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-lg sm:text-xl">Уведомления</h2>
                <p className="text-emerald-100 text-xs sm:text-sm">
                  {notifications.filter(n => !n.read).length} непрочитанных
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSettingsOpen(true)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                title="Настройки уведомлений"
              >
                <Settings className="w-5 h-5" />
              </button>
              <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {notifications.length > 0 && (
            <button
              type="button"
              onClick={() => void markAllAsRead()}
              className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white py-2 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              Отметить все как прочитанные
            </button>
          )}
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-10 h-10 text-gray-400" />
              </div>
              <p className="text-gray-600 font-medium mb-1">Нет уведомлений</p>
              <p className="text-sm text-gray-500">
                Здесь: форум, статьи, горячие темы, личные сообщения, благодарности и награды.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {notifications.map((notification) => {
                const urgencyConfig = getUrgencyConfig(notification.urgency);
                const isPickOrReward = notification.type === "pick_solution" || notification.type === "solution_reward";
                const isMessage = notification.type === "message";
                const isThank = notification.type === "profile_thank";
                const isForumReply = notification.type === "forum_reply";
                const isArticleComment = notification.type === "article_comment";
                const isListingMessage = notification.type === "listing_message";
                const iconGradient =
                  notification.type === "pick_solution"
                    ? "from-violet-500 to-purple-600"
                    : notification.type === "solution_reward"
                      ? "from-amber-500 to-orange-600"
                      : isMessage
                        ? "from-sky-500 to-blue-600"
                        : isThank
                          ? "from-rose-500 to-pink-600"
                          : isForumReply
                            ? "from-teal-500 to-emerald-600"
                            : isArticleComment
                              ? "from-indigo-500 to-blue-700"
                              : isListingMessage
                                ? "from-emerald-500 to-teal-700"
                              : urgencyConfig.color;

                return (
                  <div
                    key={notification.id}
                    className={`p-4 cursor-pointer transition-colors ${
                      !notification.read
                        ? "bg-emerald-50/50 hover:bg-emerald-50"
                        : "hover:bg-gray-50"
                    }`}
                    onClick={() => void handleNotificationClick(notification)}
                  >
                    <div className="flex gap-3">
                      {/* Icon */}
                      <div
                        className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br ${iconGradient} flex items-center justify-center flex-shrink-0 shadow-md`}
                      >
                        {panelIcon(notification)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            {isForumUrgency(notification.urgency) && !isPickOrReward && (
                              <ForumUrgencyBadge level={notification.urgency} iconClassName="w-3 h-3" />
                            )}
                            {notification.type === "pick_solution" && (
                              <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-800 border border-violet-200">
                                Выберите решение
                              </span>
                            )}
                            {notification.type === "solution_reward" && (
                              <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                                Награда
                              </span>
                            )}
                            {isMessage && (
                              <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-900 border border-sky-200">
                                Сообщение
                              </span>
                            )}
                            {isThank && (
                              <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-900 border border-rose-200">
                                Спасибо
                              </span>
                            )}
                            {isForumReply && (
                              <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-900 border border-teal-200">
                                Форум
                              </span>
                            )}
                            {isArticleComment && (
                              <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-900 border border-indigo-200">
                                Статья
                              </span>
                            )}
                            {!notification.read && (
                              <div className="w-2 h-2 bg-emerald-600 rounded-full" />
                            )}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              void clearNotification(notification.id);
                            }}
                            className="p-1 hover:bg-gray-200 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4 text-gray-500" />
                          </button>
                        </div>

                        <h3 className="font-semibold text-sm sm:text-base mb-1 line-clamp-2">
                          {notification.title}
                        </h3>

                        {notification.message && (
                          <p className="text-xs sm:text-sm text-gray-600 mb-2 line-clamp-1">
                            {notification.message}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-gray-500">
                          {notification.author && (
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {notification.author}
                            </span>
                          )}
                          {notification.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {notification.location}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {getTimeAgo(notification.timestamp)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="border-t border-gray-200 p-3 bg-gray-50 flex-shrink-0">
            <p className="text-xs text-center text-gray-600">
              Нажмите: откроются форум, статья, переписка или профиль
            </p>
          </div>
        )}
      </div>

      {/* Settings Modal */}
      {settingsOpen && <NotificationSettings onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
