import type { LearningModeId } from "./types";
import type { SceneLine, SceneSensitivity } from "./scenes-data";

/**
 * Long story narratives — single continuous films (many shots stitched).
 * Platform AI shot cap is 12s; this story is a full multi-minute edit.
 * Film v4: fixed cast Host + Guest only; narrative-first, no practice-scene reuse.
 */

export type LongStory = {
  id: string;
  title: string;
  subtitle: string;
  summary: string;
  beat: string;
  sensitivity: SceneSensitivity;
  modesAllowed: LearningModeId[];
  videoSrc: string;
  posterSrc: string;
  uploadSrc: string;
  /** Actual film length in seconds */
  durationSec: number;
  /** Practice timeline (often ≈ film for watch mode) */
  practiceSec: number;
  chapters: string[];
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

/** ~25 min 12 s film — 126 × 12s shots, dawn→night, Host + Guest only */
const ONE_DAY_FILM_SEC = 25 * 60 + 12;

/**
 * Narrative dialogue for the continuous film.
 * Speakers are only Host, Guest, or Both — matching the locked cast.
 */
const oneDayLines: Omit<SceneLine, "startSec" | "endSec">[] = [
  // —— Dawn (Host wakes) ——
  { id: "od1", speaker: "Host", narragansett: "Páshisha", english: "It is sunrise." },
  { id: "od2", speaker: "Host", narragansett: "Mautàbon, Chicháuquat wompan", english: "It is day." },
  { id: "od3", speaker: "Host", narragansett: "Wetu", english: "A house / dwelling." },
  { id: "od4", speaker: "Host", narragansett: "Wetuômuck", english: "At home." },
  { id: "od5", speaker: "Host", narragansett: "Tokêtuck", english: "Let us wake." },
  { id: "od6", speaker: "Host", narragansett: "Nkàtaquaum", english: "I am sleepy." },
  { id: "od7", speaker: "Host", narragansett: "Wuddtúckqunash, ponamáuta", english: "Let us lay on wood." },
  { id: "od8", speaker: "Host", narragansett: "Nummáttaqúaw", english: "Morning (before noon)." },
  { id: "od9", speaker: "Host", narragansett: "Wunnégin", english: "Welcome." },
  // —— Kin (both) ——
  { id: "od10", speaker: "Host", narragansett: "Ascowequassunnúmmis", english: "Good morning." },
  { id: "od11", speaker: "Guest", narragansett: "Askuttaaquompsín", english: "How are you?" },
  { id: "od12", speaker: "Host", narragansett: "Asnpaumpmaúntam", english: "I am very well." },
  { id: "od13", speaker: "Guest", narragansett: "Taubút paump maúntaman", english: "I am glad you are well." },
  { id: "od14", speaker: "Guest", narragansett: "Nósh", english: "My father. (respectful address)" },
  { id: "od15", speaker: "Host", narragansett: "Okásu", english: "A mother. (speaking of kin)" },
  { id: "od16", speaker: "Host", narragansett: "Nippápoos", english: "My child. (of the family)" },
  { id: "od17", speaker: "Guest", narragansett: "Hômes", english: "An old man (elder)." },
  { id: "od18", speaker: "Host", narragansett: "Wénise", english: "An old woman (elder)." },
  { id: "od19", speaker: "Both", narragansett: "Cowaúnckamish", english: "My respects to you." },
  { id: "od20", speaker: "Guest", narragansett: "Taubotneanawáyean", english: "I thank you." },
  // —— Meal ——
  { id: "od21", speaker: "Guest", narragansett: "Niccàwkatone", english: "I am thirsty." },
  { id: "od22", speaker: "Host", narragansett: "Nip, or nipéwese", english: "Some water." },
  { id: "od23", speaker: "Host", narragansett: "Namitch, commetesímmin", english: "Stay — you must eat first." },
  { id: "od24", speaker: "Host", narragansett: "Téaquacumméich", english: "What will you eat?" },
  { id: "od25", speaker: "Guest", narragansett: "Aupúminea-nawsaùmp", english: "Parched meal boiled (soft corn porridge)." },
  { id: "od26", speaker: "Host", narragansett: "Wunnégin", english: "Welcome." },
  { id: "od27", speaker: "Guest", narragansett: "Taubotneanawáyean", english: "I thank you." },
  { id: "od28", speaker: "Host", narragansett: "Cowaúnckamish", english: "My respects to you." },
  { id: "od29", speaker: "Guest", narragansett: "Taubút paump maúntaman", english: "I am glad (of this)." },
  // —— Path ——
  { id: "od30", speaker: "Guest", narragansett: "Nickquénum", english: "I am going." },
  { id: "od31", speaker: "Guest", narragansett: "Nnatotemúckaun", english: "I will ask the way." },
  { id: "od32", speaker: "Guest", narragansett: "Kunnatótemous", english: "I will inquire of you." },
  { id: "od33", speaker: "Guest", narragansett: "Kokotemíinnea méyi", english: "Show me the way." },
  { id: "od34", speaker: "Host", narragansett: "Mishimmáyagat", english: "A great path." },
  { id: "od35", speaker: "Host", narragansett: "Peemáyagât", english: "A short way." },
  { id: "od36", speaker: "Guest", narragansett: "Taubotneanawáyean", english: "I thank you." },
  { id: "od37", speaker: "Guest", narragansett: "Nqénowhick wouttín", english: "I stay for a wind." },
  { id: "od38", speaker: "Host", narragansett: "Wunnágehan", english: "Fair wind." },
  // —— Numbers ——
  { id: "od39", speaker: "Guest", narragansett: "Nquít", english: "One." },
  { id: "od40", speaker: "Guest", narragansett: "Neèse", english: "Two." },
  { id: "od41", speaker: "Guest", narragansett: "Nìsh", english: "Three." },
  { id: "od42", speaker: "Guest", narragansett: "Yòh", english: "Four." },
  { id: "od43", speaker: "Guest", narragansett: "Napánna", english: "Five." },
  { id: "od44", speaker: "Host", narragansett: "Piùck", english: "Ten." },
  // —— Land ——
  { id: "od45", speaker: "Host", narragansett: "Aûke", english: "Earth or land." },
  { id: "od46", speaker: "Host", narragansett: "Séquan", english: "Spring." },
  { id: "od47", speaker: "Host", narragansett: "Aukeeteámitch", english: "Spring — seed-time." },
  { id: "od48", speaker: "Guest", narragansett: "Ewáchim neash", english: "Corn." },
  { id: "od49", speaker: "Host", narragansett: "Scannémeneash", english: "Seed corn." },
  { id: "od50", speaker: "Both", narragansett: "Aukeeteaûmen", english: "To plant corn." },
  { id: "od51", speaker: "Host", narragansett: "Petascúnnemun", english: "To hill the corn." },
  { id: "od52", speaker: "Guest", narragansett: "Kepenúmmin", english: "To gather corn." },
  { id: "od53", speaker: "Host", narragansett: "Sókenug", english: "A heap of corn." },
  { id: "od54", speaker: "Guest", narragansett: "Néepun", english: "Summer." },
  { id: "od55", speaker: "Host", narragansett: "Taquònck", english: "Fall / harvest." },
  { id: "od56", speaker: "Guest", narragansett: "Papóne", english: "Winter." },
  // —— Forest ——
  { id: "od57", speaker: "Host", narragansett: "Ntauchaûmen", english: "I go to hunt." },
  { id: "od58", speaker: "Both", narragansett: "Auchaûtuck", english: "Let us hunt." },
  { id: "od59", speaker: "Guest", narragansett: "Attuck, quock", english: "Deer." },
  { id: "od60", speaker: "Host", narragansett: "Wawwúnnes", english: "A young buck." },
  { id: "od61", speaker: "Guest", narragansett: "Nkéke, nkéquock", english: "Otter, otters." },
  { id: "od62", speaker: "Host", narragansett: "Npunnowwâumen", english: "I must go to my traps." },
  { id: "od63", speaker: "Guest", narragansett: "Apè hana", english: "Trap, traps." },
  { id: "od64", speaker: "Host", narragansett: "Ntaumpauchaúmen", english: "I come from hunting." },
  { id: "od65", speaker: "Guest", narragansett: "Néyhom, mâuog", english: "Turkey, turkeys." },
  { id: "od66", speaker: "Host", narragansett: "Hònck, hònckock", english: "Goose, geese." },
  { id: "od67", speaker: "Guest", narragansett: "Chógan èuck", english: "Blackbird, blackbirds." },
  { id: "od68", speaker: "Host", narragansett: "Wunnùp, pash", english: "Wing, wings." },
  // —— Water ——
  { id: "od69", speaker: "Guest", narragansett: "Nickquénum", english: "I am going." },
  { id: "od70", speaker: "Guest", narragansett: "Acâwmuck nóteshem", english: "I came over the water." },
  { id: "od71", speaker: "Host", narragansett: "Namaùus,-suck", english: "Fish, fishes." },
  { id: "od72", speaker: "Guest", narragansett: "Ntaûmen", english: "I am fishing." },
  { id: "od73", speaker: "Host", narragansett: "Nnattuckqunnûwem", english: "I go a fishing." },
  { id: "od74", speaker: "Guest", narragansett: "Missúckeke-kéquock", english: "Bass." },
  { id: "od75", speaker: "Host", narragansett: "Mishquammaùquock", english: "Red fish, salmon." },
  { id: "od76", speaker: "Guest", narragansett: "Aúmanep", english: "A fishing line." },
  { id: "od77", speaker: "Host", narragansett: "W Aûpi", english: "The wind." },
  { id: "od78", speaker: "Guest", narragansett: "Wunnágehan", english: "Fair wind." },
  { id: "od79", speaker: "Host", narragansett: "Nqénowhick wouttín", english: "I stay for a wind." },
  { id: "od80", speaker: "Guest", narragansett: "Nippâwus", english: "The sun." },
  // —— Sky ——
  { id: "od81", speaker: "Host", narragansett: "T Ocke tussinnámmin kéesuck", english: "What do you think of the weather?" },
  { id: "od82", speaker: "Guest", narragansett: "Wekineaûquat", english: "Fair weather." },
  { id: "od83", speaker: "Host", narragansett: "Tahkì or tátakki", english: "Cold weather." },
  { id: "od84", speaker: "Guest", narragansett: "Kussúttah", english: "It is hot." },
  { id: "od85", speaker: "Host", narragansett: "Nanúmmatin", english: "The north wind." },
  { id: "od86", speaker: "Guest", narragansett: "Touwúttin", english: "South wind." },
  { id: "od87", speaker: "Both", narragansett: "Kéesuck", english: "The heavens." },
  { id: "od88", speaker: "Host", narragansett: "Yahen wàiyàuw", english: "Almost sunset." },
  { id: "od89", speaker: "Guest", narragansett: "Wayaàwi", english: "The sun is set." },
  // —— Evening ——
  { id: "od90", speaker: "Guest", narragansett: "Aunchemokauhettíttea", english: "Let us talk / tell the news." },
  { id: "od91", speaker: "Guest", narragansett: "Aaunchemókaw", english: "Tell me your news." },
  { id: "od92", speaker: "Host", narragansett: "Cuttaunchemókous", english: "I will tell you the news." },
  { id: "od93", speaker: "Host", narragansett: "Cummautaunchemókous", english: "I have finished my news." },
  { id: "od94", speaker: "Guest", narragansett: "Taubút paump maúntaman", english: "I am glad (to hear it)." },
  { id: "od95", speaker: "Host", narragansett: "Cowaúnckamish", english: "My respects to you." },
  { id: "od96", speaker: "Guest", narragansett: "Taubotneanawáyean", english: "I thank you." },
  // —— Night ——
  { id: "od97", speaker: "Host", narragansett: "Wetuômuck", english: "At home." },
  { id: "od98", speaker: "Guest", narragansett: "Nanepaùshat", english: "The moon." },
  { id: "od99", speaker: "Host", narragansett: "Anóckqus, anócksuck", english: "A star, stars." },
  { id: "od100", speaker: "Guest", narragansett: "Mishánnock", english: "The morning star." },
  { id: "od101", speaker: "Host", narragansett: "Póppakunnetch, auchaugotch", english: "Dark night." },
  { id: "od102", speaker: "Guest", narragansett: "Yo nickowémen?", english: "Shall I sleep here?" },
  { id: "od103", speaker: "Host", narragansett: "Wunnégin, cówish", english: "Welcome — sleep here." },
  { id: "od104", speaker: "Guest", narragansett: "Nsowwushkâwmen", english: "I am weary." },
  { id: "od105", speaker: "Guest", narragansett: "Nkàtaquaum", english: "I am sleepy." },
  { id: "od106", speaker: "Host", narragansett: "Cowwêtuck", english: "Let us sleep." },
  { id: "od107", speaker: "Both", narragansett: "Wuddtúckqunash, ponamáuta", english: "Let us lay on wood." },
  { id: "od108", speaker: "Both", narragansett: "Cowaúnckamish", english: "My respects to you." },
  // —— Closing ——
  { id: "od109", speaker: "Host", narragansett: "Páshisha", english: "It is sunrise. (the day remembered)" },
  { id: "od110", speaker: "Guest", narragansett: "Wayaàwi", english: "The sun is set." },
  { id: "od111", speaker: "Both", narragansett: "Wetuômuck", english: "At home." },
  { id: "od112", speaker: "Both", narragansett: "Cowaúnckamish", english: "My respects to you." },
  { id: "od113", speaker: "Guest", narragansett: "Taubotneanawáyean", english: "I thank you." },
  { id: "od114", speaker: "Host", narragansett: "Wunnégin", english: "Welcome." },
];

export const LONG_STORIES: LongStory[] = [
  {
    id: "one-day-story",
    title: "One day",
    subtitle: "A continuous film from dawn to night",
    summary:
      "One long reconstructed narrative with the same two people throughout: Host (elder of the wetu) and Guest (traveler). They wake, greet, share a meal, walk the path, work the land, move through forest and water, read the sky, talk at evening, and rest under the stars — with Narragansett language woven end to end.",
    beat: "A full day’s arc in a single film — fixed cast, language first, no scene-skipping shorts.",
    sensitivity: "everyday",
    modesAllowed: ["little_ones", "young_learner", "core_adult", "elder"],
    videoSrc: "/scenes/long/one-day-story.mp4",
    posterSrc: "/scenes/long/one-day-story.jpg",
    uploadSrc: "/scenes/long/uploads/one-day-story.mp4",
    durationSec: ONE_DAY_FILM_SEC,
    practiceSec: ONE_DAY_FILM_SEC,
    chapters: [
      "Salutation",
      "Eating and Entertainment",
      "Sleep and Lodging",
      "Numbers",
      "Relations of Consanguinity",
      "House and Family",
      "Discourse and News",
      "Time of the Day",
      "Seasons of the Year",
      "Travel",
      "The Heavenly Lights",
      "The Weather",
      "The Winds",
      "Fowl",
      "Earth and Fruits",
      "Beasts",
      "The Sea",
      "Fish and Fishing",
      "Hunting",
    ],
    reconstructionNote:
      "Long story (film v4): 126 narrative shots of the same Host and Guest, generated for this story and stitched into one continuous ~25-minute film. Dialogue forms from Williams 1643 with modern English. Not a living speaker recording and not a ceremonial film. Replace the whole file via public/scenes/long/uploads/one-day-story.mp4 when you have community footage.",
    lines: timed(oneDayLines, ONE_DAY_FILM_SEC),
  },
];
