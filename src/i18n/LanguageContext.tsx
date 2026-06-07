import React, { useEffect, useState } from "react";
import { Language, LanguageContext, translations } from "./language";

const isSupportedLanguage = (value: string | null): value is Language =>
  value === "en" || value === "fr";

const getInitialLanguage = (): Language => {
  if (typeof window === "undefined") {
    return "en";
  }

  try {
    const saved = window.localStorage.getItem("language");
    return isSupportedLanguage(saved) ? saved : "en";
  } catch {
    return "en";
  }
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);

  const setLanguage = (lang: Language) => {
    const nextLanguage = isSupportedLanguage(lang) ? lang : "en";

    setLanguageState(nextLanguage);

    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem("language", nextLanguage);
      } catch {
        // Ignore storage write failures and keep the in-memory language.
      }

      document.documentElement.lang = nextLanguage;
    }
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const t = translations[language] ?? translations.en;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
