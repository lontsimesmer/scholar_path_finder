#!/usr/bin/env node
/**
 * Regenerates public/sitemap.xml.
 *
 * The hand-maintained sitemap listed only the five static routes, so no blog
 * article was ever submitted to Google — the one part of this site that gains
 * new indexable URLs over time was the part the sitemap never covered. This
 * script reads the published posts straight from Supabase so the file cannot
 * drift from what the blog actually serves.
 *
 * Usage:
 *   npm run seo:sitemap
 *
 * Env (read from .env.local, or the process environment, in that order of
 * fallback — the same variables the Vite app uses, no extra secrets):
 *   VITE_SUPABASE_URL
 *   VITE_SUPABASE_PUBLISHABLE_KEY
 *
 * Only the anon key is needed: the "Public can read published posts" RLS policy
 * exposes exactly the rows that belong in a sitemap, which means this script
 * physically cannot leak a draft. If the credentials are missing the static
 * routes are still written and the blog section is skipped with a warning,
 * so a build on a machine without env access degrades instead of failing.
 */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUTPUT = path.join(ROOT, "public", "sitemap.xml");

/**
 * Must match SITE_URL in src/hooks/use-seo.ts. www.powerprestation.ca 301s to
 * the apex domain, so a sitemap entry on the www host would submit a redirect.
 */
const SITE_URL = "https://powerprestation.ca";

/**
 * Public, indexable routes.
 *
 * Deliberately absent:
 * - /start-procedure — gated behind sign-in; a crawler only ever sees the
 *   loading shell, so it is marked noindex in the app and must not be submitted.
 * - /login, /dashboard, /checkout, /admin/* and the other private routes, which
 *   are disallowed in robots.txt and noindex in the app.
 */
const STATIC_ROUTES = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/blog", changefreq: "weekly", priority: "0.7" },
  { path: "/legal/privacy", changefreq: "yearly", priority: "0.3" },
  { path: "/legal/terms", changefreq: "yearly", priority: "0.3" },
  { path: "/legal/cookies", changefreq: "yearly", priority: "0.3" },
];

const parseEnvFile = (contents) => {
  const env = {};
  for (const rawLine of contents.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    // Strip surrounding quotes; .env.local in this repo quotes its values.
    const value = line
      .slice(separator + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    if (key) env[key] = value;
  }
  return env;
};

const loadEnv = async () => {
  let fileEnv = {};
  try {
    fileEnv = parseEnvFile(await readFile(path.join(ROOT, ".env.local"), "utf8"));
  } catch {
    // No .env.local: fall back to the ambient environment (CI, deploy hooks).
  }
  return {
    url: process.env.VITE_SUPABASE_URL ?? fileEnv.VITE_SUPABASE_URL ?? "",
    key:
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
      fileEnv.VITE_SUPABASE_PUBLISHABLE_KEY ??
      "",
  };
};

/** YYYY-MM-DD, the form <lastmod> expects. */
const toIsoDate = (value) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
};

const escapeXml = (value) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

/**
 * Fetches published posts through the REST endpoint rather than the JS client,
 * so this script needs no runtime dependency and cannot pull the browser-only
 * `localStorage` config in src/integrations/supabase/client.ts into Node.
 */
const fetchPublishedPosts = async ({ url, key }) => {
  if (!url || !key) {
    console.warn(
      "[sitemap] VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY not set — writing static routes only.",
    );
    return [];
  }

  const endpoint = new URL("/rest/v1/blog_posts", url);
  endpoint.searchParams.set("select", "slug_fr,slug_en,updated_at,created_at");
  endpoint.searchParams.set("status", "eq.published");
  endpoint.searchParams.set("order", "created_at.desc");

  const response = await fetch(endpoint, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });

  if (!response.ok) {
    throw new Error(
      `Supabase returned ${response.status} ${response.statusText} while listing blog posts`,
    );
  }

  return await response.json();
};

const buildUrlEntry = ({ loc, lastmod, changefreq, priority }) =>
  [
    "  <url>",
    `    <loc>${escapeXml(loc)}</loc>`,
    `    <lastmod>${lastmod}</lastmod>`,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    "  </url>",
  ].join("\n");

const main = async () => {
  const env = await loadEnv();
  const posts = await fetchPublishedPosts(env);
  const today = toIsoDate(null);

  const entries = STATIC_ROUTES.map((route) =>
    buildUrlEntry({
      loc: `${SITE_URL}${route.path}`,
      lastmod: today,
      changefreq: route.changefreq,
      priority: route.priority,
    }),
  );

  /*
   * Only the French slug is submitted, even though every post is also reachable
   * at its English slug. BlogPost canonicalises on the slug of the language
   * being rendered, and a crawler carries no stored language preference, so it
   * sees the French default and consolidates on slug_fr. Submitting both slugs
   * would put a known non-canonical URL in the sitemap and invite Google to
   * report it as "Duplicate, submitted URL not selected as canonical".
   */
  let skipped = 0;
  for (const post of posts) {
    if (!post.slug_fr) {
      skipped += 1;
      continue;
    }
    entries.push(
      buildUrlEntry({
        loc: `${SITE_URL}/blog/${post.slug_fr}`,
        lastmod: toIsoDate(post.updated_at ?? post.created_at),
        changefreq: "monthly",
        priority: "0.6",
      }),
    );
  }

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    "</urlset>",
    "",
  ].join("\n");

  await writeFile(OUTPUT, xml, "utf8");

  console.log(
    `[sitemap] wrote ${entries.length} URLs to public/sitemap.xml ` +
      `(${STATIC_ROUTES.length} static, ${entries.length - STATIC_ROUTES.length} blog posts)`,
  );
  if (skipped > 0) {
    console.warn(`[sitemap] skipped ${skipped} published post(s) with no French slug.`);
  }
};

main().catch((error) => {
  console.error(`[sitemap] failed: ${error.message}`);
  process.exitCode = 1;
});
