import DOMPurify from "dompurify";

const ALLOWED_TAGS = [
  "p",
  "br",
  "h2",
  "h3",
  "strong",
  "b",
  "em",
  "i",
  "ul",
  "ol",
  "li",
  "blockquote",
  "a",
] as const;

const ALLOWED_ATTR = ["href", "target", "rel"] as const;

const addSafeLinkAttributes = (html: string) => {
  if (typeof window === "undefined") {
    return html.trim();
  }

  const template = window.document.createElement("template");
  template.innerHTML = html;

  template.content.querySelectorAll("a[href]").forEach((anchor) => {
    anchor.setAttribute("target", "_blank");
    anchor.setAttribute("rel", "noopener noreferrer nofollow");
  });

  return template.innerHTML.trim();
};

export const sanitizeRichTextHtml = (dirtyHtml: string | null | undefined) => {
  const normalizedHtml = dirtyHtml?.trim() ?? "";

  if (!normalizedHtml) {
    return "";
  }

  const cleanHtml = DOMPurify.sanitize(normalizedHtml, {
    USE_PROFILES: { html: true },
    ALLOWED_TAGS: [...ALLOWED_TAGS],
    ALLOWED_ATTR: [...ALLOWED_ATTR],
  });

  return addSafeLinkAttributes(cleanHtml);
};
