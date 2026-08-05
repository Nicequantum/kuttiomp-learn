import type { LearningModeId } from "./types";
import type { SceneLine, SceneSensitivity } from "./scenes-data";

/**
 * Long story narratives — single continuous films (many shots stitched).
 * Film V5 master-first: Host + Guest only; ~15 min / 900s continuous film.
 * Full Day acts are time windows into this master (not separate act mp4s as primary).
 * Line timings scaled from v4 1512s timeline → 900s. Style: stylized cinematic animation.
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

/** ~15 min master film (Film V5) — 10 acts × 90s windows, dawn→night, Host + Guest only */
const ONE_DAY_FILM_SEC = 900;

/**
 * Shot-accurate dialogue windows (from player-contract-one-day.json).
 * Speakers are only Host, Guest, or Both.
 */
const oneDayLines: SceneLine[] = [
  { id: "od1", speaker: "Host", narragansett: "P\u00e1shisha", english: "It is sunrise.", startSec: 0.0, endSec: 7.14 },
  { id: "od2", speaker: "Host", narragansett: "Maut\u00e0bon, Chich\u00e1uquat wompan", english: "It is day.", startSec: 7.14, endSec: 14.29 },
  { id: "od3", speaker: "Host", narragansett: "Wetu", english: "A house / dwelling.", startSec: 14.29, endSec: 21.43 },
  { id: "od4", speaker: "Host", narragansett: "Wetu\u00f4muck", english: "At home.", startSec: 21.43, endSec: 28.57 },
  { id: "od5", speaker: "Host", narragansett: "Tok\u00eatuck", english: "Let us wake.", startSec: 28.57, endSec: 42.86 },
  { id: "od6", speaker: "Host", narragansett: "Nk\u00e0taquaum", english: "I am sleepy.", startSec: 42.86, endSec: 50.0 },
  { id: "od7", speaker: "Host", narragansett: "Wuddt\u00fackqunash, ponam\u00e1uta", english: "Let us lay on wood.", startSec: 50.0, endSec: 57.14 },
  { id: "od8", speaker: "Host", narragansett: "Numm\u00e1ttaq\u00faaw", english: "Morning (before noon).", startSec: 57.14, endSec: 64.29 },
  { id: "od9", speaker: "Host", narragansett: "Wunn\u00e9gin", english: "Welcome.", startSec: 64.29, endSec: 71.43 },
  { id: "od10", speaker: "Host", narragansett: "Ascowequassunn\u00fammis", english: "Good morning.", startSec: 71.43, endSec: 78.57 },
  { id: "od11", speaker: "Guest", narragansett: "Askuttaaquomps\u00edn", english: "How are you?", startSec: 78.57, endSec: 85.71 },
  { id: "od12", speaker: "Host", narragansett: "Asnpaumpma\u00fantam", english: "I am very well.", startSec: 85.71, endSec: 92.86 },
  { id: "od13", speaker: "Guest", narragansett: "Taub\u00fat paump ma\u00fantaman", english: "I am glad you are well.", startSec: 92.86, endSec: 100.0 },
  { id: "od14", speaker: "Guest", narragansett: "N\u00f3sh", english: "My father. (respectful address)", startSec: 100.0, endSec: 107.14 },
  { id: "od15", speaker: "Host", narragansett: "Ok\u00e1su", english: "A mother. (speaking of kin)", startSec: 107.14, endSec: 121.43 },
  { id: "od16", speaker: "Host", narragansett: "Nipp\u00e1poos", english: "My child. (of the family)", startSec: 121.43, endSec: 128.57 },
  { id: "od17", speaker: "Guest", narragansett: "H\u00f4mes", english: "An old man (elder).", startSec: 128.57, endSec: 135.71 },
  { id: "od18", speaker: "Host", narragansett: "W\u00e9nise", english: "An old woman (elder).", startSec: 135.71, endSec: 142.86 },
  { id: "od19", speaker: "Both", narragansett: "Cowa\u00fanckamish", english: "My respects to you.", startSec: 142.86, endSec: 150.0 },
  { id: "od20", speaker: "Guest", narragansett: "Taubotneanaw\u00e1yean", english: "I thank you.", startSec: 150.0, endSec: 157.14 },
  { id: "od21", speaker: "Guest", narragansett: "Nicc\u00e0wkatone", english: "I am thirsty.", startSec: 157.14, endSec: 164.29 },
  { id: "od22", speaker: "Host", narragansett: "Nip, or nip\u00e9wese", english: "Some water.", startSec: 164.29, endSec: 171.43 },
  { id: "od23", speaker: "Host", narragansett: "Namitch, commetes\u00edmmin", english: "Stay \u2014 you must eat first.", startSec: 171.43, endSec: 178.57 },
  { id: "od24", speaker: "Host", narragansett: "T\u00e9aquacumm\u00e9ich", english: "What will you eat?", startSec: 178.57, endSec: 192.86 },
  { id: "od25", speaker: "Guest", narragansett: "Aup\u00faminea-nawsa\u00f9mp", english: "Parched meal boiled (soft corn porridge).", startSec: 192.86, endSec: 200.0 },
  { id: "od26", speaker: "Host", narragansett: "Wunn\u00e9gin", english: "Welcome.", startSec: 200.0, endSec: 207.14 },
  { id: "od27", speaker: "Guest", narragansett: "Taubotneanaw\u00e1yean", english: "I thank you.", startSec: 207.14, endSec: 214.29 },
  { id: "od28", speaker: "Host", narragansett: "Cowa\u00fanckamish", english: "My respects to you.", startSec: 214.29, endSec: 221.43 },
  { id: "od29", speaker: "Guest", narragansett: "Taub\u00fat paump ma\u00fantaman", english: "I am glad (of this).", startSec: 221.43, endSec: 228.57 },
  { id: "od30", speaker: "Guest", narragansett: "Nickqu\u00e9num", english: "I am going.", startSec: 228.57, endSec: 235.71 },
  { id: "od31", speaker: "Guest", narragansett: "Nnatotem\u00fackaun", english: "I will ask the way.", startSec: 235.71, endSec: 242.86 },
  { id: "od32", speaker: "Guest", narragansett: "Kunnat\u00f3temous", english: "I will inquire of you.", startSec: 242.86, endSec: 250.0 },
  { id: "od33", speaker: "Guest", narragansett: "Kokotem\u00edinnea m\u00e9yi", english: "Show me the way.", startSec: 250.0, endSec: 257.14 },
  { id: "od34", speaker: "Host", narragansett: "Mishimm\u00e1yagat", english: "A great path.", startSec: 257.14, endSec: 271.43 },
  { id: "od35", speaker: "Host", narragansett: "Peem\u00e1yag\u00e2t", english: "A short way.", startSec: 271.43, endSec: 278.57 },
  { id: "od36", speaker: "Guest", narragansett: "Taubotneanaw\u00e1yean", english: "I thank you.", startSec: 278.57, endSec: 285.71 },
  { id: "od37", speaker: "Guest", narragansett: "Nq\u00e9nowhick woutt\u00edn", english: "I stay for a wind.", startSec: 285.71, endSec: 292.86 },
  { id: "od38", speaker: "Host", narragansett: "Wunn\u00e1gehan", english: "Fair wind.", startSec: 292.86, endSec: 300.0 },
  { id: "od39", speaker: "Guest", narragansett: "Nqu\u00edt", english: "One.", startSec: 300.0, endSec: 307.14 },
  { id: "od40", speaker: "Guest", narragansett: "Ne\u00e8se", english: "Two.", startSec: 307.14, endSec: 314.29 },
  { id: "od41", speaker: "Guest", narragansett: "N\u00ecsh", english: "Three.", startSec: 314.29, endSec: 321.43 },
  { id: "od42", speaker: "Guest", narragansett: "Y\u00f2h", english: "Four.", startSec: 321.43, endSec: 328.57 },
  { id: "od43", speaker: "Guest", narragansett: "Nap\u00e1nna", english: "Five.", startSec: 328.57, endSec: 342.86 },
  { id: "od44", speaker: "Host", narragansett: "Pi\u00f9ck", english: "Ten.", startSec: 342.86, endSec: 350.0 },
  { id: "od45", speaker: "Host", narragansett: "A\u00fbke", english: "Earth or land.", startSec: 350.0, endSec: 357.14 },
  { id: "od46", speaker: "Host", narragansett: "S\u00e9quan", english: "Spring.", startSec: 357.14, endSec: 364.29 },
  { id: "od47", speaker: "Host", narragansett: "Aukeete\u00e1mitch", english: "Spring \u2014 seed-time.", startSec: 364.29, endSec: 371.43 },
  { id: "od48", speaker: "Guest", narragansett: "Ew\u00e1chim neash", english: "Corn.", startSec: 371.43, endSec: 378.57 },
  { id: "od49", speaker: "Host", narragansett: "Scann\u00e9meneash", english: "Seed corn.", startSec: 378.57, endSec: 385.71 },
  { id: "od50", speaker: "Both", narragansett: "Aukeetea\u00fbmen", english: "To plant corn.", startSec: 385.71, endSec: 392.86 },
  { id: "od51", speaker: "Host", narragansett: "Petasc\u00fannemun", english: "To hill the corn.", startSec: 392.86, endSec: 400.0 },
  { id: "od52", speaker: "Guest", narragansett: "Kepen\u00fammin", english: "To gather corn.", startSec: 400.0, endSec: 407.14 },
  { id: "od53", speaker: "Host", narragansett: "S\u00f3kenug", english: "A heap of corn.", startSec: 407.14, endSec: 421.43 },
  { id: "od54", speaker: "Guest", narragansett: "N\u00e9epun", english: "Summer.", startSec: 421.43, endSec: 428.57 },
  { id: "od55", speaker: "Host", narragansett: "Taqu\u00f2nck", english: "Fall / harvest.", startSec: 428.57, endSec: 435.71 },
  { id: "od56", speaker: "Guest", narragansett: "Pap\u00f3ne", english: "Winter.", startSec: 435.71, endSec: 442.86 },
  { id: "od57", speaker: "Host", narragansett: "Ntaucha\u00fbmen", english: "I go to hunt.", startSec: 442.86, endSec: 450.0 },
  { id: "od58", speaker: "Both", narragansett: "Aucha\u00fbtuck", english: "Let us hunt.", startSec: 450.0, endSec: 457.14 },
  { id: "od59", speaker: "Guest", narragansett: "Attuck, quock", english: "Deer.", startSec: 457.14, endSec: 464.29 },
  { id: "od60", speaker: "Host", narragansett: "Waww\u00fannes", english: "A young buck.", startSec: 464.29, endSec: 471.43 },
  { id: "od61", speaker: "Guest", narragansett: "Nk\u00e9ke, nk\u00e9quock", english: "Otter, otters.", startSec: 471.43, endSec: 478.57 },
  { id: "od62", speaker: "Host", narragansett: "Npunnoww\u00e2umen", english: "I must go to my traps.", startSec: 478.57, endSec: 492.86 },
  { id: "od63", speaker: "Guest", narragansett: "Ap\u00e8 hana", english: "Trap, traps.", startSec: 492.86, endSec: 500.0 },
  { id: "od64", speaker: "Host", narragansett: "Ntaumpaucha\u00famen", english: "I come from hunting.", startSec: 500.0, endSec: 507.14 },
  { id: "od65", speaker: "Guest", narragansett: "N\u00e9yhom, m\u00e2uog", english: "Turkey, turkeys.", startSec: 507.14, endSec: 514.29 },
  { id: "od66", speaker: "Host", narragansett: "H\u00f2nck, h\u00f2nckock", english: "Goose, geese.", startSec: 514.29, endSec: 521.43 },
  { id: "od67", speaker: "Guest", narragansett: "Ch\u00f3gan \u00e8uck", english: "Blackbird, blackbirds.", startSec: 521.43, endSec: 528.57 },
  { id: "od68", speaker: "Host", narragansett: "Wunn\u00f9p, pash", english: "Wing, wings.", startSec: 528.57, endSec: 535.71 },
  { id: "od69", speaker: "Guest", narragansett: "Nickqu\u00e9num", english: "I am going.", startSec: 535.71, endSec: 542.86 },
  { id: "od70", speaker: "Guest", narragansett: "Ac\u00e2wmuck n\u00f3teshem", english: "I came over the water.", startSec: 542.86, endSec: 550.0 },
  { id: "od71", speaker: "Host", narragansett: "Nama\u00f9us,-suck", english: "Fish, fishes.", startSec: 550.0, endSec: 557.14 },
  { id: "od72", speaker: "Guest", narragansett: "Nta\u00fbmen", english: "I am fishing.", startSec: 557.14, endSec: 571.43 },
  { id: "od73", speaker: "Host", narragansett: "Nnattuckqunn\u00fbwem", english: "I go a fishing.", startSec: 571.43, endSec: 578.57 },
  { id: "od74", speaker: "Guest", narragansett: "Miss\u00fackeke-k\u00e9quock", english: "Bass.", startSec: 578.57, endSec: 585.71 },
  { id: "od75", speaker: "Host", narragansett: "Mishquamma\u00f9quock", english: "Red fish, salmon.", startSec: 585.71, endSec: 592.86 },
  { id: "od76", speaker: "Guest", narragansett: "A\u00famanep", english: "A fishing line.", startSec: 592.86, endSec: 600.0 },
  { id: "od77", speaker: "Host", narragansett: "W A\u00fbpi", english: "The wind.", startSec: 600.0, endSec: 607.14 },
  { id: "od78", speaker: "Guest", narragansett: "Wunn\u00e1gehan", english: "Fair wind.", startSec: 607.14, endSec: 614.29 },
  { id: "od79", speaker: "Host", narragansett: "Nq\u00e9nowhick woutt\u00edn", english: "I stay for a wind.", startSec: 614.29, endSec: 621.43 },
  { id: "od80", speaker: "Guest", narragansett: "Nipp\u00e2wus", english: "The sun.", startSec: 621.43, endSec: 628.57 },
  { id: "od81", speaker: "Host", narragansett: "T Ocke tussinn\u00e1mmin k\u00e9esuck", english: "What do you think of the weather?", startSec: 628.57, endSec: 642.86 },
  { id: "od82", speaker: "Guest", narragansett: "Wekinea\u00fbquat", english: "Fair weather.", startSec: 642.86, endSec: 650.0 },
  { id: "od83", speaker: "Host", narragansett: "Tahk\u00ec or t\u00e1takki", english: "Cold weather.", startSec: 650.0, endSec: 657.14 },
  { id: "od84", speaker: "Guest", narragansett: "Kuss\u00fattah", english: "It is hot.", startSec: 657.14, endSec: 664.29 },
  { id: "od85", speaker: "Host", narragansett: "Nan\u00fammatin", english: "The north wind.", startSec: 664.29, endSec: 671.43 },
  { id: "od86", speaker: "Guest", narragansett: "Touw\u00fattin", english: "South wind.", startSec: 671.43, endSec: 678.57 },
  { id: "od87", speaker: "Both", narragansett: "K\u00e9esuck", english: "The heavens.", startSec: 678.57, endSec: 685.71 },
  { id: "od88", speaker: "Host", narragansett: "Yahen w\u00e0iy\u00e0uw", english: "Almost sunset.", startSec: 685.71, endSec: 692.86 },
  { id: "od89", speaker: "Guest", narragansett: "Waya\u00e0wi", english: "The sun is set.", startSec: 692.86, endSec: 700.0 },
  { id: "od90", speaker: "Guest", narragansett: "Aunchemokauhett\u00edttea", english: "Let us talk / tell the news.", startSec: 700.0, endSec: 707.14 },
  { id: "od91", speaker: "Guest", narragansett: "Aaunchem\u00f3kaw", english: "Tell me your news.", startSec: 707.14, endSec: 721.43 },
  { id: "od92", speaker: "Host", narragansett: "Cuttaunchem\u00f3kous", english: "I will tell you the news.", startSec: 721.43, endSec: 728.57 },
  { id: "od93", speaker: "Host", narragansett: "Cummautaunchem\u00f3kous", english: "I have finished my news.", startSec: 728.57, endSec: 735.71 },
  { id: "od94", speaker: "Guest", narragansett: "Taub\u00fat paump ma\u00fantaman", english: "I am glad (to hear it).", startSec: 735.71, endSec: 742.86 },
  { id: "od95", speaker: "Host", narragansett: "Cowa\u00fanckamish", english: "My respects to you.", startSec: 742.86, endSec: 750.0 },
  { id: "od96", speaker: "Guest", narragansett: "Taubotneanaw\u00e1yean", english: "I thank you.", startSec: 750.0, endSec: 757.14 },
  { id: "od97", speaker: "Host", narragansett: "Wetu\u00f4muck", english: "At home.", startSec: 757.14, endSec: 764.29 },
  { id: "od98", speaker: "Guest", narragansett: "Nanepa\u00f9shat", english: "The moon.", startSec: 764.29, endSec: 771.43 },
  { id: "od99", speaker: "Host", narragansett: "An\u00f3ckqus, an\u00f3cksuck", english: "A star, stars.", startSec: 771.43, endSec: 778.57 },
  { id: "od100", speaker: "Guest", narragansett: "Mish\u00e1nnock", english: "The morning star.", startSec: 778.57, endSec: 792.86 },
  { id: "od101", speaker: "Host", narragansett: "P\u00f3ppakunnetch, auchaugotch", english: "Dark night.", startSec: 792.86, endSec: 800.0 },
  { id: "od102", speaker: "Guest", narragansett: "Yo nickow\u00e9men?", english: "Shall I sleep here?", startSec: 800.0, endSec: 807.14 },
  { id: "od103", speaker: "Host", narragansett: "Wunn\u00e9gin, c\u00f3wish", english: "Welcome \u2014 sleep here.", startSec: 807.14, endSec: 814.29 },
  { id: "od104", speaker: "Guest", narragansett: "Nsowwushk\u00e2wmen", english: "I am weary.", startSec: 814.29, endSec: 821.43 },
  { id: "od105", speaker: "Guest", narragansett: "Nk\u00e0taquaum", english: "I am sleepy.", startSec: 821.43, endSec: 828.57 },
  { id: "od106", speaker: "Host", narragansett: "Coww\u00eatuck", english: "Let us sleep.", startSec: 828.57, endSec: 835.71 },
  { id: "od107", speaker: "Both", narragansett: "Wuddt\u00fackqunash, ponam\u00e1uta", english: "Let us lay on wood.", startSec: 835.71, endSec: 842.86 },
  { id: "od108", speaker: "Both", narragansett: "Cowa\u00fanckamish", english: "My respects to you.", startSec: 842.86, endSec: 850.0 },
  { id: "od109", speaker: "Host", narragansett: "P\u00e1shisha", english: "It is sunrise. (the day remembered)", startSec: 850.0, endSec: 857.14 },
  { id: "od110", speaker: "Guest", narragansett: "Waya\u00e0wi", english: "The sun is set.", startSec: 857.14, endSec: 871.43 },
  { id: "od111", speaker: "Both", narragansett: "Wetu\u00f4muck", english: "At home.", startSec: 871.43, endSec: 878.57 },
  { id: "od112", speaker: "Both", narragansett: "Cowa\u00fanckamish", english: "My respects to you.", startSec: 878.57, endSec: 885.71 },
  { id: "od113", speaker: "Guest", narragansett: "Taubotneanaw\u00e1yean", english: "I thank you.", startSec: 885.71, endSec: 892.86 },
  { id: "od114", speaker: "Host", narragansett: "Wunn\u00e9gin", english: "Welcome.", startSec: 892.86, endSec: 900.0 },
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
      "Long story (Film V5 master-first): one continuous ~15-minute kids-platform educational animation of Host and Guest — Northeastern coastal Algonquian Native American characters only — dawn to night. Narragansett language is embedded in the film soundtrack (language first). Full Day acts play 90s windows into this master. Dialogue forms from Williams 1643 with modern English. Not a living speaker recording and not a ceremonial film. Replace via public/scenes/long/uploads/one-day-story.mp4 when community footage is ready.",
    lines: oneDayLines,
  },
];
