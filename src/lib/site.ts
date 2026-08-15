/**
 * Absolute origin used for SEO artefacts (canonical, hreflang, og:url,
 * JSON-LD @id, sitemap URLs, ...). Read from VITE_SITE_URL at build
 * time; falls back to the production origin so the app keeps working
 * if the env var is missing.
 */
const RAW = (import.meta.env?.VITE_SITE_URL ?? "").toString().trim();

export const SITE_URL: string = (RAW || "https://powerprestation.ca").replace(/\/+$/, "");
