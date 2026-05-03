import { Calculator, FileSearch, Pill, Stethoscope, Coins, ShoppingCart } from "lucide-react";
import { useState } from "react";
import DosageCalculator from "./DosageCalculator";
import MedicalAnalyzer from "./MedicalAnalyzer";
import BuyPoints from "./BuyPoints";
import { useVetPoints } from "../contexts/VetPointsContext";

export default function Tools() {
  const [activeTool, setActiveTool] = useState<"dosage" | "analyzer" | null>(null);
  const [buyPointsOpen, setBuyPointsOpen] = useState(false);
  const { balance } = useVetPoints();

  const tools = [
    {
      id: "dosage" as const,
      icon: Calculator,
      title: "Калькулятор дозировок",
      description: "Справочник препаратов с поиском и расчёт доз по массе в стиле VetConnect",
      color: "emerald",
      gradient: "from-emerald-500 to-teal-500",
      cost: 20,
    },
    {
      id: "analyzer" as const,
      icon: FileSearch,
      title: "AI-анализ диагностики",
      description: "Загрузите снимки УЗИ/рентгена или анамнез для предварительного диагноза",
      color: "blue",
      gradient: "from-blue-500 to-indigo-500",
      cost: 50,
    },
  ];

  return (
    <div className="space-y-5 lg:space-y-6 xl:space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-bold text-xl sm:text-2xl lg:text-3xl mb-1 flex items-center gap-3">
          <Stethoscope className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-emerald-600" />
          AI-инструменты
        </h1>
        <p className="text-gray-600 text-sm lg:text-base">
          Профессиональные инструменты с поддержкой искусственного интеллекта
        </p>
      </div>

      {activeTool === null ? (
        <>
          {/* Tools Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
            {tools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id)}
                className="group bg-white rounded-xl lg:rounded-2xl border-2 border-gray-200 p-6 lg:p-8 hover:border-gray-300 hover:shadow-xl transition-all text-left"
              >
                <div
                  className={`w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20 bg-gradient-to-br ${tool.gradient} rounded-2xl flex items-center justify-center mb-4 lg:mb-6 group-hover:scale-110 transition-transform shadow-lg`}
                >
                  <tool.icon className="w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-white" />
                </div>

                <h3 className="font-bold text-lg sm:text-xl lg:text-2xl mb-2 lg:mb-3 group-hover:text-emerald-700 transition-colors">
                  {tool.title}
                </h3>
                <p className="text-gray-600 text-sm lg:text-base leading-relaxed">
                  {tool.description}
                </p>

                <div className="mt-4 lg:mt-6 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-700 font-medium text-sm lg:text-base">
                    Открыть инструмент
                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full font-bold text-sm shadow-md">
                    <Coins className="w-4 h-4" />
                    {tool.cost} ВБ
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Balance Info */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl lg:rounded-2xl p-6 lg:p-8 border border-amber-200">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <Coins className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg lg:text-xl mb-2">Ваш баланс ВетБаллов</h3>
                <p className="text-3xl font-bold text-amber-600 mb-3">{balance} ВБ</p>
                <p className="text-gray-700 text-sm lg:text-base mb-4">
                  Каждое использование AI-инструмента списывает ВетБаллы. Зарабатывайте баллы, участвуя в форумах и публикуя статьи!
                </p>
                <button
                  onClick={() => setBuyPointsOpen(true)}
                  className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-3 rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all font-semibold shadow-md hover:shadow-lg flex items-center gap-2"
                >
                  <ShoppingCart className="w-5 h-5" />
                  Купить баллы
                </button>
              </div>
            </div>
          </div>

          {/* Info Section */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl lg:rounded-2xl p-6 lg:p-8 border border-blue-200">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <Pill className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-lg lg:text-xl mb-2">О AI-инструментах</h3>
                <p className="text-gray-700 text-sm lg:text-base leading-relaxed mb-3">
                  Наши инструменты используют передовые алгоритмы машинного обучения для помощи в
                  принятии клинических решений. AI-анализ предназначен для поддержки, а не замены
                  профессионального суждения ветеринара.
                </p>
                <ul className="space-y-2 text-sm lg:text-base text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">✓</span>
                    <span>Результаты носят рекомендательный характер</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">✓</span>
                    <span>Все данные обрабатываются конфиденциально</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">✓</span>
                    <span>Постоянное обновление базы знаний</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </>
      ) : activeTool === "dosage" ? (
        <DosageCalculator onBack={() => setActiveTool(null)} />
      ) : (
        <MedicalAnalyzer onBack={() => setActiveTool(null)} />
      )}

      {buyPointsOpen && <BuyPoints onClose={() => setBuyPointsOpen(false)} />}
    </div>
  );
}
