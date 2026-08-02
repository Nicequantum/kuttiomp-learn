export type ContentSource = "historical_seed" | "keeper_approved";
export type CorpusMode = "demo_historical" | "keeper_only";
export type ContentAuthority = "colonial_record" | "living_speaker";

export type LexicalWord = {
  id: string;
  wordNarragansett: string;
  englishGloss: string;
  englishHistorical?: string;
  /** Demo seed chapter label; production may mirror domain */
  chapter: string;
  chapterNum: number;
  semanticDomain: string;
  source: ContentSource;
  sourceWork: string;
  authority: ContentAuthority;
  elderApproved: boolean;
  isSacred: boolean;
  isPhrase: boolean;
  speakerAttribution: string;
  orthographyNote: string;
  seasonalUsage: string[];
  /** Living speaker recording when published from Keepers */
  primaryAudioUrl?: string;
  speakerId?: string;
  category?: string;
  updatedAt?: string;
};

export type LearningPath = {
  id: string;
  title: string;
  chapter: string;
  stage: number;
  description: string;
  wordIds: string[];
};

export type MasteryStage = {
  id: number;
  key: string;
  label: string;
  description: string;
};

export type CorpusBundle = {
  corpus: CorpusMode;
  corpusLabel: string;
  notice: string;
  sourceWork: {
    title: string;
    author: string;
    year: number;
    note: string;
  };
  words: LexicalWord[];
  paths: LearningPath[];
  stages: MasteryStage[];
};

/** Runtime load status for UI honesty */
export type CorpusLoadState = {
  mode: CorpusMode;
  source: "seed" | "api" | "seed+api" | "empty";
  apiConfigured: boolean;
  apiOk: boolean | null;
  wordCount: number;
  corpusVersion: string | null;
  message: string;
  lastHydratedAt: string | null;
};
