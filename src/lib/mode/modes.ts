export type LearningMode =
  | "little_ones"
  | "young_learner"
  | "core_adult"
  | "elder";

export type ModeMeta = {
  id: LearningMode;
  label: string;
  shortLabel: string;
  tagline: string;
  description: string;
  who: string;
  navLabels: {
    home: string;
    scenes: string;
    listen: string;
    words: string;
    profile: string;
  };
  voiceFirst: boolean;
  largeTargets: boolean;
  showIpaDefault: boolean;
  showGlossImmediately: boolean;
};

export const MODES: Record<LearningMode, ModeMeta> = {
  little_ones: {
    id: "little_ones",
    label: "Little Ones",
    shortLabel: "Little Ones",
    tagline: "Gentle sounds for our youngest",
    description:
      "Large touch, audio first, short listens. Built for children learning with family — calm, clear, and warm.",
    who: "Toddlers and young children with a caregiver",
    navLabels: {
      home: "Home",
      scenes: "Watch",
      listen: "Hear",
      words: "Words",
      profile: "Me",
    },
    voiceFirst: true,
    largeTargets: true,
    showIpaDefault: false,
    showGlossImmediately: true,
  },
  young_learner: {
    id: "young_learner",
    label: "Young Learner",
    shortLabel: "Student",
    tagline: "Clear paths for growing speakers",
    description:
      "Guided paths through greetings, family, land, and daily speech — structured without pressure or points.",
    who: "Students and youth",
    navLabels: {
      home: "Home",
      scenes: "Scenes",
      listen: "Listen",
      words: "Words",
      profile: "Me",
    },
    voiceFirst: true,
    largeTargets: false,
    showIpaDefault: false,
    showGlossImmediately: true,
  },
  core_adult: {
    id: "core_adult",
    label: "Core Adult",
    shortLabel: "Adult",
    tagline: "Practical language for daily life",
    description:
      "Search, daily phrases, and paths for tribal members — useful, dignified, and ready for real conversation.",
    who: "Adults and tribal members",
    navLabels: {
      home: "Home",
      scenes: "Scenes",
      listen: "Listen",
      words: "Words",
      profile: "You",
    },
    voiceFirst: true,
    largeTargets: false,
    showIpaDefault: true,
    showGlossImmediately: false,
  },
  elder: {
    id: "elder",
    label: "Elder",
    shortLabel: "Elder",
    tagline: "Voice first, maximum clarity",
    description:
      "Large type, high contrast, one clear action at a time. Built for elders to listen, review, and share.",
    who: "Elders and high-accessibility needs",
    navLabels: {
      home: "Home",
      scenes: "Scenes",
      listen: "Listen",
      words: "Words",
      profile: "You",
    },
    voiceFirst: true,
    largeTargets: true,
    showIpaDefault: false,
    showGlossImmediately: true,
  },
};

export const MODE_LIST: LearningMode[] = [
  "little_ones",
  "young_learner",
  "core_adult",
  "elder",
];

export const DEFAULT_MODE: LearningMode = "core_adult";
