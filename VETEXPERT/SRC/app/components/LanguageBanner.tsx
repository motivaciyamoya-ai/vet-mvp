import { Globe, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useLanguage } from "../contexts/LanguageContext";

export default function LanguageBanner() {
  const { language } = useLanguage();
  const [visible, setVisible] = useState(false);
  const [hasShown, setHasShown] = useState(false);

  useEffect(() => {
    const shown = localStorage.getItem("language_banner_shown");
    if (!shown && !hasShown) {
      setVisible(true);
      setHasShown(true);
    }
  }, [hasShown]);

  const handleClose = () => {
    setVisible(false);
    localStorage.setItem("language_banner_shown", "true");
  };

  if (!visible) return null;

  const messages: Record<string, { title: string; text: string }> = {
    ru: {
      title: "Автоматический AI-перевод включен",
      text: "Весь контент на платформе автоматически переводится на ваш язык с помощью искусственного интеллекта. Оригинальный язык публикации сохраняется в метаданных.",
    },
    en: {
      title: "Automatic AI Translation Enabled",
      text: "All content on the platform is automatically translated to your language using artificial intelligence. The original publication language is preserved in metadata.",
    },
    uk: {
      title: "Автоматичний AI-переклад увімкнено",
      text: "Весь контент на платформі автоматично перекладається на вашу мову за допомогою штучного інтелекту. Оригінальна мова публікації зберігається в метаданих.",
    },
    de: {
      title: "Automatische KI-Übersetzung aktiviert",
      text: "Alle Inhalte auf der Plattform werden automatisch mit künstlicher Intelligenz in Ihre Sprache übersetzt. Die ursprüngliche Veröffentlichungssprache bleibt in den Metadaten erhalten.",
    },
  };

  const message = messages[language] || messages.ru;

  return (
    <div className="fixed bottom-20 sm:bottom-24 right-4 sm:right-6 lg:right-8 max-w-sm bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-2xl p-4 lg:p-5 z-40 animate-slide-up">
      <button
        onClick={handleClose}
        className="absolute top-2 right-2 p-1 hover:bg-white/20 rounded-lg transition-colors"
        aria-label="Закрыть"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-3 pr-6">
        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
          <Globe className="w-5 h-5" />
        </div>
        <div>
          <h4 className="font-bold mb-1 text-sm lg:text-base">{message.title}</h4>
          <p className="text-xs lg:text-sm text-blue-100 leading-relaxed">{message.text}</p>
        </div>
      </div>
    </div>
  );
}
