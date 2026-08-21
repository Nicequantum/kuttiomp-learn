export type ContentSource = "historical_seed" | "keeper_approved";
export type CorpusMode = "demo_historical" | "keeper_only";
export type ContentAuthority = "colonial_record" | "living_speaker";
export type ContentSensitivity = "everyday" | "careful" | "sensitive";
export type LearningModeId =
  | "little_ones"
  | "young_learner"
  | "core_adult"
  | "elder";

export type LexicalWord = {
  id: string;
  wordNarragansett: string;
  englishGloss: string;
  englishHistorical?: string;
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
  primaryAudioUrl?: string;
  speakerId?: string;
  category?: string;
  updatedAt?: string;
  /** Williams chapter sensitivity for mode filtering */
  sensitivity?: ContentSensitivity;
  /** Which learning modes may see this form in demo */
  modesAllowed?: LearningModeId[];
  /** Scholarly framing — not living orthography corrections */
  scholarlyNote?: string;
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

export type CorpusChapter = {
  num: number;
  title: string;
  domain: string;
  sensitivity: ContentSensitivity;
  count: number;
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
  chapters?: CorpusChapter[];
};

export type CorpusLoadState = {
  mode: CorpusMode;
  source: "seed" | "api" | "seed+api" | "empty";
  apiConfigured: boolean;
  apiOk: boolean | null;
  wordCount: number;
  corpusVersion: string | null;
  message: string;
  lastHydratedAt: string | null;
  apiReason?: string | null;
};
