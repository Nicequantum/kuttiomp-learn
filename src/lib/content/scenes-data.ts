import type { LearningModeId } from "./types";

export type SubtitleTrack = "off" | "narragansett" | "english" | "both";
export type VideoStyle = "cinematic" | "cartoon";
export type SceneSensitivity = "everyday" | "careful" | "sensitive";

export type SceneLine = {
  id: string;
  speaker: string;
  narragansett: string;
  english: string;
  /** Seconds into video when this line is active */
  startSec: number;
  endSec: number;
  wordId?: string;
};

export type LearningScene = {
  id: string;
  title: string;
  summary: string;
  chapter: string;
  chapterNum: number;
  domain: string;
  sensitivity: SceneSensitivity;
  style: VideoStyle;
  /** Modes that may open this scene */
  modesAllowed: LearningModeId[];
  videoSrc: string;
  posterSrc: string;
  durationSec: number;
  lines: SceneLine[];
  reconstructionNote: string;
  tags: string[];
};

/**
 * Historical demo scenes — dialogue forms from Williams Key (modern English).
 * Videos are AI reconstructions for learning, not living ceremony.
 */
export const SCENES: LearningScene[] = [
  {
    id: "greeting-dawn",
    title: "Greeting at dawn",
    summary:
      "A respectful welcome outside the dwelling — how are you, I am well, my service to you.",
    chapter: "Salutation",
    chapterNum: 1,
    domain: "kinship",
    sensitivity: "everyday",
    style: "cinematic",
    modesAllowed: ["young_learner", "core_adult", "elder"],
    videoSrc: "/scenes/greeting-dawn.mp4",
    posterSrc: "/scenes/greeting-dawn.jpg",
    durationSec: 8,
    tags: ["greeting", "welcome", "hospitality"],
    reconstructionNote:
      "AI visual reconstruction for language learning. Dialogue forms from Williams 1643 (modern English). Not a living speaker recording or ceremonial reenactment.",
    lines: [
      {
        id: "g1",
        speaker: "Host",
        narragansett: "Ascowequassunnúmmis",
        english: "Good morning.",
        startSec: 0,
        endSec: 1.8,
      },
      {
        id: "g2",
        speaker: "Guest",
        narragansett: "Askuttaaquompsín",
        english: "How are you?",
        startSec: 1.8,
        endSec: 3.4,
      },
      {
        id: "g3",
        speaker: "Host",
        narragansett: "Asnpaumpmaúntam",
        english: "I am very well.",
        startSec: 3.4,
        endSec: 5.2,
      },
      {
        id: "g4",
        speaker: "Guest",
        narragansett: "Taubút paump maúntaman",
        english: "I am glad you are well.",
        startSec: 5.2,
        endSec: 6.8,
      },
      {
        id: "g5",
        speaker: "Host",
        narragansett: "Cowaúnckamish",
        english: "My respects to you.",
        startSec: 6.8,
        endSec: 8,
      },
    ],
  },
  {
    id: "greeting-kids",
    title: "Hello, friend (kids)",
    summary: "A gentle cartoon hello for Little Ones — short greetings only.",
    chapter: "Salutation",
    chapterNum: 1,
    domain: "kinship",
    sensitivity: "everyday",
    style: "cartoon",
    modesAllowed: ["little_ones", "young_learner", "core_adult", "elder"],
    videoSrc: "/scenes/greeting-kids.mp4",
    posterSrc: "/scenes/greeting-kids.jpg",
    durationSec: 6,
    tags: ["kids", "greeting", "cartoon"],
    reconstructionNote:
      "Cartoon-style reconstruction for young learners. Historical demo language only.",
    lines: [
      {
        id: "k1",
        speaker: "Friend",
        narragansett: "Ascowequassunnúmmis",
        english: "Good morning.",
        startSec: 0,
        endSec: 2,
      },
      {
        id: "k2",
        speaker: "Friend",
        narragansett: "Askuttaaquompsín",
        english: "How are you?",
        startSec: 2,
        endSec: 4,
      },
      {
        id: "k3",
        speaker: "Friend",
        narragansett: "Asnpaumpmaúntam",
        english: "I am very well.",
        startSec: 4,
        endSec: 6,
      },
    ],
  },
  {
    id: "meal-share",
    title: "Stay and eat",
    summary: "Hospitality at the fire — hunger, water, and sharing food.",
    chapter: "Eating and Entertainment",
    chapterNum: 2,
    domain: "food",
    sensitivity: "everyday",
    style: "cinematic",
    modesAllowed: ["young_learner", "core_adult", "elder"],
    videoSrc: "/scenes/meal-share.mp4",
    posterSrc: "/scenes/meal-share.jpg",
    durationSec: 8,
    tags: ["food", "hospitality"],
    reconstructionNote:
      "AI reconstruction of food-sharing hospitality. Williams-era forms with modern English.",
    lines: [
      {
        id: "m1",
        speaker: "Guest",
        narragansett: "Niccàwkatone",
        english: "I am thirsty.",
        startSec: 0,
        endSec: 1.6,
      },
      {
        id: "m2",
        speaker: "Host",
        narragansett: "Nip, or nipéwese",
        english: "Give me some water.",
        startSec: 1.6,
        endSec: 3.2,
      },
      {
        id: "m3",
        speaker: "Host",
        narragansett: "Namitch, commetesímmin",
        english: "Stay — you must eat first.",
        startSec: 3.2,
        endSec: 5.2,
      },
      {
        id: "m4",
        speaker: "Host",
        narragansett: "Téaquacumméich",
        english: "What will you eat?",
        startSec: 5.2,
        endSec: 6.6,
      },
      {
        id: "m5",
        speaker: "Guest",
        narragansett: "Aupúminea-nawsaùmp",
        english: "Parched meal boiled (soft corn porridge).",
        startSec: 6.6,
        endSec: 8,
      },
    ],
  },
  {
    id: "ask-path",
    title: "Show me the way",
    summary: "On the trail — asking directions with care.",
    chapter: "Travel",
    chapterNum: 11,
    domain: "movement",
    sensitivity: "everyday",
    style: "cinematic",
    modesAllowed: ["young_learner", "core_adult", "elder"],
    videoSrc: "/scenes/ask-path.mp4",
    posterSrc: "/scenes/ask-path.jpg",
    durationSec: 8,
    tags: ["travel", "path"],
    reconstructionNote:
      "Educational reconstruction. Forms from Williams Travel chapter; not a living oral map.",
    lines: [
      {
        id: "p1",
        speaker: "Traveler",
        narragansett: "Nnatotemúckaun",
        english: "I will ask the way.",
        startSec: 0,
        endSec: 2,
      },
      {
        id: "p2",
        speaker: "Traveler",
        narragansett: "Kunnatótemous",
        english: "I will inquire of you.",
        startSec: 2,
        endSec: 3.8,
      },
      {
        id: "p3",
        speaker: "Traveler",
        narragansett: "Kokotemíinnea méyi",
        english: "Show me the way.",
        startSec: 3.8,
        endSec: 5.6,
      },
      {
        id: "p4",
        speaker: "Guide",
        narragansett: "Mishimmáyagat",
        english: "A great path.",
        startSec: 5.6,
        endSec: 7,
      },
      {
        id: "p5",
        speaker: "Guide",
        narragansett: "Peemáyagât",
        english: "A short way.",
        startSec: 7,
        endSec: 8,
      },
    ],
  },
  {
    id: "weather-sky",
    title: "Reading the weather",
    summary: "Looking up — fair, cold, hot, and the wind.",
    chapter: "The Weather",
    chapterNum: 13,
    domain: "weather",
    sensitivity: "everyday",
    style: "cinematic",
    modesAllowed: ["little_ones", "young_learner", "core_adult", "elder"],
    videoSrc: "/scenes/weather-sky.mp4",
    posterSrc: "/scenes/weather-sky.jpg",
    durationSec: 8,
    tags: ["weather", "sky"],
    reconstructionNote:
      "Visual reconstruction for weather vocabulary. Historical demo forms.",
    lines: [
      {
        id: "w1",
        speaker: "Speaker",
        narragansett: "T Ocke tussinnámmin kéesuck",
        english: "What do you think of the weather?",
        startSec: 0,
        endSec: 2.2,
      },
      {
        id: "w2",
        speaker: "Speaker",
        narragansett: "Wekineaûquat",
        english: "Fair weather.",
        startSec: 2.2,
        endSec: 3.8,
      },
      {
        id: "w3",
        speaker: "Speaker",
        narragansett: "Tahkì or tátakki",
        english: "Cold weather.",
        startSec: 3.8,
        endSec: 5.4,
      },
      {
        id: "w4",
        speaker: "Speaker",
        narragansett: "Kussúttah",
        english: "It is hot.",
        startSec: 5.4,
        endSec: 6.6,
      },
      {
        id: "w5",
        speaker: "Speaker",
        narragansett: "W Aûpi",
        english: "The wind.",
        startSec: 6.6,
        endSec: 8,
      },
    ],
  },
  {
    id: "canoe-shore",
    title: "At the shore",
    summary: "Canoe and water — the sea road in motion.",
    chapter: "The Sea",
    chapterNum: 18,
    domain: "water",
    sensitivity: "everyday",
    style: "cinematic",
    modesAllowed: ["young_learner", "core_adult", "elder"],
    videoSrc: "/scenes/canoe-shore.mp4",
    posterSrc: "/scenes/canoe-shore.jpg",
    durationSec: 8,
    tags: ["water", "canoe", "sea"],
    reconstructionNote:
      "Shore and canoe reconstruction for water vocabulary. Demo historical seed.",
    lines: [
      {
        id: "c1",
        speaker: "Paddler",
        narragansett: "Nickquénum",
        english: "I am going.",
        startSec: 0,
        endSec: 2,
      },
      {
        id: "c2",
        speaker: "Paddler",
        narragansett: "Acâwmuck nóteshem",
        english: "I came over the water.",
        startSec: 2,
        endSec: 4.2,
      },
      {
        id: "c3",
        speaker: "Paddler",
        narragansett: "Nippâwus",
        english: "The sun.",
        startSec: 4.2,
        endSec: 5.8,
      },
      {
        id: "c4",
        speaker: "Paddler",
        narragansett: "W Aûpi",
        english: "The wind.",
        startSec: 5.8,
        endSec: 8,
      },
    ],
  },
  {
    id: "trade-shore",
    title: "Trade at the shore",
    summary: "Exchange and trust — learning market language with care.",
    chapter: "Buying and Selling",
    chapterNum: 25,
    domain: "tools",
    sensitivity: "careful",
    style: "cinematic",
    modesAllowed: ["core_adult", "elder"],
    videoSrc: "/scenes/trade-shore.mp4",
    posterSrc: "/scenes/trade-shore.jpg",
    durationSec: 8,
    tags: ["trade", "wampum", "market"],
    reconstructionNote:
      "Historical trade vocabulary scene for Adult/Elder paths. Colonial record — Keepers refine living terms.",
    lines: [
      {
        id: "t1",
        speaker: "Trader",
        narragansett: "Cowaúnckamish",
        english: "My respects to you.",
        startSec: 0,
        endSec: 1.8,
      },
      {
        id: "t2",
        speaker: "Trader",
        narragansett: "Téaquacumméich",
        english: "What will you have?",
        startSec: 1.8,
        endSec: 3.6,
      },
      {
        id: "t3",
        speaker: "Buyer",
        narragansett: "Taubút paump maúntaman",
        english: "I am glad (of this).",
        startSec: 3.6,
        endSec: 5.4,
      },
      {
        id: "t4",
        speaker: "Trader",
        narragansett: "Cummautaunchemókous",
        english: "I have finished my news.",
        startSec: 5.4,
        endSec: 7,
      },
      {
        id: "t5",
        speaker: "Both",
        narragansett: "Cowaúnckamish",
        english: "My respects to you.",
        startSec: 7,
        endSec: 8,
      },
    ],
  },
];

export function getAllScenes(): LearningScene[] {
  return SCENES;
}
