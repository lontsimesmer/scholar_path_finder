import { supabase } from "@/integrations/supabase/client";
import { getErrorMessage } from "@/lib/logger";

const FUNCTION_NAME = "seo-report";

/**
 * Client side of the `seo-report` Edge Function.
 *
 * The PageSpeed API key deliberately never reaches this layer: the function
 * holds it and this module only ever sees the computed report. That is why
 * there is a GET/POST split rather than a single fetch — GET reads the cached
 * report for free, POST is the explicit refresh that spends Google quota.
 */

export type SeoStrategy = "mobile" | "desktop";

export type SeoPageAudit = {
  url: string;
  path: string;
  strategy: SeoStrategy;
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
  fieldData: {
    lcpMs: number | null;
    clsUnitless: number | null;
    inpMs: number | null;
    overall: string | null;
  } | null;
  opportunities: Array<{ id: string; title: string; savingsMs: number | null }>;
  error: string | null;
};

export type SeoRecommendationPriority = "high" | "medium" | "low";

export type SeoReport = {
  generatedAt: string;
  siteUrl: string;
  strategy: SeoStrategy;
  thresholds: {
    lcpMs: number;
    clsUnitless: number;
    inpMs: number;
    ttfbMs: number;
  };
  pages: SeoPageAudit[];
  recommendations: Array<{
    priority: SeoRecommendationPriority;
    category: string;
    path: string;
    message: string;
  }>;
};

export type SeoReportResponse = {
  report: SeoReport | null;
  cached: boolean;
};

export type SeoReportResult =
  | { success: true; report: SeoReport | null; cached: boolean }
  | { success: false; message: string };

/**
 * Raised by the function when GOOGLE_PAGESPEED_API_KEY is unset. Matched by
 * string so the page can show a setup hint instead of a raw error, the same way
 * AdminNotifications maps its known function errors.
 */
export const SEO_MISSING_KEY_MESSAGE =
  "GOOGLE_PAGESPEED_API_KEY is not configured for this project";

const invokeFunction = async <T>(options: {
  method: "GET" | "POST";
  body?: Record<string, unknown>;
}): Promise<T> => {
  const { data, error } = await supabase.functions.invoke<T>(FUNCTION_NAME, {
    method: options.method,
    body: options.body,
  });

  if (error) {
    /*
     * supabase-js collapses any non-2xx into a generic FunctionsHttpError whose
     * message is just "Edge Function returned a non-2xx status code", so the
     * real reason has to be read out of the response body. Without this the
     * missing-API-key case would surface as an opaque failure.
     */
    const context = (error as { context?: Response }).context;
    if (context && typeof context.json === "function") {
      try {
        const payload = (await context.json()) as { error?: string };
        if (payload?.error) {
          throw new Error(payload.error);
        }
      } catch (parseError) {
        if (parseError instanceof Error && parseError.message) {
          throw parseError;
        }
      }
    }
    throw error;
  }

  if (!data) throw new Error("Empty response from seo-report");
  return data;
};

/** Reads the last cached report. Never calls Google, so it is always cheap. */
export const fetchSeoReport = async (): Promise<SeoReportResult> => {
  try {
    const response = await invokeFunction<SeoReportResponse>({ method: "GET" });
    return { success: true, report: response.report, cached: response.cached };
  } catch (error) {
    return { success: false, message: getErrorMessage(error, "Failed to load the SEO report") };
  }
};

/** Runs a fresh audit. Slow by nature — Lighthouse runs per URL on Google's side. */
export const refreshSeoReport = async (
  strategy: SeoStrategy,
): Promise<SeoReportResult> => {
  try {
    const response = await invokeFunction<SeoReportResponse>({
      method: "POST",
      body: { strategy },
    });
    return { success: true, report: response.report, cached: response.cached };
  } catch (error) {
    return { success: false, message: getErrorMessage(error, "Failed to refresh the SEO report") };
  }
};

export type SeoScoreTone = "success" | "warning" | "destructive" | "muted";

/**
 * Lighthouse's own banding: 90+ is green, 50-89 amber, below 50 red. Reused for
 * every score so the colours mean the same thing in the report as they do in
 * PageSpeed itself.
 */
export const getScoreTone = (score: number | null): SeoScoreTone => {
  if (score === null) return "muted";
  if (score >= 90) return "success";
  if (score >= 50) return "warning";
  return "destructive";
};

/** `null` renders as an em dash rather than "0", which would read as a real score. */
export const formatScore = (score: number | null) => (score === null ? "—" : String(score));

export const formatMilliseconds = (value: number | null) => {
  if (value === null) return "—";
  if (value < 1000) return `${Math.round(value)} ms`;
  return `${(value / 1000).toFixed(2)} s`;
};

export const formatCls = (value: number | null) =>
  value === null ? "—" : value.toFixed(3);

/**
 * Averages only the pages that returned a score. Treating a failed audit as 0
 * would silently drag the headline number down and look like a regression.
 */
export const averageScore = (
  pages: SeoPageAudit[],
  key: keyof SeoPageAudit["scores"],
): number | null => {
  const values = pages
    .map((page) => page.scores[key])
    .filter((value): value is number => value !== null);

  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
};

export interface AdminSeoText {
  breadcrumbDashboard: string;
  breadcrumbCurrent: string;
  title: string;
  subtitle: string;
  refreshButton: string;
  refreshingButton: string;
  strategyMobile: string;
  strategyDesktop: string;
  generatedAt: string;
  neverRun: string;
  emptyTitle: string;
  emptyDescription: string;
  missingKeyTitle: string;
  missingKeyDescription: string;
  metrics: {
    performance: string;
    seo: string;
    accessibility: string;
    bestPractices: string;
    averageSuffix: string;
  };
  pagesTitle: string;
  pagesDescription: string;
  labTitle: string;
  fieldTitle: string;
  fieldUnavailable: string;
  opportunitiesTitle: string;
  noOpportunities: string;
  auditFailed: string;
  recommendationsTitle: string;
  recommendationsDescription: string;
  noRecommendations: string;
  priority: {
    high: string;
    medium: string;
    low: string;
  };
  labels: {
    lcp: string;
    cls: string;
    inp: string;
    ttfb: string;
    tbt: string;
    fcp: string;
    savings: string;
  };
  gscTitle: string;
  gscDescription: string;
  gscButton: string;
  toasts: {
    loadErrorTitle: string;
    refreshSuccessTitle: string;
    refreshSuccessDescription: string;
    refreshErrorTitle: string;
  };
}
