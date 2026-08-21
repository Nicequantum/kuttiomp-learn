/**
 * Local pairing check: public lexicon → Learn adapter rules.
 * Mirrors hydrateCorpus / adaptPublicWords (no Vite runtime).
 *
 *   npm run verify:hydrate
 *
 * Expects Kuttiomp FastAPI at VITE_API_BASE_URL (default http://localhost:8000).
 * Does not invent a production host. Exit 1 records the exact blocker.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadDotEnv(filePath) {
  if (!existsSync(filePath)) return;
  const text = readFileSync(filePath, "utf8");
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim();
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadDotEnv(resolve(process.cwd(), ".env"));

const BASE = (
  process.env.VITE_API_BASE_URL || "http://localhost:8000"
).replace(/\/$/, "");

const SEED_PUBLIC = ["Wunnegan", "Kuttiomp"];

function isPublishable(w) {
  if (
    !w?.id ||
    !String(w.wordNarragansett || "").trim() ||
    !String(w.englishGloss || "").trim()
  ) {
    return false;
  }
  if (w.isSacred) return false;
  if (w.source !== "keeper_approved") return false;
  return true;
}

function wordKey(w) {
  return String(w.wordNormalized || w.wordNarragansett || "")
    .trim()
    .toLowerCase();
}

async function fetchJson(path) {
  const url = `${BASE}${path}`;
  let res;
  try {
    res = await fetch(url, { headers: { Accept: "application/json" } });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(
      `BLOCKER: cannot reach ${url} (${detail}). Start Kuttiomp FastAPI locally (apps/api on port 8000) after setting SUPABASE_SERVICE_ROLE_KEY and GROK_API_KEY. FastAPI is not deployed — do not invent a production VITE_API_BASE_URL.`,
    );
  }
  if (!res.ok) {
    throw new Error(
      `BLOCKER: ${url} returned HTTP ${res.status}. Public routes live on the updated Kuttiomp clone (GET /api/v1/public/health|lexicon). An older API on :8000, missing secrets, or unreachable Supabase will fail here.`,
    );
  }
  return res.json();
}

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    failed += 1;
  } else {
    console.log("ok:", msg);
  }
}

console.log(`verify-hydrate: ${BASE}`);
console.log("corpus mode: demo_historical (merge path; not keeper_only cutover)");

try {
  const health = await fetchJson("/api/v1/public/health");
  assert(health?.ok === true, "GET /api/v1/public/health ok");

  const data = await fetchJson("/api/v1/public/lexicon?limit=200&offset=0");
  const raw = data.words ?? [];
  const kept = raw.filter(isPublishable);

  assert(Array.isArray(raw), "lexicon.words is an array");
  assert(
    kept.every((w) => w.source === "keeper_approved"),
    "publishable rows are keeper_approved (adapter gate)",
  );

  const keys = new Set(kept.map(wordKey));
  for (const name of SEED_PUBLIC) {
    const hit = kept.find((w) => wordKey(w) === name.toLowerCase());
    assert(
      Boolean(hit),
      `seed public word "${name}" hydrates as keeper_approved`,
    );
    if (hit) {
      console.log(
        `   ${name}: id=${hit.id} source=${hit.source} gloss=${hit.englishGloss}`,
      );
    }
  }

  if (failed) {
    console.error(`\n${failed} check(s) failed`);
    process.exit(1);
  }
  console.log(
    `\nverify-hydrate: seed public words hydrate via ${BASE} (${kept.length} publishable of ${raw.length})`,
  );
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  console.error(
    "Remaining user action: host FastAPI (Railway / Fly / Render), then set Vercel VITE_API_BASE_URL to that origin. Keep VITE_CONTENT_CORPUS=demo_historical until Keepers cut over.",
  );
  process.exit(1);
}
