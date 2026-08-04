#!/usr/bin/env node
/**
 * Film v4 — narrative-first "One day" plan
 *
 * Rules:
 * - Fixed cast ONLY: Host (elder) + Guest (younger traveler). No extras.
 * - 126 shots × 12s = 25m 12s continuous film.
 * - Dialogue (Narragansett + English) is authored first; every shot serves a line.
 * - Never reuse practice-scene shorts — each shot is generated for this film.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = "/workspace/film-build";
const SHOT_SEC = 12;
const TOTAL_SHOTS = 126;
const TOTAL = SHOT_SEC * TOTAL_SHOTS; // 1512

const STYLE =
  "Cinematic photoreal documentary-drama, respectful historical reconstruction of a coastal Southern New England Indigenous community, natural light, soft film grain, warm earth palette, vertical 9:16 frame, no text, no logos, no modern objects, no anachronisms, intimate 35mm look.";

const CAST = {
  host: {
    id: "host",
    look: "Host: elder man ~55–60, short salt-and-pepper grey hair, weathered warm brown skin, kind deep-set eyes, soft reddish-brown leather wrap, simple copper pendant, calloused hands. Same face every shot.",
    ref: "refs/host.jpg",
  },
  guest: {
    id: "guest",
    look: "Guest: younger man ~28–35, short black hair, clean features, warm brown skin, attentive eyes, soft brown leather wrap, simple cord necklace, lean build. Same face every shot.",
    ref: "refs/guest.jpg",
  },
  both: {
    id: "both",
    look: "Only these two men: Host (elder, grey hair, red-brown wrap) and Guest (younger, black hair, brown wrap). Never a third person.",
    ref: "refs/both.jpg",
  },
};

/** Narrative dialogue in story order — speakers Host | Guest | Both only */
const lines = [
  // Dawn — Host alone
  { id: "L001", speaker: "Host", n: "Páshisha", e: "It is sunrise." },
  { id: "L002", speaker: "Host", n: "Mautàbon, Chicháuquat wompan", e: "It is day." },
  { id: "L003", speaker: "Host", n: "Wetu", e: "A house / dwelling." },
  { id: "L004", speaker: "Host", n: "Wetuômuck", e: "At home." },
  { id: "L005", speaker: "Host", n: "Tokêtuck", e: "Let us wake." },
  { id: "L006", speaker: "Host", n: "Nkàtaquaum", e: "I am sleepy." },
  { id: "L007", speaker: "Host", n: "Wuddtúckqunash, ponamáuta", e: "Let us lay on wood." },
  { id: "L008", speaker: "Host", n: "Nummáttaqúaw", e: "Morning (before noon)." },
  { id: "L009", speaker: "Host", n: "Wunnégin", e: "Welcome." },
  // Kin
  { id: "L010", speaker: "Host", n: "Ascowequassunnúmmis", e: "Good morning." },
  { id: "L011", speaker: "Guest", n: "Askuttaaquompsín", e: "How are you?" },
  { id: "L012", speaker: "Host", n: "Asnpaumpmaúntam", e: "I am very well." },
  { id: "L013", speaker: "Guest", n: "Taubút paump maúntaman", e: "I am glad you are well." },
  { id: "L014", speaker: "Guest", n: "Nósh", e: "My father. (respectful address)" },
  { id: "L015", speaker: "Host", n: "Okásu", e: "A mother. (speaking of kin)" },
  { id: "L016", speaker: "Host", n: "Nippápoos", e: "My child. (of the family)" },
  { id: "L017", speaker: "Guest", n: "Hômes", e: "An old man (elder)." },
  { id: "L018", speaker: "Host", n: "Wénise", e: "An old woman (elder)." },
  { id: "L019", speaker: "Both", n: "Cowaúnckamish", e: "My respects to you." },
  { id: "L020", speaker: "Guest", n: "Taubotneanawáyean", e: "I thank you." },
  // Meal
  { id: "L021", speaker: "Guest", n: "Niccàwkatone", e: "I am thirsty." },
  { id: "L022", speaker: "Host", n: "Nip, or nipéwese", e: "Some water." },
  { id: "L023", speaker: "Host", n: "Namitch, commetesímmin", e: "Stay — you must eat first." },
  { id: "L024", speaker: "Host", n: "Téaquacumméich", e: "What will you eat?" },
  { id: "L025", speaker: "Guest", n: "Aupúminea-nawsaùmp", e: "Parched meal boiled (soft corn porridge)." },
  { id: "L026", speaker: "Host", n: "Wunnégin", e: "Welcome." },
  { id: "L027", speaker: "Guest", n: "Taubotneanawáyean", e: "I thank you." },
  { id: "L028", speaker: "Host", n: "Cowaúnckamish", e: "My respects to you." },
  { id: "L029", speaker: "Guest", n: "Taubút paump maúntaman", e: "I am glad (of this)." },
  // Path
  { id: "L030", speaker: "Guest", n: "Nickquénum", e: "I am going." },
  { id: "L031", speaker: "Guest", n: "Nnatotemúckaun", e: "I will ask the way." },
  { id: "L032", speaker: "Guest", n: "Kunnatótemous", e: "I will inquire of you." },
  { id: "L033", speaker: "Guest", n: "Kokotemíinnea méyi", e: "Show me the way." },
  { id: "L034", speaker: "Host", n: "Mishimmáyagat", e: "A great path." },
  { id: "L035", speaker: "Host", n: "Peemáyagât", e: "A short way." },
  { id: "L036", speaker: "Guest", n: "Taubotneanawáyean", e: "I thank you." },
  { id: "L037", speaker: "Guest", n: "Nqénowhick wouttín", e: "I stay for a wind." },
  { id: "L038", speaker: "Host", n: "Wunnágehan", e: "Fair wind." },
  // Numbers
  { id: "L039", speaker: "Guest", n: "Nquít", e: "One." },
  { id: "L040", speaker: "Guest", n: "Neèse", e: "Two." },
  { id: "L041", speaker: "Guest", n: "Nìsh", e: "Three." },
  { id: "L042", speaker: "Guest", n: "Yòh", e: "Four." },
  { id: "L043", speaker: "Guest", n: "Napánna", e: "Five." },
  { id: "L044", speaker: "Host", n: "Piùck", e: "Ten." },
  // Land
  { id: "L045", speaker: "Host", n: "Aûke", e: "Earth or land." },
  { id: "L046", speaker: "Host", n: "Séquan", e: "Spring." },
  { id: "L047", speaker: "Host", n: "Aukeeteámitch", e: "Spring — seed-time." },
  { id: "L048", speaker: "Guest", n: "Ewáchim neash", e: "Corn." },
  { id: "L049", speaker: "Host", n: "Scannémeneash", e: "Seed corn." },
  { id: "L050", speaker: "Both", n: "Aukeeteaûmen", e: "To plant corn." },
  { id: "L051", speaker: "Host", n: "Petascúnnemun", e: "To hill the corn." },
  { id: "L052", speaker: "Guest", n: "Kepenúmmin", e: "To gather corn." },
  { id: "L053", speaker: "Host", n: "Sókenug", e: "A heap of corn." },
  { id: "L054", speaker: "Guest", n: "Néepun", e: "Summer." },
  { id: "L055", speaker: "Host", n: "Taquònck", e: "Fall / harvest." },
  { id: "L056", speaker: "Guest", n: "Papóne", e: "Winter." },
  // Forest
  { id: "L057", speaker: "Host", n: "Ntauchaûmen", e: "I go to hunt." },
  { id: "L058", speaker: "Both", n: "Auchaûtuck", e: "Let us hunt." },
  { id: "L059", speaker: "Guest", n: "Attuck, quock", e: "Deer." },
  { id: "L060", speaker: "Host", n: "Wawwúnnes", e: "A young buck." },
  { id: "L061", speaker: "Guest", n: "Nkéke, nkéquock", e: "Otter, otters." },
  { id: "L062", speaker: "Host", n: "Npunnowwâumen", e: "I must go to my traps." },
  { id: "L063", speaker: "Guest", n: "Apè hana", e: "Trap, traps." },
  { id: "L064", speaker: "Host", n: "Ntaumpauchaúmen", e: "I come from hunting." },
  // Birds (shared with forest trail end)
  { id: "L065", speaker: "Guest", n: "Néyhom, mâuog", e: "Turkey, turkeys." },
  { id: "L066", speaker: "Host", n: "Hònck, hònckock", e: "Goose, geese." },
  { id: "L067", speaker: "Guest", n: "Chógan èuck", e: "Blackbird, blackbirds." },
  { id: "L068", speaker: "Host", n: "Wunnùp, pash", e: "Wing, wings." },
  // Water
  { id: "L069", speaker: "Guest", n: "Nickquénum", e: "I am going." },
  { id: "L070", speaker: "Guest", n: "Acâwmuck nóteshem", e: "I came over the water." },
  { id: "L071", speaker: "Host", n: "Namaùus,-suck", e: "Fish, fishes." },
  { id: "L072", speaker: "Guest", n: "Ntaûmen", e: "I am fishing." },
  { id: "L073", speaker: "Host", n: "Nnattuckqunnûwem", e: "I go a fishing." },
  { id: "L074", speaker: "Guest", n: "Missúckeke-kéquock", e: "Bass." },
  { id: "L075", speaker: "Host", n: "Mishquammaùquock", e: "Red fish, salmon." },
  { id: "L076", speaker: "Guest", n: "Aúmanep", e: "A fishing line." },
  { id: "L077", speaker: "Host", n: "W Aûpi", e: "The wind." },
  { id: "L078", speaker: "Guest", n: "Wunnágehan", e: "Fair wind." },
  { id: "L079", speaker: "Host", n: "Nqénowhick wouttín", e: "I stay for a wind." },
  { id: "L080", speaker: "Guest", n: "Nippâwus", e: "The sun." },
  // Sky
  { id: "L081", speaker: "Host", n: "T Ocke tussinnámmin kéesuck", e: "What do you think of the weather?" },
  { id: "L082", speaker: "Guest", n: "Wekineaûquat", e: "Fair weather." },
  { id: "L083", speaker: "Host", n: "Tahkì or tátakki", e: "Cold weather." },
  { id: "L084", speaker: "Guest", n: "Kussúttah", e: "It is hot." },
  { id: "L085", speaker: "Host", n: "Nanúmmatin", e: "The north wind." },
  { id: "L086", speaker: "Guest", n: "Touwúttin", e: "South wind." },
  { id: "L087", speaker: "Both", n: "Kéesuck", e: "The heavens." },
  { id: "L088", speaker: "Host", n: "Yahen wàiyàuw", e: "Almost sunset." },
  { id: "L089", speaker: "Guest", n: "Wayaàwi", e: "The sun is set." },
  // Evening
  { id: "L090", speaker: "Guest", n: "Aunchemokauhettíttea", e: "Let us talk / tell the news." },
  { id: "L091", speaker: "Guest", n: "Aaunchemókaw", e: "Tell me your news." },
  { id: "L092", speaker: "Host", n: "Cuttaunchemókous", e: "I will tell you the news." },
  { id: "L093", speaker: "Host", n: "Cummautaunchemókous", e: "I have finished my news." },
  { id: "L094", speaker: "Guest", n: "Taubút paump maúntaman", e: "I am glad (to hear it)." },
  { id: "L095", speaker: "Host", n: "Cowaúnckamish", e: "My respects to you." },
  { id: "L096", speaker: "Guest", n: "Taubotneanawáyean", e: "I thank you." },
  // Night
  { id: "L097", speaker: "Host", n: "Wetuômuck", e: "At home." },
  { id: "L098", speaker: "Guest", n: "Nanepaùshat", e: "The moon." },
  { id: "L099", speaker: "Host", n: "Anóckqus, anócksuck", e: "A star, stars." },
  { id: "L100", speaker: "Guest", n: "Mishánnock", e: "The morning star." },
  { id: "L101", speaker: "Host", n: "Póppakunnetch, auchaugotch", e: "Dark night." },
  { id: "L102", speaker: "Guest", n: "Yo nickowémen?", e: "Shall I sleep here?" },
  { id: "L103", speaker: "Host", n: "Wunnégin, cówish", e: "Welcome — sleep here." },
  { id: "L104", speaker: "Guest", n: "Nsowwushkâwmen", e: "I am weary." },
  { id: "L105", speaker: "Guest", n: "Nkàtaquaum", e: "I am sleepy." },
  { id: "L106", speaker: "Host", n: "Cowwêtuck", e: "Let us sleep." },
  { id: "L107", speaker: "Both", n: "Wuddtúckqunash, ponamáuta", e: "Let us lay on wood." },
  { id: "L108", speaker: "Both", n: "Cowaúnckamish", e: "My respects to you." },
  // Closing
  { id: "L109", speaker: "Host", n: "Páshisha", e: "It is sunrise. (the day remembered)" },
  { id: "L110", speaker: "Guest", n: "Wayaàwi", e: "The sun is set." },
  { id: "L111", speaker: "Both", n: "Wetuômuck", e: "At home." },
  { id: "L112", speaker: "Both", n: "Cowaúnckamish", e: "My respects to you." },
  { id: "L113", speaker: "Guest", n: "Taubotneanawáyean", e: "I thank you." },
  { id: "L114", speaker: "Host", n: "Wunnégin", e: "Welcome." },
];

/**
 * Visual beats — exactly 126 shots. cast: host | guest | both | nature
 * Each visual keeps the locked faces/clothing when people appear.
 */
const acts = [
  {
    id: "dawn",
    title: "Dawn in the wetu",
    shots: [
      { cast: "nature", visual: "First grey-blue light over a coastal salt marsh at dawn, mist on still water, Southern New England coast, empty of people." },
      { cast: "nature", visual: "Slow approach toward a birch-bark wetu among pines at the marsh edge, thin smoke from the roof hole, soft dawn, no people." },
      { cast: "host", visual: "Inside the wetu, Host stirs awake on woven mats under furs, warm firelight on his elder face, red-brown wrap." },
      { cast: "host", visual: "Close-up: Host's calloused hands place dry wood on the low fire, sparks rise, intimate." },
      { cast: "host", visual: "Host sits up, rubs his eyes, looks toward the doorway where pale morning light enters." },
      { cast: "host", visual: "Host stands in the wetu doorway, silhouette against gold morning, then steps into soft light." },
      { cast: "host", visual: "Host outside the wetu, breathing morning air, pines and marsh behind him, same elder face." },
      { cast: "nature", visual: "Sun rising over pines and salt marsh, long golden rays across water, no people." },
      { cast: "host", visual: "Host gathers wood near the wetu, calm morning chore, red-brown wrap, grey hair." },
      { cast: "host", visual: "Host looks down the path toward the village clearing, waiting, gentle expression." },
      { cast: "nature", visual: "Wide village clearing waking — paths, dwellings, morning birds, no people yet." },
      { cast: "guest", visual: "Guest walks the path toward the wetu from the marsh, morning light on his younger face, brown wrap, black hair." },
    ],
  },
  {
    id: "kin",
    title: "Kin at morning",
    shots: [
      { cast: "both", visual: "Host and Guest meet outside the wetu; Host greets with open hands, Guest bows head slightly." },
      { cast: "host", visual: "Host speaks warmly to Guest, slight smile, red-brown wrap, grey hair, soft morning sun." },
      { cast: "guest", visual: "Guest replies, attentive face, brown wrap, black hair, standing near the wetu wall." },
      { cast: "both", visual: "Both men sit on mats outside the dwelling, calm conversation, only these two faces." },
      { cast: "host", visual: "Host gestures toward the wetu as if speaking of family and home, medium shot." },
      { cast: "guest", visual: "Guest listens with respect, nods, coastal pines soft in background." },
      { cast: "both", visual: "Wide two-shot: Host and Guest side by side outside wetu, morning light, only these two." },
      { cast: "host", visual: "Host places a hand over his heart in a respectful greeting gesture." },
      { cast: "guest", visual: "Guest returns the respectful gesture, eyes kind." },
      { cast: "both", visual: "Both bow heads slightly toward each other, soft gold light, Cowaúnckamish moment." },
      { cast: "guest", visual: "Guest smiles gratefully at Host after thanks." },
      { cast: "both", visual: "They turn together toward the fire circle for the meal, walking a few steps." },
    ],
  },
  {
    id: "meal",
    title: "Morning meal",
    shots: [
      { cast: "both", visual: "Host and Guest seated by the outdoor fire, clay bowls and wooden cups, steam rising." },
      { cast: "guest", visual: "Guest touches his throat gently, thirsty, looking to Host." },
      { cast: "host", visual: "Host pours water into a wooden cup, offers it to Guest." },
      { cast: "guest", visual: "Guest drinks water, relief, morning light on younger face." },
      { cast: "host", visual: "Host stirs soft corn porridge in a pot over the fire, gestures for Guest to stay." },
      { cast: "both", visual: "Host serves Guest a bowl of porridge, hospitality, warm firelight, only these two." },
      { cast: "guest", visual: "Guest accepts the bowl, grateful expression, begins to eat." },
      { cast: "host", visual: "Host eats from his own bowl, calm elder face." },
      { cast: "both", visual: "Shared meal two-shot, bowls, fire, only Host and Guest." },
      { cast: "guest", visual: "Guest thanks Host with a slight bow of the head." },
      { cast: "host", visual: "Host returns respects, hand gesture of welcome." },
      { cast: "both", visual: "After the meal they stand, ready for the day's path, soft smile." },
    ],
  },
  {
    id: "path",
    title: "On the path",
    shots: [
      { cast: "guest", visual: "Guest stands ready with a small woven bag, about to leave, looking down the trail." },
      { cast: "both", visual: "Guest asks Host the way; Host points along a forest-edge path." },
      { cast: "guest", visual: "Guest listens carefully to directions, nodding." },
      { cast: "host", visual: "Host points to a broad trail — the great path — then a shorter side way." },
      { cast: "both", visual: "They walk together a short stretch of dirt path under morning sun." },
      { cast: "nature", visual: "Forest-edge path, dappled green light through leaves, empty of people." },
      { cast: "guest", visual: "Guest walks the path alone for a beat, thoughtful, same younger face and brown wrap." },
      { cast: "host", visual: "Host walks ahead as guide, grey hair, red-brown wrap." },
      { cast: "both", visual: "They pause at a fork; Host indicates the short way with an open palm." },
      { cast: "guest", visual: "Guest thanks him, looks at the wind in the treetops." },
      { cast: "nature", visual: "Wind moves marsh grass and pine tops, fair weather sky, no people." },
      { cast: "both", visual: "They continue together onto the broader trail toward the fields." },
    ],
  },
  {
    id: "numbers",
    title: "Numbers along the way",
    shots: [
      { cast: "guest", visual: "Guest holds up one finger, teaching, soft smile on the trail." },
      { cast: "guest", visual: "Guest holds up two fingers, same face and brown wrap." },
      { cast: "guest", visual: "Guest holds up three fingers, woodland path behind." },
      { cast: "guest", visual: "Guest holds up four fingers, dappled light." },
      { cast: "guest", visual: "Guest holds up five fingers, open palm." },
      { cast: "host", visual: "Host shows both hands open for ten, teaching Guest, elder smile." },
    ],
  },
  {
    id: "land",
    title: "Land and corn",
    shots: [
      { cast: "host", visual: "Host kneels, presses palm to dark earth of a garden plot, speaking of land." },
      { cast: "both", visual: "Host and Guest stand in the corn garden, young green stalks in hills." },
      { cast: "host", visual: "Host holds seed corn in his open hands, shows Guest." },
      { cast: "guest", visual: "Guest carefully places seed into a hill, learning." },
      { cast: "both", visual: "Together they hill soil around young corn plants with wooden tools." },
      { cast: "host", visual: "Host gathers a small heap of ripe ears into a basket." },
      { cast: "guest", visual: "Guest carries a basket of corn, proud careful steps." },
      { cast: "both", visual: "They rest beside the field, looking over the green land together." },
      { cast: "nature", visual: "Wide shot of corn hills and sky, Southern New England summer light, no people." },
      { cast: "host", visual: "Host speaks of seasons with open hands — spring to winter — same elder face." },
      { cast: "guest", visual: "Guest listens among the corn rows, brown wrap, black hair." },
      { cast: "both", visual: "They leave the field along a path toward the forest edge." },
    ],
  },
  {
    id: "forest",
    title: "Forest trail",
    shots: [
      { cast: "both", visual: "Host and Guest enter a timber trail, soft green light, quiet steps." },
      { cast: "host", visual: "Host moves carefully along the trail as if checking traps, calm not violent." },
      { cast: "guest", visual: "Guest follows, looking into the understory." },
      { cast: "nature", visual: "A deer stands distant among trees, then slips away — no pursuit shown." },
      { cast: "both", visual: "Host points out tracks on the ground to Guest, teaching." },
      { cast: "guest", visual: "Guest crouches to look at tracks, attentive." },
      { cast: "host", visual: "Host checks a simple snare area without drama, then walks on." },
      { cast: "nature", visual: "Quiet stream in the forest, otter-like ripples on water, animal not harmed." },
      { cast: "both", visual: "They return along the same trail, daylight warmer afternoon." },
      { cast: "host", visual: "Host looks satisfied, coming from the trail work, same face." },
      { cast: "guest", visual: "Guest carries a small bundle of gathered plants, peaceful." },
      { cast: "nature", visual: "Forest canopy, birds moving through branches, wings, no people." },
    ],
  },
  {
    id: "water",
    title: "At the water",
    shots: [
      { cast: "nature", visual: "Coastal marsh shore, birchbark canoe on sand, water glittering, no people." },
      { cast: "guest", visual: "Guest approaches the canoe, same younger man brown wrap." },
      { cast: "host", visual: "Host stands at the water's edge, looking at the wind and sky." },
      { cast: "both", visual: "Together they steady the canoe at the shore." },
      { cast: "guest", visual: "Guest holds a fishing line, preparing to fish from shore." },
      { cast: "host", visual: "Host watches the water for fish, patient." },
      { cast: "both", visual: "Both stand in shallow water near the canoe, lines out, peaceful fishing." },
      { cast: "nature", visual: "Close water surface, fish shapes below, light on waves, no people." },
      { cast: "guest", visual: "Guest carefully lifts a fish into a basket, respectful handling." },
      { cast: "host", visual: "Host feels the wind, looks toward open water." },
      { cast: "both", visual: "They wait for a fair wind, seated near the canoe, talking quietly." },
      { cast: "guest", visual: "Guest looks up at the sun over the water." },
    ],
  },
  {
    id: "sky",
    title: "Sky and weather",
    shots: [
      { cast: "both", visual: "Host and Guest stand on a rise overlooking marsh, reading the sky together." },
      { cast: "host", visual: "Host gestures at the clouds, asking about the weather." },
      { cast: "guest", visual: "Guest looks up, fair weather, replies." },
      { cast: "nature", visual: "Wide sky, fair clouds over pines and marsh, late afternoon gold, no people." },
      { cast: "host", visual: "Host wraps his arms as if describing cold weather, slight shiver gesture." },
      { cast: "guest", visual: "Guest fans his face lightly as if speaking of heat." },
      { cast: "both", visual: "Wind moves their hair and wraps; they face north then south." },
      { cast: "nature", visual: "Sun lowering toward the horizon, golden Yahen wàiyàuw light, no people." },
      { cast: "both", visual: "They watch sunset colors over the water side by side." },
      { cast: "guest", visual: "Guest's face lit by sunset, quiet awe." },
      { cast: "host", visual: "Host's face lit by the same sunset, same elder features." },
      { cast: "nature", visual: "The sun fully set, afterglow, silhouettes of pines, no people." },
    ],
  },
  {
    id: "evening",
    title: "Evening talk",
    shots: [
      { cast: "both", visual: "Back near the wetu at dusk, Host and Guest sit by a small fire, discourse and news." },
      { cast: "guest", visual: "Guest leans in, inviting Host to tell news." },
      { cast: "host", visual: "Host speaks animatedly but calmly, telling news of the day." },
      { cast: "guest", visual: "Guest listens intently, firelight on face." },
      { cast: "host", visual: "Host finishes his news with a settling gesture." },
      { cast: "both", visual: "They share a glad quiet moment after the talk." },
      { cast: "host", visual: "Host offers respects with hand over heart." },
      { cast: "guest", visual: "Guest thanks him warmly." },
      { cast: "both", visual: "Fire glows between them, only these two, evening blue hour." },
      { cast: "nature", visual: "Wetu silhouette, smoke, first stars beginning, no people." },
      { cast: "both", visual: "They stand and walk a few steps toward the wetu doorway." },
      { cast: "host", visual: "Host holds the doorway mat aside, inviting Guest in." },
    ],
  },
  {
    id: "night",
    title: "Night return",
    shots: [
      { cast: "nature", visual: "Night sky over the marsh, bright moon, stars, no people." },
      { cast: "both", visual: "Inside the wetu, Host and Guest by low fire, night interior." },
      { cast: "guest", visual: "Guest looks up through smoke hole at stars." },
      { cast: "host", visual: "Host points out a bright star, teaching." },
      { cast: "guest", visual: "Guest asks if he may sleep here, weary eyes." },
      { cast: "host", visual: "Host welcomes him with open hands — sleep here." },
      { cast: "guest", visual: "Guest settles on a mat, weary and grateful." },
      { cast: "host", visual: "Host lays wood on the fire for the night." },
      { cast: "both", visual: "Both lie down on mats, fire low, peaceful." },
      { cast: "nature", visual: "Exterior night: wetu, moon, still marsh, no people." },
      { cast: "both", visual: "Final two-shot: Host and Guest at rest by embers, respectful closing." },
      { cast: "nature", visual: "Dawn light returns faintly on the same marsh — the day remembered, quiet close, no people." },
    ],
  },
];

// Flatten
const flatShots = [];
let i = 0;
for (const act of acts) {
  for (const s of act.shots) {
    flatShots.push({
      index: i,
      id: `S${String(i).padStart(3, "0")}`,
      actId: act.id,
      actTitle: act.title,
      cast: s.cast,
      visual: s.visual,
      durationSec: SHOT_SEC,
      startSec: i * SHOT_SEC,
      endSec: (i + 1) * SHOT_SEC,
      still: `stills/${String(i).padStart(3, "0")}_${act.id}.jpg`,
      video: `shots/${String(i).padStart(3, "0")}_${act.id}.mp4`,
      style: STYLE,
    });
    i++;
  }
}

if (flatShots.length !== TOTAL_SHOTS) {
  console.error(`Expected ${TOTAL_SHOTS} shots, got ${flatShots.length}`);
  process.exit(1);
}

// Time dialogue evenly across full film
const timedLines = lines.map((l, li) => {
  const slot = TOTAL / lines.length;
  return {
    ...l,
    startSec: Math.round(li * slot * 100) / 100,
    endSec: Math.round(Math.min(TOTAL, (li + 1) * slot) * 100) / 100,
  };
});

// Attach nearest dialogue to each shot
for (const shot of flatShots) {
  const mid = shot.startSec + shot.durationSec / 2;
  let best = timedLines[0];
  let bestDist = Infinity;
  for (const l of timedLines) {
    const c = (l.startSec + l.endSec) / 2;
    const d = Math.abs(c - mid);
    if (d < bestDist) {
      bestDist = d;
      best = l;
    }
  }
  shot.lineId = best.id;
  shot.speaker = best.speaker;
  shot.narragansett = best.n;
  shot.english = best.e;
}

const plan = {
  version: 4,
  filmId: "one-day-story",
  title: "One day",
  durationSec: TOTAL,
  shotDurationSec: SHOT_SEC,
  shotCount: flatShots.length,
  style: STYLE,
  castOnly: ["host", "guest"],
  cast: CAST,
  rules: [
    "Only Host and Guest appear as people in the entire film.",
    "Every human shot must match the locked reference faces and clothing.",
    "No children, no extra villagers, no third faces.",
    "Nature-only shots allowed but must not introduce new faces.",
    "Narrative drives every shot; do not reuse practice-scene shorts.",
    "Dialogue is Narragansett (Williams 1643 forms) with modern English gloss in the app.",
  ],
  acts: acts.map((a) => ({ id: a.id, title: a.title, count: a.shots.length })),
  lines: timedLines,
  shots: flatShots,
};

mkdirSync(join(ROOT, "narrative"), { recursive: true });
writeFileSync(join(ROOT, "narrative/shot-plan.json"), JSON.stringify(plan, null, 2));
writeFileSync(
  join(ROOT, "narrative/app-lines.json"),
  JSON.stringify(
    {
      durationSec: TOTAL,
      lines: timedLines.map((l) => ({
        id: l.id.toLowerCase(),
        speaker: l.speaker,
        narragansett: l.n,
        english: l.e,
        startSec: l.startSec,
        endSec: l.endSec,
      })),
    },
    null,
    2,
  ),
);
writeFileSync(
  join(ROOT, "narrative/cast.json"),
  JSON.stringify(
    {
      filmId: "one-day-story",
      title: "One day",
      targetDurationSec: TOTAL,
      shotDurationSec: SHOT_SEC,
      shotCount: TOTAL_SHOTS,
      aspect: "9:16",
      styleLock: STYLE,
      cast: CAST,
      rules: plan.rules,
    },
    null,
    2,
  ),
);

// Manifest for stitcher: ordered list of preferred video then still
const manifest = flatShots.map((s) => ({
  index: s.index,
  id: s.id,
  actId: s.actId,
  cast: s.cast,
  still: s.still,
  video: s.video,
  durationSec: s.durationSec,
  narragansett: s.narragansett,
  english: s.english,
  speaker: s.speaker,
  visual: s.visual,
}));
writeFileSync(join(ROOT, "narrative/manifest.json"), JSON.stringify(manifest, null, 2));

console.log(
  JSON.stringify(
    {
      shots: flatShots.length,
      durationSec: TOTAL,
      durationMin: TOTAL / 60,
      acts: acts.length,
      lines: timedLines.length,
      castBreakdown: flatShots.reduce((acc, s) => {
        acc[s.cast] = (acc[s.cast] || 0) + 1;
        return acc;
      }, {}),
    },
    null,
    2,
  ),
);
