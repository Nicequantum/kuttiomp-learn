/**
 * Domain-based learning sessions built from the active corpus.
 * Works with Williams seed, mock living forms, and future public API.
 */

import { getAllWords, getPaths } from "./corpus";
import type { LearningPath, LexicalWord } from "./types";

export type DomainSession = LearningPath & {
  domain: string;
  kind: "seed_path" | "domain_session";
  livingCount: number;
  historicalCount: number;
};

const DOMAIN_META: Record<
  string,
  { title: string; description: string; stage: number }
> = {
  kinship: {
    title: "Family & people",
    description: "Greetings, relations, and how we speak to one another.",
    stage: 1,
  },
  food: {
    title: "Food & sharing",
    description: "Eating, hosting, and everyday nourishment.",
    stage: 2,
  },
  flora: {
    title: "Plants & land",
    description: "What grows on the land and how it is named.",
    stage: 2,
  },
  fauna: {
    title: "Animals",
    description: "Beings of land, water, and sky.",
    stage: 3,
  },
  weather: {
    title: "Weather & sky",
    description: "Sky, wind, and the changing day.",
    stage: 2,
  },
  water: {
    title: "Water & sea",
    description: "Rivers, tides, and living water.",
    stage: 2,
  },
  time: {
    title: "Time & seasons",
    description: "Day, night, and the year’s cycle.",
    stage: 3,
  },
  movement: {
    title: "Travel",
    description: "Going, coming, and paths between places.",
    stage: 3,
  },
  tools: {
    title: "Tools & making",
    description: "Things we make and use.",
    stage: 3,
  },
  geography: {
    title: "Land & place",
    description: "Earth, home ground, and place-names.",
    stage: 2,
  },
  governance: {
    title: "Community",
    description: "Gathering, leadership, and shared life.",
    stage: 4,
  },
  medicine: {
    title: "Care",
    description: "Healing and tending — with cultural care.",
    stage: 4,
  },
  ceremony: {
    title: "Ceremony (public only)",
    description: "Only public, non-sacred forms appear here.",
    stage: 5,
  },
  other: {
    title: "Everyday speech",
    description: "Useful forms for daily practice.",
    stage: 1,
  },
};

function counts(words: LexicalWord[]) {
  return {
    livingCount: words.filter((w) => w.source === "keeper_approved").length,
    historicalCount: words.filter((w) => w.source === "historical_seed").length,
  };
}

/** Seed-authored paths first, then domain sessions for remaining domains. */
export function getDomainSessions(minWords = 3): DomainSession[] {
  const all = getAllWords();
  const seedPaths = getPaths();

  const fromSeed: DomainSession[] = seedPaths.map((p) => {
    const words = p.wordIds
      .map((id) => all.find((w) => w.id === id))
      .filter((w): w is LexicalWord => Boolean(w));
    const c = counts(words);
    return {
      ...p,
      domain: words[0]?.semanticDomain || "other",
      kind: "seed_path",
      ...c,
    };
  });

  const coveredDomains = new Set(fromSeed.map((s) => s.domain));
  const byDomain = new Map<string, LexicalWord[]>();
  for (const w of all) {
    const list = byDomain.get(w.semanticDomain) ?? [];
    list.push(w);
    byDomain.set(w.semanticDomain, list);
  }

  const fromDomains: DomainSession[] = [...byDomain.entries()]
    .filter(([domain, list]) => list.length >= minWords && !coveredDomains.has(domain))
    .map(([domain, list]) => {
      const meta = DOMAIN_META[domain] ?? {
        title: domain,
        description: `Forms in ${domain}`,
        stage: 2,
      };
      const limited = list.slice(0, 12);
      const c = counts(limited);
      return {
        id: `session-${domain}`,
        title: meta.title,
        chapter: meta.title,
        stage: meta.stage,
        description: meta.description,
        wordIds: limited.map((w) => w.id),
        domain,
        kind: "domain_session" as const,
        ...c,
      };
    })
    .sort((a, b) => a.stage - b.stage || b.wordIds.length - a.wordIds.length);

  return [...fromSeed, ...fromDomains];
}

export function getSessionById(id: string): DomainSession | undefined {
  return getDomainSessions(1).find((s) => s.id === id);
}

export function getSessionWords(session: DomainSession): LexicalWord[] {
  const all = getAllWords();
  return session.wordIds
    .map((id) => all.find((w) => w.id === id))
    .filter((w): w is LexicalWord => Boolean(w));
}

/** Group sessions by stage for the paths index UI */
export function getSessionsByStage(): {
  stage: number;
  label: string;
  sessions: DomainSession[];
}[] {
  const sessions = getDomainSessions();
  const stageLabels: Record<number, string> = {
    1: "Begin here",
    2: "Daily life & land",
    3: "Wider world",
    4: "Community care",
    5: "Special topics",
  };
  const map = new Map<number, DomainSession[]>();
  for (const s of sessions) {
    const list = map.get(s.stage) ?? [];
    list.push(s);
    map.set(s.stage, list);
  }
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([stage, list]) => ({
      stage,
      label: stageLabels[stage] ?? `Stage ${stage}`,
      sessions: list,
    }));
}
