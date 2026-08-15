import { useEffect } from "react";

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
const DEFAULT_ORIGIN = "https://www.powerprestation.com";

const upsertMeta = (name: string, content: string, attr: "name" | "property" = "name") => {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attr, name);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
};

const upsertLink = (rel: string, href: string) => {
  let element = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", rel);
    document.head.appendChild(element);
  }
  element.setAttribute("href", href);
};

const resolveUrl = (url?: string) => {
  if (url) return url;
  if (typeof window === "undefined") return DEFAULT_ORIGIN;
  return `${window.location.origin}${window.location.pathname}`;
};

const resolveImage = (image?: string) => {
  if (!image) return `${DEFAULT_ORIGIN}/og-image.jpg`;
  if (image.startsWith("http")) return image;
  const base = typeof window !== "undefined" ? window.location.origin : DEFAULT_ORIGIN;
  return `${base}${image.startsWith("/") ? "" : "/"}${image}`;
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
    upsertLink("canonical", resolvedUrl);

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
