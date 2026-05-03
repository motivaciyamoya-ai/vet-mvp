import { Languages } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";

interface TranslatedContentProps {
  text: string;
  originalLang: string;
  className?: string;
  showBadge?: boolean;
}

const languageNames: Record<string, string> = {
  ru: "Русский",
  en: "English",
  uk: "Українська",
  de: "Deutsch",
  fr: "Français",
  es: "Español",
  it: "Italiano",
  pl: "Polski",
  zh: "中文",
  ja: "日本語",
};

export default function TranslatedContent({
  text,
  originalLang,
  className = "",
  showBadge = true,
}: TranslatedContentProps) {
  const { language, translateText } = useLanguage();
  const isTranslated = originalLang !== language;
  const translatedText = translateText(text, originalLang);

  return (
    <div className={`relative ${className}`}>
      {translatedText}

      {isTranslated && showBadge && (
        <span
          className="inline-flex items-center gap-1 ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium"
          title={`Переведено с ${languageNames[originalLang] || originalLang} с помощью ИИ`}
        >
          <Languages className="w-3 h-3" />
          <span className="hidden sm:inline">Переведено с {languageNames[originalLang]}</span>
          <span className="sm:hidden">AI</span>
        </span>
      )}
    </div>
  );
}
