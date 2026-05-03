import { ArrowLeft, FileSearch, Upload, Loader, Brain, AlertCircle, FileText, Image as ImageIcon, Sparkles, Coins } from "lucide-react";
import { useState } from "react";
import { useVetPoints } from "../contexts/VetPointsContext";

interface MedicalAnalyzerProps {
  onBack: () => void;
}

const ANALYZER_COST = 50;

export default function MedicalAnalyzer({ onBack }: MedicalAnalyzerProps) {
  const [analysisType, setAnalysisType] = useState<"anamnesis" | "imaging">("anamnesis");
  const [anamnesis, setAnamnesis] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<{
    diagnosis: string[];
    confidence: number;
    recommendations: string[];
    additionalTests: string[];
    urgency: "low" | "medium" | "high";
  } | null>(null);
  const { balance, spendServer } = useVetPoints();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setUploadedFiles(Array.from(e.target.files));
    }
  };

  const analyzeData = async () => {
    if (balance < ANALYZER_COST) {
      alert(`Недостаточно ВетБаллов! Требуется: ${ANALYZER_COST} ВБ, Доступно: ${balance} ВБ`);
      return;
    }

    const success = await spendServer({ action: "TOOL_ANALYZER" });
    if (!success) {
      alert("Не удалось списать VetCoin или недостаточно средств на сервере");
      return;
    }

    setAnalyzing(true);
    setResult(null);

    // Симуляция AI-анализа
    setTimeout(() => {
      if (analysisType === "anamnesis") {
        setResult({
          diagnosis: [
            "Острый гастроэнтерит (вероятность 78%)",
            "Пищевая непереносимость (вероятность 15%)",
            "Инородное тело в ЖКТ (вероятность 7%)",
          ],
          confidence: 78,
          recommendations: [
            "Голодная диета 12-24 часа",
            "Обеспечить доступ к чистой воде",
            "Начать регидратационную терапию",
            "Рассмотреть применение пробиотиков",
          ],
          additionalTests: [
            "Общий анализ крови",
            "Биохимический анализ крови",
            "УЗИ брюшной полости",
            "Копрологическое исследование",
          ],
          urgency: "medium",
        });
      } else {
        setResult({
          diagnosis: [
            "Признаки пневмонии в правой доле (вероятность 82%)",
            "Бронхит (вероятность 12%)",
            "Плевральный выпот (вероятность 6%)",
          ],
          confidence: 82,
          recommendations: [
            "Антибиотикотерапия широкого спектра",
            "Рентгенография в динамике через 5-7 дней",
            "Контроль температуры",
            "Обеспечить покой и тепло",
          ],
          additionalTests: [
            "Посев мокроты",
            "Общий анализ крови с лейкоформулой",
            "С-реактивный белок",
            "Газы крови (при необходимости)",
          ],
          urgency: "high",
        });
      }
      setAnalyzing(false);
    }, 3000);
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "high":
        return "bg-red-100 text-red-700 border-red-300";
      case "medium":
        return "bg-orange-100 text-orange-700 border-orange-300";
      case "low":
        return "bg-green-100 text-green-700 border-green-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  const getUrgencyLabel = (urgency: string) => {
    switch (urgency) {
      case "high":
        return "Требует срочного внимания";
      case "medium":
        return "Умеренная срочность";
      case "low":
        return "Плановое наблюдение";
      default:
        return "";
    }
  };

  return (
    <div className="space-y-5 lg:space-y-6">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors text-sm lg:text-base"
      >
        <ArrowLeft className="w-4 h-4 lg:w-5 lg:h-5" />
        Назад к инструментам
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6">
        {/* Input Form */}
        <div className="bg-white rounded-xl lg:rounded-2xl border border-gray-200 p-5 lg:p-6">
          <div className="flex items-center gap-3 mb-5 lg:mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center">
              <FileSearch className="w-6 h-6 text-white" />
            </div>
            <h2 className="font-bold text-xl lg:text-2xl">AI-анализ диагностики</h2>
          </div>

          {/* Analysis Type */}
          <div className="mb-5 lg:mb-6">
            <label className="block font-semibold mb-3 text-sm lg:text-base">
              Тип анализа <span className="text-red-600">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setAnalysisType("anamnesis")}
                className={`p-4 rounded-lg border-2 transition-all ${
                  analysisType === "anamnesis"
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-blue-300"
                }`}
              >
                <FileText className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                <div className="font-medium text-sm">Анамнез</div>
              </button>

              <button
                onClick={() => setAnalysisType("imaging")}
                className={`p-4 rounded-lg border-2 transition-all ${
                  analysisType === "imaging"
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-blue-300"
                }`}
              >
                <ImageIcon className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                <div className="font-medium text-sm">УЗИ/Рентген</div>
              </button>
            </div>
          </div>

          {analysisType === "anamnesis" ? (
            <div className="space-y-4">
              <div>
                <label htmlFor="anamnesis" className="block font-semibold mb-2 text-sm lg:text-base">
                  Описание анамнеза <span className="text-red-600">*</span>
                </label>
                <textarea
                  id="anamnesis"
                  value={anamnesis}
                  onChange={(e) => setAnamnesis(e.target.value)}
                  placeholder="Опишите симптомы, жалобы, историю заболевания, результаты осмотра...&#10;&#10;Пример: Собака, 5 лет, вялость 3 дня, рвота 2 раза, отказ от корма, температура 39.5°C, бледные слизистые..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[200px] resize-y text-sm lg:text-base"
                  maxLength={2000}
                />
                <div className="text-xs text-gray-500 mt-1">{anamnesis.length}/2000 символов</div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block font-semibold mb-2 text-sm lg:text-base">
                  Загрузка снимков <span className="text-red-600">*</span>
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm font-medium text-gray-700 mb-1">
                      Нажмите для загрузки снимков
                    </p>
                    <p className="text-xs text-gray-500">
                      Поддерживаются форматы: JPG, PNG, DICOM
                    </p>
                  </label>
                </div>

                {uploadedFiles.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {uploadedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg text-sm"
                      >
                        <ImageIcon className="w-4 h-4 text-blue-600" />
                        <span className="flex-1 truncate">{file.name}</span>
                        <span className="text-xs text-gray-500">
                          {(file.size / 1024).toFixed(1)} KB
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="imaging-notes" className="block font-semibold mb-2 text-sm lg:text-base">
                  Дополнительная информация (опционально)
                </label>
                <textarea
                  id="imaging-notes"
                  placeholder="Укажите проекцию снимка, область исследования, клинические данные..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] resize-y text-sm lg:text-base"
                />
              </div>
            </div>
          )}

          {/* Balance Info */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-4 border border-amber-200 mt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-600" />
                <span className="text-sm font-medium text-gray-700">Ваш баланс:</span>
              </div>
              <span className="font-bold text-lg text-amber-600">{balance} ВБ</span>
            </div>
          </div>

          {/* Analyze Button */}
          <button
            onClick={() => void analyzeData()}
            disabled={
              analyzing ||
              (analysisType === "anamnesis" ? !anamnesis : uploadedFiles.length === 0) ||
              balance < ANALYZER_COST
            }
            className="w-full mt-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3.5 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
          >
            {analyzing ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Анализ данных...
              </>
            ) : (
              <>
                <Brain className="w-5 h-5" />
                Начать AI-анализ
                <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-sm">
                  {ANALYZER_COST} ВБ
                </span>
              </>
            )}
          </button>

          {balance < ANALYZER_COST && !analyzing && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 mt-3">
              ⚠️ Недостаточно ВетБаллов. Требуется минимум {ANALYZER_COST} ВБ
            </div>
          )}
        </div>

        {/* Results */}
        <div className="bg-white rounded-xl lg:rounded-2xl border border-gray-200 p-5 lg:p-6">
          <div className="flex items-center gap-2 mb-4 lg:mb-5">
            <Sparkles className="w-6 h-6 text-indigo-600" />
            <h3 className="font-bold text-xl lg:text-2xl">Результаты анализа</h3>
          </div>

          {analyzing ? (
            <div className="flex flex-col items-center justify-center h-96">
              <div className="relative">
                <Brain className="w-20 h-20 text-blue-500 animate-pulse" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader className="w-10 h-10 text-indigo-600 animate-spin" />
                </div>
              </div>
              <p className="text-gray-600 mt-6 text-center">
                AI анализирует предоставленные данные...
                <br />
                <span className="text-sm text-gray-500">Это может занять несколько секунд</span>
              </p>
            </div>
          ) : result ? (
            <div className="space-y-4">
              {/* Urgency Badge */}
              <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border-2 font-medium text-sm ${getUrgencyColor(result.urgency)}`}>
                <AlertCircle className="w-4 h-4" />
                {getUrgencyLabel(result.urgency)}
              </div>

              {/* Diagnosis */}
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
                <div className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  Предварительный диагноз
                </div>
                <div className="space-y-2">
                  {result.diagnosis.map((diag, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold">{index + 1}.</span>
                      <span className="text-sm text-blue-900">{diag}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <div className="text-xs text-blue-700 mb-1">УВЕРЕННОСТЬ AI</div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-blue-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${result.confidence}%` }}
                      />
                    </div>
                    <span className="font-bold text-blue-900">{result.confidence}%</span>
                  </div>
                </div>
              </div>

              {/* Recommendations */}
              <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg">
                <div className="font-semibold text-green-900 mb-2">Рекомендации</div>
                <ul className="space-y-1.5">
                  {result.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-green-900">
                      <span className="text-green-600">✓</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Additional Tests */}
              <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded-lg">
                <div className="font-semibold text-purple-900 mb-2">
                  Дополнительные исследования
                </div>
                <ul className="space-y-1.5">
                  {result.additionalTests.map((test, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-purple-900">
                      <span className="text-purple-600">•</span>
                      <span>{test}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Disclaimer */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-900">
                    <p className="font-semibold mb-1">Важное предупреждение</p>
                    <p>
                      Результаты AI-анализа носят исключительно рекомендательный характер и не заменяют
                      профессионального клинического суждения. Окончательный диагноз и план лечения должен
                      определяться ветеринарным специалистом на основе комплексного обследования.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-96 text-center">
              <Brain className="w-16 h-16 text-gray-300 mb-4" />
              <p className="text-gray-500">
                Введите данные и нажмите "Начать AI-анализ" для получения предварительного диагноза
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
