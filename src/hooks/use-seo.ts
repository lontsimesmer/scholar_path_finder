import { useEffect } from "react";

import {
  DEFAULT_LANG,
  SUPPORTED_LANGS,
  isPublicRoutePath,
  stripLangFromPath,
  swapLangInPath,
} from "@/lib/localized-path";
import { SITE_URL } from "@/lib/site";

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  keywords?: string;
  type?: "website" | "article";
  noindex?: boolean;
  titleSuffix?: string | false;
}

const SITE_NAME = "Power Prestation";

const upsertMeta = (name: string, content: string, attr: "name" | "property" = "name") => {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attr, name);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
};

const upsertCanonical = (href: string) => {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", "canonical");
    document.head.appendChild(element);
  }
  element.setAttribute("href", href);
};

const setHreflangLinks = (
  entries: Array<{ hreflang: string; href: string }>,
) => {
  const existing = document.head.querySelectorAll<HTMLLinkElement>('link[rel="alternate"][hreflang]');
  existing.forEach((node) => node.parentNode?.removeChild(node));
  for (const entry of entries) {
    const link = document.createElement("link");
    link.setAttribute("rel", "alternate");
    link.setAttribute("hreflang", entry.hreflang);
    link.setAttribute("href", entry.href);
    document.head.appendChild(link);
  }
};

/**
 * Canonical, og:url and hreflang alternates always point to the
 * production origin regardless of where the app is currently running
 * (dev server, vite preview during prerender, staging). This ensures
 * search engines never index or advertise a non-production URL.
 */
const getOrigin = () => SITE_URL;

const resolvePathname = (url?: string) => {
  if (typeof window !== "undefined" && window.location) {
    return url ?? window.location.pathname;
  }
  return url ?? "/";
};

const resolveUrl = (url?: string) => {
  if (url && /^https?:\/\//i.test(url)) return url;
  const pathname = resolvePathname(url);
  return `${getOrigin()}${pathname}`;
};

const resolveImage = (image?: string) => {
  if (!image) return `${SITE_URL}/og-image.jpg`;
  if (image.startsWith("http")) return image;
  const base = getOrigin();
  return `${base}${image.startsWith("/") ? "" : "/"}${image}`;
};

const buildHreflangEntries = (pathname: string) => {
  if (!isPublicRoutePath(pathname)) return [];
  const bare = stripLangFromPath(pathname);
  const origin = getOrigin();
  const entries = SUPPORTED_LANGS.map((lang) => ({
    hreflang: lang,
    href: `${origin}${swapLangInPath(bare, lang)}`,
  }));
  entries.push({
    hreflang: "x-default",
    href: `${origin}${swapLangInPath(bare, DEFAULT_LANG)}`,
  });
  return entries;
};

export const useSEO = ({
  title,
  description,
  image,
  url,
  keywords,
  type = "website",
  noindex = false,
  titleSuffix,
}: SEOProps) => {
  useEffect(() => {
    if (title) {
      const suffix = titleSuffix === false ? "" : ` | ${titleSuffix ?? SITE_NAME}`;
      document.title = `${title}${suffix}`;
    }

    const pathname = resolvePathname(url);
    const resolvedUrl = resolveUrl(url);
    const resolvedImage = resolveImage(image);

    if (description) {
      upsertMeta("description", description);
      upsertMeta("og:description", description, "property");
      upsertMeta("twitter:description", description);
    }

    if (title) {
      upsertMeta("og:title", title, "property");
      upsertMeta("twitter:title", title);
    }

    upsertMeta("og:type", type, "property");
    upsertMeta("og:url", resolvedUrl, "property");
    upsertMeta("og:image", resolvedImage, "property");
    upsertMeta("twitter:image", resolvedImage);
    upsertCanonical(resolvedUrl);
    setHreflangLinks(buildHreflangEntries(pathname));

    if (keywords) {
      upsertMeta("keywords", keywords);
    }

    upsertMeta(
      "robots",
      noindex
        ? "noindex, nofollow"
        : "index, follow, max-image-preview:large, max-snippet:-1",
    );
  }, [title, description, image, url, keywords, type, noindex, titleSuffix]);
};
