/** Тип объявления в API (JOB в текущем продукте используется и для «Обмен»). */
export type MarketplaceListingApiType = "SELL" | "BUY" | "JOB";

export type MarketplaceContactKind =
  | "buy_from_seller"
  | "offer_to_buyer"
  | "exchange"
  | "accept_giveaway";

const GIVEAWAY_RE = /отдам\s+даром/i;

export function isMarketplaceGiveaway(type: MarketplaceListingApiType, description: string): boolean {
  return type === "SELL" && GIVEAWAY_RE.test(description || "");
}

export function marketplaceContactKind(
  type: MarketplaceListingApiType,
  description: string,
): MarketplaceContactKind {
  if (type === "BUY") return "offer_to_buyer";
  if (type === "JOB") return "exchange";
  if (isMarketplaceGiveaway(type, description)) return "accept_giveaway";
  return "buy_from_seller";
}

export function marketplaceContactButtonLabel(kind: MarketplaceContactKind): string {
  switch (kind) {
    case "buy_from_seller":
      return "Куплю";
    case "offer_to_buyer":
      return "Продам";
    case "exchange":
      return "Обменяюсь";
    case "accept_giveaway":
      return "Приму";
    default:
      return "Написать";
  }
}

/** Текст первого сообщения в личном чате с автором объявления. */
export function marketplaceContactDmBody(title: string, kind: MarketplaceContactKind): string {
  const t = title.trim() || "объявление";
  switch (kind) {
    case "buy_from_seller":
      return `Здравствуйте! Меня интересует ваше объявление «${t}». Готов приобрести — напишите, пожалуйста, условия сделки.`;
    case "offer_to_buyer":
      return `Здравствуйте! Вижу ваш запрос «${t}». Могу предложить подходящий вариант, готов продать — давайте обсудим детали.`;
    case "exchange":
      return `Здравствуйте! По объявлению «${t}» готов обменяться. Предложите удобный формат, договоримся.`;
    case "accept_giveaway":
      return `Здравствуйте! Готов принять «${t}» по вашему объявлению (отдам даром). Напишите, как удобнее связаться для передачи.`;
    default:
      return `Здравствуйте! Пишу по объявлению «${t}».`;
  }
}
