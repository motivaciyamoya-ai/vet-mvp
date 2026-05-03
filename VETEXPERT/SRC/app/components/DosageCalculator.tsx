import {
  ArrowLeft,
  Calculator,
  AlertCircle,
  Check,
  Copy,
  Coins,
  Search,
  RotateCcw,
  BookOpen,
  Stethoscope,
  Pill,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useVetPoints } from "../contexts/VetPointsContext";
import {
  dosageCategories,
  drugByIdFrom,
  mergeDosageCatalogFromApi,
  DRUG_REFERENCE,
  type DrugRecord,
  type DosageDrugApiRow,
  type AnimalKey,
} from "../../lib/vetDosageReference";
import { apiFetch } from "../../lib/api";

interface DosageCalculatorProps {
  onBack: () => void;
}

const DOSAGE_COST = 20;

const animalTypes: Array<{ value: AnimalKey; label: string; icon: string }> = [
  { value: "dog", label: "Собака", icon: "🐕" },
  { value: "cat", label: "Кошка", icon: "🐈" },
  { value: "rabbit", label: "Кролик", icon: "🐰" },
  { value: "bird", label: "Птица", icon: "🦜" },
  { value: "reptile", label: "Рептилия", icon: "🦎" },
  { value: "horse", label: "Лошадь", icon: "🐴" },
];

export default function DosageCalculator({ onBack }: DosageCalculatorProps) {
  const [catalog, setCatalog] = useState<DrugRecord[]>(DRUG_REFERENCE);
  const [animalType, setAnimalType] = useState<AnimalKey | "">("");
  const [weight, setWeight] = useState("");
  const [medication, setMedication] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [result, setResult] = useState<{
    drugName: string;
    dosage: string;
    frequency: string;
    duration: string;
    notes: string;
    instruction: string;
    warnings?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const { balance, spendServer } = useVetPoints();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await apiFetch<DosageDrugApiRow[]>("/api/dosage-drugs");
        if (!cancelled && Array.isArray(rows)) {
          setCatalog(mergeDosageCatalogFromApi(rows));
        }
      } catch {
        /* оставить встроенный справочник */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const categories = useMemo(() => dosageCategories(catalog), [catalog]);

  const filteredDrugs = useMemo(() => {
    let rows = [...catalog];
    if (categoryFilter) {
      rows = rows.filter((d) => d.category === categoryFilter);
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (d) =>
          d.nameRu.toLowerCase().includes(q) ||
          d.summary.toLowerCase().includes(q) ||
          d.category.toLowerCase().includes(q) ||
          d.instruction.toLowerCase().includes(q),
      );
    }
    return rows;
  }, [catalog, searchQuery, categoryFilter]);

  const selectedDrugMeta = medication ? drugByIdFrom(catalog, medication) : undefined;

  const resetFilters = () => {
    setSearchQuery("");
    setCategoryFilter(null);
  };

  const calculateDosage = async () => {
    if (!animalType || !medication || !weight.trim()) {
      alert("Укажите вид животного, препарат и массу.");
      return;
    }

    const weightNum = parseFloat(weight.replace(",", "."));
    if (!(weightNum > 0) || weightNum > 900) {
      alert("Укажите реалистичную массу (кг).");
      return;
    }

    const drug = drugByIdFrom(catalog, medication);
    const dosingRow = drug?.dosing[animalType];
    if (!drug || !dosingRow || !(dosingRow.mgPerKg > 0)) {
      alert(
        "Для выбранного вида животного в справочнике нет шаблонной дозировки mg/кг по этому препарату. Выберите другой препарат/вид или ориентируйтесь на текст карточки и инструкцию.",
      );
      return;
    }

    if (balance < DOSAGE_COST) {
      alert(`Недостаточно VetCoin: нужно ${DOSAGE_COST}, доступно ${balance}.`);
      return;
    }

    const success = await spendServer({ action: "TOOL_DOSAGE" });
    if (!success) {
      alert("Не удалось списать VetCoin: проверьте баланс и ответ сервера.");
      return;
    }

    const mgTotal = dosingRow.mgPerKg * weightNum;
    const animalLabel = animalTypes.find((a) => a.value === animalType)?.label ?? animalType;

    setResult({
      drugName: drug.nameRu,
      dosage: `${mgTotal.toFixed(2)} мг за приём (${dosingRow.mgPerKg} мг/кг × ${weightNum} кг)`,
      frequency: dosingRow.freq,
      duration: dosingRow.duration,
      notes:
        `${dosingRow.note ? dosingRow.note + " " : ""}Рассчитано для «${animalLabel}». Справочник не заменяет инструкцию к конкретной форме выпуска.`.trim(),
      instruction: drug.instruction,
      warnings: drug.warnings,
    });
  };

  const copyToClipboard = () => {
    if (!result) return;
    const text = `${result.drugName}\nИНСТРУКЦИЯ:\n${result.instruction}\n\nДозировка: ${result.dosage}\nЧастота: ${result.frequency}\nДлительность: ${result.duration}\nПримечания: ${result.notes}`;
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5 lg:space-y-8">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors text-sm lg:text-base"
      >
        <ArrowLeft className="w-4 h-4 lg:w-5 lg:h-5" />
        Назад к инструментам
      </button>

      {/* Шапка в стиле VetConnect */}
      <div className="rounded-2xl border border-teal-200/80 bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 px-5 py-6 sm:px-8 sm:py-7 text-white shadow-lg">
        <div className="flex flex-wrap items-start gap-4 justify-between">
          <div className="flex gap-4 min-w-0">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shrink-0 border border-white/30">
              <BookOpen className="w-7 h-7" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-2xl sm:text-3xl tracking-tight">Лекарственные препараты и дозировки</h1>
              <p className="text-teal-50/95 text-sm sm:text-base mt-1 max-w-2xl leading-relaxed">
                Быстрый справочник с расчётом по массе под те же задачи, что и тематические базы сообщества. Результат — памятка; решение принимает врач по полной инструкции и осмотру.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full bg-white/15 border border-white/25">
            <Stethoscope className="w-3.5 h-3.5" />
            VetConnect
          </span>
        </div>

        {/* Поиск + сброс — как «Найти / Сбросить» */}
        <div className="mt-5 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-teal-200" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Найти по названию, категории или показаниям…"
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-white/30 bg-white/10 placeholder:text-teal-100/80 text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
              autoComplete="off"
            />
          </div>
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-white/40 bg-white/10 hover:bg-white/20 transition font-semibold text-sm shrink-0"
          >
            <RotateCcw className="w-4 h-4" />
            Сбросить
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCategoryFilter(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition border ${
              categoryFilter === null
                ? "bg-white text-emerald-800 border-white"
                : "bg-white/10 text-white border-white/30 hover:bg-white/20"
            }`}
          >
            Все группы
          </button>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategoryFilter(c)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition border ${
                categoryFilter === c
                  ? "bg-white text-emerald-800 border-white"
                  : "bg-white/10 text-white border-white/30 hover:bg-white/20"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 xl:gap-8">
        {/* Список препаратов */}
        <aside className="lg:col-span-5 xl:col-span-4 flex flex-col min-h-[320px] max-h-[min(70vh,640px)]">
          <div className="bg-white rounded-xl lg:rounded-2xl border border-gray-200 shadow-sm flex flex-col h-full overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-teal-50 to-emerald-50 flex items-center justify-between gap-2">
              <h2 className="font-bold text-gray-900 text-sm sm:text-base">Справочник</h2>
              <span className="text-xs text-gray-500 tabular-nums">{filteredDrugs.length} записей</span>
            </div>
            <div className="overflow-y-auto flex-1 p-2 space-y-2">
              {filteredDrugs.length === 0 ? (
                <p className="text-sm text-gray-500 px-3 py-6 text-center">Ничего не найдено — измените запрос или сбросьте фильтры.</p>
              ) : (
                filteredDrugs.map((drug) => (
                  <button
                    key={drug.id}
                    type="button"
                    onClick={() => setMedication(drug.id)}
                    className={`w-full text-left rounded-xl px-4 py-3 border transition-all ${
                      medication === drug.id
                        ? "border-emerald-500 bg-emerald-50 shadow-sm ring-1 ring-emerald-200"
                        : "border-gray-100 bg-gray-50/50 hover:border-teal-200 hover:bg-teal-50/40"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0 text-white shadow">
                        <Pill className="w-5 h-5 text-white" aria-hidden />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-900 text-sm leading-snug">{drug.nameRu}</p>
                        <p className="text-[11px] font-medium text-teal-700 mt-0.5">{drug.category}</p>
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">{drug.summary}</p>
                        <div className="mt-3 pt-2 border-t border-gray-100">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-teal-700 mb-1">Инструкция</p>
                          <p className="text-[11px] text-gray-700 leading-snug line-clamp-4">{drug.instruction}</p>
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </aside>

        {/* Калькулятор + результат */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-white rounded-xl lg:rounded-2xl border border-gray-200 p-5 lg:p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-5 lg:mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-md">
                  <Calculator className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-xl lg:text-2xl text-gray-900">Расчёт по массе</h2>
                  <p className="text-xs text-gray-500">Списание {DOSAGE_COST} VetCoin за расчёт</p>
                </div>
              </div>

              <div className="space-y-4 lg:space-y-5">
                <div>
                  <label className="block font-semibold mb-2 text-sm">Вид животного</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {animalTypes.map((animal) => (
                      <button
                        key={animal.value}
                        type="button"
                        onClick={() => setAnimalType(animal.value)}
                        className={`p-2.5 rounded-lg border-2 transition-all text-xs sm:text-sm ${
                          animalType === animal.value
                            ? "border-emerald-500 bg-emerald-50"
                            : "border-gray-200 hover:border-emerald-300"
                        }`}
                      >
                        <div className="text-xl mb-0.5">{animal.icon}</div>
                        <div className="font-medium">{animal.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="dosage-weight" className="block font-semibold mb-2 text-sm">
                    Масса (кг)
                  </label>
                  <input
                    id="dosage-weight"
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    min="0"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="Например, 6.2"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="dosage-med-select" className="block font-semibold mb-2 text-sm">
                    Препарат из списка
                  </label>
                  <select
                    id="dosage-med-select"
                    value={medication}
                    onChange={(e) => setMedication(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  >
                    <option value="">Выберите…</option>
                    {catalog.map((med) => (
                      <option key={med.id} value={med.id}>
                        {med.nameRu} · {med.category}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedDrugMeta && (
                  <>
                    <div className="rounded-xl border border-teal-200 bg-gradient-to-br from-teal-50 to-emerald-50 p-4 text-xs text-gray-800 space-y-2 shadow-sm">
                      <p className="font-bold text-teal-900 uppercase tracking-wide text-[11px]">
                        Инструкция (аптечная памятка)
                      </p>
                      <p className="leading-relaxed">{selectedDrugMeta.instruction}</p>
                      <p className="text-[10px] text-teal-700/90 border-t border-teal-100 pt-2">
                        Обобщённый текст платформы: всегда сверять с официальной инструкцией производителя к вашей упакованной форме выпуска.
                      </p>
                    </div>
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-950 space-y-1">
                      <p className="font-semibold">К карточке</p>
                      <p>{selectedDrugMeta.summary}</p>
                      {selectedDrugMeta.warnings && (
                        <p className="text-red-800 font-medium mt-2">⚠ {selectedDrugMeta.warnings}</p>
                      )}
                    </div>
                  </>
                )}

                <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-gray-700">
                      <Coins className="w-5 h-5 text-amber-600" />
                      <span>Баланс</span>
                    </div>
                    <span className="font-bold text-lg text-amber-600">{balance}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => void calculateDosage()}
                  disabled={!animalType || !weight || !medication || balance < DOSAGE_COST}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-3.5 rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  <Calculator className="w-5 h-5 shrink-0" />
                  Рассчитать дозировку
                  <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">{DOSAGE_COST} VetCoin</span>
                </button>

                {balance < DOSAGE_COST && (
                  <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                    Нехватает VetCoin для этого расчёта.
                  </p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl lg:rounded-2xl border border-gray-200 p-5 lg:p-6 shadow-sm min-h-[320px] flex flex-col">
              <h3 className="font-bold text-xl mb-4 text-gray-900">Результат</h3>
              {result ? (
                <div className="space-y-4 flex-1">
                  <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Check className="w-5 h-5 text-emerald-600" />
                      <span className="font-semibold text-emerald-900">{result.drugName}</span>
                    </div>
                    <dl className="space-y-2 text-sm">
                      <div>
                        <dt className="text-emerald-700 text-xs uppercase font-semibold">Доза</dt>
                        <dd className="font-bold text-emerald-950 text-lg">{result.dosage}</dd>
                      </div>
                      <div>
                        <dt className="text-emerald-700 text-xs uppercase font-semibold">Частота</dt>
                        <dd className="font-medium text-emerald-900">{result.frequency}</dd>
                      </div>
                      <div>
                        <dt className="text-emerald-700 text-xs uppercase font-semibold">Длительность</dt>
                        <dd className="font-medium text-emerald-900">{result.duration}</dd>
                      </div>
                    </dl>
                  </div>

                  <div className="rounded-xl border border-teal-200 bg-teal-50/70 p-3 text-xs text-gray-800 space-y-1">
                    <p className="text-teal-800 text-[10px] uppercase font-bold tracking-wide">Инструкция</p>
                    <p className="leading-relaxed">{result.instruction}</p>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs text-gray-800">
                    {result.notes}
                  </div>

                  {result.warnings && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-900 flex gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      {result.warnings}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => copyToClipboard()}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-gray-200 rounded-xl hover:bg-gray-50 transition-colors font-medium text-sm"
                  >
                    {copied ? (
                      <>
                        <Check className="w-5 h-5 text-green-600" />
                        Скопировано
                      </>
                    ) : (
                      <>
                        <Copy className="w-5 h-5" />
                        Копировать текст
                      </>
                    )}
                  </button>

                  <p className="text-[11px] text-red-700 font-medium mt-auto pt-2 border-t border-red-100">
                    Оценочный расчёт по справочнику платформы. Не является назначением: сверять с официальной инструкцией и
                    клиникой случая.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col flex-1 items-center justify-center text-center text-gray-500 py-10 px-4">
                  <Calculator className="w-14 h-14 text-gray-200 mb-3" />
                  <p className="text-sm max-w-[18rem]">Выберите препарат из списка слева, заполните данные животного и нажмите «Рассчитать».</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
