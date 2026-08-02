/**
 * Wire types for Public Lexicon Contract v1.
 * @see docs/PUBLIC_LEXICON_CONTRACT.md
 */

export type PublicAudio = {
  url: string;
  contentType?: string;
  durationMs?: number;
  speakerName?: string;
};

/** Network DTO from GET /api/v1/public/lexicon */
export type PublicWord = {
  id: string;
  wordNarragansett: string;
  wordNormalized?: string;
  englishGloss: string;
  category?: string;
  semanticDomain: string;
  seasonalUsage?: string[];
  isPhrase?: boolean;
  orthographyNote?: string;
  speakerAttribution: string;
  speakerId?: string;
  speakerRole?: string;
  elderApproved: boolean;
  isSacred: boolean;
  source: "keeper_approved";
  authority: "living_speaker";
  primaryAudio?: PublicAudio | null;
  tags?: string[];
  updatedAt?: string;
};

export type PublicLexiconResponse = {
  corpusVersion: string;
  total: number;
  limit: number;
  offset: number;
  words: PublicWord[];
};

export type PublicHealthResponse = {
  ok: boolean;
  service?: string;
  corpusVersion?: string;
  wordCount?: number;
};

export type PublicPath = {
  id: string;
  title: string;
  description: string;
  stage: number;
  wordIds: string[];
  chapter?: string;
};

export type PublicPathsResponse = {
  paths: PublicPath[];
};
