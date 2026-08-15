#!/usr/bin/env node
/**
 * Ad-hoc smoke test that drives a real Chromium against the local
 * `npm run dev` server and asserts the bilingual routing behaviour
 * added in Phase 3 (see feat(seo): bilingual routing under /fr and /en).
 *
 * Not wired into CI — this exists so a human can verify the routing,
 * nav and SEO wiring end-to-end without opening a browser by hand.
 *
 * Usage:
 *   npm run dev           # in one terminal, wait for http://127.0.0.1:8080
 *   node scripts/smoke-test-dev.mjs
 *
 * Exits 0 when every assertion passes, 1 otherwise.
 */

import puppeteer from "puppeteer";

const BASE = "http://127.0.0.1:8080";

const results = [];
const record = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  const mark = ok ? "PASS" : "FAIL";
  const suffix = detail ? ` — ${detail}` : "";
  console.log(`  [${mark}] ${name}${suffix}`);
};

const openPage = async (browser) => {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  page.on("pageerror", (err) => console.log(`  [pageerror] ${err.message}`));
  return page;
};

const gotoAndSettle = async (page, url) => {
  await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });
  // Give React one extra tick to flush useSEO/useJsonLd effects.
  await new Promise((r) => setTimeout(r, 300));
};

const readMeta = (page) =>
  page.evaluate(() => {
    const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? null;
    const alternates = Array.from(document.querySelectorAll('link[rel="alternate"][hreflang]')).map((el) => ({
      hreflang: el.getAttribute("hreflang"),
      href: el.getAttribute("href"),
    }));
    return {
      canonical,
      alternates,
      title: document.title,
      htmlLang: document.documentElement.lang,
      description: document.querySelector('meta[name="description"]')?.getAttribute("content") ?? null,
      ogUrl: document.querySelector('meta[property="og:url"]')?.getAttribute("content") ?? null,
    };
  });

const runScenarios = async (browser) => {
  console.log("\n[scenario] Legacy / -> /fr (301 in-app)");
  {
    const page = await openPage(browser);
    await gotoAndSettle(page, `${BASE}/`);
    record("landed on /fr after visiting /", page.url() === `${BASE}/fr`, `url=${page.url()}`);
    const meta = await readMeta(page);
    record("htmlLang is fr", meta.htmlLang === "fr", `htmlLang=${meta.htmlLang}`);
    record("title starts with FR wording", /Études|Bourses|Cameroun/.test(meta.title), `title=${meta.title}`);
    record(
      "canonical points to production /fr",
      meta.canonical === "https://www.powerprestation.com/fr",
      `canonical=${meta.canonical}`,
    );
    record(
      "3 hreflang alternates (fr/en/x-default)",
      meta.alternates.length === 3
        && meta.alternates.some((a) => a.hreflang === "fr")
        && meta.alternates.some((a) => a.hreflang === "en")
        && meta.alternates.some((a) => a.hreflang === "x-default"),
      `alternates=${JSON.stringify(meta.alternates)}`,
    );
    await page.close();
  }

  console.log("\n[scenario] Legacy /blog -> /fr/blog");
  {
    const page = await openPage(browser);
    await gotoAndSettle(page, `${BASE}/blog`);
    record("landed on /fr/blog", page.url() === `${BASE}/fr/blog`, `url=${page.url()}`);
    await page.close();
  }

  console.log("\n[scenario] Legacy /legal/privacy -> /fr/legal/privacy");
  {
    const page = await openPage(browser);
    await gotoAndSettle(page, `${BASE}/legal/privacy`);
    record(
      "landed on /fr/legal/privacy",
      page.url() === `${BASE}/fr/legal/privacy`,
      `url=${page.url()}`,
    );
    await page.close();
  }

  console.log("\n[scenario] Direct /en renders English");
  {
    const page = await openPage(browser);
    await gotoAndSettle(page, `${BASE}/en`);
    const meta = await readMeta(page);
    record("htmlLang is en", meta.htmlLang === "en", `htmlLang=${meta.htmlLang}`);
    record(
      "title is English",
      /Study Abroad|Scholarships|Universities/i.test(meta.title),
      `title=${meta.title}`,
    );
    record(
      "canonical points to production /en",
      meta.canonical === "https://www.powerprestation.com/en",
      `canonical=${meta.canonical}`,
    );
    await page.close();
  }

  console.log("\n[scenario] Language switcher swaps FR -> EN on the same route");
  {
    const page = await openPage(browser);
    await gotoAndSettle(page, `${BASE}/fr/blog`);
    const trigger = await page.$('header button[aria-haspopup="menu"]');
    record("switcher trigger button is present", trigger !== null);
    if (trigger) {
      await trigger.click();
      await new Promise((r) => setTimeout(r, 300));
      // Radix menu items appear as "ENAnglais" / "FRFrancais" in FR mode;
      // pick the one whose label starts with the target flag.
      const englishItem = await page.evaluateHandle(() => {
        const items = Array.from(document.querySelectorAll('[role="menuitem"]'));
        return items.find((it) => it.textContent.trim().startsWith("EN")) ?? null;
      });
      const hasItem = await englishItem.evaluate((n) => n !== null);
      record("English menu item found", hasItem);
      if (hasItem) {
        await englishItem.click();
        await new Promise((r) => setTimeout(r, 600));
        record("URL switched to /en/blog", page.url() === `${BASE}/en/blog`, `url=${page.url()}`);
        const meta = await readMeta(page);
        record("htmlLang updated to en", meta.htmlLang === "en", `htmlLang=${meta.htmlLang}`);
        record(
          "title is English after switch",
          /Academic Guides|Blog/i.test(meta.title),
          `title=${meta.title}`,
        );
      }
    }
    await page.close();
  }

  console.log("\n[scenario] Header logo goes to localized home");
  {
    const page = await openPage(browser);
    await gotoAndSettle(page, `${BASE}/en/blog`);
    const logoHref = await page.evaluate(() => {
      const header = document.querySelector("header");
      const link = header?.querySelector('a[href="/en"], a[href="/fr"]');
      return link?.getAttribute("href") ?? null;
    });
    record("logo href respects current language", logoHref === "/en", `href=${logoHref}`);
    await page.close();
  }

  console.log("\n[scenario] Blog link in header respects current language");
  {
    const page = await openPage(browser);
    await gotoAndSettle(page, `${BASE}/en`);
    const blogHref = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll("header a"));
      const blog = links.find((a) => /^\/(fr|en)\/blog$/.test(a.getAttribute("href") ?? ""));
      return blog?.getAttribute("href") ?? null;
    });
    record("blog link is /en/blog", blogHref === "/en/blog", `href=${blogHref}`);
    await page.close();
  }

  console.log("\n[scenario] JSON-LD schemas emitted on home");
  {
    const page = await openPage(browser);
    await gotoAndSettle(page, `${BASE}/fr`);
    const types = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
      const found = new Set();
      for (const script of scripts) {
        try {
          const parsed = JSON.parse(script.textContent ?? "[]");
          const items = Array.isArray(parsed) ? parsed : [parsed];
          for (const it of items) if (it["@type"]) found.add(it["@type"]);
        } catch {
          // ignore malformed
        }
      }
      return Array.from(found);
    });
    for (const t of ["Organization", "ProfessionalService", "WebSite", "FAQPage"]) {
      record(`JSON-LD includes ${t}`, types.includes(t), `types=${types.join(",")}`);
    }
    await page.close();
  }

  console.log("\n[scenario] Unknown route -> NotFound with noindex");
  {
    const page = await openPage(browser);
    await gotoAndSettle(page, `${BASE}/definitely-does-not-exist`);
    const robots = await page.evaluate(
      () => document.querySelector('meta[name="robots"]')?.getAttribute("content") ?? null,
    );
    record(
      "robots meta is noindex on NotFound",
      robots?.includes("noindex") ?? false,
      `robots=${robots}`,
    );
    await page.close();
  }
};

const main = async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    await runScenarios(browser);
  } finally {
    await browser.close();
  }
  const passed = results.filter((r) => r.ok).length;
  const failed = results.length - passed;
  console.log(`\n[summary] ${passed}/${results.length} checks passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
};

main().catch((err) => {
  console.error(`Fatal: ${err?.message ?? err}`);
  process.exit(1);
});
