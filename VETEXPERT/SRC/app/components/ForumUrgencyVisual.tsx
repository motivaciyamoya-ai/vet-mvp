import { Flame, CircleAlert, Lightbulb } from "lucide-react";

export type ForumUrgencyLevel = "critical" | "high" | "medium";

export const forumUrgencyLabel: Record<ForumUrgencyLevel, string> = {
  critical: "Критично",
  high: "Очень важно",
  medium: "Срочно",
};

export function forumUrgencyBadgeTone(level: ForumUrgencyLevel): string {
  switch (level) {
    case "critical":
      return "bg-red-100 text-red-700 border-red-300";
    case "high":
      return "bg-orange-100 text-orange-700 border-orange-300";
    case "medium":
      return "bg-yellow-100 text-yellow-700 border-yellow-300";
  }
}

const iconAccent: Record<ForumUrgencyLevel, string> = {
  critical: "text-red-600",
  high: "text-orange-600",
  medium: "text-amber-600",
};

/** Анимированная иконка уровня (огонь / ! / лампочка) — классы `vc-urgency-*` из `animations.css` */
export function ForumUrgencyIcon({
  level,
  className = "",
  accent = "default",
}: {
  level: ForumUrgencyLevel;
  className?: string;
  /** На тёмном градиенте — белая иконка с лёгким свечением */
  accent?: "default" | "onDark";
}) {
  const anim = level === "critical" ? "vc-urgency-fire" : level === "high" ? "vc-urgency-exclaim" : "vc-urgency-bulb";
  const color =
    accent === "onDark"
      ? "text-white drop-shadow-[0_0_6px_rgba(0,0,0,0.5)]"
      : iconAccent[level];
  const cn = `vc-urgency-icon block shrink-0 ${anim} ${color} ${className}`.trim();
  if (level === "critical") return <Flame className={cn} aria-hidden />;
  if (level === "high") return <CircleAlert className={cn} aria-hidden />;
  return <Lightbulb className={cn} aria-hidden />;
}

/** Ярлык «иконка + текст» для списков и карточек */
export function ForumUrgencyBadge({
  level,
  iconClassName,
  badgeClassName = "",
}: {
  level: ForumUrgencyLevel;
  iconClassName?: string;
  badgeClassName?: string;
}) {
  const isCritical = level === "critical";
  return (
    <span
      className={
        isCritical
          ? `inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-bold border border-red-300 text-red-700 vc-urgency-critical-badge-bg ${badgeClassName}`.trim()
          : `inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-bold border ${forumUrgencyBadgeTone(level)} ${badgeClassName}`.trim()
      }
    >
      <ForumUrgencyIcon level={level} className={iconClassName ?? "w-3.5 h-3.5"} />
      {forumUrgencyLabel[level]}
    </span>
  );
}

/** То же для шапки темы поверх красного/оранжевого градиента */
export function ForumUrgencyBadgeOnGradient({
  level,
  iconClassName,
}: {
  level: ForumUrgencyLevel;
  iconClassName?: string;
}) {
  const isCritical = level === "critical";
  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg backdrop-blur-sm text-sm font-bold text-white border ${
        isCritical
          ? "vc-urgency-critical-chip-on-gradient border-white/40"
          : "bg-white/20 border-white/35"
      }`}
    >
      <ForumUrgencyIcon level={level} accent="onDark" className={iconClassName ?? "w-4 h-4"} />
      {forumUrgencyLabel[level]}
    </span>
  );
}

/** Круг слева в списке горячих тем */
export function ForumUrgencyDisc({
  level,
  className = "",
}: {
  level: ForumUrgencyLevel;
  className?: string;
}) {
  const grad =
    level === "critical"
      ? "from-red-600 to-orange-600"
      : level === "high"
        ? "from-orange-500 to-amber-500"
        : "from-amber-400 to-yellow-500";
  return (
    <div
      className={`rounded-full flex items-center justify-center shadow-lg bg-gradient-to-br ${grad} ${
        level === "critical" ? "vc-urgency-critical-disc" : ""
      } ${className}`.trim()}
    >
      <ForumUrgencyIcon level={level} accent="onDark" className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7" />
    </div>
  );
}
