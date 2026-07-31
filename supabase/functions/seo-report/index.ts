import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

import { createServiceRoleClient, requireAdminUser } from "../_shared/auth-utils.ts";
import { createLogger, getErrorMessage } from "../_shared/logger.ts";

/**
 * Admin-only SEO report: Lighthouse scores, Core Web Vitals and field data for
 * the public pages, from the Google PageSpeed Insights API.
 *
 * Adapted from an Express + `googleapis` design to this project's actual
 * backend, which is Deno Edge Functions. Three deliberate differences:
 *
 * 1. The PageSpeed key stays server-side. The original called Google from a
 *    React `useEffect`, which ships the API key to the browser where anyone can
 *    read it out of the network tab and burn the project's quota.
 *
 * 2. Search Console is not called from here. GSC needs a service-account JWT
 *    (RS256 signing over a private key), and an Edge Function is the wrong place
 *    to hold a Google private key. The report links out to the GSC property
 *    instead; the clicks/impressions panel is left for a later change if the
 *    business wants it in-app.
 *
 * 3. Results are cached in `app_settings`. PageSpeed runs a real Lighthouse pass
 *    per URL and takes 10-25 seconds, and the free tier allows 25k queries/day
 *    but only 240/minute. Caching means opening /admin/seo repeatedly costs
 *    nothing, and a deliberate refresh is an explicit action.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const logger = createLogger("SEO-REPORT");

const SITE_URL = "https://powerprestation.ca";
const REPORT_CACHE_KEY = "seo.pagespeed_report";
const PAGESPEED_ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

/**
 * Audited paths. Kept to the routes that are actually indexable — auditing a
 * noindex route would spend quota on a page that can never rank. Mirrors the
 * static entries in public/sitemap.xml.
 */
const AUDITED_PATHS = ["/", "/blog", "/legal/privacy"];

/** Google's own "good" thresholds, returned so the UI does not hard-code them. */
const THRESHOLDS = {
  lcpMs: 2500,
  clsUnitless: 0.1,
  inpMs: 200,
  ttfbMs: 800,
} as const;

type Strategy = "mobile" | "desktop";

type PageAudit = {
  url: string;
  path: string;
  strategy: Strategy;
  scores: {
    performance: number | null;
    accessibility: number | null;
    bestPractices: number | null;
    seo: number | null;
  };
  metrics: {
    lcpMs: number | null;
    clsUnitless: number | null;
    tbtMs: number | null;
    ttfbMs: number | null;
    fcpMs: number | null;
  };
  /** CrUX field data for real users; null when the URL has too little traffic. */
  fieldData: {
    lcpMs: number | null;
    clsUnitless: number | null;
    inpMs: number | null;
    overall: string | null;
  } | null;
  /** Failing Lighthouse audits worth acting on, largest saving first. */
  opportunities: Array<{ id: string; title: string; savingsMs: number | null }>;
  error: string | null;
};

type SeoReport = {
  generatedAt: string;
  siteUrl: string;
  strategy: Strategy;
  thresholds: typeof THRESHOLDS;
  pages: PageAudit[];
  recommendations: Array<{
    priority: "high" | "medium" | "low";
    category: string;
    path: string;
    message: string;
  }>;
};

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const MISSING_KEY_MESSAGE =
  "GOOGLE_PAGESPEED_API_KEY is not configured for this project";

const getErrorStatus = (message: string) => {
  if (message === "Authentication is required" || message === "Invalid authentication session") {
    return 401;
  }
  if (message === "Admin access is required") return 403;
  // 503 rather than 500: the request was valid, the integration is unconfigured.
  if (message === MISSING_KEY_MESSAGE) return 503;
  return 500;
};

/** Lighthouse scores arrive as 0-1 fractions; the UI wants 0-100. */
const toScore = (value: unknown) =>
  typeof value === "number" ? Math.round(value * 100) : null;

const toNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? Math.round(value) : null;

/** CLS is unitless and small, so it keeps three decimals instead of rounding. */
const toCls = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value)
    ? Number(value.toFixed(3))
    : null;

const auditPage = async (
  path: string,
  strategy: Strategy,
  apiKey: string,
): Promise<PageAudit> => {
  const url = `${SITE_URL}${path}`;
  const endpoint = new URL(PAGESPEED_ENDPOINT);
  endpoint.searchParams.set("url", url);
  endpoint.searchParams.set("key", apiKey);
  endpoint.searchParams.set("strategy", strategy);
  // `category` repeats rather than joining with commas — the API expects
  // repeated keys and silently returns performance only if they are joined.
  for (const category of ["performance", "accessibility", "best-practices", "seo"]) {
    endpoint.searchParams.append("category", category);
  }

  const empty: PageAudit = {
    url,
    path,
    strategy,
    scores: { performance: null, accessibility: null, bestPractices: null, seo: null },
    metrics: { lcpMs: null, clsUnitless: null, tbtMs: null, ttfbMs: null, fcpMs: null },
    fieldData: null,
    opportunities: [],
    error: null,
  };

  try {
    const response = await fetch(endpoint, { headers: { Accept: "application/json" } });

    if (!response.ok) {
      const body = await response.text();
      logger.warn("PageSpeed call failed", { path, status: response.status });
      return {
        ...empty,
        error: `PageSpeed returned ${response.status}: ${body.slice(0, 200)}`,
      };
    }

    const data = await response.json();
    const lighthouse = data?.lighthouseResult ?? {};
    const categories = lighthouse.categories ?? {};
    const audits = lighthouse.audits ?? {};

    /*
     * loadingExperience is CrUX field data: what real Chrome users measured over
     * the trailing 28 days. It is absent for low-traffic URLs, which is why it
     * is optional rather than assumed — and it is the number Google actually
     * ranks on, so it matters more than the lab scores beside it.
     */
    const crux = data?.loadingExperience?.metrics ?? null;
    const fieldData = crux
      ? {
          lcpMs: toNumber(crux.LARGEST_CONTENTFUL_PAINT_MS?.percentile),
          clsUnitless:
            typeof crux.CUMULATIVE_LAYOUT_SHIFT_SCORE?.percentile === "number"
              ? // CrUX reports CLS multiplied by 100 as an integer.
                Number((crux.CUMULATIVE_LAYOUT_SHIFT_SCORE.percentile / 100).toFixed(3))
              : null,
          inpMs: toNumber(crux.INTERACTION_TO_NEXT_PAINT?.percentile),
          overall: data?.loadingExperience?.overall_category ?? null,
        }
      : null;

    const opportunities = Object.entries(audits)
      .filter(([, audit]) => {
        const entry = audit as { score?: number | null; details?: { type?: string } };
        return (
          entry.details?.type === "opportunity" &&
          typeof entry.score === "number" &&
          entry.score < 0.9
        );
      })
      .map(([id, audit]) => {
        const entry = audit as { title?: string; numericValue?: number };
        return {
          id,
          title: entry.title ?? id,
          savingsMs: toNumber(entry.numericValue),
        };
      })
      .sort((a, b) => (b.savingsMs ?? 0) - (a.savingsMs ?? 0))
      .slice(0, 5);

    return {
      url,
      path,
      strategy,
      scores: {
        performance: toScore(categories.performance?.score),
        accessibility: toScore(categories.accessibility?.score),
        bestPractices: toScore(categories["best-practices"]?.score),
        seo: toScore(categories.seo?.score),
      },
      metrics: {
        lcpMs: toNumber(audits["largest-contentful-paint"]?.numericValue),
        clsUnitless: toCls(audits["cumulative-layout-shift"]?.numericValue),
        tbtMs: toNumber(audits["total-blocking-time"]?.numericValue),
        ttfbMs: toNumber(audits["server-response-time"]?.numericValue),
        fcpMs: toNumber(audits["first-contentful-paint"]?.numericValue),
      },
      fieldData,
      opportunities,
      error: null,
    };
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    logger.warn("PageSpeed call threw", { path, message });
    return { ...empty, error: message };
  }
};

const buildRecommendations = (pages: PageAudit[]): SeoReport["recommendations"] => {
  const recommendations: SeoReport["recommendations"] = [];

  for (const page of pages) {
    if (page.error) {
      recommendations.push({
        priority: "low",
        category: "Audit",
        path: page.path,
        message: `This page could not be audited: ${page.error}`,
      });
      continue;
    }

    if (page.scores.performance !== null && page.scores.performance < 80) {
      const top = page.opportunities
        .slice(0, 3)
        .map((item) => item.title)
        .join("; ");
      recommendations.push({
        priority: page.scores.performance < 50 ? "high" : "medium",
        category: "Performance",
        path: page.path,
        message: top
          ? `Performance ${page.scores.performance}/100. Biggest wins: ${top}.`
          : `Performance ${page.scores.performance}/100.`,
      });
    }

    if (page.scores.seo !== null && page.scores.seo < 90) {
      recommendations.push({
        priority: "high",
        category: "SEO",
        path: page.path,
        message: `Lighthouse SEO ${page.scores.seo}/100 — check titles, meta descriptions, crawlability and link text.`,
      });
    }

    if (page.scores.accessibility !== null && page.scores.accessibility < 90) {
      recommendations.push({
        priority: "medium",
        category: "Accessibility",
        path: page.path,
        message: `Accessibility ${page.scores.accessibility}/100. Contrast and alt text also affect how the page is understood.`,
      });
    }

    // Field data beats lab data: this is what Google ranks on.
    const lcp = page.fieldData?.lcpMs ?? page.metrics.lcpMs;
    if (lcp !== null && lcp > THRESHOLDS.lcpMs) {
      recommendations.push({
        priority: lcp > THRESHOLDS.lcpMs * 1.6 ? "high" : "medium",
        category: "Core Web Vitals",
        path: page.path,
        message: `LCP ${(lcp / 1000).toFixed(2)}s exceeds the ${
          THRESHOLDS.lcpMs / 1000
        }s threshold. Check the hero image priority and render-blocking requests.`,
      });
    }

    const cls = page.fieldData?.clsUnitless ?? page.metrics.clsUnitless;
    if (cls !== null && cls > THRESHOLDS.clsUnitless) {
      recommendations.push({
        priority: "medium",
        category: "Core Web Vitals",
        path: page.path,
        message: `CLS ${cls} exceeds ${THRESHOLDS.clsUnitless}. Reserve space for images and embeds with explicit width/height.`,
      });
    }
  }

  const order = { high: 0, medium: 1, low: 2 } as const;
  return recommendations.sort((a, b) => order[a.priority] - order[b.priority]);
};

const loadCachedReport = async (
  supabase: ReturnType<typeof createServiceRoleClient>,
): Promise<SeoReport | null> => {
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", REPORT_CACHE_KEY)
    .maybeSingle();

  if (error) {
    logger.warn("Could not read cached SEO report", { message: error.message });
    return null;
  }

  const value = data?.value as SeoReport | null | undefined;
  return value && typeof value === "object" && Array.isArray(value.pages) ? value : null;
};

const saveCachedReport = async (
  supabase: ReturnType<typeof createServiceRoleClient>,
  report: SeoReport,
  updatedBy: string | null,
) => {
  const { error } = await supabase.from("app_settings").upsert({
    key: REPORT_CACHE_KEY,
    value: report,
    description: "Cached PageSpeed Insights report rendered by /admin/seo.",
    updated_by: updatedBy,
  });

  if (error) {
    // A cache write failure must not fail the request: the caller already has
    // a valid report in hand, it just will not be reused on the next open.
    logger.warn("Could not cache SEO report", { message: error.message });
  }
};

const runReport = async (strategy: Strategy, apiKey: string): Promise<SeoReport> => {
  /*
   * Sequential, not Promise.all. Each URL triggers a full Lighthouse run on
   * Google's side and the per-minute quota is easy to trip; three requests in
   * parallel also risks the Edge Function wall-clock limit with nothing cached.
   */
  const pages: PageAudit[] = [];
  for (const path of AUDITED_PATHS) {
    pages.push(await auditPage(path, strategy, apiKey));
  }

  return {
    generatedAt: new Date().toISOString(),
    siteUrl: SITE_URL,
    strategy,
    thresholds: THRESHOLDS,
    pages,
    recommendations: buildRecommendations(pages),
  };
};

const parseStrategy = (value: unknown): Strategy =>
  value === "desktop" ? "desktop" : "mobile";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createServiceRoleClient();
    const caller = await requireAdminUser(supabase, req);

    // GET returns whatever is cached without spending quota, so opening the
    // page is always cheap and instant.
    if (req.method === "GET") {
      const cached = await loadCachedReport(supabase);
      return jsonResponse({ report: cached, cached: true });
    }

    // POST is the explicit "refresh" action and is the only path that calls Google.
    if (req.method === "POST") {
      const apiKey = (Deno.env.get("GOOGLE_PAGESPEED_API_KEY") ?? "").trim();
      if (!apiKey) {
        throw new Error(MISSING_KEY_MESSAGE);
      }

      const body = await req.json().catch(() => null);
      const strategy = parseStrategy((body as { strategy?: unknown } | null)?.strategy);

      const report = await runReport(strategy, apiKey);
      await saveCachedReport(supabase, report, caller.email);

      logger.info("SEO report refreshed", {
        by: caller.email,
        strategy,
        pages: report.pages.length,
        failed: report.pages.filter((page) => page.error).length,
      });

      return jsonResponse({ report, cached: false });
    }

    return jsonResponse({ error: "Method not allowed" }, 405);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    logger.error("seo-report request failed", { message });
    return jsonResponse({ error: message }, getErrorStatus(message));
  }
});
