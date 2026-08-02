import type { CorpusMode } from "./types";

/**
 * Demo deploy uses historical seed so Keepers can walk a living product.
 * Production flips to keeper_only — Williams rows never reach learners.
 */
export const CONTENT_CORPUS: CorpusMode =
  (import.meta.env.VITE_CONTENT_CORPUS as CorpusMode | undefined) ??
  "demo_historical";

export const IS_DEMO_HISTORICAL = CONTENT_CORPUS === "demo_historical";

export const APP_NAME = "Kuttiomp";
export const APP_TAGLINE = "A gathering place for Narragansett language";

/** Optional link back to the Knowledge Keeper portal (admin on Vercel). */
export const KEEPER_PORTAL_URL =
  (import.meta.env.VITE_KEEPER_PORTAL_URL as string | undefined)?.trim() || "";

/**
 * Scenery images (land-based, calm). Soft-overlaid for readability.
 * Not decorative cartoon culture — place and light of this land.
 */
export const SCENERY = {
  sunset: "/scenery/sunset-woodland.jpg",
  coastal: "/scenery/coastal-marsh.jpg",
  stream: "/scenery/forest-stream.jpg",
} as const;
