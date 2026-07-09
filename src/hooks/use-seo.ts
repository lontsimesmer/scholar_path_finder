import { useEffect } from "react";

const SITE_URL = "https://www.powerprestation.ca";
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

export const useSEO = ({ title, description, image, url }: SEOProps) => {
  useEffect(() => {
    if (title) {
      const fullTitle = `${title} | Power Prestation`;
      document.title = fullTitle;
      upsertMeta("og:title", title, "property");
      upsertMeta("twitter:title", fullTitle);
    }

    if (description) {
      upsertMeta("description", description);
      upsertMeta("og:description", description, "property");
      upsertMeta("twitter:description", description);
    }

    const absoluteImage = toAbsoluteUrl(image) ?? DEFAULT_IMAGE;
    upsertMeta("og:image", absoluteImage, "property");
    upsertMeta("twitter:image", absoluteImage);

    const absoluteUrl = toAbsoluteUrl(url) ?? `${SITE_URL}/`;
    upsertMeta("og:url", absoluteUrl, "property");
    upsertCanonical(absoluteUrl);
  }, [title, description, image, url]);
};
