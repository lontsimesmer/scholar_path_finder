#!/usr/bin/env node
/**
 * Render public/og-image.jpg (1200x630) via headless Chromium. The
 * template mirrors the brand palette taken from favicon.svg
 * (#3E60D2 -> #1D3473 gradient, white PP monogram) and adds a bold
 * bilingual tagline that works both for facebook/twitter cards and
 * the JSON-LD LocalBusiness "image" field.
 *
 * Run manually when the brand or copy changes:
 *   node scripts/generate-og-image.mjs
 *
 * Commit the resulting public/og-image.jpg alongside the change.
 */

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const outputPath = resolve(repoRoot, "public/og-image.jpg");

const HTML = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      html, body { width: 1200px; height: 630px; overflow: hidden; }
      body {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        padding: 72px 88px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", Arial, sans-serif;
        color: #ffffff;
        background:
          radial-gradient(circle at 85% 12%, rgba(255,255,255,0.08), transparent 42%),
          radial-gradient(circle at 12% 92%, rgba(255,255,255,0.06), transparent 46%),
          linear-gradient(135deg, #3E60D2 0%, #253F94 55%, #1D3473 100%);
      }
      .top-row {
        display: flex;
        align-items: center;
        gap: 22px;
      }
      .monogram {
        width: 84px;
        height: 84px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.14);
        border: 1.5px solid rgba(255, 255, 255, 0.35);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 900;
        font-size: 36px;
        letter-spacing: -1.5px;
      }
      .brand {
        font-size: 20px;
        letter-spacing: 0.28em;
        text-transform: uppercase;
        font-weight: 700;
        color: rgba(255, 255, 255, 0.85);
      }
      .middle {
        max-width: 900px;
      }
      h1 {
        font-size: 74px;
        line-height: 1.05;
        font-weight: 800;
        letter-spacing: -1.5px;
      }
      h1 .highlight {
        display: block;
        margin-top: 6px;
        color: #E8EEFF;
        font-weight: 500;
        font-size: 40px;
        letter-spacing: -0.5px;
      }
      .bottom-row {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
      }
      .tags {
        display: flex;
        gap: 14px;
        flex-wrap: wrap;
      }
      .tag {
        display: inline-flex;
        align-items: center;
        padding: 10px 20px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.12);
        border: 1px solid rgba(255, 255, 255, 0.24);
        font-size: 17px;
        font-weight: 600;
        letter-spacing: 0.02em;
      }
      .location {
        text-align: right;
        font-size: 16px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: rgba(255, 255, 255, 0.72);
        line-height: 1.6;
      }
      .location strong {
        color: #ffffff;
        font-weight: 800;
        letter-spacing: 0.02em;
        text-transform: none;
        font-size: 22px;
        display: block;
        margin-top: 4px;
      }
    </style>
  </head>
  <body>
    <div class="top-row">
      <div class="monogram">PP</div>
      <div class="brand">Power Prestation</div>
    </div>

    <div class="middle">
      <h1>
        &Eacute;tudes &agrave; l'&eacute;tranger
        <span class="highlight">Bourses, visas &amp; universit&eacute;s depuis le Cameroun</span>
      </h1>
    </div>

    <div class="bottom-row">
      <div class="tags">
        <div class="tag">Universit&eacute;s</div>
        <div class="tag">Bourses</div>
        <div class="tag">Visas</div>
        <div class="tag">Stages</div>
      </div>
      <div class="location">
        Cabinet bas&eacute; &agrave;
        <strong>Yaound&eacute;, Cameroun</strong>
      </div>
    </div>
  </body>
</html>`;

const main = async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
    await page.setContent(HTML, { waitUntil: "networkidle0" });
    await page.screenshot({
      path: outputPath,
      type: "jpeg",
      quality: 92,
      clip: { x: 0, y: 0, width: 1200, height: 630 },
    });
    console.log(`[og-image] Wrote ${outputPath} (1200x630 JPEG).`);
  } finally {
    await browser.close();
  }
};

main().catch((err) => {
  console.error(`[og-image] Fatal: ${err?.message ?? err}`);
  process.exit(1);
});
