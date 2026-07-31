import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { usePrivateRouteSeo } from "@/hooks/use-private-route-seo";
import { useLanguage } from "@/i18n/language";
import { createLogger } from "@/lib/logger";

const logger = createLogger("NotFound");

const NotFound = () => {
  const location = useLocation();
  const { t } = useLanguage();

  /*
   * A soft 404: the CDN rewrite serves index.html with a 200 for unknown paths,
   * so there is no status code telling crawlers this page is missing. The
   * noindex tag is the only signal that keeps mistyped and stale URLs out of
   * the index.
   */
  usePrivateRouteSeo(t.pageTitles.notFound);

  useEffect(() => {
    logger.warn("User attempted to access a non-existent route", {
      path: location.pathname,
    });
  }, [location.pathname]);

  return (
    <div className="page-shell flex items-center justify-center px-4 py-8">
      <div className="relative z-10 w-full max-w-xl rounded-[1.5rem] border border-white/70 bg-white/90 p-6 text-center shadow-strong sm:rounded-[2rem] md:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.26em] text-muted-foreground">404</p>
        <h1 className="mt-4 font-display text-4xl font-bold text-foreground sm:text-5xl">Page not found</h1>
        <p className="mt-4 text-lg leading-8 text-muted-foreground">
          The page you requested does not exist or may have moved.
        </p>
        <Button asChild size="lg" className="mt-8">
          <a href="/">Return to Home</a>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
