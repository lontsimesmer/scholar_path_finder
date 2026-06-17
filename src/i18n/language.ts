import { createContext, useContext } from "react";
import { en } from "./translations/en";
import { fr } from "./translations/fr";

export type Language = "en" | "fr";

export type Translations = typeof en;

export interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

export const translations: Record<Language, Translations> = {
  en,
  fr,
};

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }

  return context;
};
