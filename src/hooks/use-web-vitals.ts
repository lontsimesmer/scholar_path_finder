import { useEffect } from "react";

import { createLogger } from "@/lib/logger";

const logger = createLogger("WebVitals");

/**
 * Reports Core Web Vitals for the current page load.
 *
 * Implemented directly on PerformanceObserver rather than pulling in Google's
 * `web-vitals` package, which would add a runtime dependency to measure
 * something the platform already exposes. It also does not reach for
 * `performance.timing`, the deprecated API the reference snippet used: that
 * interface reports zeros in modern browsers, so the numbers it produced were
 * not usable.
 *
 * The three metrics Google actually ranks on are collected:
 *
 * - LCP, taken from the last `largest-contentful-paint` entry. The candidate is
 *   revised upward as the page paints, so only the final one is meaningful,
 *   which is why it is flushed at page hide rather than reported per entry.
 * - CLS, the running sum of layout shifts that were not triggered by user
 *   input. Shifts within 500ms of a click are expected and excluded.
 * - INP, approximated by the worst `event` duration. INP replaced FID as a Core
 *   Web Vital in March 2024, so FID is deliberately not collected.
 *
 * TTFB comes from the Navigation Timing entry, which is where responseStart
 * lives now.
 *
 * Reporting happens once, on the first `visibilitychange` to hidden — the only
 * event that fires reliably when a mobile browser is backgrounded or the tab is
 * discarded. `beforeunload` (used by the reference snippet) is not fired in that
 * case on mobile Safari and Chrome, so metrics collected there are silently lost
 * for a large share of real traffic.
 *
 * Output goes through the app logger, which is DEV-only for debug level. That is
 * intentional: this is a local diagnostic for spotting a regression while
 * working on a page. Field data across real users is read from the CrUX numbers
 * in the /admin/seo report, which needs no client instrumentation.
 */
export const useWebVitals = () => {
  useEffect(() => {
    if (typeof PerformanceObserver === "undefined") {
      return;
    }

    let largestContentfulPaint = 0;
    let cumulativeLayoutShift = 0;
    let interactionToNextPaint = 0;
    let reported = false;

    const observers: PerformanceObserver[] = [];

    /**
     * Entry types vary by browser, and an unsupported one makes observe() throw
     * rather than no-op. Each is registered independently so a missing type
     * (INP on Safari, for instance) does not take the other metrics down.
     */
    const observe = (
      type: string,
      callback: (entries: PerformanceEntryList) => void,
      options: PerformanceObserverInit = {},
    ) => {
      try {
        const observer = new PerformanceObserver((list) => callback(list.getEntries()));
        observer.observe({ type, buffered: true, ...options });
        observers.push(observer);
      } catch {
        // Entry type not supported in this browser; skip this metric only.
      }
    };

    observe("largest-contentful-paint", (entries) => {
      const last = entries[entries.length - 1];
      if (last) {
        largestContentfulPaint = last.startTime;
      }
    });

    observe("layout-shift", (entries) => {
      for (const entry of entries) {
        const shift = entry as PerformanceEntry & { value: number; hadRecentInput: boolean };
        if (!shift.hadRecentInput) {
          cumulativeLayoutShift += shift.value;
        }
      }
    });

    // durationThreshold is capped at 16ms by the spec; anything faster than a
    // frame is not a responsiveness problem worth recording.
    observe(
      "event",
      (entries) => {
        for (const entry of entries) {
          if (entry.duration > interactionToNextPaint) {
            interactionToNextPaint = entry.duration;
          }
        }
      },
      { durationThreshold: 40 } as PerformanceObserverInit,
    );

    const getTimeToFirstByte = () => {
      const [navigation] = performance.getEntriesByType("navigation");
      return navigation ? (navigation as PerformanceNavigationTiming).responseStart : 0;
    };

    const report = () => {
      if (reported) {
        return;
      }
      reported = true;

      const round = (value: number) => Math.round(value);

      logger.debug("Core Web Vitals", {
        path: window.location.pathname,
        // Google's "good" thresholds, for reading the numbers at a glance.
        lcpMs: round(largestContentfulPaint), // good < 2500
        cls: Number(cumulativeLayoutShift.toFixed(4)), // good < 0.1
        inpMs: round(interactionToNextPaint), // good < 200
        ttfbMs: round(getTimeToFirstByte()), // good < 800
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        report();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      observers.forEach((observer) => observer.disconnect());
    };
  }, []);
};
