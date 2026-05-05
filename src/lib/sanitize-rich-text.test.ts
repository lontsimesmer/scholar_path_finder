import { describe, expect, it } from "vitest";

import { sanitizeRichTextHtml } from "@/lib/sanitize-rich-text";

describe("sanitize rich text", () => {
  it("returns an empty string for blank content", () => {
    expect(sanitizeRichTextHtml("   ")).toBe("");
    expect(sanitizeRichTextHtml(null)).toBe("");
  });

  it("keeps allowed rich text and forces safe link attributes", () => {
    expect(sanitizeRichTextHtml('<p>Hello <strong>world</strong> <a href="https://example.com">link</a></p>')).toBe(
      '<p>Hello <strong>world</strong> <a href="https://example.com" target="_blank" rel="noopener noreferrer nofollow">link</a></p>',
    );
  });

  it("removes disallowed tags and dangerous attributes", () => {
    const sanitized = sanitizeRichTextHtml('<script>alert(1)</script><p onclick="alert(1)">Safe</p>');

    expect(sanitized).not.toContain("<script");
    expect(sanitized).not.toContain("onclick");
    expect(sanitized).toContain("<p>Safe</p>");
  });
});
