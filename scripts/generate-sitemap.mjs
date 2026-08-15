#!/usr/bin/env node
/**
 * Post-build script that regenerates dist/sitemap.xml with the list of
 * published blog posts pulled from Supabase. If Supabase cannot be reached
 * the script exits without error and leaves the static fallback sitemap
 * (copied from public/sitemap.xml by Vite) in place.
 */

import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

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

const loadEnvFile = async () => {
  const envPath = resolve(repoRoot, ".env");
  if (!existsSync(envPath)) return;
  const raw = await readFile(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/i);
    if (!match) continue;
    const key = match[1];
    if (process.env[key] !== undefined) continue;
    let value = match[2];
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
};

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

const fetchBlogUrls = async () => {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    console.warn(
      "[sitemap] Supabase env vars missing (VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY). Falling back to static sitemap.",
    );
    return [];
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await supabase
    .from("blog_posts")
    .select("slug_fr, slug_en, updated_at")
    .eq("status", "published");

  if (error) {
    console.warn(`[sitemap] Supabase query failed: ${error.message}. Falling back to static sitemap.`);
    return [];
  }

  const urls = [];
  for (const row of data ?? []) {
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

  await loadEnvFile();

  let blogUrls = [];
  try {
    blogUrls = await fetchBlogUrls();
  } catch (error) {
    console.warn(`[sitemap] Unexpected error while fetching blog posts: ${error?.message ?? error}`);
  }

  const xml = renderSitemap([...STATIC_URLS, ...blogUrls]);
  await writeFile(sitemapPath, xml, "utf8");
  console.log(`[sitemap] Wrote ${sitemapPath} with ${STATIC_URLS.length + blogUrls.length} URLs (${blogUrls.length} blog posts).`);
};

main().catch((error) => {
  console.error(`[sitemap] Fatal error: ${error?.message ?? error}`);
  process.exit(0);
});
