import { X, Upload, Coins, Image as ImageIcon, MapPin, Tag, Package } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { apiFetch, apiUploadListingImage } from "../../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { useVetPoints } from "../contexts/VetPointsContext";

interface CreateListingProps {
  onClose: () => void;
  initialListingType?: "sale" | "wanted" | "exchange" | "free";
}

const LISTING_COSTS = {
  sale: 30,
  wanted: 25,
  exchange: 20,
  free: 0,
};

function mapListingType(listingType: "sale" | "wanted" | "exchange" | "free"): "SELL" | "BUY" | "JOB" {
  if (listingType === "sale") return "SELL";
  if (listingType === "wanted") return "BUY";
  if (listingType === "exchange") return "JOB";
  return "SELL";
}

export default function CreateListing({ onClose, initialListingType = "sale" }: CreateListingProps) {
  const { isAuthenticated } = useAuth();
  const { balance, refreshVetcoins } = useVetPoints();
  const [listingType, setListingType] = useState<"sale" | "wanted" | "exchange" | "free">(() => initialListingType);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [publishing, setPublishing] = useState(false);

  const imagePreviews = useMemo(() => images.map((f) => URL.createObjectURL(f)), [images]);
  useEffect(() => {
    return () => {
      for (const u of imagePreviews) URL.revokeObjectURL(u);
    };
  }, [imagePreviews]);

  const listingTypes = [
    {
      id: "sale" as const,
      name: "Продажа",
      icon: "💰",
      color: "from-green-500 to-emerald-500",
      cost: LISTING_COSTS.sale,
      description: "Продать оборудование или товары",
    },
    {
      id: "wanted" as const,
      name: "Куплю",
      icon: "🔍",
      color: "from-orange-500 to-red-500",
      cost: LISTING_COSTS.wanted,
      description: "Разместить запрос на покупку",
    },
    {
      id: "exchange" as const,
      name: "Обмен",
      icon: "🔄",
      color: "from-purple-500 to-pink-500",
      cost: LISTING_COSTS.exchange,
      description: "Обменять на другое оборудование",
    },
    {
      id: "free" as const,
      name: "Отдам бесплатно",
      icon: "🎁",
      color: "from-blue-500 to-cyan-500",
      cost: LISTING_COSTS.free,
      description: "Отдать даром",
    },
  ];

  const categories = [
    "Диагностическое оборудование",
    "Хирургические инструменты",
    "Лабораторное оборудование",
    "Мебель и оборудование клиники",
    "Расходные материалы",
    "Медикаменты",
    "Корма и добавки",
    "Другое",
  ];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const next = Array.from(e.target.files).slice(0, 8);
      setImages(next);
      e.target.value = "";
    }
  };

  const handlePublish = async () => {
    const cost = LISTING_COSTS[listingType];

    if (!title.trim() || !description.trim() || !location.trim() || !category) {
      alert("Заполните все обязательные поля");
      return;
    }

    if (listingType !== "free" && !price.trim()) {
      alert("Укажите цену");
      return;
    }

    if (!isAuthenticated) {
      alert("Войдите в аккаунт, чтобы разместить объявление");
      return;
    }

    if (cost > 0 && balance < cost) {
      alert(`Недостаточно ВетБаллов! Требуется: ${cost} ВБ, доступно: ${balance} ВБ`);
      return;
    }

    const priceLine =
      listingType === "free"
        ? "Отдам даром."
        : `${listingType === "wanted" ? "Бюджет" : listingType === "exchange" ? "Ориентировочная стоимость" : "Цена"}: ${price.trim()} ₽`;

    const fullDescription = `${`Категория: ${category}`}\n\n${priceLine}\n\n${description.trim()}`.trim();
    if (fullDescription.length < 10) {
      alert("Описание слишком короткое");
      return;
    }

    try {
      setPublishing(true);
      const imageUrls: string[] = [];
      for (const file of images) {
        const r = await apiUploadListingImage(file);
        if (r?.url) imageUrls.push(r.url);
      }
      await apiFetch("/api/listings", {
        method: "POST",
        json: {
          type: mapListingType(listingType),
          title: title.trim(),
          description: fullDescription,
          region: location.trim(),
          imageUrls,
        },
      });
      await refreshVetcoins();
      window.dispatchEvent(new CustomEvent("vetmarket:listings-updated"));
      alert("Объявление сохранено в базе данных. VetCoin списаны на сервере (если требовалось).");
      onClose();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Не удалось опубликовать");
    } finally {
      setPublishing(false);
    }
  };

  const selectedType = listingTypes.find(t => t.id === listingType);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-xl sm:rounded-2xl max-w-4xl w-full my-4 sm:my-8 max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-3 sm:p-6 rounded-t-xl sm:rounded-t-2xl flex justify-between items-start gap-2 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <h2 className="text-base sm:text-xl lg:text-2xl font-bold text-gray-900">Новое объявление</h2>
            <p className="text-gray-600 mt-0.5 sm:mt-1 text-xs sm:text-sm lg:text-base hidden xs:block">Разместите объявление в маркетплейсе</p>
          </div>
          <button onClick={onClose} className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg flex-shrink-0">
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        <div className="p-3 sm:p-6 space-y-3 sm:space-y-6 overflow-y-auto flex-1">
          {/* Listing Type Selection */}
          <div>
            <label className="block font-semibold mb-2 sm:mb-3 text-xs sm:text-sm lg:text-base">
              Тип объявления <span className="text-red-600">*</span>
            </label>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
              {listingTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setListingType(type.id)}
                  className={`p-2 sm:p-4 rounded-lg sm:rounded-xl border-2 transition-all ${
                    listingType === type.id
                      ? "border-emerald-500 bg-emerald-50 shadow-lg"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className={`w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-1 sm:mb-2 rounded-lg bg-gradient-to-br ${type.color} flex items-center justify-center text-xl sm:text-2xl shadow-md`}>
                    {type.icon}
                  </div>
                  <div className="font-semibold text-xs sm:text-sm mb-0.5 sm:mb-1">{type.name}</div>
                  <div className="text-[10px] sm:text-xs text-gray-600 mb-1 sm:mb-2 line-clamp-2">{type.description}</div>
                  {type.cost > 0 ? (
                    <div className="flex items-center justify-center gap-0.5 sm:gap-1 text-[10px] sm:text-xs font-bold text-amber-600">
                      <Coins className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      {type.cost} ВБ
                    </div>
                  ) : (
                    <div className="text-[10px] sm:text-xs font-bold text-green-600">Бесплатно</div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Balance Info */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-3 sm:p-4 border border-amber-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Coins className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
                <span className="text-xs sm:text-sm font-medium text-gray-700">Ваш баланс:</span>
              </div>
              <span className="font-bold text-base sm:text-lg text-amber-600">{balance} ВБ</span>
            </div>
            {selectedType && selectedType.cost > 0 && (
              <div className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-gray-600">
                После публикации будет списано: <span className="font-bold text-amber-600">{selectedType.cost} ВБ</span>
              </div>
            )}
          </div>

          {/* Title */}
          <div>
            <label htmlFor="title" className="block font-semibold mb-1.5 sm:mb-2 text-xs sm:text-sm lg:text-base">
              Название <span className="text-red-600">*</span>
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="УЗИ аппарат Mindray DP-50"
              className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm sm:text-base"
              maxLength={100}
            />
            <div className="text-xs text-gray-500 mt-1">{title.length}/100</div>
          </div>

          {/* Category */}
          <div>
            <label htmlFor="category" className="block font-semibold mb-1.5 sm:mb-2 text-xs sm:text-sm lg:text-base">
              Категория <span className="text-red-600">*</span>
            </label>
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm sm:text-base"
              >
                <option value="">Выберите категорию...</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Images */}
          <div>
            <label className="block font-semibold mb-1.5 sm:mb-2 text-xs sm:text-sm lg:text-base">
              Фото (до 8)
            </label>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 sm:p-4">
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 cursor-pointer text-sm font-semibold text-gray-800">
                  <Upload className="w-4 h-4" />
                  Загрузить
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    multiple
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </label>
                <span className="text-xs text-gray-600">
                  {images.length > 0 ? `Выбрано: ${images.length}` : "Не выбрано"}
                </span>
              </div>

              {imagePreviews.length > 0 ? (
                <div className="mt-3 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                  {imagePreviews.map((src, idx) => (
                    <button
                      key={src}
                      type="button"
                      onClick={() => setImages((prev) => prev.filter((_, i) => i !== idx))}
                      className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200 bg-white"
                      title="Удалить фото"
                    >
                      <img src={src} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/35 transition-colors" />
                      <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">
                        удалить
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500 mt-2">Можно добавить несколько фото — они будут в карусели в карточке.</p>
              )}
            </div>
          </div>

          {/* Price (not for free listings) */}
          {listingType !== "free" && (
            <div>
              <label htmlFor="price" className="block font-semibold mb-1.5 sm:mb-2 text-xs sm:text-sm lg:text-base">
                {listingType === "wanted" ? "Бюджет" : listingType === "exchange" ? "Ориентировочная стоимость" : "Цена"} <span className="text-red-600">*</span>
              </label>
              <div className="relative">
                <input
                  id="price"
                  type="text"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="25000"
                  className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm sm:text-base"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-sm sm:text-base">₽</span>
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <label htmlFor="description" className="block font-semibold mb-1.5 sm:mb-2 text-xs sm:text-sm lg:text-base">
              Описание <span className="text-red-600">*</span>
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Подробное описание, состояние, комплектация..."
              className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[100px] sm:min-h-[120px] resize-y text-sm sm:text-base"
              maxLength={1000}
            />
            <div className="text-xs text-gray-500 mt-1">{description.length}/1000</div>
          </div>

          {/* Location */}
          <div>
            <label htmlFor="location" className="block font-semibold mb-1.5 sm:mb-2 text-xs sm:text-sm lg:text-base">
              Местоположение <span className="text-red-600">*</span>
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
              <input
                id="location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Москва, Россия"
                className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm sm:text-base"
              />
            </div>
          </div>

          {/* Images */}
          <div>
            <label className="block font-semibold mb-1.5 sm:mb-2 text-xs sm:text-sm lg:text-base">
              Фотографии (до 5 шт.)
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-6 text-center hover:border-emerald-400 transition-colors">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
                id="images-upload"
              />
              <label htmlFor="images-upload" className="cursor-pointer">
                <Upload className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-2 sm:mb-3" />
                <p className="text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  Нажмите для загрузки фотографий
                </p>
                <p className="text-[10px] sm:text-xs text-gray-500">JPG, PNG до 5 МБ каждая</p>
              </label>
            </div>

            {images.length > 0 && (
              <div className="mt-3 grid grid-cols-5 gap-2">
                {images.map((file, index) => (
                  <div
                    key={index}
                    className="relative aspect-square bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200"
                  >
                    <ImageIcon className="w-8 h-8 text-gray-400" />
                    <div className="absolute bottom-1 left-1 right-1 text-xs text-gray-600 bg-white/90 rounded px-1 py-0.5 truncate">
                      {file.name}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Warning if insufficient balance */}
          {selectedType && selectedType.cost > 0 && balance < selectedType.cost && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4 text-xs sm:text-sm text-red-700">
              ⚠️ Недостаточно ВетБаллов для публикации. Требуется минимум {selectedType.cost} ВБ
            </div>
          )}

          {/* Publish Button */}
          <button
            onClick={() => void handlePublish()}
            disabled={
              publishing ||
              !title.trim() ||
              !description.trim() ||
              !location.trim() ||
              !category ||
              (listingType !== "free" && !price.trim()) ||
              (selectedType && selectedType.cost > 0 && balance < selectedType.cost)
            }
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-3 sm:py-4 rounded-lg sm:rounded-xl font-bold hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
          >
            <Package className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">{publishing ? "Публикуем…" : "Опубликовать объявление"}</span>
            <span className="sm:hidden">{publishing ? "Публикуем…" : "Опубликовать"}</span>
            {selectedType && selectedType.cost > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs sm:text-sm">
                {selectedType.cost} ВБ
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
