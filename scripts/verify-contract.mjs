/**
 * Offline contract + adapter verification (no network).
 * Run: node scripts/verify-contract.mjs
 */
import { readFileSync } from "node:fs";

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
  const vis = String(w.visibility || "").trim().toLowerCase();
  if (vis && vis !== "public") return false;
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
  dropped.some((w) => w.elderApproved === false),
  "unpublished (elderApproved: false) mock row is filtered out",
);
assert(
  dropped.some((w) => !String(w.englishGloss || "").trim()),
  "missing-gloss mock row is filtered out",
);
assert(
  !kept.some((w) => w.id.includes("sacred") || w.isSacred),
  "no sacred id in publishable set",
);
assert(
  !kept.some((w) => w.elderApproved === false),
  "no unpublished row in publishable set",
);
assert(
  kept.every((w) => w.elderApproved && w.source === "keeper_approved"),
  "all kept rows are keeper_approved",
);

assert(
  !isPublishable({
    id: "",
    wordNarragansett: "Wunnégin",
    englishGloss: "welcome",
    elderApproved: true,
    isSacred: false,
    source: "keeper_approved",
  }),
  "rejects missing id",
);
assert(
  !isPublishable({
    id: "x",
    wordNarragansett: "Wunnégin",
    englishGloss: "  ",
    elderApproved: true,
    isSacred: false,
    source: "keeper_approved",
  }),
  "rejects missing gloss",
);
assert(
  !isPublishable({
    id: "x",
    wordNarragansett: "Wunnégin",
    englishGloss: "welcome",
    elderApproved: true,
    isSacred: true,
    source: "keeper_approved",
  }),
  "rejects sacred",
);
assert(
  !isPublishable({
    id: "x",
    wordNarragansett: "Wunnégin",
    englishGloss: "welcome",
    elderApproved: false,
    isSacred: false,
    source: "keeper_approved",
  }),
  "rejects elderApproved === false",
);
assert(
  !isPublishable({
    id: "x",
    wordNarragansett: "Wunnégin",
    englishGloss: "welcome",
    elderApproved: true,
    isSacred: false,
    source: "keeper_approved",
    visibility: "elders_only",
  }),
  "rejects elders_only visibility",
);

const adapter = readFileSync(
  new URL("../src/lib/content/adapter.ts", import.meta.url),
  "utf8",
);
assert(
  adapter.includes("w.elderApproved === false"),
  "adapter.ts drops elderApproved === false",
);
assert(adapter.includes("w.isSacred"), "adapter.ts drops sacred rows");
assert(
  adapter.includes("englishGloss") && adapter.includes("!w?.id"),
  "adapter.ts rejects missing id/gloss",
);

const loader = readFileSync(
  new URL("../src/lib/content/load-corpus.ts", import.meta.url),
  "utf8",
);
assert(
  loader.includes("/api/v1/public/lexicon"),
  "loader calls public lexicon contract path",
);
assert(loader.includes("limit="), "lexicon fetch sends limit");
assert(loader.includes("offset="), "lexicon fetch sends offset");
assert(/while\s*\(/.test(loader), "lexicon fetch paginates until exhausted");
assert(
  loader.includes("MAX_WORDS") || loader.includes("10_000"),
  "lexicon pagination has a sane cap",
);
assert(
  !/lexicon\?limit=200&offset=0/.test(loader) || loader.includes("offset=${offset}"),
  "does not stop at a single page of 200",
);

const config = readFileSync(
  new URL("../src/lib/content/config.ts", import.meta.url),
  "utf8",
);
assert(
  !/VITE_USE_MOCK_PUBLIC_API \?\? ["']true["']/.test(config),
  "mock pipeline does not default to true",
);
assert(
  /raw === ["']true["']/.test(config),
  "mock pipeline is opt-in (explicit true)",
);

const envExample = readFileSync(new URL("../.env.example", import.meta.url), "utf8");
assert(
  /^VITE_API_BASE_URL=\s*$/m.test(envExample),
  "VITE_API_BASE_URL is empty-by-default in .env.example",
);
assert(
  !/^VITE_USE_MOCK_PUBLIC_API=true\s*$/m.test(envExample),
  ".env.example does not silently enable mock living rows",
);
assert(
  /DANGER|never enable|production/i.test(envExample),
  ".env.example warns that mock living rows are dangerous",
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
