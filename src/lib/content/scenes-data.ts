import type { LearningModeId } from "./types";

export type SubtitleTrack = "off" | "narragansett" | "english" | "both";
export type VideoStyle = "cinematic" | "cartoon";
export type SceneSensitivity = "everyday" | "careful" | "sensitive";
export type MediaStatus = "ready" | "awaiting_upload";

export type SceneLine = {
  id: string;
  speaker: string;
  narragansett: string;
  english: string;
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
  modesAllowed: LearningModeId[];
  /** Default packaged reconstruction */
  videoSrc: string;
  posterSrc: string;
  /** Optional community/custom file: /scenes/uploads/{id}.mp4 */
  uploadSrc: string;
  durationSec: number;
  lines: SceneLine[];
  reconstructionNote: string;
  tags: string[];
  series?: string;
  mediaStatus?: MediaStatus;
};

const note =
  "AI visual reconstruction for language learning. Dialogue forms from Williams 1643 (modern English). Not a living speaker recording. Replace video files anytime via public/scenes/uploads — see docs/SCENES_UPLOAD.md.";

function scene(
  partial: Omit<LearningScene, "uploadSrc" | "reconstructionNote"> & {
    reconstructionNote?: string;
  },
): LearningScene {
  return {
    reconstructionNote: partial.reconstructionNote ?? note,
    uploadSrc: `/scenes/uploads/${partial.id}.mp4`,
    mediaStatus: partial.mediaStatus ?? "ready",
    ...partial,
  };
}

/**
 * Historical demo scenes — expand anytime; drop matching uploads/{id}.mp4 to override video.
 */
export const SCENES: LearningScene[] = [
  scene({
    id: "greeting-dawn",
    title: "Greeting at dawn",
    summary:
      "A respectful welcome outside the dwelling — how are you, I am well, my service to you.",
    chapter: "Salutation",
    chapterNum: 1,
    domain: "kinship",
    sensitivity: "everyday",
    style: "cinematic",
    series: "Daily life",
    modesAllowed: ["young_learner", "core_adult", "elder"],
    videoSrc: "/scenes/greeting-dawn.mp4",
    posterSrc: "/scenes/greeting-dawn.jpg",
    durationSec: 8,
    tags: ["greeting", "welcome", "hospitality"],
    lines: [
      { id: "g1", speaker: "Host", narragansett: "Ascowequassunnúmmis", english: "Good morning.", startSec: 0, endSec: 1.8 },
      { id: "g2", speaker: "Guest", narragansett: "Askuttaaquompsín", english: "How are you?", startSec: 1.8, endSec: 3.4 },
      { id: "g3", speaker: "Host", narragansett: "Asnpaumpmaúntam", english: "I am very well.", startSec: 3.4, endSec: 5.2 },
      { id: "g4", speaker: "Guest", narragansett: "Taubút paump maúntaman", english: "I am glad you are well.", startSec: 5.2, endSec: 6.8 },
      { id: "g5", speaker: "Host", narragansett: "Cowaúnckamish", english: "My respects to you.", startSec: 6.8, endSec: 8 },
    ],
  }),
  scene({
    id: "greeting-kids",
    title: "Hello, friend (kids)",
    summary: "A gentle cartoon hello for Little Ones — short greetings only.",
    chapter: "Salutation",
    chapterNum: 1,
    domain: "kinship",
    sensitivity: "everyday",
    style: "cartoon",
    series: "Little Ones",
    modesAllowed: ["little_ones", "young_learner", "core_adult", "elder"],
    videoSrc: "/scenes/greeting-kids.mp4",
    posterSrc: "/scenes/greeting-kids.jpg",
    durationSec: 6,
    tags: ["kids", "greeting", "cartoon"],
    lines: [
      { id: "k1", speaker: "Friend", narragansett: "Ascowequassunnúmmis", english: "Good morning.", startSec: 0, endSec: 2 },
      { id: "k2", speaker: "Friend", narragansett: "Askuttaaquompsín", english: "How are you?", startSec: 2, endSec: 4 },
      { id: "k3", speaker: "Friend", narragansett: "Asnpaumpmaúntam", english: "I am very well.", startSec: 4, endSec: 6 },
    ],
  }),
  scene({
    id: "meal-share",
    title: "Stay and eat",
    summary: "Hospitality at the fire — thirst, water, and sharing food.",
    chapter: "Eating and Entertainment",
    chapterNum: 2,
    domain: "food",
    sensitivity: "everyday",
    style: "cinematic",
    series: "Daily life",
    modesAllowed: ["young_learner", "core_adult", "elder"],
    videoSrc: "/scenes/meal-share.mp4",
    posterSrc: "/scenes/meal-share.jpg",
    durationSec: 8,
    tags: ["food", "hospitality"],
    lines: [
      { id: "m1", speaker: "Guest", narragansett: "Niccàwkatone", english: "I am thirsty.", startSec: 0, endSec: 1.6 },
      { id: "m2", speaker: "Host", narragansett: "Nip, or nipéwese", english: "Give me some water.", startSec: 1.6, endSec: 3.2 },
      { id: "m3", speaker: "Host", narragansett: "Namitch, commetesímmin", english: "Stay — you must eat first.", startSec: 3.2, endSec: 5.2 },
      { id: "m4", speaker: "Host", narragansett: "Téaquacumméich", english: "What will you eat?", startSec: 5.2, endSec: 6.6 },
      { id: "m5", speaker: "Guest", narragansett: "Aupúminea-nawsaùmp", english: "Parched meal boiled (soft corn porridge).", startSec: 6.6, endSec: 8 },
    ],
  }),
  scene({
    id: "meal-kids",
    title: "Share the bowl (kids)",
    summary: "Cartoon food-sharing for the youngest — short, warm lines.",
    chapter: "Eating and Entertainment",
    chapterNum: 2,
    domain: "food",
    sensitivity: "everyday",
    style: "cartoon",
    series: "Little Ones",
    modesAllowed: ["little_ones", "young_learner", "core_adult", "elder"],
    videoSrc: "/scenes/meal-kids.mp4",
    posterSrc: "/scenes/meal-kids.jpg",
    durationSec: 6,
    tags: ["kids", "food", "cartoon"],
    lines: [
      { id: "mk1", speaker: "Friend", narragansett: "Niccàwkatone", english: "I am thirsty.", startSec: 0, endSec: 2 },
      { id: "mk2", speaker: "Friend", narragansett: "Nip, or nipéwese", english: "Some water, please.", startSec: 2, endSec: 4 },
      { id: "mk3", speaker: "Friend", narragansett: "Namitch, commetesímmin", english: "Stay — eat first.", startSec: 4, endSec: 6 },
    ],
  }),
  scene({
    id: "home-fire",
    title: "Home by the fire",
    summary: "House and rest — wetu, sleep, welcome rest.",
    chapter: "House and Family",
    chapterNum: 6,
    domain: "kinship",
    sensitivity: "everyday",
    style: "cinematic",
    series: "Daily life",
    modesAllowed: ["little_ones", "young_learner", "core_adult", "elder"],
    videoSrc: "/scenes/home-fire.mp4",
    posterSrc: "/scenes/home-fire.jpg",
    durationSec: 8,
    tags: ["home", "family", "sleep"],
    lines: [
      { id: "h1", speaker: "Speaker", narragansett: "Wetu", english: "A house / dwelling.", startSec: 0, endSec: 1.8 },
      { id: "h2", speaker: "Speaker", narragansett: "Wetuômuck", english: "At home.", startSec: 1.8, endSec: 3.4 },
      { id: "h3", speaker: "Speaker", narragansett: "Nkàtaquaum", english: "I am sleepy.", startSec: 3.4, endSec: 5.2 },
      { id: "h4", speaker: "Speaker", narragansett: "Wunnégin, cówish", english: "Welcome — sleep here.", startSec: 5.2, endSec: 6.8 },
      { id: "h5", speaker: "Speaker", narragansett: "Nsowwushkâwmen", english: "I am weary.", startSec: 6.8, endSec: 8 },
    ],
  }),
  scene({
    id: "count-shells",
    title: "Counting shells",
    summary: "Numbers one through ten — hands and shells.",
    chapter: "Numbers",
    chapterNum: 4,
    domain: "time",
    sensitivity: "everyday",
    style: "cinematic",
    series: "Skills",
    modesAllowed: ["little_ones", "young_learner", "core_adult", "elder"],
    videoSrc: "/scenes/count-shells.mp4",
    posterSrc: "/scenes/count-shells.jpg",
    durationSec: 6,
    tags: ["numbers", "count"],
    lines: [
      { id: "n1", speaker: "Speaker", narragansett: "Nquít", english: "One.", startSec: 0, endSec: 1.2 },
      { id: "n2", speaker: "Speaker", narragansett: "Neèse", english: "Two.", startSec: 1.2, endSec: 2.2 },
      { id: "n3", speaker: "Speaker", narragansett: "Nìsh", english: "Three.", startSec: 2.2, endSec: 3.2 },
      { id: "n4", speaker: "Speaker", narragansett: "Yòh", english: "Four.", startSec: 3.2, endSec: 4.2 },
      { id: "n5", speaker: "Speaker", narragansett: "Napánna", english: "Five.", startSec: 4.2, endSec: 5.1 },
      { id: "n6", speaker: "Speaker", narragansett: "Piùck", english: "Ten.", startSec: 5.1, endSec: 6 },
    ],
  }),
  scene({
    id: "news-marsh",
    title: "News by the marsh",
    summary: "Discourse and news — tell me, I will tell you, I am finished.",
    chapter: "Discourse and News",
    chapterNum: 8,
    domain: "other",
    sensitivity: "everyday",
    style: "cinematic",
    series: "Daily life",
    modesAllowed: ["young_learner", "core_adult", "elder"],
    videoSrc: "/scenes/news-marsh.mp4",
    posterSrc: "/scenes/news-marsh.jpg",
    durationSec: 8,
    tags: ["news", "talk"],
    lines: [
      { id: "d1", speaker: "A", narragansett: "Aunchemokauhettíttea", english: "Let us talk / tell the news.", startSec: 0, endSec: 2 },
      { id: "d2", speaker: "A", narragansett: "Aaunchemókaw", english: "Tell me your news.", startSec: 2, endSec: 3.6 },
      { id: "d3", speaker: "B", narragansett: "Cuttaunchemókous", english: "I will tell you the news.", startSec: 3.6, endSec: 5.4 },
      { id: "d4", speaker: "B", narragansett: "Cummautaunchemókous", english: "I have finished my news.", startSec: 5.4, endSec: 7 },
      { id: "d5", speaker: "A", narragansett: "Taubút paump maúntaman", english: "I am glad (to hear it).", startSec: 7, endSec: 8 },
    ],
  }),
  scene({
    id: "ask-path",
    title: "Show me the way",
    summary: "On the trail — asking directions with care.",
    chapter: "Travel",
    chapterNum: 11,
    domain: "movement",
    sensitivity: "everyday",
    style: "cinematic",
    series: "Land & travel",
    modesAllowed: ["young_learner", "core_adult", "elder"],
    videoSrc: "/scenes/ask-path.mp4",
    posterSrc: "/scenes/ask-path.jpg",
    durationSec: 8,
    tags: ["travel", "path"],
    lines: [
      { id: "p1", speaker: "Traveler", narragansett: "Nnatotemúckaun", english: "I will ask the way.", startSec: 0, endSec: 2 },
      { id: "p2", speaker: "Traveler", narragansett: "Kunnatótemous", english: "I will inquire of you.", startSec: 2, endSec: 3.8 },
      { id: "p3", speaker: "Traveler", narragansett: "Kokotemíinnea méyi", english: "Show me the way.", startSec: 3.8, endSec: 5.6 },
      { id: "p4", speaker: "Guide", narragansett: "Mishimmáyagat", english: "A great path.", startSec: 5.6, endSec: 7 },
      { id: "p5", speaker: "Guide", narragansett: "Peemáyagât", english: "A short way.", startSec: 7, endSec: 8 },
    ],
  }),
  scene({
    id: "weather-sky",
    title: "Reading the weather",
    summary: "Looking up — fair, cold, hot, and the wind.",
    chapter: "The Weather",
    chapterNum: 13,
    domain: "weather",
    sensitivity: "everyday",
    style: "cinematic",
    series: "Sky & water",
    modesAllowed: ["little_ones", "young_learner", "core_adult", "elder"],
    videoSrc: "/scenes/weather-sky.mp4",
    posterSrc: "/scenes/weather-sky.jpg",
    durationSec: 8,
    tags: ["weather", "sky"],
    lines: [
      { id: "w1", speaker: "Speaker", narragansett: "T Ocke tussinnámmin kéesuck", english: "What do you think of the weather?", startSec: 0, endSec: 2.2 },
      { id: "w2", speaker: "Speaker", narragansett: "Wekineaûquat", english: "Fair weather.", startSec: 2.2, endSec: 3.8 },
      { id: "w3", speaker: "Speaker", narragansett: "Tahkì or tátakki", english: "Cold weather.", startSec: 3.8, endSec: 5.4 },
      { id: "w4", speaker: "Speaker", narragansett: "Kussúttah", english: "It is hot.", startSec: 5.4, endSec: 6.6 },
      { id: "w5", speaker: "Speaker", narragansett: "W Aûpi", english: "The wind.", startSec: 6.6, endSec: 8 },
    ],
  }),
  scene({
    id: "canoe-shore",
    title: "At the shore",
    summary: "Canoe and water — the sea road in motion.",
    chapter: "The Sea",
    chapterNum: 18,
    domain: "water",
    sensitivity: "everyday",
    style: "cinematic",
    series: "Sky & water",
    modesAllowed: ["young_learner", "core_adult", "elder"],
    videoSrc: "/scenes/canoe-shore.mp4",
    posterSrc: "/scenes/canoe-shore.jpg",
    durationSec: 8,
    tags: ["water", "canoe", "sea"],
    lines: [
      { id: "c1", speaker: "Paddler", narragansett: "Nickquénum", english: "I am going.", startSec: 0, endSec: 2 },
      { id: "c2", speaker: "Paddler", narragansett: "Acâwmuck nóteshem", english: "I came over the water.", startSec: 2, endSec: 4.2 },
      { id: "c3", speaker: "Paddler", narragansett: "Nippâwus", english: "The sun.", startSec: 4.2, endSec: 5.8 },
      { id: "c4", speaker: "Paddler", narragansett: "W Aûpi", english: "The wind.", startSec: 5.8, endSec: 8 },
    ],
  }),
  scene({
    id: "trade-shore",
    title: "Trade at the shore",
    summary: "Exchange and trust — market language with care.",
    chapter: "Buying and Selling",
    chapterNum: 25,
    domain: "tools",
    sensitivity: "careful",
    style: "cinematic",
    series: "Trade",
    modesAllowed: ["core_adult", "elder"],
    videoSrc: "/scenes/trade-shore.mp4",
    posterSrc: "/scenes/trade-shore.jpg",
    durationSec: 8,
    tags: ["trade", "wampum", "market"],
    lines: [
      { id: "t1", speaker: "Trader", narragansett: "Cowaúnckamish", english: "My respects to you.", startSec: 0, endSec: 1.8 },
      { id: "t2", speaker: "Trader", narragansett: "Téaquacumméich", english: "What will you have?", startSec: 1.8, endSec: 3.6 },
      { id: "t3", speaker: "Buyer", narragansett: "Taubút paump maúntaman", english: "I am glad (of this).", startSec: 3.6, endSec: 5.4 },
      { id: "t4", speaker: "Trader", narragansett: "Cummautaunchemókous", english: "I have finished my news.", startSec: 5.4, endSec: 7 },
      { id: "t5", speaker: "Both", narragansett: "Cowaúnckamish", english: "My respects to you.", startSec: 7, endSec: 8 },
    ],
  }),
  // Dialogue-ready slots — video optional until you upload
  scene({
    id: "earth-fruits",
    title: "Gifts of the earth",
    summary: "Land and fruits — soil, corn, and planting words (upload video anytime).",
    chapter: "Earth and Fruits",
    chapterNum: 16,
    domain: "flora",
    sensitivity: "everyday",
    style: "cinematic",
    series: "Land & travel",
    modesAllowed: ["young_learner", "core_adult", "elder"],
    videoSrc: "/scenes/weather-sky.mp4",
    posterSrc: "/scenes/weather-sky.jpg",
    durationSec: 8,
    mediaStatus: "awaiting_upload",
    tags: ["land", "plants", "upload-ready"],
    reconstructionNote:
      "Dialogue scaffold ready. Drop your video as public/scenes/uploads/earth-fruits.mp4 to replace the stand-in clip.",
    lines: [
      { id: "e1", speaker: "Speaker", narragansett: "Aúke, Aukeaseíu", english: "Downward; toward the earth.", startSec: 0, endSec: 2 },
      { id: "e2", speaker: "Speaker", narragansett: "Aupúmmineanash", english: "The parched corn.", startSec: 2, endSec: 4 },
      { id: "e3", speaker: "Speaker", narragansett: "Séquan", english: "Spring.", startSec: 4, endSec: 5.5 },
      { id: "e4", speaker: "Speaker", narragansett: "Aukeeteámitch", english: "Spring; seed-time.", startSec: 5.5, endSec: 8 },
    ],
  }),
  scene({
    id: "fish-water",
    title: "Fish and water",
    summary: "Fishing vocabulary scaffold — swap in your shore/fishing footage.",
    chapter: "Fish and Fishing",
    chapterNum: 19,
    domain: "water",
    sensitivity: "everyday",
    style: "cinematic",
    series: "Sky & water",
    modesAllowed: ["young_learner", "core_adult", "elder"],
    videoSrc: "/scenes/canoe-shore.mp4",
    posterSrc: "/scenes/canoe-shore.jpg",
    durationSec: 8,
    mediaStatus: "awaiting_upload",
    tags: ["fish", "water", "upload-ready"],
    reconstructionNote:
      "Dialogue ready. Upload public/scenes/uploads/fish-water.mp4 when you have the right footage.",
    lines: [
      { id: "f1", speaker: "Speaker", narragansett: "Ntauchâumen", english: "I go a fowling or hunting.", startSec: 0, endSec: 2.5 },
      { id: "f2", speaker: "Speaker", narragansett: "Nickquénum", english: "I am going.", startSec: 2.5, endSec: 4.5 },
      { id: "f3", speaker: "Speaker", narragansett: "W Aûpi", english: "The wind.", startSec: 4.5, endSec: 6.2 },
      { id: "f4", speaker: "Speaker", narragansett: "Nippâwus", english: "The sun.", startSec: 6.2, endSec: 8 },
    ],
  }),
];

export function getAllScenes(): LearningScene[] {
  return SCENES;
}
