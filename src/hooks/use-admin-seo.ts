import { useCallback, useEffect, useState } from "react";

import {
  type SeoReport,
  type SeoStrategy,
  fetchSeoReport,
  refreshSeoReport,
} from "@/lib/admin-seo";
import { createLogger, getErrorMessage } from "@/lib/logger";

const logger = createLogger("useAdminSeo");

type RefreshResult = { success: true } | { success: false; message: string };

export const useAdminSeo = () => {
  const [report, setReport] = useState<SeoReport | null>(null);
  const [strategy, setStrategy] = useState<SeoStrategy>("mobile");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    const result = await fetchSeoReport();
    /*
     * `=== true` rather than a bare truthiness check: this project compiles with
     * strictNullChecks off, and under that setting TypeScript will not narrow a
     * boolean-discriminated union from `if (result.success)` alone, so the error
     * branch loses its `message` field. An explicit literal comparison narrows
     * correctly.
     */
    if (result.success === true) {
      setReport(result.report);
      setLoadError(null);
      /*
       * The cached report carries the strategy it was generated with. Adopting
       * it keeps the toggle honest: showing "Mobile" selected over a desktop
       * report would misattribute every number on the page.
       */
      if (result.report?.strategy) {
        setStrategy(result.report.strategy);
      }
    } else {
      setLoadError(result.message);
      logger.error("Failed to load the SEO report", { message: result.message });
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const refresh = useCallback(async (): Promise<RefreshResult> => {
    setIsRefreshing(true);
    try {
      const result = await refreshSeoReport(strategy);
      if (result.success === true) {
        setReport(result.report);
        setLoadError(null);
        return { success: true };
      }
      logger.error("Failed to refresh the SEO report", { message: result.message });
      return { success: false, message: result.message };
    } catch (error: unknown) {
      const message = getErrorMessage(error, "Failed to refresh the SEO report");
      logger.error("Unexpected error while refreshing the SEO report", { message });
      return { success: false, message };
    } finally {
      setIsRefreshing(false);
    }
  }, [strategy]);

  return {
    report,
    strategy,
    setStrategy,
    isLoading,
    isRefreshing,
    loadError,
    load,
    refresh,
  };
};
