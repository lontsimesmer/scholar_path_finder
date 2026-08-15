import type { Language } from "@/i18n/language";

export const SUPPORTED_LANGS: Language[] = ["fr", "en"];
export const DEFAULT_LANG: Language = "fr";

const LANG_PATTERN = /^\/(fr|en)(?=\/|$)/;

/**
 * Public routes that live under /:lang/ prefixes. Anything else
 * (login, admin/*, dashboard, checkout...) stays unprefixed because
 * it's either private, transactional or noindex.
 */
const PUBLIC_ROUTE_PREFIXES = ["/blog", "/legal"] as const;

export const isPublicRoutePath = (pathname: string): boolean => {
  const bare = pathname.replace(LANG_PATTERN, "") || "/";
  if (bare === "/" || bare === "") return true;
  return PUBLIC_ROUTE_PREFIXES.some(
    (prefix) => bare === prefix || bare.startsWith(`${prefix}/`),
  );
};

export const extractLangFromPath = (pathname: string): Language | null => {
  const match = pathname.match(LANG_PATTERN);
  return match ? (match[1] as Language) : null;
};

export const stripLangFromPath = (pathname: string): string => {
  const stripped = pathname.replace(LANG_PATTERN, "");
  return stripped === "" ? "/" : stripped;
};

/**
 * Build an absolute path for a public route in a given language.
 * `path` should be the bare route without any /fr or /en prefix
 * (e.g. "/", "/blog", "/blog/my-slug", "/legal/privacy").
 */
export const buildLocalizedPath = (lang: Language, path: string): string => {
  const cleaned = path.startsWith("/") ? path : `/${path}`;
  const bare = cleaned.replace(LANG_PATTERN, "") || "/";
  if (bare === "/") return `/${lang}`;
  return `/${lang}${bare}`;
};

/**
 * Swap the language in a pathname while keeping the rest intact.
 * Falls back to a plain lang-prefixed path when the current pathname
 * has no lang prefix (e.g. private routes shouldn't call this, but
 * the fallback keeps the switcher from producing broken URLs).
 */
export const swapLangInPath = (pathname: string, targetLang: Language): string => {
  if (LANG_PATTERN.test(pathname)) {
    return pathname.replace(LANG_PATTERN, `/${targetLang}`);
  }
  if (!isPublicRoutePath(pathname)) return pathname;
  return buildLocalizedPath(targetLang, pathname);
};
