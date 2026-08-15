import { useCallback } from "react";

import { useLanguage } from "@/i18n/language";
import { buildLocalizedPath } from "@/lib/localized-path";

/**
 * Returns a memoized builder that prefixes a public-route path with
 * the current language. Use for the home page ("/"), /blog and
 * /legal/* routes — the private/admin/auth routes stay unprefixed
 * and should keep hard-coded paths.
 */
export const useLocalizedPath = () => {
  const { language } = useLanguage();
  return useCallback((path: string) => buildLocalizedPath(language, path), [language]);
};
