import { useEffect, useState } from "react";
import { X, Gift } from "lucide-react";
import { useVetPoints } from "../contexts/VetPointsContext";

interface BadgeStoreProps {
  onClose: () => void;
  recipientName?: string;
}

const availableBadges = [
  { id: "expert", name: "Эксперт", icon: "👨‍⚕️", color: "from-blue-500 to-blue-600", cost: 200, duration: 7 },
  { id: "helper", name: "Помощник", icon: "🤝", color: "from-green-500 to-green-600", cost: 150, duration: 7 },
  { id: "star", name: "Звезда", icon: "⭐", color: "from-yellow-500 to-yellow-600", cost: 250, duration: 7 },
  { id: "top", name: "ТОП", icon: "🏆", color: "from-purple-500 to-purple-600", cost: 300, duration: 7 },
  { id: "verified", name: "Проверенный", icon: "✓", color: "from-emerald-500 to-emerald-600", cost: 180, duration: 14 },
  { id: "premium", name: "Премиум", icon: "💎", color: "from-indigo-500 to-indigo-600", cost: 500, duration: 30 },
  { id: "legend", name: "Легенда", icon: "👑", color: "from-amber-500 to-amber-600", cost: 1000, duration: 30 },
  { id: "hero", name: "Герой", icon: "🦸", color: "from-red-500 to-red-600", cost: 350, duration: 14 },
  { id: "guru", name: "Гуру", icon: "🧙", color: "from-violet-500 to-violet-600", cost: 400, duration: 14 },
];

/** Самопокупка ярлыков запрещена: только дарение (оплата + к оформлению подарка). Автоматические ярлыки — за активность и статус аккаунта (см. профиль). */
export default function BadgeStore({ onClose, recipientName }: BadgeStoreProps) {
  const { balance, spendServer } = useVetPoints();
  const [selectedBadge, setSelectedBadge] = useState<(typeof availableBadges)[0] | null>(null);
  const [giftRecipient, setGiftRecipient] = useState(recipientName ?? "");

  useEffect(() => {
    setGiftRecipient(recipientName ?? "");
  }, [recipientName]);

  const GIFT_SURCHARGE = 50;

  const handleGift = async () => {
    if (!selectedBadge) return;

    const totalCost = selectedBadge.cost + GIFT_SURCHARGE;

    if (balance < totalCost) {
      alert("Недостаточно ВетБаллов");
      return;
    }

    if (!giftRecipient.trim()) {
      alert("Укажите получателя — имя, ник или e-mail коллеги");
      return;
    }

    const success = await spendServer({
      action: "BADGE_PURCHASE",
      badgeId: selectedBadge.id,
      gift: true,
    });

    if (!success) {
      alert(
        "Не удалось выполнить списание на сервере (проверьте баланс и что разрешены только подарочные покупки).",
      );
      return;
    }

    alert(
      `Списано ${totalCost} ВБ. Ярлык «${selectedBadge.name}» отправлен получателю «${giftRecipient.trim()}». Назначение на аккаунт получателя добавляется модерацией/в будущем на сервере.`,
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <div className="bg-white border-b border-gray-200 p-3 sm:p-5 lg:p-6 flex justify-between items-start gap-3 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">Подарить ярлык</h2>
            <p className="text-xs sm:text-sm text-gray-600 mt-2 leading-relaxed">
              Приобретать себе ярлык нельзя — только коллеге. Свои значки получаются <strong>автоматически</strong>, когда
              выполнены условия (активность на форуме, подтверждённая почта и т. д.).
            </p>
            <p className="text-xs sm:text-sm text-gray-600 mt-2">
              Баланс: <span className="font-bold text-emerald-600">{balance} ВБ</span> · К оформлению всегда +{GIFT_SURCHARGE}{" "}
              ВБ
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg flex-shrink-0" aria-label="Закрыть">
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        <div className="p-3 sm:p-5 lg:p-6">
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg sm:rounded-xl">
            <div className="flex items-center gap-2 text-pink-700 font-semibold text-sm sm:text-base mb-2">
              <Gift className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              Получатель
            </div>
            <input
              type="text"
              value={giftRecipient}
              onChange={(e) => setGiftRecipient(e.target.value)}
              placeholder="Имя, ник или email коллеги"
              className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 lg:gap-4 mb-4 sm:mb-5 lg:mb-6">
            {availableBadges.map((badge) => (
              <button
                key={badge.id}
                type="button"
                onClick={() => setSelectedBadge(badge)}
                className={`p-2 sm:p-3 lg:p-4 rounded-lg sm:rounded-xl border-2 transition-all text-left ${
                  selectedBadge?.id === badge.id
                    ? "border-emerald-500 bg-emerald-50 shadow-lg sm:scale-105"
                    : "border-gray-200 hover:border-gray-300 hover:shadow-md"
                }`}
              >
                <div
                  className={`w-10 h-10 sm:w-14 sm:h-14 lg:w-16 lg:h-16 mx-auto mb-2 sm:mb-3 rounded-full bg-gradient-to-br ${badge.color} flex items-center justify-center text-xl sm:text-2xl lg:text-3xl shadow-lg`}
                >
                  {badge.icon}
                </div>
                <h3 className="font-bold text-xs sm:text-sm lg:text-base text-gray-900 mb-1">{badge.name}</h3>
                <p className="text-[10px] sm:text-xs lg:text-sm text-gray-600 mb-1 sm:mb-2">{badge.duration} дн</p>
                <p className="font-bold text-xs sm:text-sm lg:text-base text-emerald-600">{badge.cost} ВБ + {GIFT_SURCHARGE} ВБ</p>
              </button>
            ))}
          </div>

          {selectedBadge && (
            <div className="bg-white border-t border-gray-200 pt-3 sm:pt-4">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Подарок:</p>
                  <p className="font-bold text-sm sm:text-base text-gray-900">{selectedBadge.name}</p>
                  <p className="text-xs text-gray-500 mt-1">→ {giftRecipient.trim() || "получатель…"}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs sm:text-sm text-gray-600">С вашего счёта:</p>
                  <p className="font-bold text-sm sm:text-base text-gray-900">
                    {selectedBadge.cost + GIFT_SURCHARGE} ВБ
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => void handleGift()}
                disabled={!giftRecipient.trim()}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-3 sm:py-3.5 lg:py-4 rounded-lg sm:rounded-xl font-bold text-sm sm:text-base hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Подарить «{selectedBadge.name}»
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
