import { useState } from "react";
import { assetUrl } from "../../lib/api";
import {
  type PublicModerationDto,
  moderationBadgeLabel,
  moderationBadgeTitle,
} from "../../lib/moderationUi";

function initials(label: string) {
  const parts = label.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

type UserAvatarProps = {
  avatarUrl?: string | null;
  /** Имя для инициалов и aria */
  label: string;
  className?: string;
  ringClassName?: string;
  /** Бейдж санкции рядом с аватаром (пояснение — во всплывающей подсказке). */
  moderation?: PublicModerationDto | null;
};

/**
 * Аватар с фолбэком на градиент и инициалы; принимает путь `/uploads/...` через assetUrl().
 */
export default function UserAvatar({
  avatarUrl,
  label,
  className = "w-10 h-10",
  ringClassName,
  moderation,
}: UserAvatarProps) {
  const [broken, setBroken] = useState(false);
  const resolved = avatarUrl ? assetUrl(avatarUrl) : "";
  const showImg = resolved && !broken;

  const badgeTone =
    moderation?.status === "BANNED"
      ? "border border-slate-950/30 bg-slate-900 text-white"
      : moderation?.status === "TEMP_SUSPENDED"
        ? "border border-amber-950/20 bg-amber-500 text-amber-950"
        : moderation?.status === "WARNED"
          ? "border border-sky-950/20 bg-sky-500 text-white"
          : "";

  const showMod = Boolean(moderation && moderation.status !== "NONE");

  return (
    <div
      className={`relative shrink-0 rounded-full overflow-hidden shadow-md ${ringClassName ?? "ring-2 ring-white/90"}`}
    >
      {showImg ? (
        <img
          src={resolved}
          alt=""
          loading="lazy"
          onError={() => setBroken(true)}
          className={`${className} object-cover`}
        />
      ) : (
        <div
          className={`${className} flex items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-bold text-sm`}
          aria-hidden
        >
          {initials(label)}
        </div>
      )}

      {showMod && moderation ? (
        <div
          className={`absolute bottom-0 right-0 min-w-[1.15rem] min-h-[1.15rem] px-0.5 rounded-md text-[9px] font-black leading-none shadow-sm flex items-center justify-center ${badgeTone}`}
          title={moderationBadgeTitle(moderation)}
          aria-label={moderationBadgeTitle(moderation)}
        >
          {moderationBadgeLabel(moderation)}
        </div>
      ) : null}
    </div>
  );
}
