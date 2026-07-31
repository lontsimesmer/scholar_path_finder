import { SITE_URL } from "@/hooks/use-seo";

/**
 * Schema.org builders for the public pages.
 *
 * The Organization and WebSite nodes live as static JSON-LD in index.html so
 * crawlers that do not execute JavaScript still see them. Everything here is
 * page-specific and references those static nodes by @id rather than repeating
 * them, which keeps the graph consistent and the payload small.
 */

export const ORGANIZATION_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

type JsonLd = Record<string, unknown>;

const absolute = (path: string) =>
  path.startsWith("http") ? path : `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`;

/**
 * Strips HTML so rich-text bodies can be used in schema fields, which expect
 * plain text. Runs on already-sanitized content.
 */
const toPlainText = (html: string) =>
  html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

/** Average English/French reading speed, used for the wordCount/timeRequired hints. */
const WORDS_PER_MINUTE = 200;

export interface BreadcrumbEntry {
  name: string;
  /** Root-relative path, e.g. "/blog". */
  path: string;
}

export const buildBreadcrumbList = (entries: BreadcrumbEntry[]): JsonLd => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: entries.map((entry, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: entry.name,
    item: absolute(entry.path),
  })),
});

export interface FaqQuestion {
  question: string;
  answer: string;
}

/**
 * FAQPage rich results are one of the few remaining SERP enhancements available
 * to a consultancy site, and this business already maintains the answers in the
 * admin FAQ table. Only the questions actually rendered on the page are
 * included, which is what Google's structured-data policy requires.
 */
export const buildFaqPage = (items: FaqQuestion[], url: string): JsonLd | null => {
  const usable = items.filter((item) => item.question?.trim() && item.answer?.trim());

  if (usable.length === 0) {
    return null;
  }

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${absolute(url)}#faq`,
    isPartOf: { "@id": WEBSITE_ID },
    mainEntity: usable.map((item) => ({
      "@type": "Question",
      name: toPlainText(item.question),
      acceptedAnswer: {
        "@type": "Answer",
        text: toPlainText(item.answer),
      },
    })),
  };
};

/*
 * The service OfferCatalog is intentionally static JSON-LD in index.html rather
 * than built here: it never changes between renders, and putting it in the
 * document means crawlers that do not execute JavaScript still see the service
 * vocabulary ("scholarship assistance", "visa guidance") attached to the
 * business entity.
 */

export interface BlogPostingInput {
  title: string;
  description: string;
  /** Sanitized HTML body; converted to plain text for articleBody. */
  html?: string;
  image?: string;
  /** Root-relative path, e.g. "/blog/my-post". */
  path: string;
  publishedTime: string;
  modifiedTime?: string;
  language: "fr" | "en";
}

export const buildBlogPosting = ({
  title,
  description,
  html,
  image,
  path,
  publishedTime,
  modifiedTime,
  language,
}: BlogPostingInput): JsonLd => {
  const plainBody = html ? toPlainText(html) : "";
  const wordCount = plainBody ? plainBody.split(" ").length : undefined;
  const url = absolute(path);

  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${url}#article`,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
    headline: title.slice(0, 110),
    name: title,
    description,
    inLanguage: language,
    datePublished: publishedTime,
    dateModified: modifiedTime ?? publishedTime,
    author: { "@id": ORGANIZATION_ID },
    publisher: { "@id": ORGANIZATION_ID },
    isPartOf: { "@id": `${SITE_URL}/blog#blog` },
    ...(image ? { image: absolute(image) } : {}),
    ...(wordCount
      ? {
          wordCount,
          timeRequired: `PT${Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE))}M`,
        }
      : {}),
  };
};

export interface BlogListingEntry {
  title: string;
  path: string;
  publishedTime: string;
}

export const buildBlogListing = (
  entries: BlogListingEntry[],
  name: string,
  description: string,
  language: "fr" | "en",
): JsonLd => ({
  "@context": "https://schema.org",
  "@type": "Blog",
  "@id": `${SITE_URL}/blog#blog`,
  url: `${SITE_URL}/blog`,
  name,
  description,
  inLanguage: language,
  publisher: { "@id": ORGANIZATION_ID },
  blogPost: entries.map((entry) => ({
    "@type": "BlogPosting",
    "@id": `${absolute(entry.path)}#article`,
    headline: entry.title.slice(0, 110),
    url: absolute(entry.path),
    datePublished: entry.publishedTime,
    author: { "@id": ORGANIZATION_ID },
  })),
});

export const buildWebPage = (
  name: string,
  description: string,
  path: string,
  language: "fr" | "en",
): JsonLd => ({
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": absolute(path),
  url: absolute(path),
  name,
  description,
  inLanguage: language,
  isPartOf: { "@id": WEBSITE_ID },
  about: { "@id": ORGANIZATION_ID },
});
