import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const HEADER_OFFSET = 112;
const MAX_SCROLL_ATTEMPTS = 12;
const SCROLL_RETRY_DELAY_MS = 120;

const scrollToElement = (element: HTMLElement) => {
  const top = window.scrollY + element.getBoundingClientRect().top - HEADER_OFFSET;
  window.scrollTo({
    top: Math.max(top, 0),
    behavior: "smooth",
  });
};

const ScrollToHash = () => {
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) {
      return;
    }

    const targetId = decodeURIComponent(location.hash.replace(/^#/, ""));
    if (!targetId) {
      return;
    }

    let attempts = 0;
    let timeoutId: number | null = null;

    const tryScroll = () => {
      const element = document.getElementById(targetId);
      if (element) {
        scrollToElement(element);
        return;
      }

      attempts += 1;
      if (attempts >= MAX_SCROLL_ATTEMPTS) {
        return;
      }

      timeoutId = window.setTimeout(tryScroll, SCROLL_RETRY_DELAY_MS);
    };

    tryScroll();

    return () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [location.hash, location.pathname]);

  return null;
};

export default ScrollToHash;
