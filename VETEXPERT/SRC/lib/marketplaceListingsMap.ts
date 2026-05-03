import { articleCoverForId } from "./articleCovers";
import { isMarketplaceGiveaway } from "./marketplaceContactSeller";
import type { MarketplaceListingApiType } from "./marketplaceContactSeller";

export type ApiListingSummary = {
  id: string;
  title: string;
  description: string;
  region: string;
  type: MarketplaceListingApiType;
  createdAt: string;
  buyerId?: string | null;
  author: {
    id: string;
    email: string;
    profile?: { displayName?: string | null } | null;
  };
};

/** Карточка маркетплейса: единый вид для записей из API и демо */
export type MarketplaceUnifiedCard = {
  key: string;
  /** id для Link: cuid или числовой строки демо */
  id: string;
  source: "api" | "demo";
  title: string;
  /** Краткий текст карточки */
  description: string;
  /** Полное описание с сервера (для классификации «одаром», кнопки «Написать») */
  listingDescriptionRaw: string;
  location: string;
  categoryLabel: string;
  author: string;
  authorUserId: string | null;
  listingTypeApi: MarketplaceListingApiType;
  uiType: "sale" | "free" | "exchange" | "wanted";
  timeLabel: string;
  /** Текст в блоке «цена», null — показать «Бесплатно» или заглушку */
  price: string | null;
  image: string;
};

export function marketplaceCardUiKind(
  apiType: MarketplaceListingApiType,
  description: string,
): "sale" | "free" | "exchange" | "wanted" {
  if (apiType === "BUY") return "wanted";
  if (apiType === "JOB") return "exchange";
  if (apiType === "SELL" && isMarketplaceGiveaway("SELL", description)) return "free";
  return "sale";
}

export function parseListingCategory(description: string): string {
  const m = description.match(/^Категория:\s*(.+)$/im);
  const raw = m?.[1]?.trim();
  return raw && raw.length > 0 ? raw : "Объявление";
}

/** Строка для зелёного блока цены (уже человекочитаемая). */
export function parseListingPriceDisplay(
  description: string,
  uiKind: "sale" | "free" | "exchange" | "wanted",
): string | null {
  if (uiKind === "free") return null;
  const lines = description.split(/\n/).map((l) => l.trim());
  for (const line of lines) {
    const mb = /^Бюджет:\s*(.+)$/i.exec(line);
    if (mb) return normalizePrice(mb[1]);
    const mw = /^Ориентировочная стоимость:\s*(.+)$/i.exec(line);
    if (mw) return normalizePrice(mw[1]);
    const ms = /^Цена:\s*(.+)$/i.exec(line);
    if (ms) return normalizePrice(ms[1]);
  }
  return null;
}

function normalizePrice(inner: string): string {
  const t = inner.replace(/\s*₽\s*$/i, "").trim();
  if (!t) return "";
  if (/^\d/.test(t) && !/₽/i.test(inner)) return `${t} ₽`;
  return inner.trim();
}

export function listingPreviewText(description: string, maxLen = 160): string {
  const raw = description.replace(/\r/g, "").trim();
  const chunks = raw.split(/\n+/).filter(Boolean);
  const kept = chunks.filter((c) => {
    const s = c.trim();
    const low = s.toLowerCase();
    if (/^категория:/i.test(s)) return false;
    if (/^(цена|бюджет|ориентировочная стоимость):/i.test(s)) return false;
    if (/^отдам даром/i.test(low)) return false;
    return true;
  });
  const text = (kept.join(" ") || raw.replace(/\s+/g, " ")).trim();
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen - 1)}…`;
}

export function mapApiListingToCard(row: ApiListingSummary, formatTime: (iso: string) => string): MarketplaceUnifiedCard {
  const uiType = marketplaceCardUiKind(row.type, row.description);
  const cat = parseListingCategory(row.description);
  const price = parseListingPriceDisplay(row.description, uiType);
  return {
    key: `api-${row.id}`,
    id: row.id,
    source: "api",
    title: row.title,
    description: listingPreviewText(row.description),
    listingDescriptionRaw: row.description,
    location: row.region,
    categoryLabel: cat,
    author: row.author.profile?.displayName?.trim() || row.author.email,
    authorUserId: row.author.id,
    listingTypeApi: row.type,
    uiType,
    timeLabel: formatTime(row.createdAt),
    price,
    image: articleCoverForId(row.id),
  };
}
