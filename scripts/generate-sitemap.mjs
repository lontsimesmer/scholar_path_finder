#!/usr/bin/env node
/**
 * Post-build script that regenerates dist/sitemap.xml with the list of
 * published blog posts pulled from Supabase. Emits both /fr/ and /en/
 * variants for every public route, cross-linked via xhtml:link
 * rel="alternate" hreflang so Google understands the language pairing.
 * If Supabase cannot be reached the script still writes the static
 * routes and exits without error.
 */

import { writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { fetchPublishedBlogPosts, loadEnvFile } from "./lib/blog-posts.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const distDir = resolve(repoRoot, "dist");
const sitemapPath = resolve(distDir, "sitemap.xml");

const SITE_URL = "https://www.powerprestation.com";
const LANGUAGES = ["fr", "en"];
const DEFAULT_LANG = "fr";

// Each entry: { path, changefreq, priority, slugs? }
// `path` is the bare public path without any /fr or /en prefix.
// For blog posts, slugs = { fr, en } lets us emit the language-specific slug.
const STATIC_ENTRIES = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/blog", changefreq: "weekly", priority: "0.8" },
  { path: "/legal/privacy", changefreq: "yearly", priority: "0.3" },
  { path: "/legal/terms", changefreq: "yearly", priority: "0.3" },
  { path: "/legal/cookies", changefreq: "yearly", priority: "0.3" },
];

const escapeXml = (value) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const localize = (lang, path) => {
  const bare = path === "/" ? "" : path;
  return `${SITE_URL}/${lang}${bare}`;
};

const localizeSlug = (lang, slugs) => {
  const slug = slugs[lang] ?? slugs[DEFAULT_LANG];
  return `${SITE_URL}/${lang}/blog/${slug}`;
};

const renderUrl = ({ loc, alternates, changefreq, priority, lastmod }) => {
  const parts = [`    <loc>${escapeXml(loc)}</loc>`];
  if (lastmod) parts.push(`    <lastmod>${lastmod}</lastmod>`);
  if (changefreq) parts.push(`    <changefreq>${changefreq}</changefreq>`);
  if (priority) parts.push(`    <priority>${priority}</priority>`);
  for (const alt of alternates) {
    parts.push(
      `    <xhtml:link rel="alternate" hreflang="${alt.hreflang}" href="${escapeXml(alt.href)}"/>`,
    );
  }
  return `  <url>\n${parts.join("\n")}\n  </url>`;
};

const renderSitemap = (urls) => {
  const body = urls.map(renderUrl).join("\n\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n\n${body}\n\n</urlset>\n`;
};

const buildStaticVariants = (entry) =>
  LANGUAGES.map((lang) => {
    const loc = localize(lang, entry.path);
    const alternates = [
      ...LANGUAGES.map((otherLang) => ({
        hreflang: otherLang,
        href: localize(otherLang, entry.path),
      })),
      { hreflang: "x-default", href: localize(DEFAULT_LANG, entry.path) },
    ];
    return {
      loc,
      alternates,
      changefreq: entry.changefreq,
      priority: entry.priority,
    };
  });

const buildBlogVariants = (post) => {
  const slugs = {};
  if (post.slug_fr) slugs.fr = post.slug_fr;
  if (post.slug_en) slugs.en = post.slug_en;
  if (!slugs.fr && !slugs.en) return [];

  const lastmod = post.updated_at
    ? new Date(post.updated_at).toISOString().slice(0, 10)
    : undefined;

  return LANGUAGES.filter((lang) => slugs[lang]).map((lang) => {
    const loc = localizeSlug(lang, slugs);
    const alternates = [
      ...LANGUAGES.filter((otherLang) => slugs[otherLang]).map((otherLang) => ({
        hreflang: otherLang,
        href: localizeSlug(otherLang, slugs),
      })),
      {
        hreflang: "x-default",
        href: localizeSlug(slugs[DEFAULT_LANG] ? DEFAULT_LANG : Object.keys(slugs)[0], slugs),
      },
    ];
    return {
      loc,
      alternates,
      changefreq: "monthly",
      priority: "0.7",
      lastmod,
    };
  });
};

const main = async () => {
  if (!existsSync(distDir)) {
    console.warn(`[sitemap] dist/ not found at ${distDir}. Run \`vite build\` first.`);
    process.exit(0);
  }

  await loadEnvFile(repoRoot);

  let posts = [];
  try {
    posts = await fetchPublishedBlogPosts();
  } catch (error) {
    console.warn(`[sitemap] Unexpected error while fetching blog posts: ${error?.message ?? error}`);
  }

  const staticUrls = STATIC_ENTRIES.flatMap(buildStaticVariants);
  const blogUrls = posts.flatMap(buildBlogVariants);
  const urls = [...staticUrls, ...blogUrls];

  const xml = renderSitemap(urls);
  await writeFile(sitemapPath, xml, "utf8");
  console.log(
    `[sitemap] Wrote ${sitemapPath} with ${urls.length} URLs (${staticUrls.length} static + ${blogUrls.length} blog).`,
  );
};

main().catch((error) => {
  console.error(`[sitemap] Fatal error: ${error?.message ?? error}`);
  process.exit(0);
});
