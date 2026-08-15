#!/usr/bin/env node
/**
 * Post-build script that regenerates dist/sitemap.xml with the list of
 * published blog posts pulled from Supabase. If Supabase cannot be reached
 * the script exits without error and leaves the static fallback sitemap
 * (copied from public/sitemap.xml by Vite) in place.
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

const STATIC_URLS = [
  { loc: `${SITE_URL}/`, changefreq: "weekly", priority: "1.0" },
  { loc: `${SITE_URL}/blog`, changefreq: "weekly", priority: "0.8" },
  { loc: `${SITE_URL}/legal/privacy`, changefreq: "yearly", priority: "0.3" },
  { loc: `${SITE_URL}/legal/terms`, changefreq: "yearly", priority: "0.3" },
  { loc: `${SITE_URL}/legal/cookies`, changefreq: "yearly", priority: "0.3" },
];

const escapeXml = (value) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const renderUrl = ({ loc, changefreq, priority, lastmod }) => {
  const parts = [`    <loc>${escapeXml(loc)}</loc>`];
  if (lastmod) parts.push(`    <lastmod>${lastmod}</lastmod>`);
  if (changefreq) parts.push(`    <changefreq>${changefreq}</changefreq>`);
  if (priority) parts.push(`    <priority>${priority}</priority>`);
  return `  <url>\n${parts.join("\n")}\n  </url>`;
};

const renderSitemap = (urls) => {
  const body = urls.map(renderUrl).join("\n\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n\n${body}\n\n</urlset>\n`;
};

const toBlogUrls = (posts) => {
  const urls = [];
  for (const row of posts) {
    const lastmod = row.updated_at ? new Date(row.updated_at).toISOString().slice(0, 10) : undefined;
    if (row.slug_fr) {
      urls.push({
        loc: `${SITE_URL}/blog/${row.slug_fr}`,
        changefreq: "monthly",
        priority: "0.7",
        lastmod,
      });
    }
    if (row.slug_en && row.slug_en !== row.slug_fr) {
      urls.push({
        loc: `${SITE_URL}/blog/${row.slug_en}`,
        changefreq: "monthly",
        priority: "0.7",
        lastmod,
      });
    }
  }
  return urls;
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

  const blogUrls = toBlogUrls(posts);
  const xml = renderSitemap([...STATIC_URLS, ...blogUrls]);
  await writeFile(sitemapPath, xml, "utf8");
  console.log(
    `[sitemap] Wrote ${sitemapPath} with ${STATIC_URLS.length + blogUrls.length} URLs (${blogUrls.length} blog posts).`,
  );
};

main().catch((error) => {
  console.error(`[sitemap] Fatal error: ${error?.message ?? error}`);
  process.exit(0);
});
