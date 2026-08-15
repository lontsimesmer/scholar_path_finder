#!/usr/bin/env node
/**
 * Post-build script that pre-renders the public routes of the SPA into
 * static HTML files so that search engines and social crawlers receive
 * fully populated markup (meta, canonical, JSON-LD, main content) instead
 * of an empty <div id="root">.
 *
 * Flow:
 *   1. Boots `vite preview` against dist/ on a random free port.
 *   2. Uses Puppeteer to visit each public route, waits for network idle,
 *      captures the rendered HTML and rewrites it back to dist/<path>/index.html.
 *   3. Kills the preview server.
 *
 * If Puppeteer or the preview server cannot start, the script logs a
 * warning and exits without failing the build (Netlify _redirects still
 * routes everything through the client-side SPA).
 */

import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { dirname, resolve } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import { fetchPublishedBlogPosts, loadEnvFile } from "./lib/blog-posts.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const distDir = resolve(repoRoot, "dist");

const STATIC_ROUTES = [
  "/",
  "/blog",
  "/legal/privacy",
  "/legal/terms",
  "/legal/cookies",
];

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

const prerenderRoute = async (page, baseUrl, route) => {
  const target = `${baseUrl}${route}`;
  await page.goto(target, { waitUntil: "networkidle0", timeout: 30000 });
  // Give the app one more frame to flush any late React updates (Supabase, useSEO, useJsonLd).
  await new Promise((r) => setTimeout(r, 250));
  const html = await page.content();
  const outputPath = routeToFilePath(route);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, html, "utf8");
  return outputPath;
};

const collectRoutes = async () => {
  const routes = [...STATIC_ROUTES];
  try {
    const posts = await fetchPublishedBlogPosts();
    const seen = new Set();
    for (const post of posts) {
      for (const slug of [post.slug_fr, post.slug_en]) {
        if (!slug || seen.has(slug)) continue;
        seen.add(slug);
        routes.push(`/blog/${slug}`);
      }
    }
  } catch (error) {
    console.warn(`[prerender] Failed to list blog posts: ${error?.message ?? error}`);
  }
  return routes;
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
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    // Force the French locale before any app script runs so that the
    // pre-rendered snapshot matches our FR-first meta/hreflang strategy.
    await page.evaluateOnNewDocument(() => {
      try {
        window.localStorage.setItem("language", "fr");
      } catch {
        // Ignore storage failures — page will fall back to the default language.
      }
    });
    // Fail loud on unhandled console errors to help debugging.
    page.on("pageerror", (err) => console.warn(`[prerender] page error: ${err.message}`));

    for (const route of routes) {
      try {
        const outPath = await prerenderRoute(page, baseUrl, route);
        console.log(`[prerender]   ${route} -> ${outPath}`);
      } catch (error) {
        console.warn(`[prerender]   ${route} FAILED: ${error?.message ?? error}`);
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
