/** Демо-объявления маркетплейса (числовой id в URL). Если id — cuid, данные берутся из API. */

import type { MarketplaceListingApiType } from "./marketplaceContactSeller";

export type DemoMarketListing = {
  id: number;
  title: string;
  description: string;
  price: string | null;
  type: "sale" | "free" | "exchange" | "wanted";
  category: string;
  location: string;
  author: string;
  time: string;
  image: string;
};

export const DEMO_MARKETPLACE_LISTINGS: DemoMarketListing[] = [
  {
    id: 1,
    title: "Ветеринарный УЗИ аппарат Mindray DP-50",
    description:
      "Профессиональный УЗИ сканер в отличном состоянии, 2 датчика, все кабели в комплекте. Продажа связана с переходом к более новому парку аппаратуры.",
    price: "450,000 ₽",
    type: "sale",
    category: "Оборудование",
    location: "Москва",
    author: "Клиника \"ВетПро\"",
    time: "2 часа назад",
    image: "https://images.unsplash.com/photo-1530497610245-94d3c16cda28?w=800&h=600&fit=crop",
  },
  {
    id: 2,
    title: "Отдам котят в добрые руки",
    description:
      "Отдам даром: три котёнка, 2 месяца, привиты, приучены к лотку. Ищут любящих хозяев. Фильтруем ответственность и условия содержания; готовы к кастрации по договорённости с новым домом.",
    price: null,
    type: "free",
    category: "Животные",
    location: "Санкт-Петербург",
    author: "Мария К.",
    time: "3 часа назад",
    image: "https://images.unsplash.com/photo-1574158622682-e40e69881006?w=800&h=600&fit=crop",
  },
  {
    id: 3,
    title: "Меняю стерилизатор на рентген-аппарат",
    description:
      "Автоклав Melag 23+ (2020 год), отличное состояние, сервисное обслуживание по графику. Интересует портативный рентген с документами.",
    price: null,
    type: "exchange",
    category: "Оборудование",
    location: "Новосибирск",
    author: "Ветклиника \"Айболит\"",
    time: "5 часов назад",
    image: "https://images.unsplash.com/photo-1581595220892-b0739db3ba8c?w=800&h=600&fit=crop",
  },
  {
    id: 4,
    title: "Ищу хирургический набор инструментов",
    description:
      "Нужен базовый набор хирургических инструментов для небольшой клиники. Интересуют состояние, стерильность упаковки и история регламентирования.",
    price: null,
    type: "wanted",
    category: "Инструменты",
    location: "Екатеринбург",
    author: "Доктор Сергеев",
    time: "1 день назад",
    image: "https://images.unsplash.com/photo-1579154204601-01588f351e67?w=800&h=600&fit=crop",
  },
  {
    id: 5,
    title: "Стоматологическая установка для животных",
    description:
      "Полностью укомплектованная установка с ультразвуком и полировкой. После технического осмотра, готовы к организации пробного сеанса на площадке покупателя.",
    price: "280,000 ₽",
    type: "sale",
    category: "Оборудование",
    location: "Казань",
    author: "ВетЦентр \"Зоодоктор\"",
    time: "1 день назад",
    image: "https://images.unsplash.com/photo-1606811971618-4486d14f3f99?w=800&h=600&fit=crop",
  },
  {
    id: 6,
    title: "Отдам ветеринарные журналы 2015-2020",
    description:
      "Отдам даром большую коллекцию профессиональных журналов, аккуратное хранение. Самовывоз; часть выпусков в электронных дубликатах на диске отдаём вместе с бумажной серией.",
    price: null,
    type: "free",
    category: "Литература",
    location: "Минск",
    author: "Виктория М.",
    time: "2 дня назад",
    image: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&h=600&fit=crop",
  },
];

/** Сопоставление демо-типа карточки с enum API (JOB — обмен в продукте). */
export function demoListingApiType(type: DemoMarketListing["type"]): MarketplaceListingApiType {
  switch (type) {
    case "sale":
    case "free":
      return "SELL";
    case "exchange":
      return "JOB";
    case "wanted":
      return "BUY";
    default:
      return "SELL";
  }
}

export function getDemoMarketplaceListing(idParam: string | undefined): DemoMarketListing | undefined {
  if (idParam == null || idParam.trim() === "") return undefined;
  if (!/^\d+$/.test(idParam.trim())) return undefined;
  const id = Number(idParam);
  return DEMO_MARKETPLACE_LISTINGS.find((i) => i.id === id);
}
