export type ContentSource = "historical_seed" | "keeper_approved";
export type CorpusMode = "demo_historical" | "keeper_only";

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
  authority: "colonial_record" | "living_speaker";
  elderApproved: boolean;
  isSacred: boolean;
  isPhrase: boolean;
  speakerAttribution: string;
  orthographyNote: string;
  seasonalUsage: string[];
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
