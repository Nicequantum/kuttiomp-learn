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

/**
 * Knowledge Keeper portal (admin).
 * Override with VITE_KEEPER_PORTAL_URL on Vercel if the admin domain changes.
 */
export const KEEPER_PORTAL_URL =
  (import.meta.env.VITE_KEEPER_PORTAL_URL as string | undefined)?.trim() ||
  "https://kuttiomp-admin-viti.vercel.app";

/**
 * High-resolution land photography (JPG + WebP).
 */
export const SCENERY = {
  sunset: {
    jpg: "/scenery/sunset-woodland.jpg",
    webp: "/scenery/sunset-woodland.webp",
  },
  coastal: {
    jpg: "/scenery/coastal-marsh.jpg",
    webp: "/scenery/coastal-marsh.webp",
  },
  stream: {
    jpg: "/scenery/forest-stream.jpg",
    webp: "/scenery/forest-stream.webp",
  },
} as const;
