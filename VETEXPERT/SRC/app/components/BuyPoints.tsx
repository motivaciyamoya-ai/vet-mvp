import { X, Coins, CreditCard, Smartphone, Wallet, Sparkles, Star, Crown, Zap } from "lucide-react";
import { useState } from "react";

interface BuyPointsProps {
  onClose: () => void;
}

/** Платёжный шлюз пока не подключён — пакеты отображаются без фиктивного начисления VetCoin на клиенте. */
export default function BuyPoints({ onClose }: BuyPointsProps) {
  const packages = [
    {
      id: "starter",
      name: "Стартовый",
      points: 100,
      price: 99,
      currency: "₽",
      bonus: 0,
      icon: Star,
      color: "from-gray-400 to-gray-500",
      popular: false,
    },
    {
      id: "standard",
      name: "Стандартный",
      points: 500,
      price: 449,
      currency: "₽",
      bonus: 50,
      icon: Sparkles,
      color: "from-blue-500 to-indigo-500",
      popular: true,
    },
    {
      id: "premium",
      name: "Премиум",
      points: 1000,
      price: 799,
      currency: "₽",
      bonus: 150,
      icon: Zap,
      color: "from-purple-500 to-pink-500",
      popular: false,
    },
    {
      id: "ultimate",
      name: "Максимум",
      points: 2500,
      price: 1899,
      currency: "₽",
      bonus: 500,
      icon: Crown,
      color: "from-amber-500 to-orange-500",
      popular: false,
    },
  ];

  const [selectedPackage, setSelectedPackage] = useState<(typeof packages)[0] | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "phone" | "wallet" | null>(null);

  const paymentMethods = [
    { id: "card" as const, name: "Банковская карта", icon: CreditCard, description: "Visa, MasterCard, МИР" },
    { id: "phone" as const, name: "Мобильный платеж", icon: Smartphone, description: "СБП, Apple Pay, Google Pay" },
    { id: "wallet" as const, name: "Электронный кошелек", icon: Wallet, description: "ЮMoney, QIWI, WebMoney" },
  ];

  const handlePurchase = () => {
    if (!selectedPackage || !paymentMethod) return;
    alert(
      `Оплата и автоматическое зачисление VetCoin через этот интерфейс пока не настроены. Пакет «${selectedPackage.name}» не был изменён.\n\nАдминистратор может изменить баланс в админ-панели → VetCoin.`,
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl max-w-6xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-3 sm:p-5 lg:p-6 rounded-t-2xl flex justify-between items-start gap-3 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold mb-1">Покупка ВетБаллов</h2>
            <p className="text-emerald-100 text-xs sm:text-sm hidden sm:block">Только информация об ассортименте — зачисление через платёж появится позже</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0">
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        <div className="p-3 sm:p-5 lg:p-6 space-y-4 sm:space-y-6">
          <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-950 text-xs sm:text-sm p-3 sm:p-4">
            Никаких демо-начислений: баланс берётся только из базы (эндпоинт пользователя VetCoin после входа).
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {packages.map((pkg) => {
              const Icon = pkg.icon;
              return (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => setSelectedPackage(pkg)}
                  className={`relative text-left rounded-xl border-2 p-4 transition-all hover:shadow-md ${
                    selectedPackage?.id === pkg.id ? "border-emerald-500 shadow-lg bg-emerald-50/60" : "border-gray-200"
                  }`}
                >
                  {pkg.popular && (
                    <span className="absolute -top-2 right-3 text-[10px] font-bold uppercase bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                      Популярный
                    </span>
                  )}
                  <div
                    className={`w-10 h-10 rounded-lg mb-3 bg-gradient-to-br ${pkg.color} flex items-center justify-center`}
                  >
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="font-bold text-gray-900 mb-1">{pkg.name}</div>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-2xl font-bold text-emerald-600">{pkg.points + pkg.bonus}</span>
                    <span className="text-xs text-gray-600">ВБ</span>
                  </div>
                  <div className="text-xs text-gray-500 mb-3">
                    {pkg.bonus ? `Включая бонус +${pkg.bonus}` : "Без бонуса"}
                  </div>
                  <div className="text-lg font-bold text-gray-900">
                    {pkg.price}
                    {pkg.currency}
                  </div>
                </button>
              );
            })}
          </div>

          <div>
            <p className="font-semibold text-gray-900 mb-3 text-sm sm:text-base">Способ оплаты (пока не активен)</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
              {paymentMethods.map((m) => {
                const Mi = m.icon;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id)}
                    className={`flex gap-3 p-3 rounded-lg border text-left transition-all ${
                      paymentMethod === m.id ? "border-emerald-500 bg-emerald-50" : "border-gray-200 hover:border-emerald-200"
                    }`}
                  >
                    <Mi className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="font-medium text-sm">{m.name}</div>
                      <div className="text-xs text-gray-600 truncate">{m.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => handlePurchase()}
              disabled={!selectedPackage || !paymentMethod}
              className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl flex justify-center items-center gap-2"
            >
              <Coins className="w-5 h-5" />
              Подтвердить (сообщение)
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
