import {
  getActiveBundle,
  getCorpusLoadState,
  hydrateCorpus,
  loadCorpus,
  subscribeCorpus,
} from "./load-corpus";
import { CONTENT_CORPUS, IS_DEMO_HISTORICAL } from "./config";
import type {
  CorpusChapter,
  LearningModeId,
  LearningPath,
  LexicalWord,
  MasteryStage,
} from "./types";
import { useModeStore } from "@/lib/mode/store";

export {
  getActiveBundle,
  getCorpusLoadState,
  hydrateCorpus,
  loadCorpus,
  subscribeCorpus,
};

function currentMode(): LearningModeId | null {
  try {
    return useModeStore.getState().mode;
  } catch {
    return null;
  }
}

function visibleWords(modeOverride?: LearningModeId | null): LexicalWord[] {
  const bundle = getActiveBundle();
  const mode = modeOverride === undefined ? currentMode() : modeOverride;

  if (CONTENT_CORPUS === "keeper_only") {
    return bundle.words.filter(
      (w) => w.source === "keeper_approved" && w.elderApproved && !w.isSacred,
    );
  }

  let list = bundle.words.filter(
    (w) => w.source === "historical_seed" || w.source === "keeper_approved",
  );

  if (mode === "little_ones" || mode === "young_learner") {
    list = list.filter((w) => {
      if (w.isSacred) return false;
      const sens = w.sensitivity ?? "everyday";
      if (sens === "sensitive") return false;
      if (w.modesAllowed && w.modesAllowed.length > 0) {
        return w.modesAllowed.includes(mode);
      }
      return true;
    });
  }

  return list;
}

export function getCorpusMeta() {
  const bundle = getActiveBundle();
  const state = getCorpusLoadState();
  return {
    corpus: CONTENT_CORPUS,
    isDemo: IS_DEMO_HISTORICAL,
    label: bundle.corpusLabel,
    notice: bundle.notice,
    sourceWork: bundle.sourceWork,
    loadSource: state.source,
    loadMessage: state.message,
    apiOk: state.apiOk,
    corpusVersion: state.corpusVersion,
    totalInSeed: bundle.words.length,
  };
}

export function getAllWords(): LexicalWord[] {
  return visibleWords();
}

export function getWordById(id: string): LexicalWord | undefined {
  const mode = currentMode();
  const fromVisible = visibleWords().find((w) => w.id === id);
  if (fromVisible) return fromVisible;
  if (mode === "core_adult" || mode === "elder" || !mode) {
    return getActiveBundle().words.find((w) => w.id === id);
  }
  return undefined;
}

export function searchWords(query: string): LexicalWord[] {
  const q = query.trim().toLowerCase();
  if (!q) return visibleWords();
  return visibleWords().filter(
    (w) =>
      w.wordNarragansett.toLowerCase().includes(q) ||
      w.englishGloss.toLowerCase().includes(q) ||
      w.chapter.toLowerCase().includes(q) ||
      w.semanticDomain.toLowerCase().includes(q),
  );
}

export function getWordsByDomain(domain: string): LexicalWord[] {
  return visibleWords().filter((w) => w.semanticDomain === domain);
}

export function getWordsByChapter(chapter: string): LexicalWord[] {
  return visibleWords().filter((w) => w.chapter === chapter);
}

export function getWordsByChapterNum(num: number): LexicalWord[] {
  return visibleWords().filter((w) => w.chapterNum === num);
}

export function getChapters(): CorpusChapter[] {
  const bundle = getActiveBundle();
  if (bundle.chapters?.length) {
    const counts = new Map<number, number>();
    for (const w of visibleWords()) {
      counts.set(w.chapterNum, (counts.get(w.chapterNum) ?? 0) + 1);
    }
    return bundle.chapters.map((c) => ({
      ...c,
      count: counts.get(c.num) ?? 0,
    }));
  }
  const map = new Map<number, CorpusChapter>();
  for (const w of visibleWords()) {
    const prev = map.get(w.chapterNum);
    if (prev) prev.count += 1;
    else
      map.set(w.chapterNum, {
        num: w.chapterNum,
        title: w.chapter,
        domain: w.semanticDomain,
        sensitivity: w.sensitivity ?? "everyday",
        count: 1,
      });
  }
  return [...map.values()].sort((a, b) => a.num - b.num);
}

export function getPaths(): LearningPath[] {
  const bundle = getActiveBundle();
  const words = new Set(visibleWords().map((w) => w.id));
  return bundle.paths
    .map((p) => ({
      ...p,
      wordIds: p.wordIds.filter((id) => words.has(id)),
    }))
    .filter((p) => p.wordIds.length > 0);
}

export function getPathById(id: string): LearningPath | undefined {
  return getPaths().find((p) => p.id === id);
}

export function getPathWords(path: LearningPath): LexicalWord[] {
  return path.wordIds
    .map((id) => getWordById(id))
    .filter((w): w is LexicalWord => Boolean(w));
}

export function getStages(): MasteryStage[] {
  return getActiveBundle().stages;
}

export function getStage(id: number): MasteryStage | undefined {
  return getActiveBundle().stages.find((s) => s.id === id);
}

export function getDomains(): { id: string; label: string; count: number }[] {
  const map = new Map<string, number>();
  for (const w of visibleWords()) {
    map.set(w.semanticDomain, (map.get(w.semanticDomain) ?? 0) + 1);
  }
  const labels: Record<string, string> = {
    kinship: "Family & people",
    food: "Food & sharing",
    flora: "Plants & land",
    fauna: "Animals",
    weather: "Weather & sky",
    water: "Water & sea",
    time: "Time & seasons",
    movement: "Travel",
    tools: "Tools & trade",
    governance: "Community",
    medicine: "Care",
    ceremony: "Ceremony",
    spiritual: "Spirit",
    color: "Color & paint",
    other: "Everyday",
  };
  return [...map.entries()]
    .map(([id, count]) => ({ id, label: labels[id] ?? id, count }))
    .sort((a, b) => b.count - a.count);
}

export function getFeaturedWords(limit = 6): LexicalWord[] {
  const preferredChapters = [
    "Salutation",
    "Eating and Entertainment",
    "Relations of Consanguinity",
    "House and Family",
    "Earth and Fruits",
    "Travel",
  ];
  const all = visibleWords();
  const picked: LexicalWord[] = [];
  for (const ch of preferredChapters) {
    for (const hit of all.filter((w) => w.chapter === ch)) {
      if (picked.length >= limit) break;
      if (!picked.some((x) => x.id === hit.id)) picked.push(hit);
    }
    if (picked.length >= limit) break;
  }
  for (const w of all) {
    if (picked.length >= limit) break;
    if (!picked.some((x) => x.id === w.id)) picked.push(w);
  }
  return picked.slice(0, limit);
}

export function getListenQueue(limit = 12): LexicalWord[] {
  const preferred = [
    "Salutation",
    "Eating and Entertainment",
    "Relations of Consanguinity",
    "House and Family",
    "Numbers",
    "Travel",
    "The Weather",
  ];
  const all = visibleWords();
  const ordered: LexicalWord[] = [];
  for (const ch of preferred) {
    for (const w of all.filter((x) => x.chapter === ch)) {
      if (!ordered.some((o) => o.id === w.id)) ordered.push(w);
    }
  }
  for (const w of all) {
    if (!ordered.some((o) => o.id === w.id)) ordered.push(w);
  }
  return ordered.slice(0, limit);
}
