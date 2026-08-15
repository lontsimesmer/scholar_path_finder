import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { createLogger } from "@/lib/logger";
import { useSEO } from "@/hooks/use-seo";
import { useLocalizedPath } from "@/hooks/use-localized-path";
import { useLanguage } from "@/i18n/language";

const logger = createLogger("NotFound");

const NotFound = () => {
  const location = useLocation();
  const { t } = useLanguage();
  const localized = useLocalizedPath();

  useSEO({
    title: t.seo.notFound.title,
    description: t.seo.notFound.description,
    noindex: true,
  });

  useEffect(() => {
    logger.warn("User attempted to access a non-existent route", {
      path: location.pathname,
    });
  }, [location.pathname]);

  return (
    <div className="page-shell flex items-center justify-center px-4 py-8">
      <div className="relative z-10 w-full max-w-xl rounded-[1.5rem] border border-white/70 bg-white/90 p-6 text-center shadow-strong sm:rounded-[2rem] md:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.26em] text-muted-foreground">404</p>
        <h1 className="mt-4 font-display text-4xl font-bold text-foreground sm:text-5xl">
          {t.seo.notFound.title}
        </h1>
        <p className="mt-4 text-lg leading-8 text-muted-foreground">
          {t.seo.notFound.description}
        </p>
        <Button asChild size="lg" className="mt-8">
          <a href={localized("/")}>{t.legal.backHome}</a>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
