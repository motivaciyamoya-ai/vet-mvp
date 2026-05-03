export type ForumActivityStats = {
  threadsCreated: number;
  postsCreated: number;
};

export type EarnedBadgeInput = {
  emailVerified?: boolean;
  role?: string;
  forumStats: ForumActivityStats | null;
};

export type EarnedBadgeRow = {
  id: string;
  name: string;
  icon: string;
  color: string;
  duration: number;
};

/**
 * Автоматические ярлыки за достижения (не из магазина).
 * id с префиксом earn- не пересекаются с id платных даримых из BadgeStore.
 */
export function computeEarnedBadges(input: EarnedBadgeInput): EarnedBadgeRow[] {
  const out: EarnedBadgeRow[] = [];
  const { emailVerified, role, forumStats } = input;

  if (emailVerified) {
    out.push({
      id: "earn-email-verified",
      name: "Почта подтверждена",
      icon: "✓",
      color: "from-emerald-500 to-teal-600",
      duration: 0,
    });
  }

  if (role === "ADMIN") {
    out.push({
      id: "earn-role-admin",
      name: "Администратор",
      icon: "🛡️",
      color: "from-slate-700 to-slate-900",
      duration: 0,
    });
  } else if (role === "MODERATOR") {
    out.push({
      id: "earn-role-mod",
      name: "Модератор",
      icon: "⭐",
      color: "from-violet-600 to-purple-700",
      duration: 0,
    });
  }

  if (forumStats) {
    if (forumStats.threadsCreated >= 1) {
      out.push({
        id: "earn-first-thread",
        name: "Автор темы",
        icon: "🧵",
        color: "from-indigo-500 to-blue-600",
        duration: 0,
      });
    }
    if (forumStats.threadsCreated >= 5) {
      out.push({
        id: "earn-active-author",
        name: "Активный автор",
        icon: "📝",
        color: "from-sky-500 to-cyan-600",
        duration: 0,
      });
    }
    if (forumStats.postsCreated >= 5) {
      out.push({
        id: "earn-helper-forum",
        name: "Помощник на форуме",
        icon: "🤝",
        color: "from-green-500 to-emerald-600",
        duration: 0,
      });
    }
    if (forumStats.postsCreated >= 25) {
      out.push({
        id: "earn-expert-collab",
        name: "Эксперт обсуждений",
        icon: "👨‍⚕️",
        color: "from-blue-600 to-indigo-700",
        duration: 0,
      });
    }
  }

  return out;
}
