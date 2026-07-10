import { useEffect } from "react";

const SITE_URL = "https://www.powerprestation.ca";
const BRAND = "Power Prestation";
const DEFAULT_TITLE = `${BRAND} | Study Abroad & Academic Mobility Consulting`;
const DEFAULT_DESCRIPTION =
  "Power Prestation is a study-abroad and academic mobility consultancy in Yaoundé, Cameroon. Expert help with university selection, scholarship applications, visas, and internship placement.";
const DEFAULT_IMAGE = `${SITE_URL}/og-image.jpg`;

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  /** Absolute or root-relative path for this page, e.g. "/blog". */
  url?: string;
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

const upsertCanonical = (href: string) => {
  let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }
  link.setAttribute("href", href);
};

const toAbsoluteUrl = (url?: string) => {
  if (!url) return undefined;
  if (url.startsWith("http")) return url;
  return `${SITE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
};

const withBrand = (title: string) =>
  title.includes(BRAND) ? title : `${title} | ${BRAND}`;

export const useSEO = ({ title, description, image, url }: SEOProps) => {
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

    const absoluteUrl = toAbsoluteUrl(url) ?? `${SITE_URL}/`;
    upsertMeta("og:url", absoluteUrl, "property");
    upsertCanonical(absoluteUrl);
  }, [title, description, image, url]);
};
