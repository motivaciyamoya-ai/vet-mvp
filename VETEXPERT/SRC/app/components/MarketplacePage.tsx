import { Plus, Coins, Info } from "lucide-react";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import Marketplace from "./Marketplace";
import CreateListing from "./CreateListing";
import { useAuth } from "../contexts/AuthContext";

export default function MarketplacePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { authReady, isAuthenticated } = useAuth();
  const [createListingOpen, setCreateListingOpen] = useState(false);
  const [listingInitialType, setListingInitialType] = useState<"sale" | "wanted" | "exchange" | "free">("sale");

  const openCreateListing = (t: "sale" | "wanted" | "exchange" | "free") => {
    if (!authReady) return;
    if (!isAuthenticated) {
      const from = `${location.pathname}${location.search}`;
      navigate("/login", { state: { from } });
      return;
    }
    setListingInitialType(t);
    setCreateListingOpen(true);
  };

  return (
    <div className="space-y-5 lg:space-y-6 xl:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-bold text-xl sm:text-2xl lg:text-3xl mb-1">Маркетплейс</h1>
          <p className="text-gray-600 text-sm lg:text-base">
            Покупка, продажа и обмен ветеринарного оборудования
          </p>
        </div>
        <button
          type="button"
          onClick={() => openCreateListing("sale")}
          className="flex w-full sm:w-auto items-center justify-center gap-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white px-5 py-2.5 lg:px-6 lg:py-3 rounded-lg hover:from-amber-700 hover:to-orange-700 transition-all font-medium text-sm lg:text-base shadow-lg hover:shadow-xl whitespace-nowrap"
          disabled={!authReady}
        >
          <Plus className="w-4 h-4 lg:w-5 lg:h-5 shrink-0" />
          Разместить объявление
        </button>
      </div>

      {/* Pricing Info */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <Info className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-3">Стоимость размещения объявлений</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <button
                type="button"
                onClick={() => openCreateListing("sale")}
                className="w-full text-left bg-white rounded-lg p-3 border border-green-200 hover:border-emerald-400 hover:shadow-md transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={!authReady}
              >
                <div className="text-2xl mb-1">💰</div>
                <div className="font-semibold text-sm mb-1">Продажа</div>
                <div className="flex items-center gap-1 text-amber-600 font-bold">
                  <Coins className="w-4 h-4" />
                  30 ВБ
                </div>
                <span className="text-[11px] text-emerald-700 font-medium mt-2 inline-block">Разместить →</span>
              </button>
              <button
                type="button"
                onClick={() => openCreateListing("wanted")}
                className="w-full text-left bg-white rounded-lg p-3 border border-orange-200 hover:border-orange-400 hover:shadow-md transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={!authReady}
              >
                <div className="text-2xl mb-1">🔍</div>
                <div className="font-semibold text-sm mb-1">Куплю</div>
                <div className="flex items-center gap-1 text-amber-600 font-bold">
                  <Coins className="w-4 h-4" />
                  25 ВБ
                </div>
                <span className="text-[11px] text-emerald-700 font-medium mt-2 inline-block">Разместить →</span>
              </button>
              <button
                type="button"
                onClick={() => openCreateListing("exchange")}
                className="w-full text-left bg-white rounded-lg p-3 border border-purple-200 hover:border-purple-400 hover:shadow-md transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={!authReady}
              >
                <div className="text-2xl mb-1">🔄</div>
                <div className="font-semibold text-sm mb-1">Обмен</div>
                <div className="flex items-center gap-1 text-amber-600 font-bold">
                  <Coins className="w-4 h-4" />
                  20 ВБ
                </div>
                <span className="text-[11px] text-emerald-700 font-medium mt-2 inline-block">Разместить →</span>
              </button>
              <button
                type="button"
                onClick={() => openCreateListing("free")}
                className="w-full text-left bg-white rounded-lg p-3 border border-blue-200 hover:border-blue-400 hover:shadow-md transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={!authReady}
              >
                <div className="text-2xl mb-1">🎁</div>
                <div className="font-semibold text-sm mb-1">Отдам бесплатно</div>
                <div className="text-green-600 font-bold text-sm">Бесплатно</div>
                <span className="text-[11px] text-emerald-700 font-medium mt-2 inline-block">Разместить →</span>
              </button>
            </div>
            <p className="text-sm text-gray-600 mt-3">
              💡 Объявления "Отдам бесплатно" публикуются без списания баллов
            </p>
            {authReady && !isAuthenticated && (
              <p className="text-xs text-slate-600 mt-2">
                Чтобы разместить объявление, нужно{" "}
                <button
                  type="button"
                  onClick={() => openCreateListing("sale")}
                  className="text-emerald-700 font-semibold hover:underline"
                >
                  войти в аккаунт
                </button>
                .
              </p>
            )}
          </div>
        </div>
      </div>

      <Marketplace />

      {createListingOpen && (
        <CreateListing
          key={listingInitialType}
          initialListingType={listingInitialType}
          onClose={() => setCreateListingOpen(false)}
        />
      )}
    </div>
  );
}
