import type { LearningModeId } from "./types";
import type { SceneLine, SceneSensitivity } from "./scenes-data";

/**
 * Long story narratives — single continuous films (many shots stitched).
 * Film v4.2: Host + Guest only; shot-accurate line windows from player contract.
 * Keyshots use AI image-to-video motion; remaining shots Ken Burns from locked stills.
 * Do not re-use practice-scene shorts for this media package.
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
  /** Practice timeline (matches film for watch mode) */
  practiceSec: number;
  chapters: string[];
  lines: SceneLine[];
  reconstructionNote: string;
};

/** ~25 min 12 s film — 126 × 12s shots, dawn→night, Host + Guest only */
const ONE_DAY_FILM_SEC = 25 * 60 + 12;

/**
 * Shot-accurate dialogue windows (from player-contract-one-day.json).
 * Speakers are only Host, Guest, or Both.
 */
const oneDayLines: SceneLine[] = [
  { id: "od1", speaker: "Host", narragansett: "P\u00e1shisha", english: "It is sunrise.", startSec: 0, endSec: 12 },
  { id: "od2", speaker: "Host", narragansett: "Maut\u00e0bon, Chich\u00e1uquat wompan", english: "It is day.", startSec: 12, endSec: 24 },
  { id: "od3", speaker: "Host", narragansett: "Wetu", english: "A house / dwelling.", startSec: 24, endSec: 36 },
  { id: "od4", speaker: "Host", narragansett: "Wetu\u00f4muck", english: "At home.", startSec: 36, endSec: 48 },
  { id: "od5", speaker: "Host", narragansett: "Tok\u00eatuck", english: "Let us wake.", startSec: 48, endSec: 72 },
  { id: "od6", speaker: "Host", narragansett: "Nk\u00e0taquaum", english: "I am sleepy.", startSec: 72, endSec: 84 },
  { id: "od7", speaker: "Host", narragansett: "Wuddt\u00fackqunash, ponam\u00e1uta", english: "Let us lay on wood.", startSec: 84, endSec: 96 },
  { id: "od8", speaker: "Host", narragansett: "Numm\u00e1ttaq\u00faaw", english: "Morning (before noon).", startSec: 96, endSec: 108 },
  { id: "od9", speaker: "Host", narragansett: "Wunn\u00e9gin", english: "Welcome.", startSec: 108, endSec: 120 },
  { id: "od10", speaker: "Host", narragansett: "Ascowequassunn\u00fammis", english: "Good morning.", startSec: 120, endSec: 132 },
  { id: "od11", speaker: "Guest", narragansett: "Askuttaaquomps\u00edn", english: "How are you?", startSec: 132, endSec: 144 },
  { id: "od12", speaker: "Host", narragansett: "Asnpaumpma\u00fantam", english: "I am very well.", startSec: 144, endSec: 156 },
  { id: "od13", speaker: "Guest", narragansett: "Taub\u00fat paump ma\u00fantaman", english: "I am glad you are well.", startSec: 156, endSec: 168 },
  { id: "od14", speaker: "Guest", narragansett: "N\u00f3sh", english: "My father. (respectful address)", startSec: 168, endSec: 180 },
  { id: "od15", speaker: "Host", narragansett: "Ok\u00e1su", english: "A mother. (speaking of kin)", startSec: 180, endSec: 204 },
  { id: "od16", speaker: "Host", narragansett: "Nipp\u00e1poos", english: "My child. (of the family)", startSec: 204, endSec: 216 },
  { id: "od17", speaker: "Guest", narragansett: "H\u00f4mes", english: "An old man (elder).", startSec: 216, endSec: 228 },
  { id: "od18", speaker: "Host", narragansett: "W\u00e9nise", english: "An old woman (elder).", startSec: 228, endSec: 240 },
  { id: "od19", speaker: "Both", narragansett: "Cowa\u00fanckamish", english: "My respects to you.", startSec: 240, endSec: 252 },
  { id: "od20", speaker: "Guest", narragansett: "Taubotneanaw\u00e1yean", english: "I thank you.", startSec: 252, endSec: 264 },
  { id: "od21", speaker: "Guest", narragansett: "Nicc\u00e0wkatone", english: "I am thirsty.", startSec: 264, endSec: 276 },
  { id: "od22", speaker: "Host", narragansett: "Nip, or nip\u00e9wese", english: "Some water.", startSec: 276, endSec: 288 },
  { id: "od23", speaker: "Host", narragansett: "Namitch, commetes\u00edmmin", english: "Stay \u2014 you must eat first.", startSec: 288, endSec: 300 },
  { id: "od24", speaker: "Host", narragansett: "T\u00e9aquacumm\u00e9ich", english: "What will you eat?", startSec: 300, endSec: 324 },
  { id: "od25", speaker: "Guest", narragansett: "Aup\u00faminea-nawsa\u00f9mp", english: "Parched meal boiled (soft corn porridge).", startSec: 324, endSec: 336 },
  { id: "od26", speaker: "Host", narragansett: "Wunn\u00e9gin", english: "Welcome.", startSec: 336, endSec: 348 },
  { id: "od27", speaker: "Guest", narragansett: "Taubotneanaw\u00e1yean", english: "I thank you.", startSec: 348, endSec: 360 },
  { id: "od28", speaker: "Host", narragansett: "Cowa\u00fanckamish", english: "My respects to you.", startSec: 360, endSec: 372 },
  { id: "od29", speaker: "Guest", narragansett: "Taub\u00fat paump ma\u00fantaman", english: "I am glad (of this).", startSec: 372, endSec: 384 },
  { id: "od30", speaker: "Guest", narragansett: "Nickqu\u00e9num", english: "I am going.", startSec: 384, endSec: 396 },
  { id: "od31", speaker: "Guest", narragansett: "Nnatotem\u00fackaun", english: "I will ask the way.", startSec: 396, endSec: 408 },
  { id: "od32", speaker: "Guest", narragansett: "Kunnat\u00f3temous", english: "I will inquire of you.", startSec: 408, endSec: 420 },
  { id: "od33", speaker: "Guest", narragansett: "Kokotem\u00edinnea m\u00e9yi", english: "Show me the way.", startSec: 420, endSec: 432 },
  { id: "od34", speaker: "Host", narragansett: "Mishimm\u00e1yagat", english: "A great path.", startSec: 432, endSec: 456 },
  { id: "od35", speaker: "Host", narragansett: "Peem\u00e1yag\u00e2t", english: "A short way.", startSec: 456, endSec: 468 },
  { id: "od36", speaker: "Guest", narragansett: "Taubotneanaw\u00e1yean", english: "I thank you.", startSec: 468, endSec: 480 },
  { id: "od37", speaker: "Guest", narragansett: "Nq\u00e9nowhick woutt\u00edn", english: "I stay for a wind.", startSec: 480, endSec: 492 },
  { id: "od38", speaker: "Host", narragansett: "Wunn\u00e1gehan", english: "Fair wind.", startSec: 492, endSec: 504 },
  { id: "od39", speaker: "Guest", narragansett: "Nqu\u00edt", english: "One.", startSec: 504, endSec: 516 },
  { id: "od40", speaker: "Guest", narragansett: "Ne\u00e8se", english: "Two.", startSec: 516, endSec: 528 },
  { id: "od41", speaker: "Guest", narragansett: "N\u00ecsh", english: "Three.", startSec: 528, endSec: 540 },
  { id: "od42", speaker: "Guest", narragansett: "Y\u00f2h", english: "Four.", startSec: 540, endSec: 552 },
  { id: "od43", speaker: "Guest", narragansett: "Nap\u00e1nna", english: "Five.", startSec: 552, endSec: 576 },
  { id: "od44", speaker: "Host", narragansett: "Pi\u00f9ck", english: "Ten.", startSec: 576, endSec: 588 },
  { id: "od45", speaker: "Host", narragansett: "A\u00fbke", english: "Earth or land.", startSec: 588, endSec: 600 },
  { id: "od46", speaker: "Host", narragansett: "S\u00e9quan", english: "Spring.", startSec: 600, endSec: 612 },
  { id: "od47", speaker: "Host", narragansett: "Aukeete\u00e1mitch", english: "Spring \u2014 seed-time.", startSec: 612, endSec: 624 },
  { id: "od48", speaker: "Guest", narragansett: "Ew\u00e1chim neash", english: "Corn.", startSec: 624, endSec: 636 },
  { id: "od49", speaker: "Host", narragansett: "Scann\u00e9meneash", english: "Seed corn.", startSec: 636, endSec: 648 },
  { id: "od50", speaker: "Both", narragansett: "Aukeetea\u00fbmen", english: "To plant corn.", startSec: 648, endSec: 660 },
  { id: "od51", speaker: "Host", narragansett: "Petasc\u00fannemun", english: "To hill the corn.", startSec: 660, endSec: 672 },
  { id: "od52", speaker: "Guest", narragansett: "Kepen\u00fammin", english: "To gather corn.", startSec: 672, endSec: 684 },
  { id: "od53", speaker: "Host", narragansett: "S\u00f3kenug", english: "A heap of corn.", startSec: 684, endSec: 708 },
  { id: "od54", speaker: "Guest", narragansett: "N\u00e9epun", english: "Summer.", startSec: 708, endSec: 720 },
  { id: "od55", speaker: "Host", narragansett: "Taqu\u00f2nck", english: "Fall / harvest.", startSec: 720, endSec: 732 },
  { id: "od56", speaker: "Guest", narragansett: "Pap\u00f3ne", english: "Winter.", startSec: 732, endSec: 744 },
  { id: "od57", speaker: "Host", narragansett: "Ntaucha\u00fbmen", english: "I go to hunt.", startSec: 744, endSec: 756 },
  { id: "od58", speaker: "Both", narragansett: "Aucha\u00fbtuck", english: "Let us hunt.", startSec: 756, endSec: 768 },
  { id: "od59", speaker: "Guest", narragansett: "Attuck, quock", english: "Deer.", startSec: 768, endSec: 780 },
  { id: "od60", speaker: "Host", narragansett: "Waww\u00fannes", english: "A young buck.", startSec: 780, endSec: 792 },
  { id: "od61", speaker: "Guest", narragansett: "Nk\u00e9ke, nk\u00e9quock", english: "Otter, otters.", startSec: 792, endSec: 804 },
  { id: "od62", speaker: "Host", narragansett: "Npunnoww\u00e2umen", english: "I must go to my traps.", startSec: 804, endSec: 828 },
  { id: "od63", speaker: "Guest", narragansett: "Ap\u00e8 hana", english: "Trap, traps.", startSec: 828, endSec: 840 },
  { id: "od64", speaker: "Host", narragansett: "Ntaumpaucha\u00famen", english: "I come from hunting.", startSec: 840, endSec: 852 },
  { id: "od65", speaker: "Guest", narragansett: "N\u00e9yhom, m\u00e2uog", english: "Turkey, turkeys.", startSec: 852, endSec: 864 },
  { id: "od66", speaker: "Host", narragansett: "H\u00f2nck, h\u00f2nckock", english: "Goose, geese.", startSec: 864, endSec: 876 },
  { id: "od67", speaker: "Guest", narragansett: "Ch\u00f3gan \u00e8uck", english: "Blackbird, blackbirds.", startSec: 876, endSec: 888 },
  { id: "od68", speaker: "Host", narragansett: "Wunn\u00f9p, pash", english: "Wing, wings.", startSec: 888, endSec: 900 },
  { id: "od69", speaker: "Guest", narragansett: "Nickqu\u00e9num", english: "I am going.", startSec: 900, endSec: 912 },
  { id: "od70", speaker: "Guest", narragansett: "Ac\u00e2wmuck n\u00f3teshem", english: "I came over the water.", startSec: 912, endSec: 924 },
  { id: "od71", speaker: "Host", narragansett: "Nama\u00f9us,-suck", english: "Fish, fishes.", startSec: 924, endSec: 936 },
  { id: "od72", speaker: "Guest", narragansett: "Nta\u00fbmen", english: "I am fishing.", startSec: 936, endSec: 960 },
  { id: "od73", speaker: "Host", narragansett: "Nnattuckqunn\u00fbwem", english: "I go a fishing.", startSec: 960, endSec: 972 },
  { id: "od74", speaker: "Guest", narragansett: "Miss\u00fackeke-k\u00e9quock", english: "Bass.", startSec: 972, endSec: 984 },
  { id: "od75", speaker: "Host", narragansett: "Mishquamma\u00f9quock", english: "Red fish, salmon.", startSec: 984, endSec: 996 },
  { id: "od76", speaker: "Guest", narragansett: "A\u00famanep", english: "A fishing line.", startSec: 996, endSec: 1008 },
  { id: "od77", speaker: "Host", narragansett: "W A\u00fbpi", english: "The wind.", startSec: 1008, endSec: 1020 },
  { id: "od78", speaker: "Guest", narragansett: "Wunn\u00e1gehan", english: "Fair wind.", startSec: 1020, endSec: 1032 },
  { id: "od79", speaker: "Host", narragansett: "Nq\u00e9nowhick woutt\u00edn", english: "I stay for a wind.", startSec: 1032, endSec: 1044 },
  { id: "od80", speaker: "Guest", narragansett: "Nipp\u00e2wus", english: "The sun.", startSec: 1044, endSec: 1056 },
  { id: "od81", speaker: "Host", narragansett: "T Ocke tussinn\u00e1mmin k\u00e9esuck", english: "What do you think of the weather?", startSec: 1056, endSec: 1080 },
  { id: "od82", speaker: "Guest", narragansett: "Wekinea\u00fbquat", english: "Fair weather.", startSec: 1080, endSec: 1092 },
  { id: "od83", speaker: "Host", narragansett: "Tahk\u00ec or t\u00e1takki", english: "Cold weather.", startSec: 1092, endSec: 1104 },
  { id: "od84", speaker: "Guest", narragansett: "Kuss\u00fattah", english: "It is hot.", startSec: 1104, endSec: 1116 },
  { id: "od85", speaker: "Host", narragansett: "Nan\u00fammatin", english: "The north wind.", startSec: 1116, endSec: 1128 },
  { id: "od86", speaker: "Guest", narragansett: "Touw\u00fattin", english: "South wind.", startSec: 1128, endSec: 1140 },
  { id: "od87", speaker: "Both", narragansett: "K\u00e9esuck", english: "The heavens.", startSec: 1140, endSec: 1152 },
  { id: "od88", speaker: "Host", narragansett: "Yahen w\u00e0iy\u00e0uw", english: "Almost sunset.", startSec: 1152, endSec: 1164 },
  { id: "od89", speaker: "Guest", narragansett: "Waya\u00e0wi", english: "The sun is set.", startSec: 1164, endSec: 1176 },
  { id: "od90", speaker: "Guest", narragansett: "Aunchemokauhett\u00edttea", english: "Let us talk / tell the news.", startSec: 1176, endSec: 1188 },
  { id: "od91", speaker: "Guest", narragansett: "Aaunchem\u00f3kaw", english: "Tell me your news.", startSec: 1188, endSec: 1212 },
  { id: "od92", speaker: "Host", narragansett: "Cuttaunchem\u00f3kous", english: "I will tell you the news.", startSec: 1212, endSec: 1224 },
  { id: "od93", speaker: "Host", narragansett: "Cummautaunchem\u00f3kous", english: "I have finished my news.", startSec: 1224, endSec: 1236 },
  { id: "od94", speaker: "Guest", narragansett: "Taub\u00fat paump ma\u00fantaman", english: "I am glad (to hear it).", startSec: 1236, endSec: 1248 },
  { id: "od95", speaker: "Host", narragansett: "Cowa\u00fanckamish", english: "My respects to you.", startSec: 1248, endSec: 1260 },
  { id: "od96", speaker: "Guest", narragansett: "Taubotneanaw\u00e1yean", english: "I thank you.", startSec: 1260, endSec: 1272 },
  { id: "od97", speaker: "Host", narragansett: "Wetu\u00f4muck", english: "At home.", startSec: 1272, endSec: 1284 },
  { id: "od98", speaker: "Guest", narragansett: "Nanepa\u00f9shat", english: "The moon.", startSec: 1284, endSec: 1296 },
  { id: "od99", speaker: "Host", narragansett: "An\u00f3ckqus, an\u00f3cksuck", english: "A star, stars.", startSec: 1296, endSec: 1308 },
  { id: "od100", speaker: "Guest", narragansett: "Mish\u00e1nnock", english: "The morning star.", startSec: 1308, endSec: 1332 },
  { id: "od101", speaker: "Host", narragansett: "P\u00f3ppakunnetch, auchaugotch", english: "Dark night.", startSec: 1332, endSec: 1344 },
  { id: "od102", speaker: "Guest", narragansett: "Yo nickow\u00e9men?", english: "Shall I sleep here?", startSec: 1344, endSec: 1356 },
  { id: "od103", speaker: "Host", narragansett: "Wunn\u00e9gin, c\u00f3wish", english: "Welcome \u2014 sleep here.", startSec: 1356, endSec: 1368 },
  { id: "od104", speaker: "Guest", narragansett: "Nsowwushk\u00e2wmen", english: "I am weary.", startSec: 1368, endSec: 1380 },
  { id: "od105", speaker: "Guest", narragansett: "Nk\u00e0taquaum", english: "I am sleepy.", startSec: 1380, endSec: 1392 },
  { id: "od106", speaker: "Host", narragansett: "Coww\u00eatuck", english: "Let us sleep.", startSec: 1392, endSec: 1404 },
  { id: "od107", speaker: "Both", narragansett: "Wuddt\u00fackqunash, ponam\u00e1uta", english: "Let us lay on wood.", startSec: 1404, endSec: 1416 },
  { id: "od108", speaker: "Both", narragansett: "Cowa\u00fanckamish", english: "My respects to you.", startSec: 1416, endSec: 1428 },
  { id: "od109", speaker: "Host", narragansett: "P\u00e1shisha", english: "It is sunrise. (the day remembered)", startSec: 1428, endSec: 1440 },
  { id: "od110", speaker: "Guest", narragansett: "Waya\u00e0wi", english: "The sun is set.", startSec: 1440, endSec: 1464 },
  { id: "od111", speaker: "Both", narragansett: "Wetu\u00f4muck", english: "At home.", startSec: 1464, endSec: 1476 },
  { id: "od112", speaker: "Both", narragansett: "Cowa\u00fanckamish", english: "My respects to you.", startSec: 1476, endSec: 1488 },
  { id: "od113", speaker: "Guest", narragansett: "Taubotneanaw\u00e1yean", english: "I thank you.", startSec: 1488, endSec: 1500 },
  { id: "od114", speaker: "Host", narragansett: "Wunn\u00e9gin", english: "Welcome.", startSec: 1500, endSec: 1512 },
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
      "Long story (film v4.2): 126 narrative shots of the same Host and Guest, stitched into one continuous 25-minute film. Twelve keyshots use AI image-to-video motion; other shots are Ken Burns from locked stills. Line timings are shot-accurate. Dialogue forms from Williams 1643 with modern English. Not a living speaker recording and not a ceremonial film. Replace via public/scenes/long/uploads/one-day-story.mp4 when community footage is ready.",
    lines: oneDayLines,
  },
];
