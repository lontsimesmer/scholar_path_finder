import { type ImgHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

/**
 * Image wrapper that applies the Core Web Vitals attributes it is easy to
 * forget on a raw <img>.
 *
 * This deliberately does not do the `src + "?w=1200&format=webp"` rewriting
 * that image-CDN setups use: every image here is a local asset imported through
 * Vite, which fingerprints and serves it as-is. Appending query parameters to a
 * bundled asset URL would produce a 404, not a resized image. Getting real
 * responsive sources would mean generating the variants at build time, which is
 * a separate change; what this component does fix is the part that costs
 * ranking today — layout shift and LCP priority.
 *
 * What it enforces:
 *
 * - `width`/`height` are required, so the browser can reserve the box before
 *   the bytes arrive. This is the single biggest CLS lever. They describe the
 *   asset's intrinsic aspect ratio; CSS still controls the rendered size.
 * - `priority` marks the LCP candidate. It sets `fetchpriority="high"` and
 *   opts out of lazy loading, because a lazily-loaded above-the-fold image is
 *   discovered late and reliably degrades LCP. Everything else stays lazy.
 * - `decoding="async"` keeps image decode off the main thread so it cannot
 *   block interaction readiness.
 */
export interface OptimizedImageProps
  extends Omit<ImgHTMLAttributes<HTMLImageElement>, "loading" | "decoding" | "width" | "height"> {
  src: string;
  /**
   * Required and meaningful. Empty alt is only correct for purely decorative
   * images; for those, pass `alt=""` explicitly and the intent is documented at
   * the call site.
   */
  alt: string;
  /** Intrinsic pixel width of the asset, used to reserve layout space. */
  width: number;
  /** Intrinsic pixel height of the asset, used to reserve layout space. */
  height: number;
  /**
   * Set on the above-the-fold LCP image only. Marking several images priority
   * defeats the purpose, since it gives the browser no ordering to act on.
   */
  priority?: boolean;
}

/**
 * Emits the priority hint as the lowercase HTML attribute the browser reads.
 *
 * React 18 has no `fetchPriority` in its DOM prop typings and logs "React does
 * not recognize the fetchPriority prop" for the camelCase spelling, so it is
 * built as a plain attribute object instead. React 19 supports the camelCase
 * prop directly, at which point this indirection can collapse into a normal
 * `fetchPriority={...}` on the element.
 */
const fetchPriorityAttribute = (priority: boolean) =>
  ({ fetchpriority: priority ? "high" : "auto" }) as Record<string, string>;

export const OptimizedImage = ({
  src,
  alt,
  width,
  height,
  priority = false,
  className,
  ...rest
}: OptimizedImageProps) => (
  // `rest` is spread first so the attributes this component exists to guarantee
  // cannot be silently overridden by a caller passing them through.
  <img
    {...rest}
    {...fetchPriorityAttribute(priority)}
    src={src}
    alt={alt}
    width={width}
    height={height}
    loading={priority ? "eager" : "lazy"}
    decoding="async"
    className={cn(className)}
  />
);

export default OptimizedImage;
