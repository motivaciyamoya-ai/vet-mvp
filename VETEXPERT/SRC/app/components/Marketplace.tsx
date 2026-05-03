import { ShoppingBag, Gift, RefreshCw, DollarSign, MapPin, Clock, Heart, Loader2 } from "lucide-react";
import { Link } from "react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import MarketplaceContactSellerButton from "./MarketplaceContactSellerButton";
import { DEMO_MARKETPLACE_LISTINGS, demoListingApiType, type DemoMarketListing } from "../../lib/demoMarketplace";
import { apiListingsList } from "../../lib/api";
import { formatRelativeRu } from "../../lib/forumFeedMapping";
import { mapApiListingToCard, type MarketplaceUnifiedCard, type ApiListingSummary } from "../../lib/marketplaceListingsMap";

function demoToUnified(item: DemoMarketListing): MarketplaceUnifiedCard {
  return {
    key: `demo-${item.id}`,
    id: String(item.id),
    source: "demo",
    title: item.title,
    description: item.description,
    listingDescriptionRaw: item.description,
    location: item.location,
    categoryLabel: item.category,
    author: item.author,
    authorUserId: null,
    listingTypeApi: demoListingApiType(item.type),
    uiType: item.type,
    timeLabel: item.time,
    price: item.price,
    image: item.image,
  };
}

/** Блок маркетплейса: объявления из API + демо-карточки ниже разделителя для примера */
export default function Marketplace({ limit }: { limit?: number }) {
  const [activeType, setActiveType] = useState<"all" | "sale" | "free" | "exchange" | "wanted">("all");
  const [apiItems, setApiItems] = useState<ApiListingSummary[]>([]);
  const [loadingApi, setLoadingApi] = useState(true);

  const loadListings = useCallback(async () => {
    setLoadingApi(true);
    try {
      const r = await apiListingsList(100);
      setApiItems(r.items ?? []);
    } catch {
      setApiItems([]);
    } finally {
      setLoadingApi(false);
    }
  }, []);

  useEffect(() => {
    void loadListings();
  }, [loadListings]);

  useEffect(() => {
    const handler = () => void loadListings();
    window.addEventListener("vetmarket:listings-updated", handler);
    return () => window.removeEventListener("vetmarket:listings-updated", handler);
  }, [loadListings]);

  const apiCards = useMemo(
    () => apiItems.map((row) => mapApiListingToCard(row, formatRelativeRu)),
    [apiItems],
  );
  const demoCards = useMemo(() => DEMO_MARKETPLACE_LISTINGS.map(demoToUnified), []);

  /** Если в БД есть объявления — показываем только их у реальных авторов; демо — только офлайн/пустая БД. */
  const mergedCards = useMemo(() => {
    if (apiCards.length > 0) return apiCards;
    return demoCards;
  }, [apiCards, demoCards]);
  const usingDemoFallback = !loadingApi && apiItems.length === 0;

  const displayCards = useMemo(() => {
    const filtered =
      activeType === "all" ? mergedCards : mergedCards.filter((c) => c.uiType === activeType);
    return limit ? filtered.slice(0, limit) : filtered;
  }, [mergedCards, activeType, limit]);

  const typeConfig = {
    sale: { label: "Продажа", icon: DollarSign, color: "emerald", bgColor: "bg-emerald-100", textColor: "text-emerald-700", borderColor: "border-emerald-300" },
    free: { label: "Даром", icon: Gift, color: "blue", bgColor: "bg-blue-100", textColor: "text-blue-700", borderColor: "border-blue-300" },
    exchange: { label: "Обмен", icon: RefreshCw, color: "purple", bgColor: "bg-purple-100", textColor: "text-purple-700", borderColor: "border-purple-300" },
    wanted: { label: "Куплю", icon: ShoppingBag, color: "orange", bgColor: "bg-orange-100", textColor: "text-orange-700", borderColor: "border-orange-300" },
  };

  return (
    <div className="bg-white rounded-lg lg:rounded-xl border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 sm:p-5 lg:p-6 border-b border-gray-200">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
              <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-lg sm:text-xl lg:text-2xl text-gray-900">
                Маркетплейс
              </h2>
              <p className="text-amber-700 text-xs sm:text-sm">
                Покупка, продажа и обмен оборудования
              </p>
            </div>
          </div>
          {!limit && loadingApi ? (
            <span className="inline-flex items-center gap-2 text-xs text-slate-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Обновляем объявления…
            </span>
          ) : !limit && apiCards.length > 0 ? (
            <p className="text-[11px] sm:text-xs text-amber-900/80 bg-white/70 border border-amber-100 rounded-lg px-3 py-1.5 max-w-xl">
              Объявления из базы: автор указан как зарегистрированный пользователь, можно написать продавцу.
            </p>
          ) : !limit && usingDemoFallback && demoCards.length > 0 ? (
            <p className="text-[11px] sm:text-xs text-amber-900/90 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 max-w-xl">
              Нет ответа от сервера или база без объявлений — ниже только демо-картинки без реального продавца. Чтобы были
              настоящие объявления: запустите <span className="font-mono">npm run seed</span> в <span className="font-mono">backend</span>{" "}
              или разместите объявление сами.
            </p>
          ) : null}
        </div>

        {!limit && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setActiveType("all")}
              className={`flex flex-col items-center gap-1.5 sm:gap-2 px-3 py-3 sm:py-4 rounded-lg font-medium text-xs sm:text-sm transition-all ${
                activeType === "all"
                  ? "bg-amber-600 text-white shadow-lg"
                  : "bg-white text-gray-700 hover:bg-amber-100"
              }`}
            >
              <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6" />
              <span>Все</span>
            </button>
            {(Object.entries(typeConfig) as [keyof typeof typeConfig, (typeof typeConfig)["sale"]][]).map(([type, config]) => {
              const Icon = config.icon;
              return (
                <button
                  type="button"
                  key={type}
                  onClick={() => setActiveType(type)}
                  className={`flex flex-col items-center gap-1.5 sm:gap-2 px-3 py-3 sm:py-4 rounded-lg font-medium text-xs sm:text-sm transition-all ${
                    activeType === type
                      ? `${config.bgColor} ${config.textColor} border-2 ${config.borderColor} shadow-lg`
                      : "bg-white text-gray-700 hover:bg-gray-100 border-2 border-transparent"
                  }`}
                >
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                  <span>{config.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6 p-4 sm:p-5 lg:p-6">
        {displayCards.length === 0 && !loadingApi ? (
          <p className="col-span-full text-center text-sm text-slate-500 py-12">
            В этой категории объявлений пока нет.
          </p>
        ) : null}
        {displayCards.map((item) => {
          const config = typeConfig[item.uiType];
          const Icon = config.icon;

          return (
            <div
              key={item.key}
              className="group bg-white rounded-xl border-2 border-gray-200 hover:border-gray-300 overflow-hidden hover:shadow-xl transition-all flex flex-col"
            >
              <Link
                to={`/marketplace/${item.id}`}
                className="block flex-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-inset rounded-t-xl"
              >
                {/* Image */}
                <div className="relative h-48 bg-gray-200 overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />

                  {item.source === "demo" ? (
                    <span className="absolute bottom-3 right-3 z-10 text-[10px] font-bold uppercase tracking-wide bg-black/55 text-white px-2 py-0.5 rounded">
                      Демо
                    </span>
                  ) : null}

                  {/* Type Badge */}
                  <div className={`absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${config.bgColor} ${config.textColor} border-2 ${config.borderColor} font-semibold text-xs backdrop-blur-sm`}>
                    <Icon className="w-4 h-4" />
                    {config.label}
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    className="absolute top-3 right-3 z-10 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors"
                    aria-label="В избранное"
                  >
                    <Heart className="w-4 h-4 text-gray-600 hover:text-red-500 transition-colors" />
                  </button>
                </div>

                <div className="p-4">
                  {/* Price */}
                  {item.price ? (
                    <div className="text-2xl font-bold text-emerald-700 mb-2">
                      {item.price}
                    </div>
                  ) : item.uiType === "free" ? (
                    <div className="text-2xl font-bold text-blue-700 mb-2">
                      Бесплатно
                    </div>
                  ) : (
                    <div className="h-8 mb-2" />
                  )}

                  <h3 className="font-bold text-base lg:text-lg mb-2 line-clamp-2 group-hover:text-amber-700 transition-colors leading-snug">
                    {item.title}
                  </h3>

                  <p className="text-sm text-gray-600 mb-3 line-clamp-2 leading-relaxed">{item.description}</p>

                  <div className="space-y-2 pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate">{item.location}</span>
                      <span className="text-gray-300 shrink-0">•</span>
                      <span className="bg-gray-100 px-2 py-0.5 rounded shrink-0 max-w-[40%] truncate">{item.categoryLabel}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-xs text-gray-500">
                      <span className="font-medium text-gray-700 truncate">{item.author}</span>
                      <span className="flex items-center gap-1 shrink-0">
                        <Clock className="w-3 h-3" />
                        {item.timeLabel}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
              <div className="px-4 pb-4 pt-0 mt-auto">
                <MarketplaceContactSellerButton
                  sellerUserId={item.authorUserId}
                  listingTitle={item.title}
                  listingType={item.listingTypeApi}
                  listingDescription={item.listingDescriptionRaw}
                  disabledReason={
                    item.source === "demo" ? "Демо-объявление: автор не зарегистрирован в системе." : undefined
                  }
                  className="w-full"
                />
              </div>
            </div>
          );
        })}
      </div>

      {limit && (
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <Link
            to="/marketplace"
            className="block text-center text-sm lg:text-base font-medium text-amber-700 hover:text-amber-800 transition-colors"
          >
            Смотреть все объявления →
          </Link>
        </div>
      )}
    </div>
  );
}
