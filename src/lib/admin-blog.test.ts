import { describe, expect, it } from "vitest";

import {
  createEmptyBlogPost,
  isBlogFieldFilled,
  normalizeBlogPost,
  type BlogPostRecord,
} from "@/lib/admin-blog";

describe("admin blog helpers", () => {
  it("creates a complete draft skeleton for bilingual articles", () => {
    expect(createEmptyBlogPost()).toEqual({
      content_en: "",
      content_fr: "",
      excerpt_en: "",
      excerpt_fr: "",
      image_url: "",
      slug_en: "",
      slug_fr: "",
      status: "draft",
      title_en: "",
      title_fr: "",
    });
  });

  it("normalizes partial posts without losing supplied values", () => {
    const normalized = normalizeBlogPost({
      id: "post-1",
      title_fr: "Titre",
      status: "published",
    } as Partial<BlogPostRecord>);

    expect(normalized).toMatchObject({
      id: "post-1",
      image_url: "",
      status: "published",
      title_en: "",
      title_fr: "Titre",
    });
  });

  it("treats blank strings as missing fields", () => {
    expect(isBlogFieldFilled("   ")).toBe(false);
    expect(isBlogFieldFilled("Contenu")).toBe(true);
    expect(isBlogFieldFilled(1)).toBe(true);
    expect(isBlogFieldFilled(null)).toBe(false);
  });
});
