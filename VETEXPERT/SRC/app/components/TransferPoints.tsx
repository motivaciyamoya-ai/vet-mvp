import { useState } from "react";
import { X, Send, User, Coins } from "lucide-react";
import { useVetPoints } from "../contexts/VetPointsContext";

interface TransferPointsProps {
  onClose: () => void;
  recipientName?: string;
}

export default function TransferPoints({ onClose, recipientName }: TransferPointsProps) {
  const { balance } = useVetPoints();
  const [recipient, setRecipient] = useState(recipientName || "");
  const [amount, setAmount] = useState("");

  const presetAmounts = [50, 100, 200, 500];

  const handleTransfer = () => {
    alert(
      "Перевод VetCoin другому пользователю через этот интерфейс пока не реализован на сервере. Баланс хранится в базе данных; изменения возможны через администратора.",
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl max-w-md w-full p-4 sm:p-6">
        {/* Header */}
        <div className="flex justify-between items-start gap-3 mb-4 sm:mb-6">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center flex-shrink-0">
              <Send className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">Перевод баллов</h2>
              <p className="text-xs sm:text-sm text-gray-600">Баланс: {balance} ВБ</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Recipient */}
        <div className="mb-4 sm:mb-6">
          <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
            Получатель
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="Имя пользователя"
              className="w-full pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Amount */}
        <div className="mb-3 sm:mb-4">
          <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
            Сумма
          </label>
          <div className="relative">
            <Coins className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              min="1"
              max={balance}
              className="w-full pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Preset Amounts */}
        <div className="grid grid-cols-4 gap-2 mb-4 sm:mb-6">
          {presetAmounts.map((preset) => (
            <button
              key={preset}
              onClick={() => setAmount(preset.toString())}
              disabled={preset > balance}
              className="px-2 sm:px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm font-semibold"
            >
              {preset}
            </button>
          ))}
        </div>

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 sm:p-3 mb-4 sm:mb-6">
          <p className="text-xs sm:text-sm text-blue-800">
            💡 Баллы зачисляются мгновенно
          </p>
        </div>

        {/* Transfer Button */}
        <button
          onClick={handleTransfer}
          disabled={!recipient.trim() || !amount || parseInt(amount) <= 0}
          className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-2.5 sm:py-3 rounded-lg font-bold text-sm sm:text-base hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Send className="w-4 h-4 sm:w-5 sm:h-5" />
          Перевести
        </button>
      </div>
    </div>
  );
}
