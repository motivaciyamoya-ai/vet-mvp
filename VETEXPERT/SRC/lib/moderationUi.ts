/** Публичный снимок санкций с API (`ModerationService.toPublicDto`). */
export type PublicModerationDto = {
  status: "NONE" | "WARNED" | "TEMP_SUSPENDED" | "BANNED" | string;
  until: string | null;
  reasonPublic: string | null;
  lastSanctionKind: "WARN" | "TEMP_SUSPEND" | "LIFETIME_BAN" | string | null;
  lastSanctionAt: string | null;
};

export function formatModerationUntilRu(iso: string | null | undefined): string {
  if (!iso || !iso.trim()) return "";
  try {
    return new Date(iso).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

/** Короткая подпись для бейджа на аватаре. */
export function moderationBadgeLabel(m: Pick<PublicModerationDto, "status" | "lastSanctionKind">): string {
  if (m.status === "BANNED") return "Бан";
  if (m.status === "TEMP_SUSPENDED") return "Стоп";
  if (m.status === "WARNED") return "!";
  if (m.lastSanctionKind === "LIFETIME_BAN") return "Бан";
  if (m.lastSanctionKind === "TEMP_SUSPEND") return "Стоп";
  if (m.lastSanctionKind === "WARN") return "!";
  return "!";
}

export function moderationBadgeTitle(m: PublicModerationDto): string {
  const reason = (m.reasonPublic ?? "").trim();
  const until = formatModerationUntilRu(m.until);
  const head =
    m.status === "BANNED"
      ? "Пожизненная блокировка: доступен только просмотр."
      : m.status === "TEMP_SUSPENDED"
        ? "Временная блокировка: публикация и действия за VetCoin недоступны."
        : m.status === "WARNED"
          ? "Предупреждение модератора."
          : "Статус модерации.";

  const tail = [
    until ? `до ${until}` : m.status === "BANNED" ? "бессрочно" : "",
    reason ? `Причина: ${reason}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return tail ? `${head} ${tail}` : head;
}

export function moderationAccountBannerLines(m: PublicModerationDto): { title: string; body: string } {
  const reason = (m.reasonPublic ?? "").trim();
  const until = formatModerationUntilRu(m.until);

  if (m.status === "BANNED") {
    return {
      title: "Аккаунт заблокирован навсегда",
      body: [reason ? `Причина: ${reason}` : "Доступен только просмотр страниц.", "Выход из аккаунта по-прежнему доступен."].join(
        " ",
      ),
    };
  }
  if (m.status === "TEMP_SUSPENDED") {
    return {
      title: "Временная блокировка аккаунта",
      body: [
        until ? `До ${until}.` : "",
        reason ? `Причина: ${reason}` : "",
        "Публикация контента и действия за VetCoin сейчас недоступны.",
      ]
        .map((s) => s.trim())
        .filter(Boolean)
        .join(" "),
    };
  }
  if (m.status === "WARNED") {
    return {
      title: "Предупреждение модерации",
      body: [
        until ? `Бейдж и пояснение отображаются до ${until}.` : "",
        reason ? `Текст: ${reason}` : "",
      ]
        .map((s) => s.trim())
        .filter(Boolean)
        .join(" "),
    };
  }
  return { title: "", body: "" };
}
