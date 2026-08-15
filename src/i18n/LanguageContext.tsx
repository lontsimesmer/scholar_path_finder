import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Language, LanguageContext, translations } from "./language";
import {
  DEFAULT_LANG,
  extractLangFromPath,
  isPublicRoutePath,
  swapLangInPath,
} from "@/lib/localized-path";

const isSupportedLanguage = (value: string | null): value is Language =>
  value === "en" || value === "fr";

const getStoredLanguage = (): Language | null => {
  if (typeof window === "undefined") return null;
  try {
    const saved = window.localStorage.getItem("language");
    return isSupportedLanguage(saved) ? saved : null;
  } catch {
    return null;
  }
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Language priority: URL prefix > localStorage > default (FR).
  const resolveLanguage = useCallback((): Language => {
    const fromUrl = extractLangFromPath(location.pathname);
    if (fromUrl) return fromUrl;
    return getStoredLanguage() ?? DEFAULT_LANG;
  }, [location.pathname]);

  const [language, setLanguageState] = useState<Language>(resolveLanguage);

  useEffect(() => {
    const next = resolveLanguage();
    setLanguageState((prev) => (prev === next ? prev : next));
  }, [resolveLanguage]);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = language;
    }
  }, [language]);

  const setLanguage = useCallback(
    (lang: Language) => {
      const nextLanguage = isSupportedLanguage(lang) ? lang : DEFAULT_LANG;

      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem("language", nextLanguage);
        } catch {
          // Ignore storage write failures and keep the in-memory language.
        }
      }

      setLanguageState(nextLanguage);

      // If we're on a public route, navigate to the same route in the
      // other language so the URL stays canonical. Private routes stay
      // as-is; we still update the in-memory language for the UI.
      if (isPublicRoutePath(location.pathname)) {
        const target = swapLangInPath(location.pathname, nextLanguage) + location.search + location.hash;
        if (target !== location.pathname + location.search + location.hash) {
          navigate(target, { replace: true });
        }
      }
    },
    [location.pathname, location.search, location.hash, navigate],
  );

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t: translations[language] ?? translations[DEFAULT_LANG],
    }),
    [language, setLanguage],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};
