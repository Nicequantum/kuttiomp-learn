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
 * Kuttiomp FastAPI origin for Public Lexicon Contract v1.
 * Example: https://api.your-domain.com  (no trailing slash)
 */
export const API_BASE_URL = (
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? ""
).replace(/\/$/, "");

export function isApiConfigured(): boolean {
  return Boolean(API_BASE_URL);
}

/**
 * Mock living pipeline — engineering only.
 * Opt-in: must be explicitly `true` / `1`. Never default on.
 * Production-shaped configs leave this unset/false so mock rows cannot
 * ship as living Keeper forms. When `VITE_API_BASE_URL` is set, the live
 * API always wins and mock is ignored.
 */
export function isMockPipelineEnabled(): boolean {
  if (isApiConfigured()) return false;
  const raw = String(import.meta.env.VITE_USE_MOCK_PUBLIC_API ?? "")
    .trim()
    .toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes";
}

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
  night: {
    jpg: "/scenery/night-pines.jpg",
    webp: "/scenery/night-pines.webp",
  },
} as const;
