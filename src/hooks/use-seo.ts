import { useEffect } from "react";

/**
 * Canonical origin. Must match the host the CDN actually serves without a
 * redirect: www.powerprestation.ca issues a 301 to the apex domain, so every
 * canonical, alternate, sitemap entry and JSON-LD @id has to use the apex form.
 * Pointing canonicals at a redirecting host makes search engines resolve a
 * redirect chain before they can consolidate signals.
 */
export const SITE_URL = "https://powerprestation.ca";
const BRAND = "Power Prestation";
const DEFAULT_TITLE = `${BRAND} | Study Abroad & Academic Mobility Consulting`;
const DEFAULT_DESCRIPTION =
  "Power Prestation is a study-abroad and academic mobility consultancy in Yaoundé, Cameroon. Expert help with university selection, scholarship applications, visas, and internship placement.";
const DEFAULT_IMAGE = `${SITE_URL}/og-image.jpg`;
const INDEXABLE_ROBOTS =
  "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";
const PRIVATE_ROBOTS = "noindex, nofollow";

/** Marks the nodes this hook owns so it can replace them without touching static tags. */
const MANAGED_ATTR = "data-seo-managed";
/**
 * Identifies which caller owns an injected JSON-LD block. Slots let a page-level
 * block and a section-level block (the FAQ, for example) coexist: each caller
 * only ever replaces its own nodes, so effect ordering between parent and child
 * components cannot make one wipe the other.
 */
const JSONLD_SLOT_ATTR = "data-seo-jsonld";

export type SEOLanguage = "fr" | "en";

const OG_LOCALES: Record<SEOLanguage, string> = {
  fr: "fr_CA",
  en: "en_CA",
};

export interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  imageAlt?: string;
  /** Absolute or root-relative path for this page, e.g. "/blog". */
  url?: string;
  type?: "website" | "article";
  /** Keep transactional and authenticated routes out of the index. */
  noindex?: boolean;
  keywords?: string;
  language?: SEOLanguage;
  /** ISO timestamps, article pages only. */
  publishedTime?: string;
  modifiedTime?: string;
  /** Structured data for this page; replaced on every navigation. */
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
  /**
   * Language alternates for this page. Only emit these once the same content is
   * genuinely reachable at each URL — a self-referencing or fabricated
   * alternate is worse than none.
   */
  alternates?: Array<{ hreflang: string; href: string }>;
}

const upsertMeta = (name: string, content: string, attr: "name" | "property" = "name") => {
  let element = document.querySelector(`meta[${attr}="${name}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attr, name);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
};

const removeMeta = (name: string, attr: "name" | "property" = "name") => {
  document.querySelector(`meta[${attr}="${name}"]`)?.remove();
};

const upsertCanonical = (href: string) => {
  let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }
  link.setAttribute("href", href);
};

const replaceManaged = (selector: string) => {
  document.querySelectorAll(`${selector}[${MANAGED_ATTR}]`).forEach((node) => node.remove());
};

const toAbsoluteUrl = (url?: string) => {
  if (!url) return undefined;
  if (url.startsWith("http")) return url;
  return `${SITE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
};

const withBrand = (title: string) =>
  title.includes(BRAND) ? title : `${title} | ${BRAND}`;

/**
 * Injects JSON-LD into the document head under a named slot, replacing whatever
 * that slot held before and clearing it on unmount. Pass `null` to emit nothing,
 * which is the right behaviour while data is still loading — an empty schema
 * block is worse than no block.
 */
export const useJsonLd = (
  slot: string,
  jsonLd: Record<string, unknown> | Array<Record<string, unknown>> | null | undefined,
) => {
  const serialized = jsonLd ? JSON.stringify(jsonLd) : "";

  useEffect(() => {
    const selector = `script[type="application/ld+json"][${JSONLD_SLOT_ATTR}="${slot}"]`;
    document.querySelectorAll(selector).forEach((node) => node.remove());

    if (!serialized) {
      return;
    }

    const parsed = JSON.parse(serialized) as
      | Record<string, unknown>
      | Array<Record<string, unknown>>;
    const blocks = Array.isArray(parsed) ? parsed : [parsed];

    blocks.forEach((block) => {
      const script = document.createElement("script");
      script.setAttribute("type", "application/ld+json");
      script.setAttribute(MANAGED_ATTR, "true");
      script.setAttribute(JSONLD_SLOT_ATTR, slot);
      script.textContent = JSON.stringify(block);
      document.head.appendChild(script);
    });

    return () => {
      document.querySelectorAll(selector).forEach((node) => node.remove());
    };
  }, [slot, serialized]);
};

export const useSEO = ({
  title,
  description,
  image,
  imageAlt,
  url,
  type = "website",
  noindex = false,
  keywords,
  language,
  publishedTime,
  modifiedTime,
  jsonLd,
  alternates,
}: SEOProps) => {
  useJsonLd("page", jsonLd);

  // Alternates are a fresh array on every render, so key the effect on its
  // serialized form rather than on identity.
  const alternatesKey = alternates ? JSON.stringify(alternates) : "";

  useEffect(() => {
    const fullTitle = title ? withBrand(title) : DEFAULT_TITLE;
    document.title = fullTitle;
    upsertMeta("og:title", fullTitle, "property");
    upsertMeta("twitter:title", fullTitle);

    const finalDescription = description ?? DEFAULT_DESCRIPTION;
    upsertMeta("description", finalDescription);
    upsertMeta("og:description", finalDescription, "property");
    upsertMeta("twitter:description", finalDescription);

    const absoluteImage = toAbsoluteUrl(image) ?? DEFAULT_IMAGE;
    upsertMeta("og:image", absoluteImage, "property");
    upsertMeta("twitter:image", absoluteImage);
    if (imageAlt) {
      upsertMeta("og:image:alt", imageAlt, "property");
      upsertMeta("twitter:image:alt", imageAlt);
    }

    const absoluteUrl = toAbsoluteUrl(url) ?? `${SITE_URL}/`;
    upsertMeta("og:url", absoluteUrl, "property");
    upsertCanonical(absoluteUrl);

    upsertMeta("og:type", type, "property");

    // Always written, so a page that indexes clears the noindex left behind by
    // the previous route in this single-page app.
    upsertMeta("robots", noindex ? PRIVATE_ROBOTS : INDEXABLE_ROBOTS);
    upsertMeta("googlebot", noindex ? PRIVATE_ROBOTS : INDEXABLE_ROBOTS);

    if (keywords) {
      upsertMeta("keywords", keywords);
    }

    if (language) {
      upsertMeta("og:locale", OG_LOCALES[language], "property");
    }

    if (type === "article" && publishedTime) {
      upsertMeta("article:published_time", publishedTime, "property");
    } else {
      removeMeta("article:published_time", "property");
    }

    if (type === "article" && modifiedTime) {
      upsertMeta("article:modified_time", modifiedTime, "property");
    } else {
      removeMeta("article:modified_time", "property");
    }

    replaceManaged("link[rel='alternate']");
    if (alternatesKey) {
      // Re-parsed from the serialized key so the effect depends on the value
      // rather than on an array identity that changes on every render.
      (JSON.parse(alternatesKey) as NonNullable<SEOProps["alternates"]>).forEach(
        ({ hreflang, href }) => {
          const link = document.createElement("link");
          link.setAttribute("rel", "alternate");
          link.setAttribute("hreflang", hreflang);
          link.setAttribute("href", href);
          link.setAttribute(MANAGED_ATTR, "true");
          document.head.appendChild(link);
        },
      );
    }
  }, [
    title,
    description,
    image,
    imageAlt,
    url,
    type,
    noindex,
    keywords,
    language,
    publishedTime,
    modifiedTime,
    alternatesKey,
  ]);
};
