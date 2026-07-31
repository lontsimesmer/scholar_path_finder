import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { OptimizedImage } from "@/components/ui/OptimizedImage";

/**
 * These assertions read the rendered DOM attributes rather than the props,
 * because the whole point of the component is what the browser ends up seeing.
 * `fetchpriority` in particular is only honoured when React actually emits it
 * as a lowercase HTML attribute, so asserting on the prop would prove nothing.
 */
describe("OptimizedImage", () => {
  it("reserves layout space and defers non-priority images", () => {
    const { getByAltText } = render(
      <OptimizedImage src="/hero.jpg" alt="A student" width={1920} height={1080} />,
    );

    const image = getByAltText("A student");

    // Explicit intrinsic dimensions are what let the browser avoid layout shift.
    expect(image.getAttribute("width")).toBe("1920");
    expect(image.getAttribute("height")).toBe("1080");
    expect(image.getAttribute("loading")).toBe("lazy");
    expect(image.getAttribute("decoding")).toBe("async");
    expect(image.getAttribute("fetchpriority")).toBe("auto");
  });

  it("marks a priority image as eager with high fetch priority", () => {
    const { getByAltText } = render(
      <OptimizedImage src="/hero.jpg" alt="LCP image" width={1920} height={1080} priority />,
    );

    const image = getByAltText("LCP image");

    // A lazily-loaded LCP element is discovered late and degrades LCP, so the
    // priority path must opt out of lazy loading entirely.
    expect(image.getAttribute("loading")).toBe("eager");
    expect(image.getAttribute("fetchpriority")).toBe("high");
  });

  it("does not let a caller override the attributes it guarantees", () => {
    const { getByAltText } = render(
      <OptimizedImage
        src="/hero.jpg"
        alt="Guarded"
        width={800}
        height={600}
        priority
        // @ts-expect-error deliberately passing an attribute the type omits.
        loading="lazy"
      />,
    );

    expect(getByAltText("Guarded").getAttribute("loading")).toBe("eager");
  });
});
