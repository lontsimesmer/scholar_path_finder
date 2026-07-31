import { useLocation } from "react-router-dom";

import { useSEO } from "@/hooks/use-seo";

/**
 * Marks an authenticated or transactional route as noindex/nofollow.
 *
 * robots.txt already disallows these paths, but a disallowed URL can still be
 * indexed from an external link — Google cannot read the page to find a robots
 * meta tag, yet it can list the bare URL. A meta tag on a crawlable page is the
 * only directive that reliably keeps it out of the index, so these routes stay
 * crawlable in robots.txt terms and rely on this tag instead.
 *
 * The canonical is self-referencing rather than inherited from the previous
 * route, which would otherwise leak a private path's signals onto a public URL.
 */
export const usePrivateRouteSeo = (title: string) => {
  const { pathname } = useLocation();

  useSEO({
    title,
    noindex: true,
    url: pathname,
  });
};
