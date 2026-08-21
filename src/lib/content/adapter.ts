/**
 * Maps Public Lexicon API rows → Learn LexicalWord / paths.
 * @see docs/PUBLIC_LEXICON_CONTRACT.md
 */

import type { PublicPath, PublicWord } from "./public-api";
import type { LearningPath, LexicalWord } from "./types";

const DOMAIN_CHAPTER: Record<string, { chapter: string; chapterNum: number }> =
  {
    kinship: { chapter: "Family & people", chapterNum: 1 },
    food: { chapter: "Food & sharing", chapterNum: 2 },
    flora: { chapter: "Plants & land", chapterNum: 3 },
    fauna: { chapter: "Animals", chapterNum: 4 },
    weather: { chapter: "Weather & sky", chapterNum: 5 },
    water: { chapter: "Water & sea", chapterNum: 6 },
    time: { chapter: "Time & seasons", chapterNum: 7 },
    movement: { chapter: "Travel", chapterNum: 8 },
    tools: { chapter: "Tools & trade", chapterNum: 9 },
    governance: { chapter: "Community", chapterNum: 10 },
    medicine: { chapter: "Care", chapterNum: 11 },
    ceremony: { chapter: "Ceremony", chapterNum: 12 },
    spiritual: { chapter: "Spirit", chapterNum: 13 },
    other: { chapter: "Everyday", chapterNum: 99 },
  };

/** Defensive: public API must never ship sacred; drop if misconfigured server. */
export function isPublishablePublicWord(w: PublicWord): boolean {
  if (!w?.id || !w.wordNarragansett?.trim() || !w.englishGloss?.trim()) {
    return false;
  }
  if (w.isSacred) return false;
  if (w.elderApproved === false) return false;
  if (w.source !== "keeper_approved") return false;
  return true;
}

export function publicWordToLexical(w: PublicWord): LexicalWord {
  const domain = (w.semanticDomain || "other").toLowerCase();
  const ch = DOMAIN_CHAPTER[domain] ?? DOMAIN_CHAPTER.other;
  const attribution =
    w.speakerAttribution?.trim() ||
    (w.speakerRole
      ? `Living speaker (${w.speakerRole})`
      : "Living speaker");

  return {
    id: w.id,
    wordNarragansett: w.wordNarragansett.trim(),
    englishGloss: w.englishGloss.trim(),
    chapter: ch.chapter,
    chapterNum: ch.chapterNum,
    semanticDomain: domain,
    source: "keeper_approved",
    sourceWork: "Knowledge Keepers — living corpus",
    authority: "living_speaker",
    elderApproved: true,
    isSacred: false,
    isPhrase: Boolean(
      w.isPhrase ||
        w.category === "phrase" ||
        w.category === "proverb" ||
        w.wordNarragansett.includes(" "),
    ),
    speakerAttribution: attribution,
    orthographyNote:
      w.orthographyNote?.trim() ||
      "Community orthography — living speakers hold authority.",
    seasonalUsage: w.seasonalUsage?.length
      ? w.seasonalUsage
      : ["year_round"],
    primaryAudioUrl: w.primaryAudio?.url || undefined,
    speakerId: w.speakerId,
    category: w.category,
    updatedAt: w.updatedAt,
  };
}

export function adaptPublicWords(words: PublicWord[]): LexicalWord[] {
  return words.filter(isPublishablePublicWord).map(publicWordToLexical);
}

export function publicPathToLearning(p: PublicPath): LearningPath {
  return {
    id: p.id,
    title: p.title,
    chapter: p.chapter || p.title,
    stage: p.stage ?? 1,
    description: p.description || "",
    wordIds: p.wordIds ?? [],
  };
}

/** Build simple domain paths when API has no /paths yet */
export function synthesizePathsFromWords(words: LexicalWord[]): LearningPath[] {
  const byDomain = new Map<string, LexicalWord[]>();
  for (const w of words) {
    const list = byDomain.get(w.semanticDomain) ?? [];
    list.push(w);
    byDomain.set(w.semanticDomain, list);
  }
  let stage = 1;
  return [...byDomain.entries()]
    .filter(([, list]) => list.length >= 2)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 12)
    .map(([domain, list]) => ({
      id: `domain-${domain}`,
      title: list[0]?.chapter || domain,
      chapter: list[0]?.chapter || domain,
      stage: stage++,
      description: `Living forms in ${domain}`,
      wordIds: list.map((w) => w.id),
    }));
}
