/**
 * Community media resolution.
 *
 * Rule: when a real upload exists at the configured path, it always wins
 * over the packaged reconstruction. SPA hosts often return HTML 200 for
 * missing assets — so content-type and size are validated, never status alone.
 */

export type MediaKind = "scene" | "day-act" | "story";

export type ResolvedMedia = {
  /** URL to play */
  src: string;
  /** True when community upload was selected */
  fromUpload: boolean;
  /** Human label for UI */
  sourceLabel: "community" | "reconstruction";
  /** Upload path that was checked (if any) */
  uploadSrc?: string;
  /** Why upload was not used, when known */
  reason?: string;
};

const MIN_BYTES = 10_000;
/** Session cache so index/catalog probes don't re-HEAD every mount */
const cache = new Map<string, { at: number; ok: boolean; reason?: string }>();
const CACHE_TTL_MS = 60_000;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function looksLikeVideo(res: Response): { ok: boolean; reason?: string } {
  const ct = (res.headers.get("content-type") || "").toLowerCase();
  // SPA fallback is the #1 false-positive on Vercel-style hosts
  if (ct.includes("text/html") || ct.includes("text/plain")) {
    return { ok: false, reason: "not-video-content-type" };
  }
  if (ct.startsWith("video/")) return { ok: true };
  if (ct.includes("mp4") || ct.includes("octet-stream") || ct === "") {
    const len = Number(res.headers.get("content-length") || 0);
    if (len > 0 && len < MIN_BYTES) {
      return { ok: false, reason: "file-too-small" };
    }
    // Accept missing content-length when type is video-ish / empty (some CDNs)
    return { ok: true };
  }
  return { ok: false, reason: `unsupported-type:${ct || "unknown"}` };
}

async function probeUpload(uploadSrc: string): Promise<{
  ok: boolean;
  reason?: string;
}> {
  const hit = cache.get(uploadSrc);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return { ok: hit.ok, reason: hit.reason };
  }

  try {
    // Prefer HEAD (cheap). Fall back to Range GET when HEAD is blocked.
    let res = await fetch(uploadSrc, {
      method: "HEAD",
      cache: "no-store",
    });

    if (!res.ok || res.status === 405 || res.status === 501) {
      res = await fetch(uploadSrc, {
        method: "GET",
        headers: { Range: "bytes=0-0" },
        cache: "no-store",
      });
    }

    if (!res.ok) {
      const out = { ok: false, reason: `http-${res.status}` };
      cache.set(uploadSrc, { at: Date.now(), ...out });
      return out;
    }

    const check = looksLikeVideo(res);
    cache.set(uploadSrc, { at: Date.now(), ...check });
    return check;
  } catch {
    const out = { ok: false, reason: "network" };
    cache.set(uploadSrc, { at: Date.now(), ...out });
    return out;
  }
}

/**
 * Prefer community upload when present and valid; else packaged reconstruction.
 */
export async function resolveCommunityMedia(opts: {
  packagedSrc: string;
  uploadSrc?: string | null;
}): Promise<ResolvedMedia> {
  const packaged = opts.packagedSrc;
  const upload = opts.uploadSrc?.trim() || "";

  if (!isBrowser() || !upload) {
    return {
      src: packaged,
      fromUpload: false,
      sourceLabel: "reconstruction",
      uploadSrc: upload || undefined,
      reason: !upload ? "no-upload-path" : "ssr",
    };
  }

  const probe = await probeUpload(upload);
  if (probe.ok) {
    return {
      src: upload,
      fromUpload: true,
      sourceLabel: "community",
      uploadSrc: upload,
    };
  }

  return {
    src: packaged,
    fromUpload: false,
    sourceLabel: "reconstruction",
    uploadSrc: upload,
    reason: probe.reason,
  };
}

/** Force a fresh probe (catalog “Recheck” button). */
export function invalidateCommunityMediaCache(uploadSrc?: string): void {
  if (uploadSrc) cache.delete(uploadSrc);
  else cache.clear();
}

/** Batch status for catalog UI — does not return playable src. */
export async function probeCommunityUpload(
  uploadSrc: string,
): Promise<{ present: boolean; reason?: string }> {
  if (!isBrowser()) return { present: false, reason: "ssr" };
  const r = await probeUpload(uploadSrc);
  return { present: r.ok, reason: r.reason };
}
