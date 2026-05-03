import { Globe, Check } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useLanguage } from "../contexts/LanguageContext";

const languages = [
  { code: "ru", name: "Русский", flag: "🇷🇺" },
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "uk", name: "Українська", flag: "🇺🇦" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "it", name: "Italiano", flag: "🇮🇹" },
  { code: "pl", name: "Polski", flag: "🇵🇱" },
  { code: "zh", name: "中文", flag: "🇨🇳" },
  { code: "ja", name: "日本語", flag: "🇯🇵" },
];

type LanguageSelectorProps = {
  /** Только иконка глобуса — для плотной шапки на планшетах/ноутбуках */
  compact?: boolean;
};

export default function LanguageSelector({ compact = false }: LanguageSelectorProps) {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLang = languages.find((l) => l.code === language) || languages[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative shrink-0" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={
          compact
            ? "flex items-center justify-center p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
            : "flex items-center gap-2 px-3 py-2 lg:px-4 lg:py-2.5 rounded-lg hover:bg-gray-100 transition-colors text-sm lg:text-base"
        }
        aria-label={`Язык: ${currentLang.name}`}
        title={`${currentLang.name} (${currentLang.code})`}
      >
        <Globe className={`text-gray-600 ${compact ? "w-5 h-5" : "w-4 h-4 lg:w-5 lg:h-5"}`} />
        {!compact ? (
          <>
            <span className="hidden sm:inline text-base lg:text-lg">{currentLang.flag}</span>
            <span className="hidden md:inline font-medium">{currentLang.code.toUpperCase()}</span>
          </>
        ) : (
          <span className="sr-only">{currentLang.name}</span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl border border-gray-200 shadow-lg z-50 overflow-hidden">
          <div className="p-3 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Globe className="w-4 h-4" />
              <span className="font-medium">Выберите язык</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Весь контент будет автоматически переведен на выбранный язык с помощью ИИ
            </p>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  setLanguage(lang.code);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left ${
                  language === lang.code ? "bg-emerald-50" : ""
                }`}
              >
                <span className="text-2xl">{lang.flag}</span>
                <span className="flex-1 font-medium">{lang.name}</span>
                {language === lang.code && (
                  <Check className="w-5 h-5 text-emerald-600" />
                )}
              </button>
            ))}
          </div>

          <div className="p-3 border-t border-gray-200 bg-gray-50">
            <div className="flex items-start gap-2 text-xs text-gray-600">
              <span className="text-blue-600">ℹ️</span>
              <p className="leading-relaxed">
                Автоматический перевод выполняется ИИ. Исходный язык сохраняется в метаданных.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
