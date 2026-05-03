import { Coins, TrendingUp, Award, Gift, History, AlertCircle, ShoppingCart, ArrowRightLeft } from "lucide-react";
import { useState } from "react";
import { useVetPoints } from "../contexts/VetPointsContext";
import BuyPoints from "./BuyPoints";

export default function VetPointsStats() {
  const { balance, transactions } = useVetPoints();
  const [buyPointsOpen, setBuyPointsOpen] = useState(false);

  const earningRules = [
    { action: "Новая тема на форуме", points: 25, icon: "💬" },
    { action: "Комментарий/ответ", points: 10, icon: "💭" },
    { action: "Публикация статьи", points: 50, icon: "📝" },
    { action: "Объявление на маркетплейсе", points: 15, icon: "🛍️" },
    { action: "Полезный ответ (10+ лайков)", points: 30, icon: "👍" },
    { action: "Лучший ответ месяца", points: 100, icon: "🏆" },
    { action: "Проведенная консультация", points: 40, icon: "🩺" },
    { action: "Ежедневный вход", points: 5, icon: "📅" },
  ];

  const spendingOptions = [
    { service: "AI-калькулятор дозировок", cost: 20, color: "emerald", icon: "🧮" },
    { service: "AI-анализ диагностики", cost: 50, color: "indigo", icon: "🔬" },
    { service: "Объявление: Продажа", cost: 30, color: "green", icon: "💰" },
    { service: "Объявление: Куплю", cost: 25, color: "orange", icon: "🔍" },
    { service: "Объявление: Обмен", cost: 20, color: "purple", icon: "🔄" },
    { service: "Объявление: Бесплатно", cost: 0, color: "blue", icon: "🎁" },
    { service: "Горячая тема (срочно)", cost: 50, color: "yellow", icon: "💡" },
    { service: "Горячая тема (очень важно)", cost: 100, color: "orange", icon: "⚠️" },
    { service: "Горячая тема (критично)", cost: 150, color: "red", icon: "🔥" },
    { service: "Срочная консультация", cost: 80, color: "blue", icon: "🚑" },
    { service: "Второе мнение специалиста", cost: 60, color: "purple", icon: "🔍" },
    { service: "Приоритет в поиске", cost: 30, color: "green", icon: "⭐" },
  ];

  const totalEarned = transactions
    .filter(t => t.type === "earn")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalSpent = Math.abs(
    transactions
      .filter(t => t.type === "spend")
      .reduce((sum, t) => sum + t.amount, 0)
  );

  return (
    <div className="space-y-5 lg:space-y-6">
      {/* Balance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl p-5 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Coins className="w-5 h-5" />
            <span className="text-sm text-amber-100">Текущий баланс</span>
          </div>
          <div className="font-bold text-3xl mb-3">{balance.toLocaleString()}</div>
          <button
            onClick={() => setBuyPointsOpen(true)}
            className="w-full bg-white text-amber-600 py-2 rounded-lg hover:bg-amber-50 transition-all font-semibold text-sm flex items-center justify-center gap-2"
          >
            <ShoppingCart className="w-4 h-4" />
            Купить баллы
          </button>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl p-5 text-white">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5" />
            <span className="text-sm text-green-100">Всего получено</span>
          </div>
          <div className="font-bold text-3xl">+{totalEarned.toLocaleString()}</div>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-pink-500 rounded-xl p-5 text-white">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 rotate-180" />
            <span className="text-sm text-red-100">Всего потрачено</span>
          </div>
          <div className="font-bold text-3xl">-{totalSpent.toLocaleString()}</div>
        </div>
      </div>

      {/* Earning Rules */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 lg:p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <Gift className="w-5 h-5 text-green-600" />
          </div>
          <h3 className="font-bold text-xl">Как заработать ВетБаллы</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {earningRules.map((rule, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{rule.icon}</span>
                <span className="font-medium text-sm lg:text-base">{rule.action}</span>
              </div>
              <div className="flex items-center gap-1 bg-green-600 text-white px-3 py-1 rounded-full font-bold text-sm">
                <Coins className="w-4 h-4" />
                +{rule.points}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-1">Бонусы за качество</p>
              <p>
                Получайте дополнительные баллы за полезные публикации! Чем больше лайков и сохранений у вашего контента, тем больше бонусных баллов вы получите.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Spending Options */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 lg:p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
            <Award className="w-5 h-5 text-amber-600" />
          </div>
          <h3 className="font-bold text-xl">На что потратить баллы</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {spendingOptions.map((option, index) => (
            <div
              key={index}
              className={`p-4 bg-${option.color}-50 border-2 border-${option.color}-200 rounded-xl hover:shadow-lg transition-all group cursor-pointer`}
            >
              <div className="text-3xl mb-3">{option.icon}</div>
              <div className="font-semibold mb-2 text-sm lg:text-base group-hover:text-${option.color}-700 transition-colors">
                {option.service}
              </div>
              <div className={`flex items-center gap-1 bg-${option.color}-600 text-white px-3 py-1.5 rounded-lg font-bold inline-flex`}>
                <Coins className="w-4 h-4" />
                {option.cost}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 p-4 bg-amber-50 border-l-4 border-amber-500 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-900">
              <p className="font-semibold mb-1">Система приоритетов</p>
              <p>
                Срочные функции требуют баллов, чтобы обеспечить качественную помощь. Чем выше приоритет, тем быстрее вы получите ответ от коллег.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 lg:p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <History className="w-5 h-5 text-purple-600" />
          </div>
          <h3 className="font-bold text-xl">История операций</h3>
        </div>

        <div className="space-y-2">
          {transactions.slice(0, 10).map((transaction) => (
            <div
              key={transaction.id}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    transaction.type === "earn"
                      ? "bg-green-100 text-green-600"
                      : transaction.type === "transfer"
                      ? "bg-blue-100 text-blue-600"
                      : "bg-red-100 text-red-600"
                  }`}
                >
                  {transaction.type === "earn" ? (
                    <TrendingUp className="w-5 h-5" />
                  ) : transaction.type === "transfer" ? (
                    <ArrowRightLeft className="w-5 h-5" />
                  ) : (
                    <TrendingUp className="w-5 h-5 rotate-180" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm lg:text-base truncate">{transaction.reason}</div>
                  <div className="text-xs text-gray-500">{transaction.date}</div>
                </div>
              </div>

              <div
                className={`font-bold text-lg lg:text-xl ${
                  transaction.type === "earn"
                    ? "text-green-600"
                    : transaction.type === "transfer"
                    ? "text-blue-600"
                    : "text-red-600"
                }`}
              >
                {transaction.amount > 0 ? "+" : ""}
                {transaction.amount}
              </div>
            </div>
          ))}
        </div>
      </div>

      {buyPointsOpen && <BuyPoints onClose={() => setBuyPointsOpen(false)} />}
    </div>
  );
}
