#!/usr/bin/env node
/**
 * Post-build script that rewrites dist/robots.txt so the `Sitemap:`
 * directive points to the current site origin (from VITE_SITE_URL).
 * Falls back to the production URL when the env var is missing.
 */

import { writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { loadEnvFile } from "./lib/blog-posts.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const distDir = resolve(repoRoot, "dist");
const robotsPath = resolve(distDir, "robots.txt");

const resolveSiteUrl = () => {
  const raw = (process.env.VITE_SITE_URL ?? "").trim();
  return (raw || "https://powerprestation.ca").replace(/\/+$/, "");
};

const render = (siteUrl) => `# ${siteUrl}/robots.txt

User-agent: *
Allow: /
Allow: /blog
Allow: /blog/
Allow: /legal/

Disallow: /admin
Disallow: /admin/
Disallow: /dashboard
Disallow: /checkout
Disallow: /payment-success
Disallow: /start-procedure
Disallow: /login
Disallow: /forgot-password
Disallow: /reset-password
Disallow: /verify-2fa
Disallow: /verify-contact

Sitemap: ${siteUrl}/sitemap.xml
`;

const main = async () => {
  if (!existsSync(distDir)) {
    console.warn(`[robots] dist/ not found at ${distDir}. Run \`vite build\` first.`);
    process.exit(0);
  }

  await loadEnvFile(repoRoot);
  const siteUrl = resolveSiteUrl();
  await writeFile(robotsPath, render(siteUrl), "utf8");
  console.log(`[robots] Wrote ${robotsPath} with Sitemap: ${siteUrl}/sitemap.xml`);
};

main().catch((error) => {
  console.error(`[robots] Fatal error: ${error?.message ?? error}`);
  process.exit(0);
});
