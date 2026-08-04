import type { LearningModeId } from "./types";
import type { SceneLine, SceneSensitivity } from "./scenes-data";

/**
 * Long story narratives — single continuous films (many shots stitched).
 * Platform AI shot cap is 12s; this story is a full multi-minute (or longer) edit.
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

/** ~40 min 50 s film — one continuous day story */
const ONE_DAY_FILM_SEC = 40 * 60 + 50;

const oneDayLines: Omit<SceneLine, "startSec" | "endSec">[] = [
  // —— Dawn ——
  { id: "od1", speaker: "Narrator", narragansett: "Páshisha", english: "It is sunrise." },
  { id: "od2", speaker: "Narrator", narragansett: "Mautàbon, Chicháuquat wompan", english: "It is day." },
  { id: "od3", speaker: "Narrator", narragansett: "Wetu", english: "A house / dwelling." },
  { id: "od4", speaker: "Narrator", narragansett: "Wetuômuck", english: "At home." },
  { id: "od5", speaker: "Speaker", narragansett: "Tokêtuck", english: "Let us wake." },
  { id: "od6", speaker: "Speaker", narragansett: "Nkàtaquaum", english: "I am sleepy." },
  { id: "od7", speaker: "Speaker", narragansett: "Wuddtúckqunash, ponamáuta", english: "Let us lay on wood." },
  { id: "od8", speaker: "Speaker", narragansett: "Nummáttaqúaw", english: "Morning (before noon)." },
  { id: "od9", speaker: "Speaker", narragansett: "Wunnégin", english: "Welcome." },
  // —— Kin ——
  { id: "od10", speaker: "Host", narragansett: "Ascowequassunnúmmis", english: "Good morning." },
  { id: "od11", speaker: "Guest", narragansett: "Askuttaaquompsín", english: "How are you?" },
  { id: "od12", speaker: "Host", narragansett: "Asnpaumpmaúntam", english: "I am very well." },
  { id: "od13", speaker: "Guest", narragansett: "Taubút paump maúntaman", english: "I am glad you are well." },
  { id: "od14", speaker: "Speaker", narragansett: "Nósh", english: "My father." },
  { id: "od15", speaker: "Speaker", narragansett: "Okásu", english: "A mother." },
  { id: "od16", speaker: "Speaker", narragansett: "Nippápoos", english: "My child." },
  { id: "od17", speaker: "Speaker", narragansett: "Hômes", english: "An old man (elder)." },
  { id: "od18", speaker: "Speaker", narragansett: "Wénise", english: "An old woman (elder)." },
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
  // —— Path ——
  { id: "od29", speaker: "Traveler", narragansett: "Nickquénum", english: "I am going." },
  { id: "od30", speaker: "Traveler", narragansett: "Nnatotemúckaun", english: "I will ask the way." },
  { id: "od31", speaker: "Traveler", narragansett: "Kunnatótemous", english: "I will inquire of you." },
  { id: "od32", speaker: "Traveler", narragansett: "Kokotemíinnea méyi", english: "Show me the way." },
  { id: "od33", speaker: "Guide", narragansett: "Mishimmáyagat", english: "A great path." },
  { id: "od34", speaker: "Guide", narragansett: "Peemáyagât", english: "A short way." },
  { id: "od35", speaker: "Traveler", narragansett: "Taubotneanawáyean", english: "I thank you." },
  { id: "od36", speaker: "Traveler", narragansett: "Nqénowhick wouttín", english: "I stay for a wind." },
  // —— Numbers along the way ——
  { id: "od37", speaker: "Speaker", narragansett: "Nquít", english: "One." },
  { id: "od38", speaker: "Speaker", narragansett: "Neèse", english: "Two." },
  { id: "od39", speaker: "Speaker", narragansett: "Nìsh", english: "Three." },
  { id: "od40", speaker: "Speaker", narragansett: "Yòh", english: "Four." },
  { id: "od41", speaker: "Speaker", narragansett: "Napánna", english: "Five." },
  { id: "od42", speaker: "Speaker", narragansett: "Piùck", english: "Ten." },
  // —— Land & seasons ——
  { id: "od43", speaker: "Speaker", narragansett: "Aûke", english: "Earth or land." },
  { id: "od44", speaker: "Speaker", narragansett: "Séquan", english: "Spring." },
  { id: "od45", speaker: "Speaker", narragansett: "Aukeeteámitch", english: "Spring — seed-time." },
  { id: "od46", speaker: "Speaker", narragansett: "Ewáchim neash", english: "Corn." },
  { id: "od47", speaker: "Speaker", narragansett: "Scannémeneash", english: "Seed corn." },
  { id: "od48", speaker: "Speaker", narragansett: "Aukeeteaûmen", english: "To plant corn." },
  { id: "od49", speaker: "Speaker", narragansett: "Petascúnnemun", english: "To hill the corn." },
  { id: "od50", speaker: "Speaker", narragansett: "Kepenúmmin", english: "To gather corn." },
  { id: "od51", speaker: "Speaker", narragansett: "Sókenug", english: "A heap of corn." },
  { id: "od52", speaker: "Speaker", narragansett: "Néepun", english: "Summer." },
  { id: "od53", speaker: "Speaker", narragansett: "Taquònck", english: "Fall / harvest." },
  { id: "od54", speaker: "Speaker", narragansett: "Papóne", english: "Winter." },
  // —— Forest ——
  { id: "od55", speaker: "Speaker", narragansett: "Ntauchaûmen", english: "I go to hunt." },
  { id: "od56", speaker: "Speaker", narragansett: "Auchaûtuck", english: "Let us hunt." },
  { id: "od57", speaker: "Speaker", narragansett: "Attuck, quock", english: "Deer." },
  { id: "od58", speaker: "Speaker", narragansett: "Wawwúnnes", english: "A young buck." },
  { id: "od59", speaker: "Speaker", narragansett: "Nkéke, nkéquock", english: "Otter, otters." },
  { id: "od60", speaker: "Speaker", narragansett: "Npunnowwâumen", english: "I must go to my traps." },
  { id: "od61", speaker: "Speaker", narragansett: "Apè hana", english: "Trap, traps." },
  { id: "od62", speaker: "Speaker", narragansett: "Ntaumpauchaúmen", english: "I come from hunting." },
  // —— Birds ——
  { id: "od63", speaker: "Speaker", narragansett: "Néyhom, mâuog", english: "Turkey, turkeys." },
  { id: "od64", speaker: "Speaker", narragansett: "Hònck, hònckock", english: "Goose, geese." },
  { id: "od65", speaker: "Speaker", narragansett: "Chógan èuck", english: "Blackbird, blackbirds." },
  { id: "od66", speaker: "Speaker", narragansett: "Wunnùp, pash", english: "Wing, wings." },
  // —— Water ——
  { id: "od67", speaker: "Paddler", narragansett: "Nickquénum", english: "I am going." },
  { id: "od68", speaker: "Paddler", narragansett: "Acâwmuck nóteshem", english: "I came over the water." },
  { id: "od69", speaker: "Speaker", narragansett: "Namaùus,-suck", english: "Fish, fishes." },
  { id: "od70", speaker: "Speaker", narragansett: "Ntaûmen", english: "I am fishing." },
  { id: "od71", speaker: "Speaker", narragansett: "Nnattuckqunnûwem", english: "I go a fishing." },
  { id: "od72", speaker: "Speaker", narragansett: "Missúckeke-kéquock", english: "Bass." },
  { id: "od73", speaker: "Speaker", narragansett: "Mishquammaùquock", english: "Red fish, salmon." },
  { id: "od74", speaker: "Speaker", narragansett: "Aúmanep", english: "A fishing line." },
  { id: "od75", speaker: "Paddler", narragansett: "W Aûpi", english: "The wind." },
  { id: "od76", speaker: "Paddler", narragansett: "Wunnágehan", english: "Fair wind." },
  { id: "od77", speaker: "Paddler", narragansett: "Nqénowhick wouttín", english: "I stay for a wind." },
  { id: "od78", speaker: "Paddler", narragansett: "Nippâwus", english: "The sun." },
  // —— Weather & sky ——
  { id: "od79", speaker: "Speaker", narragansett: "T Ocke tussinnámmin kéesuck", english: "What do you think of the weather?" },
  { id: "od80", speaker: "Speaker", narragansett: "Wekineaûquat", english: "Fair weather." },
  { id: "od81", speaker: "Speaker", narragansett: "Tahkì or tátakki", english: "Cold weather." },
  { id: "od82", speaker: "Speaker", narragansett: "Kussúttah", english: "It is hot." },
  { id: "od83", speaker: "Speaker", narragansett: "Nanúmmatin", english: "The north wind." },
  { id: "od84", speaker: "Speaker", narragansett: "Touwúttin", english: "South wind." },
  { id: "od85", speaker: "Speaker", narragansett: "Kéesuck", english: "The heavens." },
  { id: "od86", speaker: "Speaker", narragansett: "Yahen wàiyàuw", english: "Almost sunset." },
  { id: "od87", speaker: "Speaker", narragansett: "Wayaàwi", english: "The sun is set." },
  // —— Evening talk ——
  { id: "od88", speaker: "A", narragansett: "Aunchemokauhettíttea", english: "Let us talk / tell the news." },
  { id: "od89", speaker: "A", narragansett: "Aaunchemókaw", english: "Tell me your news." },
  { id: "od90", speaker: "B", narragansett: "Cuttaunchemókous", english: "I will tell you the news." },
  { id: "od91", speaker: "B", narragansett: "Cummautaunchemókous", english: "I have finished my news." },
  { id: "od92", speaker: "A", narragansett: "Taubút paump maúntaman", english: "I am glad (to hear it)." },
  { id: "od93", speaker: "B", narragansett: "Cowaúnckamish", english: "My respects to you." },
  { id: "od94", speaker: "A", narragansett: "Taubotneanawáyean", english: "I thank you." },
  // —— Night ——
  { id: "od95", speaker: "Speaker", narragansett: "Wetuômuck", english: "At home." },
  { id: "od96", speaker: "Speaker", narragansett: "Nanepaùshat", english: "The moon." },
  { id: "od97", speaker: "Speaker", narragansett: "Anóckqus, anócksuck", english: "A star, stars." },
  { id: "od98", speaker: "Speaker", narragansett: "Mishánnock", english: "The morning star." },
  { id: "od99", speaker: "Speaker", narragansett: "Póppakunnetch, auchaugotch", english: "Dark night." },
  { id: "od100", speaker: "Guest", narragansett: "Yo nickowémen?", english: "Shall I sleep here?" },
  { id: "od101", speaker: "Host", narragansett: "Wunnégin, cówish", english: "Welcome — sleep here." },
  { id: "od102", speaker: "Speaker", narragansett: "Nsowwushkâwmen", english: "I am weary." },
  { id: "od103", speaker: "Speaker", narragansett: "Nkàtaquaum", english: "I am sleepy." },
  { id: "od104", speaker: "Host", narragansett: "Cowwêtuck", english: "Let us sleep." },
  { id: "od105", speaker: "Speaker", narragansett: "Wuddtúckqunash, ponamáuta", english: "Let us lay on wood." },
  { id: "od106", speaker: "Both", narragansett: "Cowaúnckamish", english: "My respects to you." },
  // —— Closing echo of the day ——
  { id: "od107", speaker: "Narrator", narragansett: "Páshisha", english: "It is sunrise. (the day remembered)" },
  { id: "od108", speaker: "Narrator", narragansett: "Wayaàwi", english: "The sun is set." },
  { id: "od109", speaker: "Narrator", narragansett: "Wetuômuck", english: "At home." },
  { id: "od110", speaker: "Narrator", narragansett: "Cowaúnckamish", english: "My respects to you." },
  { id: "od111", speaker: "Narrator", narragansett: "Taubotneanawáyean", english: "I thank you." },
  { id: "od112", speaker: "Narrator", narragansett: "Wunnégin", english: "Welcome." },
];

export const LONG_STORIES: LongStory[] = [
  {
    id: "one-day-story",
    title: "One day",
    subtitle: "A continuous film from dawn to night",
    summary:
      "One long reconstructed narrative: wake in the wetu, greet kin, share a meal, walk the path, work the land, move through forest and water, read the sky, talk at evening, and rest under the stars — with Narragansett throughout.",
    beat: "A full day’s arc in a single film, language woven end to end.",
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
      "Long story narrative: many AI reconstruction shots stitched into one continuous film (~41 minutes). Dialogue forms from Williams 1643 with modern English. Not a living speaker recording and not a ceremonial film. Replace the whole file via public/scenes/long/uploads/one-day-story.mp4 when you have community footage.",
    lines: timed(oneDayLines, ONE_DAY_FILM_SEC),
  },
];
