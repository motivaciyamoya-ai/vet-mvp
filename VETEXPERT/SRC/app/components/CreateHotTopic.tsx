import { X, AlertTriangle, Coins, ImagePlus, Trash2 } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import { apiFetch, apiUploadThreadImage, assetUrl, getAccessToken } from "../../lib/api";
import { ForumUrgencyIcon, forumUrgencyLabel } from "./ForumUrgencyVisual";
import { useVetPoints } from "../contexts/VetPointsContext";
import { useAuth } from "../contexts/AuthContext";

interface CreateHotTopicProps {
  onClose: () => void;
  /** Если задан (например с главной «срочная тема»), совпадает с кнопками уровня срочности */
  initialUrgency?: "critical" | "high" | "medium";
  /** `standard` — обычная тема без URGENCY и без списания за «горячую» */
  topicKind?: "hot" | "standard";
}

/** Множители совпадают с backend `forum.service` (medium×1, high×2, critical×3). */
const HOT_TOPIC_COST_MULT = {
  medium: 1,
  high: 2,
  critical: 3,
} as const;

export default function CreateHotTopic({ onClose, initialUrgency, topicKind = "hot" }: CreateHotTopicProps) {
  const navigate = useNavigate();
  const { balance, refreshVetcoins } = useVetPoints();
  const { user } = useAuth();
  const isHot = topicKind === "hot";
  const [urgency, setUrgency] = useState<"critical" | "high" | "medium">(() => initialUrgency ?? "high");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [error, setError] = useState("");
  const [coverImageUrls, setCoverImageUrls] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  /** Видимые на странице темы теги (через запятую или пробел); служебный URGENCY добавляется на сервер отдельно. */
  const [topicKeywords, setTopicKeywords] = useState("");
  /** База из `/api/forum/hot-topic-pricing` (= `vetcoin.hot_topic_cost` в админке). */
  const [hotTopicBaseCost, setHotTopicBaseCost] = useState(50);

  useEffect(() => {
    apiFetch<{ hotTopicBaseCost: number }>("/api/forum/hot-topic-pricing")
      .then((r) => setHotTopicBaseCost(Math.max(0, Math.floor(Number(r.hotTopicBaseCost)) || 50)))
      .catch(() => {});
  }, []);

  const urgencyDisplayCost = useMemo(
    () => ({
      medium: hotTopicBaseCost * HOT_TOPIC_COST_MULT.medium,
      high: hotTopicBaseCost * HOT_TOPIC_COST_MULT.high,
      critical: hotTopicBaseCost * HOT_TOPIC_COST_MULT.critical,
    }),
    [hotTopicBaseCost],
  );

  const currentCost = isHot ? urgencyDisplayCost[urgency] : 0;
  const canAfford = isHot ? balance >= currentCost : true;

  useEffect(() => {
    apiFetch<Array<{ id: string; name: string }>>("/api/forum/categories")
      .then((rows) => setCategories(Array.isArray(rows) ? rows : []))
      .catch(() => setCategories([]));
  }, []);

  const handleSubmit = async () => {
    setError("");
    if (!title.trim()) {
      setError("Введите название темы");
      return;
    }

    if (!description.trim()) {
      setError("Введите описание проблемы");
      return;
    }

    if (!categoryId) {
      setError("Выберите раздел форума из базы данных");
      return;
    }

    if (!user) {
      navigate("/login");
      return;
    }

    if (isHot && !canAfford) {
      setError("Недостаточно ВетБаллов для публикации горячей темы");
      return;
    }

    try {
      const keywordPart = topicKeywords.trim();
      const tagsCombined = isHot
        ? keywordPart
          ? `${keywordPart} URGENCY:${urgency}`
          : `URGENCY:${urgency}`
        : keywordPart;

      await apiFetch("/api/forum/threads", {
        method: "POST",
        json: {
          categoryId,
          title: title.trim(),
          body: description.trim(),
          tags: tagsCombined,
          ...(coverImageUrls.length > 0 ? { coverImageUrls } : {}),
        },
      });
      await refreshVetcoins();
      alert(
        isHot
          ? "Горячая тема опубликована. Списание VetCoin выполнено на сервере."
          : "Тема опубликована в выбранном разделе.",
      );
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Не удалось создать тему");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div
          className={`sticky top-0 text-white p-5 lg:p-6 border-b ${
            isHot
              ? "bg-gradient-to-r from-red-600 to-orange-600 border-red-700"
              : "bg-gradient-to-r from-emerald-600 to-teal-600 border-emerald-700"
          }`}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg transition-colors"
            aria-label="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              {isHot ? (
                <ForumUrgencyIcon level="critical" accent="onDark" className="w-7 h-7" />
              ) : (
                <span className="text-2xl" aria-hidden>
                  💬
                </span>
              )}
            </div>
            <h2 className="font-bold text-xl lg:text-2xl">
              {isHot ? "Создать горячую тему" : "Новая тема на форуме"}
            </h2>
          </div>
          <p className={`text-sm lg:text-base ${isHot ? "text-red-100" : "text-emerald-100"}`}>
            {isHot
              ? "Срочное обсуждение для получения быстрой помощи от коллег"
              : "Обычное обсуждение в выбранном разделе — без метки «горячая» и без оплаты за срочность"}
          </p>
        </div>

        {/* Alert */}
        {isHot ? (
          <div className="m-5 lg:m-6 p-4 bg-amber-50 border-l-4 border-amber-500 rounded-lg">
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-900">
                <p className="font-semibold mb-1">Используйте горячие темы только для срочных случаев</p>
                <p className="text-amber-800">
                  Горячие темы отправляют уведомления всем специалистам вашего региона. Используйте
                  эту функцию только для критических ситуаций, требующих немедленного внимания.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="m-5 lg:m-6 p-4 bg-slate-50 border-l-4 border-emerald-500 rounded-lg">
            <p className="text-sm text-slate-800">
              Обычные темы не помечаются как «горячие» и&nbsp;не&nbsp;участвуют в&nbsp;разделах «Горячие» / начислениях за
              срочность. После создания тема появится в общей ленте и в выбранном разделе.
            </p>
          </div>
        )}

        <div className="p-5 lg:p-6 space-y-5">
          {/* Urgency Level */}
          {isHot ? (
          <div>
            <label className="block font-semibold mb-3 text-gray-900">
              Уровень срочности <span className="text-red-600">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => setUrgency("critical")}
                className={`p-4 rounded-lg border-2 transition-all overflow-hidden ${
                  urgency === "critical"
                    ? "border-red-500 shadow-lg vc-urgency-critical-badge-bg"
                    : "border-gray-200 hover:border-red-300"
                }`}
              >
                <div className="flex flex-col items-center gap-1 mb-1">
                  <ForumUrgencyIcon level="critical" className="w-8 h-8" />
                  <span className="font-bold text-red-700 text-center">{forumUrgencyLabel.critical}</span>
                </div>
                <div className="text-xs text-gray-600 mb-2">Жизнь под угрозой</div>
                <div className="flex items-center justify-center gap-1 bg-red-600 text-white px-2 py-1 rounded text-xs font-bold">
                  <Coins className="w-3 h-3" />
                  {urgencyDisplayCost.critical}
                </div>
              </button>

              <button
                onClick={() => setUrgency("high")}
                className={`p-4 rounded-lg border-2 transition-all ${
                  urgency === "high"
                    ? "border-orange-500 bg-orange-50 shadow-lg"
                    : "border-gray-200 hover:border-orange-300"
                }`}
              >
                <div className="flex flex-col items-center gap-1 mb-1">
                  <ForumUrgencyIcon level="high" className="w-8 h-8" />
                  <span className="font-bold text-orange-700 text-center">{forumUrgencyLabel.high}</span>
                </div>
                <div className="text-xs text-gray-600 mb-2">Нужна помощь в ближайшее время</div>
                <div className="flex items-center justify-center gap-1 bg-orange-600 text-white px-2 py-1 rounded text-xs font-bold">
                  <Coins className="w-3 h-3" />
                  {urgencyDisplayCost.high}
                </div>
              </button>

              <button
                onClick={() => setUrgency("medium")}
                className={`p-4 rounded-lg border-2 transition-all ${
                  urgency === "medium"
                    ? "border-yellow-500 bg-yellow-50 shadow-lg"
                    : "border-gray-200 hover:border-yellow-300"
                }`}
              >
                <div className="flex flex-col items-center gap-1 mb-1">
                  <ForumUrgencyIcon level="medium" className="w-8 h-8" />
                  <span className="font-bold text-yellow-700 text-center">{forumUrgencyLabel.medium}</span>
                </div>
                <div className="text-xs text-gray-600 mb-2">Требует внимания коллег</div>
                <div className="flex items-center justify-center gap-1 bg-yellow-600 text-white px-2 py-1 rounded text-xs font-bold">
                  <Coins className="w-3 h-3" />
                  {urgencyDisplayCost.medium}
                </div>
              </button>
            </div>
          </div>
          ) : null}

          {/* Title */}
          <div>
            <label htmlFor="title" className="block font-semibold mb-2 text-gray-900">
              Заголовок <span className="text-red-600">*</span>
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Кратко опишите ситуацию..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-base"
              maxLength={150}
            />
            <div className="text-xs text-gray-500 mt-1">{title.length}/150 символов</div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block font-semibold mb-2 text-gray-900">
              Подробное описание <span className="text-red-600">*</span>
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Опишите ситуацию подробно: симптомы, предпринятые действия, результаты анализов..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-base min-h-[150px] resize-y"
              maxLength={2000}
            />
            <div className="text-xs text-gray-500 mt-1">{description.length}/2000 символов</div>
          </div>

          {/* Author-visible tags */}
          <div>
            <label htmlFor="topicKeywords" className="block font-semibold mb-2 text-gray-900">
              Теги темы <span className="text-gray-500 font-normal">(по желанию)</span>
            </label>
            <input
              id="topicKeywords"
              type="text"
              value={topicKeywords}
              onChange={(e) => setTopicKeywords(e.target.value)}
              placeholder="например: кошки, УЗИ, инфекция"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-base"
              maxLength={240}
              autoComplete="off"
            />
            <p className="text-xs text-gray-500 mt-1">
              Короткие слова через запятую или пробел — они отобразятся у темы.
              {isHot ? " Уровень срочности хранится отдельно и не показывается как текст." : ""}
            </p>
          </div>

          {/* Category */}
          <div>
            <label htmlFor="category" className="block font-semibold mb-2 text-gray-900">
              Категория <span className="text-red-600">*</span>
            </label>
            <select
              id="category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-base"
            >
              <option value="">{categories.length === 0 ? "Загрузка разделов…" : "Выберите раздел…"}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            <label className="block font-semibold text-gray-900">Иллюстрации к теме (до 8)</label>
            <p className="text-xs text-gray-600">JPEG, PNG, WebP или GIF до 8 МБ. Файлы хранятся на сервере.</p>
            <div className="flex flex-wrap gap-3">
              {coverImageUrls.map((url) => (
                <div key={url} className="relative w-24 h-24 rounded-lg overflow-hidden border border-gray-200 group/thumb">
                  <img src={assetUrl(url)} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    aria-label="Удалить изображение"
                    onClick={() => setCoverImageUrls((prev) => prev.filter((u) => u !== url))}
                    className="absolute inset-x-0 bottom-0 py-1 bg-black/55 text-white text-xs flex items-center justify-center gap-1 opacity-0 group-hover/thumb:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                    Убрать
                  </button>
                </div>
              ))}
              {coverImageUrls.length < 8 && (
                <label className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 hover:border-orange-400 transition-colors text-gray-600">
                  <ImagePlus className="w-7 h-7 mb-1" />
                  <span className="text-[10px] px-1 text-center leading-tight">Добавить</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="sr-only"
                    disabled={uploadingImages}
                    onChange={(e) => {
                      const list = e.target.files;
                      e.target.value = "";
                      if (!list?.length) return;
                      if (!getAccessToken()) {
                        setError("Войдите в аккаунт, чтобы загрузить изображения");
                        navigate("/login");
                        return;
                      }
                      setUploadingImages(true);
                      setError("");
                      void (async () => {
                        try {
                          for (const file of Array.from(list)) {
                            const { url } = await apiUploadThreadImage(file);
                            setCoverImageUrls((prev) => (prev.length >= 8 ? prev : [...prev, url]));
                          }
                        } catch (err) {
                          setError(err instanceof Error ? err.message : "Не удалось загрузить изображение");
                        } finally {
                          setUploadingImages(false);
                        }
                      })();
                    }}
                  />
                </label>
              )}
            </div>
            {uploadingImages && <p className="text-xs text-gray-600">Загрузка файлов…</p>}
          </div>

          {/* Balance Info */}
          {isHot ? (
            <div className={`p-4 rounded-lg border-2 ${canAfford ? "bg-green-50 border-green-300" : "bg-red-50 border-red-300"}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-600 mb-1">Ваш баланс</div>
                  <div className="flex items-center gap-2">
                    <Coins className="w-5 h-5 text-amber-600" />
                    <span className="font-bold text-2xl">{balance}</span>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 mb-1">Стоимость</div>
                  <div className="flex items-center gap-2">
                    <Coins className="w-5 h-5 text-amber-600" />
                    <span className="font-bold text-2xl text-red-600">-{currentCost}</span>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 mb-1">Остаток</div>
                  <div className={`font-bold text-2xl ${canAfford ? "text-green-600" : "text-red-600"}`}>
                    {balance - currentCost}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-lg border-2 border-emerald-200 bg-emerald-50">
              <p className="text-sm text-emerald-900">
                За создание темы баллы за&nbsp;«срочность» не&nbsp;списываются. По&nbsp;правилам сервера может начислиться
                бонус за&nbsp;новую тему форума.
              </p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
              <p className="text-red-800 text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              onClick={() => void handleSubmit()}
              className={`flex-1 flex items-center justify-center gap-2 text-white px-6 py-3.5 rounded-lg transition-all font-semibold text-base shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed ${
                isHot
                  ? "bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700"
                  : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
              }`}
              disabled={
                !title.trim() ||
                !description.trim() ||
                !categoryId ||
                categories.length === 0 ||
                (isHot && !canAfford)
              }
            >
              {isHot ? (
                <>
                  <ForumUrgencyIcon level={urgency} accent="onDark" className="w-5 h-5" />
                  Опубликовать за {currentCost} баллов
                </>
              ) : (
                <>Опубликовать тему</>
              )}
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3.5 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Отмена
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
