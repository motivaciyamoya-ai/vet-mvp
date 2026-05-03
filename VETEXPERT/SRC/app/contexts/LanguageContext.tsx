import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => void;
  translateText: (text: string, originalLang?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<string>(() => {
    // Определение языка из localStorage или браузера
    const saved = localStorage.getItem("app_language");
    if (saved) return saved;

    const browserLang = navigator.language.split("-")[0];
    return browserLang || "ru";
  });

  useEffect(() => {
    localStorage.setItem("app_language", language);
  }, [language]);

  // Симуляция AI-перевода (в продакшене здесь был бы вызов API)
  const translateText = (text: string, originalLang?: string): string => {
    // Если язык совпадает с оригиналом, возвращаем как есть
    if (originalLang && originalLang === language) {
      return text;
    }

    // В реальном приложении здесь был бы вызов AI API для перевода
    // Сейчас просто возвращаем оригинальный текст
    return text;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, translateText }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
}
