/**
 * Offline contract + adapter verification (no network).
 * Run: node scripts/verify-contract.mjs
 */
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";

// Lightweight inline checks mirroring adapter rules (avoid TS runtime)
const mock = JSON.parse(
  readFileSync(
    new URL("../src/lib/content/fixtures/mock-public-lexicon.json", import.meta.url),
  ),
);

function isPublishable(w) {
  if (!w?.id || !String(w.wordNarragansett || "").trim() || !String(w.englishGloss || "").trim())
    return false;
  if (w.isSacred) return false;
  if (w.elderApproved === false) return false;
  if (w.source !== "keeper_approved") return false;
  return true;
}

const raw = mock.words || [];
const kept = raw.filter(isPublishable);
const dropped = raw.filter((w) => !isPublishable(w));

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    failed++;
  } else {
    console.log("ok:", msg);
  }
}

assert(raw.length >= 5, "mock fixture has sample words");
assert(kept.length >= 5, "publishable mock words remain");
assert(
  dropped.some((w) => w.isSacred),
  "sacred mock row is filtered out",
);
assert(
  !kept.some((w) => w.id.includes("sacred") || w.isSacred),
  "no sacred id in publishable set",
);
assert(
  kept.every((w) => w.elderApproved && w.source === "keeper_approved"),
  "all kept rows are keeper_approved",
);

// Seed integrity
const seed = JSON.parse(
  readFileSync(new URL("../src/lib/content/seed-williams.json", import.meta.url)),
);
assert(Array.isArray(seed.words) && seed.words.length > 500, "seed has substantial lexicon");
assert(
  seed.words.every((w) => w.source === "historical_seed"),
  "seed rows marked historical_seed",
);
assert(
  seed.words.every((w) => w.elderApproved === false),
  "seed rows not elder-approved",
);

if (failed) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log("\nverify-contract: all checks passed");
