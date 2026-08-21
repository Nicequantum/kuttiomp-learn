/**
 * Corpus loader: demo seed ↔ public API ↔ mock living pipeline.
 * @see docs/PUBLIC_LEXICON_CONTRACT.md
 */

import seed from "./seed-williams.json";
import mockPublic from "./fixtures/mock-public-lexicon.json";
import {
  CONTENT_CORPUS,
  IS_DEMO_HISTORICAL,
  API_BASE_URL,
  isApiConfigured,
  isMockPipelineEnabled,
} from "./config";
import {
  adaptPublicWords,
  publicPathToLearning,
  synthesizePathsFromWords,
} from "./adapter";
import type {
  PublicHealthResponse,
  PublicLexiconResponse,
  PublicPathsResponse,
} from "./public-api";
import type {
  CorpusBundle,
  CorpusLoadState,
  LearningPath,
  LexicalWord,
  MasteryStage,
} from "./types";

const seedBundle = seed as CorpusBundle;

let active: CorpusBundle = structuredClone(seedBundle);
let loadState: CorpusLoadState = {
  mode: CONTENT_CORPUS,
  source: "seed",
  apiConfigured: isApiConfigured(),
  apiOk: null,
  wordCount: seedBundle.words.length,
  corpusVersion: null,
  message: IS_DEMO_HISTORICAL
    ? "Demo historical seed (Williams 1643)"
    : "Waiting for public API",
  lastHydratedAt: null,
};

const listeners = new Set<() => void>();

function notify() {
  for (const fn of listeners) fn();
}

export function subscribeCorpus(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function getCorpusLoadState(): CorpusLoadState {
  return loadState;
}

export function getActiveBundle(): CorpusBundle {
  return active;
}

export function loadCorpus(): CorpusBundle {
  return active;
}

function keeperEmptyNotice(
  kind: "unavailable" | "empty" | "unconfigured",
): string {
  if (kind === "unavailable") {
    return "Content temporarily unavailable. Living forms will appear here when the Keeper service is reachable again.";
  }
  if (kind === "unconfigured") {
    return "The living corpus is not connected yet. Keepers publish approved words from the Knowledge Keeper portal.";
  }
  return "Keepers are building the living corpus. Approved public words will appear here.";
}

function demoUnavailableNotice(detail: string): string {
  return `Living corpus unreachable (${detail}). Historical demo seed is shown — not living tribal authority.`;
}

async function fetchPublicHealth(): Promise<PublicHealthResponse> {
  const base = API_BASE_URL;
  if (!base) throw new Error("API not configured");
  const res = await fetch(`${base}/api/v1/public/health`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Health HTTP ${res.status}`);
  }
  return (await res.json()) as PublicHealthResponse;
}

function applyUnavailable(detail: string, reason?: string | null) {
  if (IS_DEMO_HISTORICAL) {
    active = structuredClone(seedBundle);
    loadState = {
      mode: "demo_historical",
      source: "seed",
      apiConfigured: true,
      apiOk: false,
      wordCount: active.words.length,
      corpusVersion: null,
      message: demoUnavailableNotice(detail),
      lastHydratedAt: new Date().toISOString(),
      apiReason: reason ?? "living_corpus_unreachable",
    };
    return;
  }
  active = emptyKeeperBundle(keeperEmptyNotice("unavailable"));
  loadState = {
    mode: "keeper_only",
    source: "empty",
    apiConfigured: true,
    apiOk: false,
    wordCount: 0,
    corpusVersion: null,
    message: active.notice,
    lastHydratedAt: new Date().toISOString(),
    apiReason: reason ?? "living_corpus_unreachable",
  };
}

function emptyKeeperBundle(notice: string): CorpusBundle {
  return {
    corpus: "keeper_only",
    corpusLabel: "Living Keeper corpus",
    notice,
    sourceWork: {
      title: "Knowledge Keepers",
      author: "Narragansett speakers & Keepers",
      year: new Date().getFullYear(),
      note: "Living authority only — no historical demo seed.",
    },
    words: [],
    paths: [],
    stages: seedBundle.stages,
  };
}

function loadMockPublic(): {
  words: LexicalWord[];
  paths: LearningPath[];
  version: string;
} {
  const data = mockPublic as PublicLexiconResponse;
  const words = adaptPublicWords(data.words ?? []);
  return {
    words,
    paths: synthesizePathsFromWords(words),
    version: data.corpusVersion ?? "mock",
  };
}

async function fetchPublicLexicon(): Promise<{
  words: LexicalWord[];
  paths: LearningPath[];
  version: string | null;
}> {
  const base = API_BASE_URL;
  if (!base) throw new Error("API not configured");

  const res = await fetch(`${base}/api/v1/public/lexicon?limit=200&offset=0`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Lexicon HTTP ${res.status}`);
  }
  const data = (await res.json()) as PublicLexiconResponse;
  const words = adaptPublicWords(data.words ?? []);

  let paths: LearningPath[] = [];
  try {
    const pathRes = await fetch(`${base}/api/v1/public/paths`, {
      headers: { Accept: "application/json" },
    });
    if (pathRes.ok) {
      const pathData = (await pathRes.json()) as PublicPathsResponse;
      paths = (pathData.paths ?? []).map(publicPathToLearning);
    }
  } catch {
    /* optional */
  }
  if (paths.length === 0) {
    paths = synthesizePathsFromWords(words);
  }

  return {
    words,
    paths,
    version: data.corpusVersion ?? null,
  };
}

function applyLivingWords(
  words: LexicalWord[],
  paths: LearningPath[],
  version: string | null,
  sourceLabel: "api" | "mock",
) {
  if (CONTENT_CORPUS === "keeper_only") {
    active = {
      corpus: "keeper_only",
      corpusLabel:
        sourceLabel === "mock"
          ? "Mock living pipeline (dev)"
          : "Living Keeper corpus",
      notice:
        words.length === 0
          ? keeperEmptyNotice("empty")
          : sourceLabel === "mock"
            ? "Mock living forms for engineering — not tribal authority. Sacred leak tests must not appear."
            : "Living forms from Knowledge Keepers. Sacred content never appears here.",
      sourceWork: {
        title:
          sourceLabel === "mock"
            ? "Mock public lexicon fixture"
            : "Knowledge Keepers",
        author:
          sourceLabel === "mock"
            ? "Engineering fixture"
            : "Narragansett speakers & Keepers",
        year: new Date().getFullYear(),
        note:
          sourceLabel === "mock"
            ? "Replace with real API. Mock rows are labeled."
            : "Elder-approved, public visibility only.",
      },
      words,
      paths,
      stages: seedBundle.stages as MasteryStage[],
    };
    loadState = {
      mode: "keeper_only",
      source: words.length ? (sourceLabel === "mock" ? "api" : "api") : "empty",
      apiConfigured: sourceLabel === "api",
      apiOk: true,
      wordCount: words.length,
      corpusVersion: version,
      message:
        sourceLabel === "mock"
          ? `Mock pipeline: ${words.length} living forms (sacred filtered)`
          : words.length === 0
            ? keeperEmptyNotice("empty")
            : `Loaded ${words.length} living forms`,
      lastHydratedAt: new Date().toISOString(),
      apiReason: null,
    };
    return;
  }

  // Demo: merge seed + living (living wins on id)
  const map = new Map<string, LexicalWord>();
  for (const w of seedBundle.words) map.set(w.id, w);
  for (const w of words) map.set(w.id, w);
  const merged = [...map.values()];
  const pathList =
    paths.length > 0 ? paths : (seedBundle.paths as LearningPath[]);
  active = {
    ...structuredClone(seedBundle),
    words: merged,
    paths: pathList,
    notice:
      words.length > 0
        ? `${seedBundle.notice} · ${sourceLabel === "mock" ? "Mock" : "Live"} Keeper forms: ${words.length}.`
        : seedBundle.notice,
  };
  loadState = {
    mode: "demo_historical",
    source: words.length > 0 ? "seed+api" : "seed",
    apiConfigured: sourceLabel === "api" || isApiConfigured(),
    apiOk: true,
    wordCount: merged.length,
    corpusVersion: version,
    message:
      sourceLabel === "mock"
        ? `Demo seed + ${words.length} mock living forms`
        : words.length > 0
          ? `Demo seed + ${words.length} live Keeper forms`
          : "Demo seed (API reachable, no public words yet)",
    lastHydratedAt: new Date().toISOString(),
    apiReason: null,
  };
}

export async function hydrateCorpus(): Promise<CorpusLoadState> {
  loadState = {
    ...loadState,
    mode: CONTENT_CORPUS,
    apiConfigured: isApiConfigured(),
  };

  // 1) Live API — health first so unreachable Supabase is not a vague 503
  if (isApiConfigured()) {
    try {
      const health = await fetchPublicHealth();
      if (!health.ok) {
        applyUnavailable(
          health.reason || "living corpus not ready",
          health.reason,
        );
        notify();
        return loadState;
      }
      const { words, paths, version } = await fetchPublicLexicon();
      applyLivingWords(words, paths, version, "api");
      notify();
      return loadState;
    } catch (err) {
      const detail = err instanceof Error ? err.message : "unknown error";
      applyUnavailable(detail);
      notify();
      return loadState;
    }
  }

  // 2) Mock living pipeline (engineering while Keepers work)
  if (isMockPipelineEnabled()) {
    const { words, paths, version } = loadMockPublic();
    applyLivingWords(words, paths, version, "mock");
    notify();
    return loadState;
  }

  // 3) Seed only
  if (IS_DEMO_HISTORICAL) {
    active = structuredClone(seedBundle);
    loadState = {
      ...loadState,
      source: "seed",
      apiOk: null,
      wordCount: active.words.length,
      message:
        "Demo seed — set VITE_API_BASE_URL when public API is ready (or VITE_USE_MOCK_PUBLIC_API=true to test living pipeline)",
      lastHydratedAt: new Date().toISOString(),
      apiReason: null,
    };
  } else {
    active = emptyKeeperBundle(keeperEmptyNotice("unconfigured"));
    loadState = {
      ...loadState,
      source: "empty",
      apiOk: false,
      wordCount: 0,
      message: active.notice,
      lastHydratedAt: new Date().toISOString(),
      apiReason: "unconfigured",
    };
  }
  notify();
  return loadState;
}
