import { Coins, TrendingUp, TrendingDown, ShoppingCart } from "lucide-react";
import { useState } from "react";
import { useVetPoints } from "../contexts/VetPointsContext";
import BuyPoints from "./BuyPoints";

export default function VetPointsBalance({ showDetails = true }: { showDetails?: boolean }) {
  const { balance, transactions, currencyDisplayName } = useVetPoints();
  const [buyPointsOpen, setBuyPointsOpen] = useState(false);

  // Подсчет за последние 30 дней
  const recentEarned = transactions
    .filter(t => t.type === "earn")
    .slice(0, 10)
    .reduce((sum, t) => sum + t.amount, 0);

  const recentSpent = Math.abs(
    transactions
      .filter(t => t.type === "spend")
      .slice(0, 10)
      .reduce((sum, t) => sum + t.amount, 0)
  );

  return (
    <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl lg:rounded-2xl p-5 lg:p-6 text-white shadow-xl">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 lg:w-14 lg:h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
          <Coins className="w-6 h-6 lg:w-7 lg:h-7" />
        </div>
        <div>
          <div className="text-sm lg:text-base text-amber-100">{`Баланс ${currencyDisplayName}`}</div>
          <div className="font-bold text-3xl lg:text-4xl">{balance.toLocaleString()}</div>
        </div>
      </div>

      {showDetails && (
        <>
          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/20">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-green-200" />
                <span className="text-xs text-amber-100">Получено</span>
              </div>
              <div className="font-bold text-xl">+{recentEarned}</div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="w-4 h-4 text-red-200" />
                <span className="text-xs text-amber-100">Потрачено</span>
              </div>
              <div className="font-bold text-xl">-{recentSpent}</div>
            </div>
          </div>

          <button
            onClick={() => setBuyPointsOpen(true)}
            className="w-full mt-4 bg-white text-amber-600 py-3 rounded-lg hover:bg-amber-50 transition-all font-semibold shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
          >
            <ShoppingCart className="w-5 h-5" />
            Купить баллы
          </button>
        </>
      )}

      {buyPointsOpen && <BuyPoints onClose={() => setBuyPointsOpen(false)} />}
    </div>
  );
}
