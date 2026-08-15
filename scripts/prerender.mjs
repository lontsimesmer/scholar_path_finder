#!/usr/bin/env node
/**
 * Post-build script that pre-renders the public routes of the SPA into
 * static HTML files so that search engines and social crawlers receive
 * fully populated markup (meta, canonical, JSON-LD, main content) instead
 * of an empty <div id="root">.
 *
 * Every public route is rendered twice — once under /fr/... and once
 * under /en/... — matching the bilingual routing layout. Blog posts
 * are pre-rendered per language when a language-specific slug exists.
 *
 * Flow:
 *   1. Boots `vite preview` against dist/ on a random free port.
 *   2. Uses Puppeteer to visit each localized route, waits for network
 *      idle, captures the rendered HTML and writes it back to
 *      dist/<lang>/<...>/index.html.
 *   3. Kills the preview server.
 *
 * If Puppeteer or the preview server cannot start, the script logs a
 * warning and exits without failing the build (SPA fallback keeps
 * working via _redirects on the hosting side).
 */

import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { dirname, resolve } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import { fetchPublishedBlogPosts, loadEnvFile } from "./lib/blog-posts.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const distDir = resolve(repoRoot, "dist");

const LANGUAGES = ["fr", "en"];
const STATIC_PATHS = ["/", "/blog", "/legal/privacy", "/legal/terms", "/legal/cookies"];

const findFreePort = () =>
  new Promise((resolvePort, rejectPort) => {
    const server = createServer();
    server.on("error", rejectPort);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => resolvePort(port));
    });
  });

const waitForServer = async (url, timeoutMs = 15000) => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url, { redirect: "manual" });
      if (response.status < 500) return;
    } catch {
      // Not ready yet
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Preview server did not become ready at ${url} within ${timeoutMs}ms.`);
};

const startPreviewServer = async (port) => {
  const viteBin = resolve(repoRoot, "node_modules/vite/bin/vite.js");
  if (!existsSync(viteBin)) {
    throw new Error(`Vite binary not found at ${viteBin}. Run \`npm install\` first.`);
  }

  const child = spawn(
    process.execPath,
    [viteBin, "preview", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
    { cwd: repoRoot, stdio: ["ignore", "pipe", "pipe"] },
  );

  child.stdout.on("data", () => {});
  child.stderr.on("data", (chunk) => {
    process.stderr.write(`[preview] ${chunk}`);
  });

  await waitForServer(`http://127.0.0.1:${port}/`);
  return child;
};

const routeToFilePath = (route) => {
  const trimmed = route.replace(/^\//, "").replace(/\/+$/, "");
  const dir = trimmed.length === 0 ? distDir : resolve(distDir, trimmed);
  return resolve(dir, "index.html");
};

const buildLocalizedRoute = (lang, path) => {
  const bare = path === "/" ? "" : path;
  return `/${lang}${bare}`;
};

const prerenderRoute = async (page, baseUrl, route) => {
  const target = `${baseUrl}${route}`;
  await page.goto(target, { waitUntil: "networkidle0", timeout: 30000 });
  // Give the app one more frame to flush any late React updates
  // (Supabase, useSEO, useJsonLd).
  await new Promise((r) => setTimeout(r, 250));
  const html = await page.content();
  const outputPath = routeToFilePath(route);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, html, "utf8");
  return outputPath;
};

const collectRoutes = async () => {
  const routes = [];
  for (const lang of LANGUAGES) {
    for (const path of STATIC_PATHS) {
      routes.push({ lang, route: buildLocalizedRoute(lang, path) });
    }
  }

  try {
    const posts = await fetchPublishedBlogPosts();
    for (const post of posts) {
      const slugPerLang = { fr: post.slug_fr, en: post.slug_en };
      for (const lang of LANGUAGES) {
        const slug = slugPerLang[lang];
        if (!slug) continue;
        routes.push({ lang, route: `/${lang}/blog/${slug}` });
      }
    }
  } catch (error) {
    console.warn(`[prerender] Failed to list blog posts: ${error?.message ?? error}`);
  }
  return routes;
};

const setLocaleForPage = async (page, lang) => {
  await page.evaluateOnNewDocument((value) => {
    try {
      window.localStorage.setItem("language", value);
    } catch {
      // Ignore storage failures.
    }
  }, lang);
};

const main = async () => {
  if (!existsSync(distDir)) {
    console.warn(`[prerender] dist/ not found at ${distDir}. Run \`vite build\` first.`);
    process.exit(0);
  }

  const rootIndex = resolve(distDir, "index.html");
  if (!existsSync(rootIndex)) {
    console.warn(`[prerender] ${rootIndex} not found. Skipping prerender.`);
    process.exit(0);
  }

  await loadEnvFile(repoRoot);

  let puppeteer;
  try {
    puppeteer = (await import("puppeteer")).default;
  } catch (error) {
    console.warn(`[prerender] Puppeteer not installed (${error?.message ?? error}). Skipping.`);
    process.exit(0);
  }

  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const routes = await collectRoutes();

  console.log(`[prerender] Pre-rendering ${routes.length} route(s) via ${baseUrl}`);

  let preview;
  let browser;
  try {
    preview = await startPreviewServer(port);
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    // Fail loud on unhandled page errors to help debugging.
    for (const { lang, route } of routes) {
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });
      // Prime localStorage with the target language before the SPA
      // scripts run so useLanguage resolves correctly on first paint.
      await setLocaleForPage(page, lang);
      page.on("pageerror", (err) =>
        console.warn(`[prerender] page error (${route}): ${err.message}`),
      );

      try {
        const outPath = await prerenderRoute(page, baseUrl, route);
        console.log(`[prerender]   ${route} -> ${outPath}`);
      } catch (error) {
        console.warn(`[prerender]   ${route} FAILED: ${error?.message ?? error}`);
      } finally {
        await page.close().catch(() => undefined);
      }
    }
  } catch (error) {
    console.warn(`[prerender] Aborted: ${error?.message ?? error}`);
  } finally {
    if (browser) await browser.close().catch(() => undefined);
    if (preview && !preview.killed) {
      preview.kill();
    }
  }
};

main().catch((error) => {
  console.error(`[prerender] Fatal error: ${error?.message ?? error}`);
  process.exit(0);
});
