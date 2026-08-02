/**
 * Corpus loader: demo seed ↔ public API.
 * @see docs/PUBLIC_LEXICON_CONTRACT.md
 */

import seed from "./seed-williams.json";
import {
  CONTENT_CORPUS,
  IS_DEMO_HISTORICAL,
  API_BASE_URL,
  isApiConfigured,
} from "./config";
import {
  adaptPublicWords,
  publicPathToLearning,
  synthesizePathsFromWords,
} from "./adapter";
import type { PublicLexiconResponse, PublicPathsResponse } from "./public-api";
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

/** Sync snapshot used by existing corpus helpers */
export function loadCorpus(): CorpusBundle {
  return active;
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
    /* paths optional in v1 */
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

/**
 * Hydrate from public API when configured.
 * Safe to call multiple times; failures keep previous usable corpus.
 */
export async function hydrateCorpus(): Promise<CorpusLoadState> {
  loadState = {
    ...loadState,
    mode: CONTENT_CORPUS,
    apiConfigured: isApiConfigured(),
  };

  if (!isApiConfigured()) {
    if (IS_DEMO_HISTORICAL) {
      active = structuredClone(seedBundle);
      loadState = {
        ...loadState,
        source: "seed",
        apiOk: null,
        wordCount: active.words.length,
        message: "Demo seed — set VITE_API_BASE_URL when public API is ready",
        lastHydratedAt: new Date().toISOString(),
      };
    } else {
      active = emptyKeeperBundle(
        "Production mode (keeper_only) requires VITE_API_BASE_URL.",
      );
      loadState = {
        ...loadState,
        source: "empty",
        apiOk: false,
        wordCount: 0,
        message: active.notice,
        lastHydratedAt: new Date().toISOString(),
      };
    }
    notify();
    return loadState;
  }

  try {
    const { words, paths, version } = await fetchPublicLexicon();

    if (CONTENT_CORPUS === "keeper_only") {
      active = {
        corpus: "keeper_only",
        corpusLabel: "Living Keeper corpus",
        notice:
          words.length === 0
            ? "No published words yet. Keepers approve public entries in the admin portal."
            : "Living forms from Knowledge Keepers. Sacred content never appears here.",
        sourceWork: {
          title: "Knowledge Keepers",
          author: "Narragansett speakers & Keepers",
          year: new Date().getFullYear(),
          note: "Elder-approved, public visibility only.",
        },
        words,
        paths,
        stages: seedBundle.stages as MasteryStage[],
      };
      loadState = {
        mode: "keeper_only",
        source: words.length ? "api" : "empty",
        apiConfigured: true,
        apiOk: true,
        wordCount: words.length,
        corpusVersion: version,
        message:
          words.length === 0
            ? "API ok — waiting for first published words"
            : `Loaded ${words.length} living forms`,
        lastHydratedAt: new Date().toISOString(),
      };
    } else {
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
            ? `${seedBundle.notice} · Also showing ${words.length} live Keeper form(s).`
            : seedBundle.notice,
      };
      loadState = {
        mode: "demo_historical",
        source: words.length > 0 ? "seed+api" : "seed",
        apiConfigured: true,
        apiOk: true,
        wordCount: merged.length,
        corpusVersion: version,
        message:
          words.length > 0
            ? `Demo seed + ${words.length} live Keeper forms`
            : "Demo seed (API reachable, no public words yet)",
        lastHydratedAt: new Date().toISOString(),
      };
    }
  } catch (err) {
    const detail = err instanceof Error ? err.message : "unknown error";
    if (IS_DEMO_HISTORICAL) {
      active = structuredClone(seedBundle);
      loadState = {
        mode: "demo_historical",
        source: "seed",
        apiConfigured: true,
        apiOk: false,
        wordCount: active.words.length,
        corpusVersion: null,
        message: `API unavailable (${detail}) — using demo seed`,
        lastHydratedAt: new Date().toISOString(),
      };
    } else {
      active = emptyKeeperBundle(
        `Could not load living corpus (${detail}). Try again later.`,
      );
      loadState = {
        mode: "keeper_only",
        source: "empty",
        apiConfigured: true,
        apiOk: false,
        wordCount: 0,
        corpusVersion: null,
        message: active.notice,
        lastHydratedAt: new Date().toISOString(),
      };
    }
  }

  notify();
  return loadState;
}
