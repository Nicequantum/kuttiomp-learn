import type { LearningModeId } from "./types";
import type { SceneLine, SceneSensitivity } from "./scenes-data";

/**
 * Full Day Journey — multi-act life-cycle experience (Film V5).
 *
 * Master film: one continuous stylized cinematic animation (~15 min / 900s).
 * Each act plays a TIME WINDOW into that master (not separate act mp4s as primary).
 * Community uploads can still replace any act with a self-contained clip.
 *
 * Cultural: historical Williams forms + modern English. Not living ceremony.
 * Sensitive/sacred reconstruction is not staged; evening act is discourse only.
 */

/** Shared master film for all Full Day acts (Film V5). */
export const MASTER_STORY_VIDEO = "/scenes/long/one-day-story.mp4";
export const MASTER_STORY_POSTER = "/scenes/long/one-day-story.jpg";

/** Seconds per act window on the master (10 acts × 90s = 900s). */
export const ACT_WINDOW_SEC = 90;

export type DayActId =
  | "dawn-wake"
  | "kin-greet"
  | "morning-meal"
  | "prepare-path"
  | "land-corn"
  | "forest-trail"
  | "water-shore"
  | "sky-weather"
  | "evening-talk"
  | "night-return";

export type DayAct = {
  id: DayActId;
  order: number;
  title: string;
  summary: string;
  beat: string;
  chapters: string[];
  chapterNums: number[];
  domains: string[];
  sensitivity: SceneSensitivity;
  modesAllowed: LearningModeId[];
  /** Packaged master film (shared); community upload overrides per act. */
  videoSrc: string;
  posterSrc: string;
  uploadSrc: string;
  /** Window into master film — absolute start on master timeline. */
  windowStartSec: number;
  /** Window into master film — absolute end on master timeline. */
  windowEndSec: number;
  /** Packaged film window length (windowEnd − windowStart). */
  durationSec: number;
  /** Learn-mode dialogue window in seconds (may exceed film window). */
  practiceSec: number;
  lines: SceneLine[];
  reconstructionNote: string;
};

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

/** Build a 90s window for act order 1..10 (0–90, 90–180, … 810–900). */
function actWindow(order: number): {
  windowStartSec: number;
  windowEndSec: number;
  durationSec: number;
} {
  const windowStartSec = (order - 1) * ACT_WINDOW_SEC;
  const windowEndSec = order * ACT_WINDOW_SEC;
  return {
    windowStartSec,
    windowEndSec,
    durationSec: windowEndSec - windowStartSec,
  };
}

const dayNote =
  "Full Day act (Film V5) — plays a window of the master one-day film (stylized cinematic animation). Dialogue from Williams 1643 (modern English). Not a living speaker film or a ceremonial recording. Replace with community footage via public/scenes/day/uploads/{act-id}.mp4 (self-contained act clip overrides the master window).";

export const DAY_JOURNEY = {
  id: "full-day",
  title: "A full day",
  subtitle: "From dawn in the wetu to night under the stars",
  summary:
    "One continuous life-cycle path: wake, kin, meal, trail, land, water, sky, talk, and rest — language from many chapters woven into a single day.",
  targetFilmMin: 15,
  targetPracticeMin: 35,
} as const;

export const DAY_ACTS: DayAct[] = [
  {
    id: "dawn-wake",
    order: 1,
    title: "Dawn in the wetu",
    summary: "Waking at first light — house, sleep, the day begins.",
    beat: "Someone wakes in the dwelling as light finds the doorway.",
    chapters: ["Sleep and Lodging", "House and Family", "Time of the Day"],
    chapterNums: [3, 6, 9],
    domains: ["kinship", "time"],
    sensitivity: "everyday",
    modesAllowed: ["little_ones", "young_learner", "core_adult", "elder"],
    videoSrc: MASTER_STORY_VIDEO,
    posterSrc: "/scenes/day/dawn-wake.jpg",
    uploadSrc: "/scenes/day/uploads/dawn-wake.mp4",
    ...actWindow(1),
    practiceSec: 180,
    reconstructionNote: dayNote,
    lines: timed(
      [
        { id: "dw1", speaker: "Host", narragansett: "Páshisha", english: "It is sunrise.", wordId: "rw-09-p-shisha" },
        { id: "dw2", speaker: "Host", narragansett: "Mautàbon, Chicháuquat wompan", english: "It is day.", wordId: "rw-09-maut-bon-chich-uquat-wompan" },
        { id: "dw3", speaker: "Host", narragansett: "Wetu", english: "A house / dwelling." },
        { id: "dw4", speaker: "Host", narragansett: "Wetuômuck", english: "At home." },
        { id: "dw5", speaker: "Host", narragansett: "Tokêtuck", english: "Let us wake.", wordId: "rw-03-tok-tuck" },
        { id: "dw6", speaker: "Host", narragansett: "Nkàtaquaum", english: "I am sleepy.", wordId: "rw-03-nk-taquaum" },
        { id: "dw7", speaker: "Host", narragansett: "Wuddtúckqunash, ponamáuta", english: "Let us lay on wood.", wordId: "rw-03-wuddt-ckqunash-ponam-uta" },
        { id: "dw8", speaker: "Host", narragansett: "Nummáttaqúaw", english: "Morning (before noon).", wordId: "rw-09-numm-ttaq-aw" },
        { id: "dw9", speaker: "Host", narragansett: "Wunnégin", english: "Welcome (to the day)." },
        { id: "dw10", speaker: "Host", narragansett: "Cowaúnckamish", english: "My respects to you." },
      ],
      180,
    ),
  },
  {
    id: "kin-greet",
    order: 2,
    title: "Kin at morning",
    summary: "Greeting family — father, mother, child, elders.",
    beat: "Morning words among kin outside the dwelling.",
    chapters: ["Salutation", "Relations of Consanguinity"],
    chapterNums: [1, 5],
    domains: ["kinship"],
    sensitivity: "everyday",
    modesAllowed: ["little_ones", "young_learner", "core_adult", "elder"],
    videoSrc: MASTER_STORY_VIDEO,
    posterSrc: "/scenes/day/kin-greet.jpg",
    uploadSrc: "/scenes/day/uploads/kin-greet.mp4",
    ...actWindow(2),
    practiceSec: 180,
    reconstructionNote: dayNote,
    lines: timed(
      [
        { id: "kg1", speaker: "Host", narragansett: "Ascowequassunnúmmis", english: "Good morning." },
        { id: "kg2", speaker: "Guest", narragansett: "Askuttaaquompsín", english: "How are you?" },
        { id: "kg3", speaker: "Host", narragansett: "Asnpaumpmaúntam", english: "I am very well." },
        { id: "kg4", speaker: "Host", narragansett: "Nósh", english: "My father.", wordId: "rw-05-n-sh" },
        { id: "kg5", speaker: "Host", narragansett: "Okásu", english: "A mother.", wordId: "rw-05-ok-su" },
        { id: "kg6", speaker: "Host", narragansett: "Nippápoos", english: "My child." },
        { id: "kg7", speaker: "Host", narragansett: "Hômes", english: "An old man (elder).", wordId: "rw-05-h-mes" },
        { id: "kg8", speaker: "Host", narragansett: "Wénise", english: "An old woman (elder).", wordId: "rw-05-w-nise" },
        { id: "kg9", speaker: "Both", narragansett: "Cowaúnckamish", english: "My respects to you." },
        { id: "kg10", speaker: "Guest", narragansett: "Taubotneanawáyean", english: "I thank you." },
      ],
      180,
    ),
  },
  {
    id: "morning-meal",
    order: 3,
    title: "Morning meal",
    summary: "Hospitality and food — thirst, water, stay and eat.",
    beat: "Sharing the bowl before the day’s work.",
    chapters: ["Eating and Entertainment"],
    chapterNums: [2],
    domains: ["food"],
    sensitivity: "everyday",
    modesAllowed: ["little_ones", "young_learner", "core_adult", "elder"],
    videoSrc: MASTER_STORY_VIDEO,
    posterSrc: "/scenes/day/morning-meal.jpg",
    uploadSrc: "/scenes/day/uploads/morning-meal.mp4",
    ...actWindow(3),
    practiceSec: 180,
    reconstructionNote: dayNote,
    lines: timed(
      [
        { id: "mm1", speaker: "Guest", narragansett: "Niccàwkatone", english: "I am thirsty." },
        { id: "mm2", speaker: "Host", narragansett: "Nip, or nipéwese", english: "Some water." },
        { id: "mm3", speaker: "Host", narragansett: "Namitch, commetesímmin", english: "Stay — you must eat first." },
        { id: "mm4", speaker: "Host", narragansett: "Téaquacumméich", english: "What will you eat?" },
        { id: "mm5", speaker: "Guest", narragansett: "Aupúminea-nawsaùmp", english: "Parched meal boiled (soft corn porridge)." },
        { id: "mm6", speaker: "Host", narragansett: "Wunnégin", english: "Welcome." },
        { id: "mm7", speaker: "Guest", narragansett: "Taubotneanawáyean", english: "I thank you." },
        { id: "mm8", speaker: "Host", narragansett: "Cowaúnckamish", english: "My respects to you." },
        { id: "mm9", speaker: "Guest", narragansett: "Taubút paump maúntaman", english: "I am glad (of this)." },
        { id: "mm10", speaker: "Host", narragansett: "Nickquénum", english: "I am going. (after the meal)" },
      ],
      180,
    ),
  },
  {
    id: "prepare-path",
    order: 4,
    title: "On the path",
    summary: "Leaving home — asking the way, the great path and the short way.",
    beat: "Feet on the trail toward land and water.",
    chapters: ["Travel"],
    chapterNums: [11],
    domains: ["movement"],
    sensitivity: "everyday",
    modesAllowed: ["young_learner", "core_adult", "elder"],
    videoSrc: MASTER_STORY_VIDEO,
    posterSrc: "/scenes/day/prepare-path.jpg",
    uploadSrc: "/scenes/day/uploads/prepare-path.mp4",
    ...actWindow(4),
    practiceSec: 180,
    reconstructionNote: dayNote,
    lines: timed(
      [
        { id: "pp1", speaker: "Host", narragansett: "Nickquénum", english: "I am going." },
        { id: "pp2", speaker: "Host", narragansett: "Nnatotemúckaun", english: "I will ask the way." },
        { id: "pp3", speaker: "Host", narragansett: "Kunnatótemous", english: "I will inquire of you." },
        { id: "pp4", speaker: "Host", narragansett: "Kokotemíinnea méyi", english: "Show me the way." },
        { id: "pp5", speaker: "Guest", narragansett: "Mishimmáyagat", english: "A great path." },
        { id: "pp6", speaker: "Guest", narragansett: "Peemáyagât", english: "A short way." },
        { id: "pp7", speaker: "Host", narragansett: "Taubotneanawáyean", english: "I thank you." },
        { id: "pp8", speaker: "Guest", narragansett: "Cowaúnckamish", english: "My respects to you." },
        { id: "pp9", speaker: "Host", narragansett: "Nqénowhick wouttín", english: "I stay for a wind.", wordId: "rw-14-nq-nowhick-woutt-n" },
        { id: "pp10", speaker: "Host", narragansett: "Wunnágehan", english: "Fair wind." },
      ],
      180,
    ),
  },
  {
    id: "land-corn",
    order: 5,
    title: "Land and corn",
    summary: "Earth, seed, planting, gathering — gifts of the land.",
    beat: "Fields and gardens; hands in soil and corn.",
    chapters: ["Earth and Fruits", "Seasons of the Year"],
    chapterNums: [16, 10],
    domains: ["flora", "time"],
    sensitivity: "everyday",
    modesAllowed: ["little_ones", "young_learner", "core_adult", "elder"],
    videoSrc: MASTER_STORY_VIDEO,
    posterSrc: "/scenes/day/land-corn.jpg",
    uploadSrc: "/scenes/day/uploads/land-corn.mp4",
    ...actWindow(5),
    practiceSec: 200,
    reconstructionNote: dayNote,
    lines: timed(
      [
        { id: "lc1", speaker: "Host", narragansett: "Aûke", english: "Earth or land.", wordId: "rw-16-a-ke-and" },
        { id: "lc2", speaker: "Host", narragansett: "Séquan", english: "Spring.", wordId: "rw-10-s-quan" },
        { id: "lc3", speaker: "Host", narragansett: "Aukeeteámitch", english: "Spring — seed-time.", wordId: "rw-10-aukeete-mitch" },
        { id: "lc4", speaker: "Host", narragansett: "Ewáchim neash", english: "Corn.", wordId: "rw-16-ew-chim-neash" },
        { id: "lc5", speaker: "Host", narragansett: "Scannémeneash", english: "Seed corn.", wordId: "rw-16-scann-meneash" },
        { id: "lc6", speaker: "Host", narragansett: "Aukeeteaûmen", english: "To plant corn.", wordId: "rw-16-aukeetea-men" },
        { id: "lc7", speaker: "Host", narragansett: "Petascúnnemun", english: "To hill the corn.", wordId: "rw-16-petasc-nnemun" },
        { id: "lc8", speaker: "Host", narragansett: "Kepenúmmin", english: "To gather corn.", wordId: "rw-16-kepen-mmin" },
        { id: "lc9", speaker: "Host", narragansett: "Sókenug", english: "A heap of corn.", wordId: "rw-16-s-kenug" },
        { id: "lc10", speaker: "Host", narragansett: "Néepun", english: "Summer.", wordId: "rw-10-n-epun-quaq-squan" },
        { id: "lc11", speaker: "Host", narragansett: "Taquònck", english: "Fall / harvest.", wordId: "rw-10-taqu-nck" },
        { id: "lc12", speaker: "Host", narragansett: "Wunnégin", english: "Welcome (to the harvest)." },
      ],
      200,
    ),
  },
  {
    id: "forest-trail",
    order: 6,
    title: "Forest trail",
    summary: "Woods language — deer, otter, going out and returning (no violence shown).",
    beat: "Through timber and quiet game trails.",
    chapters: ["Beasts", "Hunting"],
    chapterNums: [17, 27],
    domains: ["flora", "movement"],
    sensitivity: "everyday",
    modesAllowed: ["young_learner", "core_adult", "elder"],
    videoSrc: MASTER_STORY_VIDEO,
    posterSrc: "/scenes/day/forest-trail.jpg",
    uploadSrc: "/scenes/day/uploads/forest-trail.mp4",
    ...actWindow(6),
    practiceSec: 180,
    reconstructionNote: dayNote,
    lines: timed(
      [
        { id: "ft1", speaker: "Host", narragansett: "Ntauchaûmen", english: "I go to hunt.", wordId: "rw-27-ntaucha-men" },
        { id: "ft2", speaker: "Host", narragansett: "Auchaûtuck", english: "Let us hunt.", wordId: "rw-27-aucha-tuck" },
        { id: "ft3", speaker: "Host", narragansett: "Attuck, quock", english: "Deer.", wordId: "rw-17-attuck-quock" },
        { id: "ft4", speaker: "Host", narragansett: "Wawwúnnes", english: "A young buck.", wordId: "rw-17-waww-nnes" },
        { id: "ft5", speaker: "Host", narragansett: "Nkéke, nkéquock", english: "Otter, otters.", wordId: "rw-17-nk-ke-nk-quock" },
        { id: "ft6", speaker: "Host", narragansett: "Npunnowwâumen", english: "I must go to my traps.", wordId: "rw-27-npunnoww-umen" },
        { id: "ft7", speaker: "Host", narragansett: "Apè hana", english: "Trap, traps.", wordId: "rw-27-ap-hana" },
        { id: "ft8", speaker: "Host", narragansett: "Ntaumpauchaúmen", english: "I come from hunting.", wordId: "rw-27-ntaumpaucha-men" },
        { id: "ft9", speaker: "Host", narragansett: "Nummouashàwmen", english: "I go to set traps.", wordId: "rw-27-nummouash-wmen" },
        { id: "ft10", speaker: "Host", narragansett: "Nickquénum", english: "I am going." },
      ],
      180,
    ),
  },
  {
    id: "water-shore",
    order: 7,
    title: "At the water",
    summary: "Shore, canoe, fish, wind for the crossing.",
    beat: "Canoe and nets; the sea road opens.",
    chapters: ["The Sea", "Fish and Fishing", "The Winds"],
    chapterNums: [18, 19, 14],
    domains: ["water", "weather"],
    sensitivity: "everyday",
    modesAllowed: ["little_ones", "young_learner", "core_adult", "elder"],
    videoSrc: MASTER_STORY_VIDEO,
    posterSrc: "/scenes/day/water-shore.jpg",
    uploadSrc: "/scenes/day/uploads/water-shore.mp4",
    ...actWindow(7),
    practiceSec: 200,
    reconstructionNote: dayNote,
    lines: timed(
      [
        { id: "ws1", speaker: "Host", narragansett: "Nickquénum", english: "I am going." },
        { id: "ws2", speaker: "Host", narragansett: "Acâwmuck nóteshem", english: "I came over the water." },
        { id: "ws3", speaker: "Host", narragansett: "Namaùus,-suck", english: "Fish, fishes.", wordId: "rw-19-nama-us-suck" },
        { id: "ws4", speaker: "Host", narragansett: "Ntaûmen", english: "I am fishing.", wordId: "rw-19-nta-men" },
        { id: "ws5", speaker: "Host", narragansett: "Nnattuckqunnûwem", english: "I go a fishing.", wordId: "rw-19-nnattuckqunn-wem" },
        { id: "ws6", speaker: "Host", narragansett: "Missúckeke-kéquock", english: "Bass.", wordId: "rw-19-miss-ckeke-k-quock" },
        { id: "ws7", speaker: "Host", narragansett: "Aúmanep", english: "A fishing line.", wordId: "rw-19-a-manep" },
        { id: "ws8", speaker: "Host", narragansett: "W Aûpi", english: "The wind.", wordId: "rw-14-w-a-pi" },
        { id: "ws9", speaker: "Host", narragansett: "Wunnágehan", english: "Fair wind." },
        { id: "ws10", speaker: "Host", narragansett: "Nqénowhick wouttín", english: "I stay for a wind.", wordId: "rw-14-nq-nowhick-woutt-n" },
        { id: "ws11", speaker: "Host", narragansett: "Nippâwus", english: "The sun." },
        { id: "ws12", speaker: "Host", narragansett: "Taubotneanawáyean", english: "I thank you." },
      ],
      200,
    ),
  },
  {
    id: "sky-weather",
    order: 8,
    title: "Sky and weather",
    summary: "Reading fair, cold, heat, and the winds of the afternoon.",
    beat: "Eyes to the sky before turning home.",
    chapters: ["The Weather", "The Winds", "The Heavenly Lights"],
    chapterNums: [13, 14, 12],
    domains: ["weather"],
    sensitivity: "everyday",
    modesAllowed: ["little_ones", "young_learner", "core_adult", "elder"],
    videoSrc: MASTER_STORY_VIDEO,
    posterSrc: "/scenes/day/sky-weather.jpg",
    uploadSrc: "/scenes/day/uploads/sky-weather.mp4",
    ...actWindow(8),
    practiceSec: 180,
    reconstructionNote: dayNote,
    lines: timed(
      [
        { id: "sw1", speaker: "Host", narragansett: "T Ocke tussinnámmin kéesuck", english: "What do you think of the weather?" },
        { id: "sw2", speaker: "Host", narragansett: "Wekineaûquat", english: "Fair weather." },
        { id: "sw3", speaker: "Host", narragansett: "Tahkì or tátakki", english: "Cold weather." },
        { id: "sw4", speaker: "Host", narragansett: "Kussúttah", english: "It is hot." },
        { id: "sw5", speaker: "Host", narragansett: "Nanúmmatin", english: "The north wind.", wordId: "rw-14-nan-mmatin" },
        { id: "sw6", speaker: "Host", narragansett: "Touwúttin", english: "South wind.", wordId: "rw-14-touw-ttin" },
        { id: "sw7", speaker: "Host", narragansett: "Kéesuck", english: "The heavens.", wordId: "rw-12-k-esuck" },
        { id: "sw8", speaker: "Host", narragansett: "Nippâwus", english: "The sun.", wordId: "rw-12-nipp-wus" },
        { id: "sw9", speaker: "Host", narragansett: "Yahen wàiyàuw", english: "Almost sunset.", wordId: "rw-09-yahen-w-iy-uw" },
        { id: "sw10", speaker: "Host", narragansett: "Wayaàwi", english: "The sun is set.", wordId: "rw-09-waya-wi" },
      ],
      180,
    ),
  },
  {
    id: "evening-talk",
    order: 9,
    title: "Evening talk",
    summary: "Discourse and news at dusk — tell me, I will tell you, I am finished.",
    beat: "Neighbors share news as the day cools. (Not a ceremonial reconstruction.)",
    chapters: ["Discourse and News"],
    chapterNums: [8],
    domains: ["other"],
    sensitivity: "everyday",
    modesAllowed: ["young_learner", "core_adult", "elder"],
    videoSrc: MASTER_STORY_VIDEO,
    posterSrc: "/scenes/day/evening-talk.jpg",
    uploadSrc: "/scenes/day/uploads/evening-talk.mp4",
    ...actWindow(9),
    practiceSec: 180,
    reconstructionNote:
      dayNote +
      " Gathering/talk language only — living ceremony is not staged in this demo.",
    lines: timed(
      [
        { id: "et1", speaker: "Host", narragansett: "Aunchemokauhettíttea", english: "Let us talk / tell the news." },
        { id: "et2", speaker: "Host", narragansett: "Aaunchemókaw", english: "Tell me your news." },
        { id: "et3", speaker: "Guest", narragansett: "Cuttaunchemókous", english: "I will tell you the news." },
        { id: "et4", speaker: "Guest", narragansett: "Cummautaunchemókous", english: "I have finished my news." },
        { id: "et5", speaker: "Host", narragansett: "Taubút paump maúntaman", english: "I am glad (to hear it)." },
        { id: "et6", speaker: "Guest", narragansett: "Cowaúnckamish", english: "My respects to you." },
        { id: "et7", speaker: "Host", narragansett: "Taubotneanawáyean", english: "I thank you." },
        { id: "et8", speaker: "Guest", narragansett: "Wunnégin", english: "Welcome." },
        { id: "et9", speaker: "Host", narragansett: "Asnpaumpmaúntam", english: "I am very well." },
        { id: "et10", speaker: "Guest", narragansett: "Askuttaaquompsín", english: "How are you?" },
      ],
      180,
    ),
  },
  {
    id: "night-return",
    order: 10,
    title: "Night return",
    summary: "Home again — moon, stars, sleep, and rest by the fire.",
    beat: "The day closes under Nanepaùshat and the stars.",
    chapters: ["The Heavenly Lights", "Sleep and Lodging", "House and Family"],
    chapterNums: [12, 3, 6],
    domains: ["weather", "kinship"],
    sensitivity: "everyday",
    modesAllowed: ["little_ones", "young_learner", "core_adult", "elder"],
    videoSrc: MASTER_STORY_VIDEO,
    posterSrc: "/scenes/day/night-return.jpg",
    uploadSrc: "/scenes/day/uploads/night-return.mp4",
    ...actWindow(10),
    practiceSec: 200,
    reconstructionNote: dayNote,
    lines: timed(
      [
        { id: "nr1", speaker: "Host", narragansett: "Wetuômuck", english: "At home." },
        { id: "nr2", speaker: "Host", narragansett: "Nanepaùshat", english: "The moon.", wordId: "rw-12-nanepa-shat-and" },
        { id: "nr3", speaker: "Host", narragansett: "Anóckqus, anócksuck", english: "A star, stars.", wordId: "rw-12-an-ckqus-an-cksuck" },
        { id: "nr4", speaker: "Host", narragansett: "Mishánnock", english: "The morning star.", wordId: "rw-12-mish-nnock" },
        { id: "nr5", speaker: "Host", narragansett: "Póppakunnetch, auchaugotch", english: "Dark night.", wordId: "rw-09-p-ppakunnetch-auchaugotch" },
        { id: "nr6", speaker: "Guest", narragansett: "Yo nickowémen?", english: "Shall I sleep here?", wordId: "rw-03-yo-nickow-men" },
        { id: "nr7", speaker: "Host", narragansett: "Wunnégin, cówish", english: "Welcome — sleep here.", wordId: "rw-03-wunn-gin-c-wish" },
        { id: "nr8", speaker: "Host", narragansett: "Nsowwushkâwmen", english: "I am weary." },
        { id: "nr9", speaker: "Host", narragansett: "Nkàtaquaum", english: "I am sleepy.", wordId: "rw-03-nk-taquaum" },
        { id: "nr10", speaker: "Host", narragansett: "Cowwêtuck", english: "Let us sleep.", wordId: "rw-03-coww-tuck" },
        { id: "nr11", speaker: "Host", narragansett: "Wuddtúckqunash, ponamáuta", english: "Let us lay on wood.", wordId: "rw-03-wuddt-ckqunash-ponam-uta" },
        { id: "nr12", speaker: "Both", narragansett: "Cowaúnckamish", english: "My respects to you." },
      ],
      200,
    ),
  },
];
