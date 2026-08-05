import type { LearningModeId } from "./types";

export type SubtitleTrack = "off" | "narragansett" | "english" | "both";
/** Spoken track during scene play — Narragansett is always the default. */
export type VoiceTrack = "narragansett" | "english" | "both" | "off";
export type VideoStyle = "cinematic" | "cartoon";
export type SceneSensitivity = "everyday" | "careful" | "sensitive";
export type MediaStatus = "ready" | "awaiting_upload";
/** learn = line-paced with TTS (default); watch = continuous video timeline */
export type PlayMode = "learn" | "watch";

export type SceneLine = {
  id: string;
  /** Prefer Host / Guest / Both (Friend allowed for little-ones cartoon scenes). */
  speaker: string;
  narragansett: string;
  english: string;
  startSec: number;
  endSec: number;
  /** Optional link into demo Williams lexicon word id */
  wordId?: string;
  /**
   * Packaged oral audio (language-first). Path under public/.
   * When set, player plays this before live TTS / browser speech.
   */
  audioSrc?: string;
};

/**
 * Optional window into a longer master film (Film V5 Full Day acts).
 * When set, ScenePlayer seeks/plays only [startSec, endSec) of videoSrc.
 */
export type MediaWindow = {
  startSec: number;
  endSec: number;
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
  /**
   * Learn-mode practice window (seconds). May exceed packaged clip length;
   * Watch mode uses real media duration from the video element.
   */
  durationSec: number;
  lines: SceneLine[];
  reconstructionNote: string;
  tags: string[];
  series?: string;
  mediaStatus?: MediaStatus;
  /** Suggested learning order within a mode (lower first) */
  pathOrder?: number;
  /**
   * When set, videoSrc is a longer master film and this scene plays only
   * the [startSec, endSec) window (Film V5 Full Day acts).
   */
  mediaWindow?: MediaWindow;
};

const note =
  "AI visual reconstruction for language learning. Dialogue forms from Williams 1643 (modern English). Not a living speaker recording. Audio for the language is synthesized for practice until living speaker recordings replace it. Drop your own video anytime via public/scenes/uploads — see docs/SCENES_UPLOAD.md.";

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

/** Space lines evenly across a target duration (for learn + watch pacing). */
function timed(
  lines: Omit<SceneLine, "startSec" | "endSec">[],
  totalSec: number,
): SceneLine[] {
  const n = lines.length;
  if (n === 0) return [];
  const slot = totalSec / n;
  return lines.map((l, i) => ({
    ...l,
    startSec: Math.round(i * slot * 100) / 100,
    endSec: Math.round(Math.min(totalSec, (i + 1) * slot) * 100) / 100,
  }));
}

/**
 * Historical demo scenes — expand anytime; drop matching uploads/{id}.mp4 to override video.
 * Forms stay Williams 1643 with modern English glosses; living Keepers replace later.
 * Timings target ~24–36s of practice context (learn mode + longer multi-shot video where available).
 */
export const SCENES: LearningScene[] = [
  // ——— Salutation ———
  scene({
    id: "greeting-dawn",
    title: "Greeting at dawn",
    summary:
      "A respectful welcome outside the dwelling — morning greeting, well-being, and respects.",
    chapter: "Salutation",
    chapterNum: 1,
    domain: "kinship",
    sensitivity: "everyday",
    style: "cinematic",
    series: "Daily life",
    pathOrder: 10,
    modesAllowed: ["young_learner", "core_adult", "elder"],
    videoSrc: "/scenes/greeting-dawn.mp4",
    posterSrc: "/scenes/greeting-dawn.jpg",
    durationSec: 28,
    tags: ["greeting", "welcome", "hospitality"],
    lines: timed(
      [
        { id: "g1", speaker: "Host", narragansett: "Ascowequassunnúmmis", english: "Good morning." },
        { id: "g2", speaker: "Guest", narragansett: "Askuttaaquompsín", english: "How are you?" },
        { id: "g3", speaker: "Host", narragansett: "Asnpaumpmaúntam", english: "I am very well." },
        { id: "g4", speaker: "Guest", narragansett: "Taubút paump maúntaman", english: "I am glad you are well." },
        { id: "g5", speaker: "Host", narragansett: "Cowaúnckamish", english: "My respects to you." },
        { id: "g6", speaker: "Guest", narragansett: "Cowaúnckamish", english: "My respects to you." },
        { id: "g7", speaker: "Host", narragansett: "Asco wequássin", english: "Good evening. (evening form of greeting)" },
        { id: "g8", speaker: "Guest", narragansett: "Taubotneanawáyean", english: "I thank you." },
      ],
      28,
    ),
  }),
  scene({
    id: "greeting-kids",
    title: "Hello, friend (kids)",
    summary: "HQ shot-per-line hello — same two friends, cinematic storybook, each greeting acted.",
    chapter: "Salutation",
    chapterNum: 1,
    domain: "kinship",
    sensitivity: "everyday",
    style: "cinematic",
    series: "Little Ones",
    pathOrder: 1,
    modesAllowed: ["little_ones", "young_learner", "core_adult", "elder"],
    videoSrc: "/scenes/greeting-kids.mp4",
    posterSrc: "/scenes/greeting-kids.jpg",
    durationSec: 30,
    tags: ["kids", "hq", "greeting", "cartoon"],
    lines: timed(
      [
        { id: "k1", speaker: "Friend", narragansett: "Ascowequassunnúmmis", english: "Good morning." },
        { id: "k2", speaker: "Friend", narragansett: "Askuttaaquompsín", english: "How are you?" },
        { id: "k3", speaker: "Friend", narragansett: "Asnpaumpmaúntam", english: "I am very well." },
        { id: "k4", speaker: "Friend", narragansett: "Cowaúnckamish", english: "My respects to you." },
        { id: "k5", speaker: "Friend", narragansett: "Taubotneanawáyean", english: "I thank you." },
      ],
      30,
    ),
  }),

  // ——— Eating ———
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
    pathOrder: 20,
    modesAllowed: ["young_learner", "core_adult", "elder"],
    videoSrc: "/scenes/meal-share.mp4",
    posterSrc: "/scenes/meal-share.jpg",
    durationSec: 28,
    tags: ["food", "hospitality"],
    lines: timed(
      [
        { id: "m1", speaker: "Guest", narragansett: "Niccàwkatone", english: "I am thirsty." },
        { id: "m2", speaker: "Host", narragansett: "Nip, or nipéwese", english: "Some water." },
        { id: "m3", speaker: "Host", narragansett: "Namitch, commetesímmin", english: "Stay — you must eat first." },
        { id: "m4", speaker: "Host", narragansett: "Téaquacumméich", english: "What will you eat?" },
        { id: "m5", speaker: "Guest", narragansett: "Aupúminea-nawsaùmp", english: "Parched meal boiled (soft corn porridge)." },
        { id: "m6", speaker: "Host", narragansett: "Wunnégin", english: "Welcome." },
        { id: "m7", speaker: "Guest", narragansett: "Taubotneanawáyean", english: "I thank you." },
        { id: "m8", speaker: "Host", narragansett: "Cowaúnckamish", english: "My respects to you." },
      ],
      28,
    ),
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
    pathOrder: 2,
    modesAllowed: ["little_ones", "young_learner", "core_adult", "elder"],
    videoSrc: "/scenes/meal-kids.mp4",
    posterSrc: "/scenes/meal-kids.jpg",
    durationSec: 18,
    tags: ["kids", "food", "cartoon"],
    lines: timed(
      [
        { id: "mk1", speaker: "Friend", narragansett: "Niccàwkatone", english: "I am thirsty." },
        { id: "mk2", speaker: "Friend", narragansett: "Nip, or nipéwese", english: "Some water, please." },
        { id: "mk3", speaker: "Friend", narragansett: "Namitch, commetesímmin", english: "Stay — eat first." },
        { id: "mk4", speaker: "Friend", narragansett: "Téaquacumméich", english: "What will you eat?" },
        { id: "mk5", speaker: "Friend", narragansett: "Taubotneanawáyean", english: "I thank you." },
      ],
      20,
    ),
  }),

  // ——— Sleep & lodging ———
  scene({
    id: "sleep-lodge",
    title: "Rest for the night",
    summary: "Sleep and lodging — welcome rest, mats, wood on the fire.",
    chapter: "Sleep and Lodging",
    chapterNum: 3,
    domain: "kinship",
    sensitivity: "everyday",
    style: "cinematic",
    series: "Daily life",
    pathOrder: 25,
    modesAllowed: ["young_learner", "core_adult", "elder"],
    videoSrc: "/scenes/sleep-lodge.mp4",
    posterSrc: "/scenes/sleep-lodge.jpg",
    durationSec: 28,
    tags: ["sleep", "home", "lodge"],
    lines: timed(
      [
        { id: "sl1", speaker: "Guest", narragansett: "Yo nickowémen?", english: "Shall I sleep here?", wordId: "rw-03-yo-nickow-men" },
        { id: "sl2", speaker: "Host", narragansett: "Wunnégin, cówish", english: "Welcome — sleep here.", wordId: "rw-03-wunn-gin-c-wish" },
        { id: "sl3", speaker: "Host", narragansett: "Wuddtúckqunash, ponamáuta", english: "Let us lay on wood.", wordId: "rw-03-wuddt-ckqunash-ponam-uta" },
        { id: "sl4", speaker: "Guest", narragansett: "Nkàtaquaum", english: "I am sleepy.", wordId: "rw-03-nk-taquaum" },
        { id: "sl5", speaker: "Host", narragansett: "Cowwêtuck", english: "Let us sleep.", wordId: "rw-03-coww-tuck" },
        { id: "sl6", speaker: "Host", narragansett: "Mattannauke", english: "Fine mats to sleep on.", wordId: "rw-03-mattannauke-or" },
        { id: "sl7", speaker: "Guest", narragansett: "Cowwêwi", english: "He is asleep.", wordId: "rw-03-coww-wi" },
        { id: "sl8", speaker: "Host", narragansett: "Tokêtuck", english: "Let us wake.", wordId: "rw-03-tok-tuck" },
      ],
      28,
    ),
  }),

  // ——— Numbers ———
  scene({
    id: "count-shells",
    title: "Counting shells",
    summary: "Numbers one through ten — hands and shells along the shore.",
    chapter: "Numbers",
    chapterNum: 4,
    domain: "time",
    sensitivity: "everyday",
    style: "cinematic",
    series: "Skills",
    pathOrder: 30,
    modesAllowed: ["young_learner", "core_adult", "elder"],
    videoSrc: "/scenes/count-shells.mp4",
    posterSrc: "/scenes/count-shells.jpg",
    durationSec: 30,
    tags: ["numbers", "count"],
    lines: timed(
      [
        { id: "n1", speaker: "Host", narragansett: "Nquít", english: "One." },
        { id: "n2", speaker: "Host", narragansett: "Neèse", english: "Two." },
        { id: "n3", speaker: "Host", narragansett: "Nìsh", english: "Three." },
        { id: "n4", speaker: "Host", narragansett: "Yòh", english: "Four." },
        { id: "n5", speaker: "Host", narragansett: "Napánna", english: "Five." },
        { id: "n6", speaker: "Host", narragansett: "Qútta", english: "Six." },
        { id: "n7", speaker: "Host", narragansett: "Énada", english: "Seven." },
        { id: "n8", speaker: "Host", narragansett: "Shwósuck", english: "Eight." },
        { id: "n9", speaker: "Host", narragansett: "Paskúgit", english: "Nine." },
        { id: "n10", speaker: "Host", narragansett: "Piùck", english: "Ten." },
      ],
      30,
    ),
  }),

  // ——— Kin ———
  scene({
    id: "family-kin",
    title: "Our family",
    summary: "Kinship words — father, mother, child, elders of the family.",
    chapter: "Relations of Consanguinity",
    chapterNum: 5,
    domain: "kinship",
    sensitivity: "everyday",
    style: "cinematic",
    series: "Daily life",
    pathOrder: 35,
    modesAllowed: ["young_learner", "core_adult", "elder"],
    videoSrc: "/scenes/family-kin.mp4",
    posterSrc: "/scenes/family-kin.jpg",
    durationSec: 28,
    tags: ["family", "kin", "people"],
    lines: timed(
      [
        { id: "fk1", speaker: "Host", narragansett: "Nósh", english: "My father.", wordId: "rw-05-n-sh" },
        { id: "fk2", speaker: "Host", narragansett: "Cŏsh", english: "Your father.", wordId: "rw-05-c-sh" },
        { id: "fk3", speaker: "Host", narragansett: "Okásu", english: "A mother.", wordId: "rw-05-ok-su" },
        { id: "fk4", speaker: "Host", narragansett: "Nókace, níchwhaw", english: "My mother.", wordId: "rw-05-n-kace-n-chwhaw" },
        { id: "fk5", speaker: "Host", narragansett: "Nippápoos", english: "My child." },
        { id: "fk6", speaker: "Host", narragansett: "Hômes", english: "An old man (elder).", wordId: "rw-05-h-mes" },
        { id: "fk7", speaker: "Host", narragansett: "Wénise", english: "An old woman (elder).", wordId: "rw-05-w-nise" },
        { id: "fk8", speaker: "Host", narragansett: "Kichize", english: "An old man.", wordId: "rw-05-kichize" },
      ],
      28,
    ),
  }),

  // ——— House ———
  scene({
    id: "home-fire",
    title: "Home by the fire",
    summary: "House and rest — wetu, at home, sleep, welcome rest.",
    chapter: "House and Family",
    chapterNum: 6,
    domain: "kinship",
    sensitivity: "everyday",
    style: "cinematic",
    series: "Daily life",
    pathOrder: 40,
    modesAllowed: ["young_learner", "core_adult", "elder"],
    videoSrc: "/scenes/home-fire.mp4",
    posterSrc: "/scenes/home-fire.jpg",
    durationSec: 28,
    tags: ["home", "family", "sleep"],
    lines: timed(
      [
        { id: "h1", speaker: "Host", narragansett: "Wetu", english: "A house / dwelling." },
        { id: "h2", speaker: "Host", narragansett: "Wetuômuck", english: "At home." },
        { id: "h3", speaker: "Host", narragansett: "Nkàtaquaum", english: "I am sleepy." },
        { id: "h4", speaker: "Host", narragansett: "Wunnégin, cówish", english: "Welcome — sleep here." },
        { id: "h5", speaker: "Host", narragansett: "Nsowwushkâwmen", english: "I am weary." },
        { id: "h6", speaker: "Host", narragansett: "Cowwêtuck", english: "Let us sleep." },
        { id: "h7", speaker: "Host", narragansett: "Wuddtúckqunash, ponamáuta", english: "Let us lay on wood." },
        { id: "h8", speaker: "Host", narragansett: "Wunnégin", english: "Welcome." },
      ],
      28,
    ),
  }),

  // ——— Discourse ———
  scene({
    id: "news-marsh",
    title: "News by the marsh",
    summary: "Discourse and news — let us talk, tell me, I will tell you, I am finished.",
    chapter: "Discourse and News",
    chapterNum: 8,
    domain: "other",
    sensitivity: "everyday",
    style: "cinematic",
    series: "Daily life",
    pathOrder: 50,
    modesAllowed: ["young_learner", "core_adult", "elder"],
    videoSrc: "/scenes/news-marsh.mp4",
    posterSrc: "/scenes/news-marsh.jpg",
    durationSec: 28,
    tags: ["news", "talk"],
    lines: timed(
      [
        { id: "d1", speaker: "Host", narragansett: "Aunchemokauhettíttea", english: "Let us talk / tell the news." },
        { id: "d2", speaker: "Host", narragansett: "Aaunchemókaw", english: "Tell me your news." },
        { id: "d3", speaker: "Guest", narragansett: "Cuttaunchemókous", english: "I will tell you the news." },
        { id: "d4", speaker: "Guest", narragansett: "Cummautaunchemókous", english: "I have finished my news." },
        { id: "d5", speaker: "Host", narragansett: "Taubút paump maúntaman", english: "I am glad (to hear it)." },
        { id: "d6", speaker: "Guest", narragansett: "Cowaúnckamish", english: "My respects to you." },
        { id: "d7", speaker: "Host", narragansett: "Taubotneanawáyean", english: "I thank you." },
        { id: "d8", speaker: "Guest", narragansett: "Wunnégin", english: "Welcome." },
      ],
      28,
    ),
  }),

  // ——— Time of day ———
  scene({
    id: "day-hours",
    title: "Hours of the day",
    summary: "From sunrise to dark night — telling time by the sun.",
    chapter: "Time of the Day",
    chapterNum: 9,
    domain: "time",
    sensitivity: "everyday",
    style: "cinematic",
    series: "Sky & water",
    pathOrder: 55,
    modesAllowed: ["young_learner", "core_adult", "elder"],
    videoSrc: "/scenes/day-hours.mp4",
    posterSrc: "/scenes/day-hours.jpg",
    durationSec: 28,
    tags: ["time", "sun", "day"],
    lines: timed(
      [
        { id: "dh1", speaker: "Host", narragansett: "Páshisha", english: "It is sunrise.", wordId: "rw-09-p-shisha" },
        { id: "dh2", speaker: "Host", narragansett: "Mautàbon, Chicháuquat wompan", english: "It is day.", wordId: "rw-09-maut-bon-chich-uquat-wompan" },
        { id: "dh3", speaker: "Host", narragansett: "Nummáttaqúaw", english: "Morning (before noon).", wordId: "rw-09-numm-ttaq-aw" },
        { id: "dh4", speaker: "Host", narragansett: "Páweshaquaw", english: "Noon.", wordId: "rw-09-p-weshaquaw" },
        { id: "dh5", speaker: "Host", narragansett: "Nawwâuwqaw", english: "Afternoon.", wordId: "rw-09-naww-uwqaw" },
        { id: "dh6", speaker: "Host", narragansett: "Yahen wàiyàuw", english: "Almost sunset.", wordId: "rw-09-yahen-w-iy-uw" },
        { id: "dh7", speaker: "Host", narragansett: "Wayaàwi", english: "The sun is set.", wordId: "rw-09-waya-wi" },
        { id: "dh8", speaker: "Host", narragansett: "Póppakunnetch, auchaugotch", english: "Dark night.", wordId: "rw-09-p-ppakunnetch-auchaugotch" },
      ],
      28,
    ),
  }),

  // ——— Seasons ———
  scene({
    id: "seasons-year",
    title: "Through the year",
    summary: "Spring, summer, harvest, winter — the year's turning.",
    chapter: "Seasons of the Year",
    chapterNum: 10,
    domain: "time",
    sensitivity: "everyday",
    style: "cinematic",
    series: "Sky & water",
    pathOrder: 60,
    modesAllowed: ["young_learner", "core_adult", "elder"],
    videoSrc: "/scenes/seasons-year.mp4",
    posterSrc: "/scenes/seasons-year.jpg",
    durationSec: 28,
    tags: ["seasons", "year"],
    lines: timed(
      [
        { id: "sy1", speaker: "Host", narragansett: "Séquan", english: "Spring.", wordId: "rw-10-s-quan" },
        { id: "sy2", speaker: "Host", narragansett: "Aukeeteámitch", english: "Spring — seed-time.", wordId: "rw-10-aukeete-mitch" },
        { id: "sy3", speaker: "Host", narragansett: "Néepun", english: "Summer.", wordId: "rw-10-n-epun-quaq-squan" },
        { id: "sy4", speaker: "Host", narragansett: "Taquònck", english: "Fall / autumn.", wordId: "rw-10-taqu-nck" },
        { id: "sy5", speaker: "Host", narragansett: "Papóne", english: "Winter.", wordId: "rw-10-pap-ne" },
        { id: "sy6", speaker: "Host", narragansett: "Yo neepúnnacup", english: "This summer last.", wordId: "rw-10-yo-neep-nnacup" },
        { id: "sy7", speaker: "Host", narragansett: "Yò taquónticup", english: "This harvest last.", wordId: "rw-10-y-taqu-nticup" },
        { id: "sy8", speaker: "Host", narragansett: "Yaûnedg", english: "The last year.", wordId: "rw-10-ya-nedg" },
      ],
      28,
    ),
  }),
  scene({
    id: "seasons-kids",
    title: "Four seasons (kids)",
    summary: "A soft cartoon walk through spring, summer, fall, and winter.",
    chapter: "Seasons of the Year",
    chapterNum: 10,
    domain: "time",
    sensitivity: "everyday",
    style: "cartoon",
    series: "Little Ones",
    pathOrder: 7,
    modesAllowed: ["little_ones", "young_learner", "core_adult", "elder"],
    videoSrc: "/scenes/seasons-kids.mp4",
    posterSrc: "/scenes/seasons-kids.jpg",
    durationSec: 18,
    tags: ["kids", "seasons", "cartoon"],
    lines: timed(
      [
        { id: "sk1", speaker: "Friend", narragansett: "Séquan", english: "Spring." },
        { id: "sk2", speaker: "Friend", narragansett: "Néepun", english: "Summer." },
        { id: "sk3", speaker: "Friend", narragansett: "Taquònck", english: "Fall." },
        { id: "sk4", speaker: "Friend", narragansett: "Papóne", english: "Winter." },
        { id: "sk5", speaker: "Friend", narragansett: "Aukeeteámitch", english: "Seed-time." },
      ],
      20,
    ),
  }),

  // ——— Travel ———
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
    pathOrder: 70,
    modesAllowed: ["young_learner", "core_adult", "elder"],
    videoSrc: "/scenes/ask-path.mp4",
    posterSrc: "/scenes/ask-path.jpg",
    durationSec: 28,
    tags: ["travel", "path"],
    lines: timed(
      [
        { id: "p1", speaker: "Host", narragansett: "Nnatotemúckaun", english: "I will ask the way." },
        { id: "p2", speaker: "Host", narragansett: "Kunnatótemous", english: "I will inquire of you." },
        { id: "p3", speaker: "Host", narragansett: "Kokotemíinnea méyi", english: "Show me the way." },
        { id: "p4", speaker: "Guest", narragansett: "Mishimmáyagat", english: "A great path." },
        { id: "p5", speaker: "Guest", narragansett: "Peemáyagât", english: "A short way." },
        { id: "p6", speaker: "Host", narragansett: "Taubotneanawáyean", english: "I thank you." },
        { id: "p7", speaker: "Guest", narragansett: "Cowaúnckamish", english: "My respects to you." },
        { id: "p8", speaker: "Host", narragansett: "Nickquénum", english: "I am going." },
      ],
      28,
    ),
  }),

  // ——— Heavenly lights ———
  scene({
    id: "sky-moon",
    title: "Moon and stars",
    summary: "Heavenly lights — sun, moon, stars over the coast.",
    chapter: "The Heavenly Lights",
    chapterNum: 12,
    domain: "weather",
    sensitivity: "everyday",
    style: "cinematic",
    series: "Sky & water",
    pathOrder: 75,
    modesAllowed: ["young_learner", "core_adult", "elder"],
    videoSrc: "/scenes/sky-moon.mp4",
    posterSrc: "/scenes/sky-moon.jpg",
    durationSec: 28,
    tags: ["moon", "stars", "sky"],
    lines: timed(
      [
        { id: "sm1", speaker: "Host", narragansett: "Kéesuck", english: "The heavens.", wordId: "rw-12-k-esuck" },
        { id: "sm2", speaker: "Host", narragansett: "Nippâwus", english: "The sun.", wordId: "rw-12-nipp-wus" },
        { id: "sm3", speaker: "Host", narragansett: "Nanepaùshat", english: "The moon.", wordId: "rw-12-nanepa-shat-and" },
        { id: "sm4", speaker: "Host", narragansett: "Yò Ockquitteunk", english: "A new moon.", wordId: "rw-12-y-ockquitteunk" },
        { id: "sm5", speaker: "Host", narragansett: "Yo wompanámmit", english: "Half moon.", wordId: "rw-12-yo-wompan-mmit" },
        { id: "sm6", speaker: "Host", narragansett: "Anóckqus, anócksuck", english: "A star, stars.", wordId: "rw-12-an-ckqus-an-cksuck" },
        { id: "sm7", speaker: "Host", narragansett: "Mishánnock", english: "The morning star.", wordId: "rw-12-mish-nnock" },
        { id: "sm8", speaker: "Host", narragansett: "Pashpíshea", english: "The moon is up.", wordId: "rw-12-pashp-shea" },
      ],
      28,
    ),
  }),

  // ——— Weather ———
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
    pathOrder: 80,
    modesAllowed: ["young_learner", "core_adult", "elder"],
    videoSrc: "/scenes/weather-sky.mp4",
    posterSrc: "/scenes/weather-sky.jpg",
    durationSec: 28,
    tags: ["weather", "sky"],
    lines: timed(
      [
        { id: "w1", speaker: "Host", narragansett: "T Ocke tussinnámmin kéesuck", english: "What do you think of the weather?" },
        { id: "w2", speaker: "Host", narragansett: "Wekineaûquat", english: "Fair weather." },
        { id: "w3", speaker: "Host", narragansett: "Tahkì or tátakki", english: "Cold weather." },
        { id: "w4", speaker: "Host", narragansett: "Kussúttah", english: "It is hot." },
        { id: "w5", speaker: "Host", narragansett: "W Aûpi", english: "The wind." },
        { id: "w6", speaker: "Host", narragansett: "Wunnágehan", english: "Fair wind." },
        { id: "w7", speaker: "Host", narragansett: "Sáchimoachepewéssin", english: "A strong northeast wind." },
        { id: "w8", speaker: "Host", narragansett: "Nqénowhick wouttín", english: "I stay for a wind." },
      ],
      28,
    ),
  }),

  // ——— Winds ———
  scene({
    id: "wind-rise",
    title: "Reading the winds",
    summary: "Wind names and waiting for a fair breeze.",
    chapter: "The Winds",
    chapterNum: 14,
    domain: "weather",
    sensitivity: "everyday",
    style: "cinematic",
    series: "Sky & water",
    pathOrder: 85,
    modesAllowed: ["young_learner", "core_adult", "elder"],
    videoSrc: "/scenes/wind-rise.mp4",
    posterSrc: "/scenes/wind-rise.jpg",
    durationSec: 28,
    tags: ["wind", "weather"],
    lines: timed(
      [
        { id: "wr1", speaker: "Host", narragansett: "W Aûpi", english: "The wind.", wordId: "rw-14-w-a-pi" },
        { id: "wr2", speaker: "Host", narragansett: "Tashínash waupanash", english: "How many winds are there?", wordId: "rw-14-tash-nash-waupanash" },
        { id: "wr3", speaker: "Host", narragansett: "Nanúmmatin", english: "The north wind.", wordId: "rw-14-nan-mmatin" },
        { id: "wr4", speaker: "Host", narragansett: "Nopâtin", english: "The east wind.", wordId: "rw-14-nop-tin" },
        { id: "wr5", speaker: "Host", narragansett: "Touwúttin", english: "South wind.", wordId: "rw-14-touw-ttin" },
        { id: "wr6", speaker: "Host", narragansett: "Papônetin", english: "West wind.", wordId: "rw-14-pap-netin" },
        { id: "wr7", speaker: "Host", narragansett: "Wunnágehan", english: "Fair wind.", wordId: "rw-14-wunn-gehan-or" },
        { id: "wr8", speaker: "Host", narragansett: "Nqénowhick wouttín", english: "I stay for a wind.", wordId: "rw-14-nq-nowhick-woutt-n" },
      ],
      28,
    ),
  }),

  // ——— Fowl ———
  scene({
    id: "birds-marsh",
    title: "Birds of the marsh",
    summary: "Fowl of the land and water — turkey, goose, blackbird, wing.",
    chapter: "Fowl",
    chapterNum: 15,
    domain: "flora",
    sensitivity: "everyday",
    style: "cinematic",
    series: "Land & travel",
    pathOrder: 90,
    modesAllowed: ["young_learner", "core_adult", "elder"],
    videoSrc: "/scenes/birds-marsh.mp4",
    posterSrc: "/scenes/birds-marsh.jpg",
    durationSec: 28,
    tags: ["birds", "fowl", "marsh"],
    lines: timed(
      [
        { id: "bm1", speaker: "Host", narragansett: "Néyhom, mâuog", english: "Turkey, turkeys.", wordId: "rw-15-n-yhom-m-uog" },
        { id: "bm2", speaker: "Host", narragansett: "Hònck, hònckock", english: "Goose, geese.", wordId: "rw-15-h-nck-h-nckock" },
        { id: "bm3", speaker: "Host", narragansett: "Chógan èuck", english: "Blackbird, blackbirds.", wordId: "rw-15-ch-gan-uck" },
        { id: "bm4", speaker: "Host", narragansett: "Paupock, sûog", english: "Partridge, partridges.", wordId: "rw-15-paupock-s-og" },
        { id: "bm5", speaker: "Host", narragansett: "Wunnùp, pash", english: "Wing, wings.", wordId: "rw-15-wunn-p-pash" },
        { id: "bm6", speaker: "Host", narragansett: "Yo aquéchinock", english: "There they swim." },
        { id: "bm7", speaker: "Host", narragansett: "Aunckuck, quâuog", english: "Heath cocks." },
        { id: "bm8", speaker: "Host", narragansett: "Wunnúppaníckánawhone", english: "Wing-shot.", wordId: "rw-15-wunn-ppan-ck-nawhone" },
      ],
      28,
    ),
  }),
  scene({
    id: "birds-kids",
    title: "Bird friends (kids)",
    summary: "Gentle cartoon birds for Little Ones — goose, turkey, blackbird.",
    chapter: "Fowl",
    chapterNum: 15,
    domain: "flora",
    sensitivity: "everyday",
    style: "cartoon",
    series: "Little Ones",
    pathOrder: 8,
    modesAllowed: ["little_ones", "young_learner", "core_adult", "elder"],
    videoSrc: "/scenes/birds-kids.mp4",
    posterSrc: "/scenes/birds-kids.jpg",
    durationSec: 18,
    tags: ["kids", "birds", "cartoon"],
    lines: timed(
      [
        { id: "bk1", speaker: "Friend", narragansett: "Hònck", english: "Goose." },
        { id: "bk2", speaker: "Friend", narragansett: "Néyhom", english: "Turkey." },
        { id: "bk3", speaker: "Friend", narragansett: "Chógan", english: "Blackbird." },
        { id: "bk4", speaker: "Friend", narragansett: "Wunnùp", english: "Wing." },
        { id: "bk5", speaker: "Friend", narragansett: "Paupock", english: "Partridge." },
      ],
      18,
    ),
  }),


  scene({
    id: "count-kids",
    title: "Count with me (kids)",
    summary: "Friend Tan and Friend Teal count shells one to five — same two friends as Hello.",
    chapter: "Of their numbers",
    chapterNum: 4,
    domain: "time",
    sensitivity: "everyday",
    style: "cartoon",
    series: "Little Ones",
    pathOrder: 3,
    modesAllowed: ["little_ones", "young_learner", "core_adult", "elder"],
    videoSrc: "/scenes/count-kids.mp4",
    posterSrc: "/scenes/count-kids.jpg",
    durationSec: 18,
    tags: ["kids", "numbers", "cartoon"],
    lines: timed(
      [
        { id: "ck1", speaker: "Friend", narragansett: "Nquít", english: "One." },
        { id: "ck2", speaker: "Friend", narragansett: "Neèse", english: "Two." },
        { id: "ck3", speaker: "Friend", narragansett: "Nìsh", english: "Three." },
        { id: "ck4", speaker: "Friend", narragansett: "Yòh", english: "Four." },
        { id: "ck5", speaker: "Friend", narragansett: "Napánna", english: "Five." },
      ],
      20,
    ),
  }),
  scene({
    id: "family-kids",
    title: "Family words (kids)",
    summary: "HQ family words — father, mother, child, elders shown with the two friends as leads.",
    chapter: "Of the family",
    chapterNum: 5,
    domain: "kinship",
    sensitivity: "everyday",
    style: "cinematic",
    series: "Little Ones",
    pathOrder: 4,
    modesAllowed: ["little_ones", "young_learner", "core_adult", "elder"],
    videoSrc: "/scenes/family-kids.mp4",
    posterSrc: "/scenes/family-kids.jpg",
    durationSec: 30,
    tags: ["kids", "hq", "family", "cartoon"],
    lines: timed(
      [
        { id: "fkids1", speaker: "Friend", narragansett: "Nósh", english: "My father." },
        { id: "fkids2", speaker: "Friend", narragansett: "Okásu", english: "A mother." },
        { id: "fkids3", speaker: "Friend", narragansett: "Nippápoos", english: "My child." },
        { id: "fkids4", speaker: "Friend", narragansett: "Hômes", english: "An old man (elder)." },
        { id: "fkids5", speaker: "Friend", narragansett: "Wénise", english: "An old woman (elder)." },
      ],
      30,
    ),
  }),
  scene({
    id: "home-kids",
    title: "Home wetu (kids)",
    summary: "HQ wetu home — accurate bark-mat dome, shot-per-line with the two friends.",
    chapter: "Of the family and house",
    chapterNum: 6,
    domain: "kinship",
    sensitivity: "everyday",
    style: "cinematic",
    series: "Little Ones",
    pathOrder: 5,
    modesAllowed: ["little_ones", "young_learner", "core_adult", "elder"],
    videoSrc: "/scenes/home-kids.mp4",
    posterSrc: "/scenes/home-kids.jpg",
    durationSec: 30,
    tags: ["kids", "hq", "home", "cartoon"],
    lines: timed(
      [
        { id: "hk1", speaker: "Friend", narragansett: "Wetu", english: "A house / dwelling." },
        { id: "hk2", speaker: "Friend", narragansett: "Wetuômuck", english: "At home." },
        { id: "hk3", speaker: "Friend", narragansett: "Wunnégin", english: "Welcome." },
        { id: "hk4", speaker: "Friend", narragansett: "Nkàtaquaum", english: "I am sleepy." },
        { id: "hk5", speaker: "Friend", narragansett: "Cowwêtuck", english: "Let us sleep." },
      ],
      30,
    ),
  }),
  scene({
    id: "day-kids",
    title: "Day light (kids)",
    summary: "Sunrise to night with the same two friends under the sky.",
    chapter: "Of the time of the day",
    chapterNum: 9,
    domain: "time",
    sensitivity: "everyday",
    style: "cartoon",
    series: "Little Ones",
    pathOrder: 6,
    modesAllowed: ["little_ones", "young_learner", "core_adult", "elder"],
    videoSrc: "/scenes/day-kids.mp4",
    posterSrc: "/scenes/day-kids.jpg",
    durationSec: 18,
    tags: ["kids", "day", "cartoon"],
    lines: timed(
      [
        { id: "dk1", speaker: "Friend", narragansett: "Páshisha", english: "It is sunrise." },
        { id: "dk2", speaker: "Friend", narragansett: "Mautàbon", english: "It is day." },
        { id: "dk3", speaker: "Friend", narragansett: "Nummáttaqúaw", english: "Morning." },
        { id: "dk4", speaker: "Friend", narragansett: "Wayaàwi", english: "The sun is set." },
        { id: "dk5", speaker: "Friend", narragansett: "Póppakunnetch", english: "Dark night." },
      ],
      20,
    ),
  }),
  scene({
    id: "water-kids",
    title: "By the water (kids)",
    summary: "Shore words — water, fish, fair wind — same two Hello friends.",
    chapter: "Of the sea",
    chapterNum: 18,
    domain: "water",
    sensitivity: "everyday",
    style: "cartoon",
    series: "Little Ones",
    pathOrder: 9,
    modesAllowed: ["little_ones", "young_learner", "core_adult", "elder"],
    videoSrc: "/scenes/water-kids.mp4",
    posterSrc: "/scenes/water-kids.jpg",
    durationSec: 18,
    tags: ["kids", "water", "cartoon"],
    lines: timed(
      [
        { id: "wk1", speaker: "Friend", narragansett: "Nip", english: "Water." },
        { id: "wk2", speaker: "Friend", narragansett: "Namaùus", english: "Fish." },
        { id: "wk3", speaker: "Friend", narragansett: "Ntaûmen", english: "I am fishing." },
        { id: "wk4", speaker: "Friend", narragansett: "Wunnágehan", english: "Fair wind." },
        { id: "wk5", speaker: "Friend", narragansett: "Nickquénum", english: "I am going." },
      ],
      20,
    ),
  }),
  scene({
    id: "sleep-kids",
    title: "Night rest (kids)",
    summary: "Sleepy time words with Friend Tan and Friend Teal by the fire.",
    chapter: "Of sleep and lodging",
    chapterNum: 3,
    domain: "kinship",
    sensitivity: "everyday",
    style: "cartoon",
    series: "Little Ones",
    pathOrder: 10,
    modesAllowed: ["little_ones", "young_learner", "core_adult", "elder"],
    videoSrc: "/scenes/sleep-kids.mp4",
    posterSrc: "/scenes/sleep-kids.jpg",
    durationSec: 18,
    tags: ["kids", "sleep", "cartoon"],
    lines: timed(
      [
        { id: "skids1", speaker: "Friend", narragansett: "Yo nickowémen?", english: "Shall I sleep here?" },
        { id: "skids2", speaker: "Friend", narragansett: "Wunnégin, cówish", english: "Welcome — sleep here." },
        { id: "skids3", speaker: "Friend", narragansett: "Nkàtaquaum", english: "I am sleepy." },
        { id: "skids4", speaker: "Friend", narragansett: "Cowwêtuck", english: "Let us sleep." },
        { id: "skids5", speaker: "Friend", narragansett: "Mattannauke", english: "Fine mats to sleep on." },
      ],
      20,
    ),
  }),
  scene({
    id: "path-kids",
    title: "Little path (kids)",
    summary: "Path words — show me the way — same two friends on the trail.",
    chapter: "Of travel",
    chapterNum: 11,
    domain: "movement",
    sensitivity: "everyday",
    style: "cartoon",
    series: "Little Ones",
    pathOrder: 11,
    modesAllowed: ["little_ones", "young_learner", "core_adult", "elder"],
    videoSrc: "/scenes/path-kids.mp4",
    posterSrc: "/scenes/path-kids.jpg",
    durationSec: 18,
    tags: ["kids", "path", "cartoon"],
    lines: timed(
      [
        { id: "pk1", speaker: "Friend", narragansett: "Kokotemíinnea méyi", english: "Show me the way." },
        { id: "pk2", speaker: "Friend", narragansett: "Peemáyagât", english: "A short way." },
        { id: "pk3", speaker: "Friend", narragansett: "Mishimmáyagat", english: "A great path." },
        { id: "pk4", speaker: "Friend", narragansett: "Taubotneanawáyean", english: "I thank you." },
        { id: "pk5", speaker: "Friend", narragansett: "Nickquénum", english: "I am going." },
      ],
      20,
    ),
  }),
  scene({
    id: "land-kids",
    title: "Corn and land (kids)",
    summary: "Earth and corn words with the two Hello friends by the hills.",
    chapter: "Of the earth and fruits",
    chapterNum: 16,
    domain: "flora",
    sensitivity: "everyday",
    style: "cartoon",
    series: "Little Ones",
    pathOrder: 12,
    modesAllowed: ["little_ones", "young_learner", "core_adult", "elder"],
    videoSrc: "/scenes/land-kids.mp4",
    posterSrc: "/scenes/land-kids.jpg",
    durationSec: 18,
    tags: ["kids", "land", "cartoon"],
    lines: timed(
      [
        { id: "lk1", speaker: "Friend", narragansett: "Aûke", english: "Earth or land." },
        { id: "lk2", speaker: "Friend", narragansett: "Ewáchim neash", english: "Corn." },
        { id: "lk3", speaker: "Friend", narragansett: "Scannémeneash", english: "Seed corn." },
        { id: "lk4", speaker: "Friend", narragansett: "Aukeeteaûmen", english: "To plant corn." },
        { id: "lk5", speaker: "Friend", narragansett: "Sókenug", english: "A heap of corn." },
      ],
      20,
    ),
  }),

  // ——— Earth & fruits ———
  scene({
    id: "earth-fruits",
    title: "Gifts of the earth",
    summary: "Land and corn — planting, seed-time, the living earth.",
    chapter: "Earth and Fruits",
    chapterNum: 16,
    domain: "flora",
    sensitivity: "everyday",
    style: "cinematic",
    series: "Land & travel",
    pathOrder: 95,
    modesAllowed: ["young_learner", "core_adult", "elder"],
    videoSrc: "/scenes/earth-fruits.mp4",
    posterSrc: "/scenes/earth-fruits.jpg",
    durationSec: 28,
    tags: ["land", "plants", "corn"],
    lines: timed(
      [
        { id: "e1", speaker: "Host", narragansett: "Aûke", english: "Earth or land.", wordId: "rw-16-a-ke-and" },
        { id: "e2", speaker: "Host", narragansett: "Ewáchim neash", english: "Corn.", wordId: "rw-16-ew-chim-neash" },
        { id: "e3", speaker: "Host", narragansett: "Scannémeneash", english: "Seed corn.", wordId: "rw-16-scann-meneash" },
        { id: "e4", speaker: "Host", narragansett: "Aukeeteaûmen", english: "To plant corn.", wordId: "rw-16-aukeetea-men" },
        { id: "e5", speaker: "Host", narragansett: "Aukeeteámitch", english: "Spring — seed-time.", wordId: "rw-10-aukeete-mitch" },
        { id: "e6", speaker: "Host", narragansett: "Petascúnnemun", english: "To hill the corn.", wordId: "rw-16-petasc-nnemun" },
        { id: "e7", speaker: "Host", narragansett: "Kepenúmmin", english: "To gather corn.", wordId: "rw-16-kepen-mmin" },
        { id: "e8", speaker: "Host", narragansett: "Sókenug", english: "A heap of corn.", wordId: "rw-16-s-kenug" },
      ],
      28,
    ),
  }),

  // ——— Beasts ———
  scene({
    id: "forest-deer",
    title: "Deer in the forest",
    summary: "Beasts of the land — deer and otter of the woods and water.",
    chapter: "Beasts",
    chapterNum: 17,
    domain: "flora",
    sensitivity: "everyday",
    style: "cinematic",
    series: "Land & travel",
    pathOrder: 100,
    modesAllowed: ["young_learner", "core_adult", "elder"],
    videoSrc: "/scenes/forest-deer.mp4",
    posterSrc: "/scenes/forest-deer.jpg",
    durationSec: 24,
    tags: ["deer", "animals", "forest"],
    lines: timed(
      [
        { id: "fd1", speaker: "Host", narragansett: "Attuck, quock", english: "Deer.", wordId: "rw-17-attuck-quock" },
        { id: "fd2", speaker: "Host", narragansett: "Wawwúnnes", english: "A young buck.", wordId: "rw-17-waww-nnes" },
        { id: "fd3", speaker: "Host", narragansett: "Kuttíomp", english: "A great buck.", wordId: "rw-17-kutt-omp-paucott-uwaw" },
        { id: "fd4", speaker: "Host", narragansett: "Nkéke, nkéquock", english: "Otter, otters.", wordId: "rw-17-nk-ke-nk-quock" },
        { id: "fd5", speaker: "Host", narragansett: "Moattôqus", english: "A black wolf.", wordId: "rw-17-moatt-qus" },
        { id: "fd6", speaker: "Host", narragansett: "Natuphéttitch yo sanaukamick", english: "Let them feed on this ground." },
      ],
      24,
    ),
  }),

  // ——— Sea ———
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
    pathOrder: 105,
    modesAllowed: ["young_learner", "core_adult", "elder"],
    videoSrc: "/scenes/canoe-shore.mp4",
    posterSrc: "/scenes/canoe-shore.jpg",
    durationSec: 28,
    tags: ["water", "canoe", "sea"],
    lines: timed(
      [
        { id: "c1", speaker: "Host", narragansett: "Nickquénum", english: "I am going." },
        { id: "c2", speaker: "Host", narragansett: "Acâwmuck nóteshem", english: "I came over the water." },
        { id: "c3", speaker: "Host", narragansett: "Nippâwus", english: "The sun." },
        { id: "c4", speaker: "Host", narragansett: "W Aûpi", english: "The wind." },
        { id: "c5", speaker: "Host", narragansett: "Wunnágehan", english: "Fair wind." },
        { id: "c6", speaker: "Host", narragansett: "Nqénowhick wouttín", english: "I stay for a wind." },
        { id: "c7", speaker: "Host", narragansett: "Cowaúnckamish", english: "My respects to you." },
        { id: "c8", speaker: "Host", narragansett: "Taubotneanawáyean", english: "I thank you." },
      ],
      28,
    ),
  }),

  // ——— Fish ———
  scene({
    id: "fish-water",
    title: "Fish and fishing",
    summary: "Fishing vocabulary — fish, bass, going out to fish.",
    chapter: "Fish and Fishing",
    chapterNum: 19,
    domain: "water",
    sensitivity: "everyday",
    style: "cinematic",
    series: "Sky & water",
    pathOrder: 110,
    modesAllowed: ["young_learner", "core_adult", "elder"],
    videoSrc: "/scenes/fish-water.mp4",
    posterSrc: "/scenes/fish-water.jpg",
    durationSec: 28,
    tags: ["fish", "water", "shore"],
    lines: timed(
      [
        { id: "f1", speaker: "Host", narragansett: "Namaùus,-suck", english: "Fish, fishes.", wordId: "rw-19-nama-us-suck" },
        { id: "f2", speaker: "Host", narragansett: "Ntaûmen", english: "I am fishing.", wordId: "rw-19-nta-men" },
        { id: "f3", speaker: "Host", narragansett: "Nnattuckqunnûwem", english: "I go a fishing.", wordId: "rw-19-nnattuckqunn-wem" },
        { id: "f4", speaker: "Host", narragansett: "Missúckeke-kéquock", english: "Bass.", wordId: "rw-19-miss-ckeke-k-quock" },
        { id: "f5", speaker: "Host", narragansett: "Mishquammaùquock", english: "Red fish, salmon.", wordId: "rw-19-mishquamma-quock" },
        { id: "f6", speaker: "Host", narragansett: "Aúmanep", english: "A fishing line.", wordId: "rw-19-a-manep" },
        { id: "f7", speaker: "Host", narragansett: "Aumaûog", english: "They are fishing.", wordId: "rw-19-auma-og" },
        { id: "f8", speaker: "Host", narragansett: "Kuttaûmen?", english: "Do you fish?", wordId: "rw-19-kutta-men" },
      ],
      28,
    ),
  }),

  // ——— Trade ———
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
    pathOrder: 120,
    modesAllowed: ["core_adult", "elder"],
    videoSrc: "/scenes/trade-shore.mp4",
    posterSrc: "/scenes/trade-shore.jpg",
    durationSec: 28,
    tags: ["trade", "wampum", "market"],
    lines: timed(
      [
        { id: "t1", speaker: "Host", narragansett: "Cowaúnckamish", english: "My respects to you." },
        { id: "t2", speaker: "Host", narragansett: "Téaquacumméich", english: "What will you have?" },
        { id: "t3", speaker: "Guest", narragansett: "Taubút paump maúntaman", english: "I am glad (of this)." },
        { id: "t4", speaker: "Host", narragansett: "Cummautaunchemókous", english: "I have finished my news." },
        { id: "t5", speaker: "Guest", narragansett: "Taubotneanawáyean", english: "I thank you." },
        { id: "t6", speaker: "Host", narragansett: "Wunnégin", english: "Welcome." },
        { id: "t7", speaker: "Both", narragansett: "Cowaúnckamish", english: "My respects to you." },
        { id: "t8", speaker: "Guest", narragansett: "Nickquénum", english: "I am going." },
      ],
      28,
    ),
  }),

  // ——— Hunting ———
  scene({
    id: "hunt-trail",
    title: "On the hunt trail",
    summary:
      "Hunting language of going out and returning — respectful trail words (no violence shown).",
    chapter: "Hunting",
    chapterNum: 27,
    domain: "movement",
    sensitivity: "everyday",
    style: "cinematic",
    series: "Land & travel",
    pathOrder: 115,
    modesAllowed: ["young_learner", "core_adult", "elder"],
    videoSrc: "/scenes/hunt-trail.mp4",
    posterSrc: "/scenes/hunt-trail.jpg",
    durationSec: 28,
    tags: ["hunt", "trail", "forest"],
    lines: timed(
      [
        { id: "ht1", speaker: "Host", narragansett: "Ntauchaûmen", english: "I go to hunt.", wordId: "rw-27-ntaucha-men" },
        { id: "ht2", speaker: "Host", narragansett: "Auchaûtuck", english: "Let us hunt.", wordId: "rw-27-aucha-tuck" },
        { id: "ht3", speaker: "Host", narragansett: "Nowetauchaûmen", english: "I will hunt with you.", wordId: "rw-27-nowetaucha-men" },
        { id: "ht4", speaker: "Host", narragansett: "Npunnowwâumen", english: "I must go to my traps.", wordId: "rw-27-npunnoww-umen" },
        { id: "ht5", speaker: "Host", narragansett: "Apè hana", english: "Trap, traps.", wordId: "rw-27-ap-hana" },
        { id: "ht6", speaker: "Host", narragansett: "Ntaumpauchaúmen", english: "I come from hunting.", wordId: "rw-27-ntaumpaucha-men" },
        { id: "ht7", speaker: "Host", narragansett: "Ncáttiteam weeyoùs", english: "I long for venison.", wordId: "rw-27-nc-ttiteam-weeyo-s" },
        { id: "ht8", speaker: "Host", narragansett: "Nummouashàwmen", english: "I go to set traps.", wordId: "rw-27-nummouash-wmen" },
      ],
      28,
    ),
  }),

  // ——— Upload-ready scaffolds ———
  scene({
    id: "wampum-count",
    title: "Shell money words",
    summary: "Shell money and fathom counts — dedicated reconstruction for wampum vocabulary practice.",
    chapter: "Coin and Wampum",
    chapterNum: 24,
    domain: "tools",
    sensitivity: "everyday",
    style: "cinematic",
    series: "Trade",
    pathOrder: 125,
    modesAllowed: ["core_adult", "elder"],
    videoSrc: "/scenes/wampum-count.mp4",
    posterSrc: "/scenes/wampum-count.jpg",
    durationSec: 24,
    mediaStatus: "ready",
    tags: ["wampum", "trade"],
    reconstructionNote:
      "Dedicated shell-money reconstruction (object still + motion). Not living speaker footage. Prefer community media at public/scenes/uploads/wampum-count.mp4.",
    lines: timed(
      [
        { id: "wc1", speaker: "Host", narragansett: "Neesaúmscat", english: "Two pence (shell money unit).", wordId: "rw-24-neesa-mscat" },
        { id: "wc2", speaker: "Host", narragansett: "Quttatashaúmscat, or quttauatu", english: "Six pence.", wordId: "rw-24-quttatasha-mscat-or-quttauatu" },
        { id: "wc3", speaker: "Guest", narragansett: "Piuckquaúmscat", english: "Ten pence.", wordId: "rw-24-piuckqua-mscat" },
        { id: "wc4", speaker: "Host", narragansett: "Neesaumpaúgatuck", english: "Two fathom (ten shillings).", wordId: "rw-24-neesaumpa-gatuck" },
        { id: "wc5", speaker: "Guest", narragansett: "Shwaumpáugatuck", english: "Three fathom (fifteen shillings).", wordId: "rw-24-shwaump-ugatuck" },
        { id: "wc6", speaker: "Both", narragansett: "Cowaúnckamish", english: "My respects to you." },
      ],
      24,
    ),
  }),
  scene({
    id: "clothing-words",
    title: "Clothing words",
    summary: "Mantles and moccasins — careful clothing vocabulary with a dedicated reconstruction (Adult/Elder).",
    chapter: "Clothing",
    chapterNum: 20,
    domain: "tools",
    sensitivity: "careful",
    style: "cinematic",
    series: "Trade",
    pathOrder: 130,
    modesAllowed: ["core_adult", "elder"],
    videoSrc: "/scenes/clothing-words.mp4",
    posterSrc: "/scenes/clothing-words.jpg",
    durationSec: 24,
    mediaStatus: "ready",
    tags: ["clothing", "careful"],
    reconstructionNote:
      "Careful chapter — dedicated object still reconstruction (mantle, moccasins). Not living speaker footage and not a fashion film. Prefer community media at public/scenes/uploads/clothing-words.mp4.",
    lines: timed(
      [
        { id: "cl1", speaker: "Host", narragansett: "Mocússinass", english: "Moccasins / shoes.", wordId: "rw-20-moc-ssinass-mockussinchass" },
        { id: "cl2", speaker: "Guest", narragansett: "Saunketíppo, or, Ashónaquo", english: "A hat or cap.", wordId: "rw-20-saunket-ppo-or-ash-naquo" },
        { id: "cl3", speaker: "Host", narragansett: "Maúnek: nquittiashíagat", english: "An English coat or mantle.", wordId: "rw-20-ma-nek-nquittiash-agat" },
        { id: "cl4", speaker: "Guest", narragansett: "Squáus aúhaqut", english: "A woman's mantle.", wordId: "rw-20-squ-us-a-haqut" },
        { id: "cl5", speaker: "Host", narragansett: "Muckíis auhaqut", english: "A child's mantle.", wordId: "rw-20-muck-is-auhaqut" },
      ],
      24,
    ),
  }),
];

export function getAllScenes(): LearningScene[] {
  return SCENES;
}
