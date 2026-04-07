import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { createLogger } from "@/lib/logger";

const logger = createLogger("NotFound");

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    logger.warn("User attempted to access a non-existent route", {
      path: location.pathname,
    });
  }, [location.pathname]);

  return (
    <div className="page-shell flex items-center justify-center px-4 py-8">
      <div className="relative z-10 w-full max-w-xl rounded-[2rem] border border-white/70 bg-white/90 p-10 text-center shadow-strong">
        <p className="text-sm font-semibold uppercase tracking-[0.26em] text-muted-foreground">404</p>
        <h1 className="mt-4 font-display text-5xl font-bold text-foreground">Page not found</h1>
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
