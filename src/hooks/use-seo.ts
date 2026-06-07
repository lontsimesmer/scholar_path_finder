import { useEffect } from "react";

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
}

export const useSEO = ({ title, description, image, url }: SEOProps) => {
  useEffect(() => {
    if (title) {
      document.title = `${title} | Power Prestation`;
    }

    const updateMeta = (name: string, content: string, attr: string = "name") => {
      let element = document.querySelector(`meta[${attr}="${name}"]`);
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attr, name);
        document.head.appendChild(element);
      }
      element.setAttribute("content", content);
    };

    if (description) {
      updateMeta("description", description);
      updateMeta("og:description", description, "property");
    }

    if (title) {
      updateMeta("og:title", title, "property");
    }

    if (image) {
      updateMeta("og:image", image, "property");
    }

    if (url) {
      updateMeta("og:url", url, "property");
    }
  }, [title, description, image, url]);
};
