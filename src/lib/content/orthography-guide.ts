/**
 * Reading tips for Williams-era historical spellings (demo only).
 * Not living Narragansett orthography. Keepers supersede all of this.
 */

export type OrthographyTip = {
  id: string;
  pattern: string;
  guidance: string;
  example?: string;
};

export const ORTHOGRAPHY_DISCLAIMER =
  "These tips help you sound out Roger Williams’ 1643 English-letter spellings for demo practice only. They are colonial approximations — not modern tribal orthography and not living speaker authority.";

export const ORTHOGRAPHY_TIPS: OrthographyTip[] = [
  {
    id: "acute",
    pattern: "Acute marks (é, á, ó)",
    guidance:
      "Williams often used accents to mark a stressed or held vowel. Give that syllable a little more weight.",
    example: "Askuttaaquompsín — stress toward the end",
  },
  {
    id: "double-vowel",
    pattern: "Double vowels (aa, ee, oo)",
    guidance:
      "Hold slightly longer than a single English vowel. Prefer a pure vowel, not a modern English diphthong.",
    example: "Keénkaneen",
  },
  {
    id: "qu",
    pattern: "qu / qw",
    guidance: "Usually like English “kw”.",
    example: "Ascowequassunnúmmis",
  },
  {
    id: "ch",
    pattern: "ch",
    guidance:
      "Often like “church.” Living speakers may prefer a different value — follow Keepers when available.",
  },
  {
    id: "nn-mm",
    pattern: "nn, mm",
    guidance: "Hold the nasal lightly (gentle gemination), then release into the next sound.",
  },
  {
    id: "final-uck",
    pattern: "Final -uck / -uk",
    guidance:
      "Closer to a short “uk” than English “luck” with a swallowed ending. Finish the consonant clearly.",
  },
  {
    id: "wh",
    pattern: "wh",
    guidance: "Soft “hw” or “w” — do not force a harsh English “wh”.",
  },
  {
    id: "comma-lists",
    pattern: "Comma-separated forms",
    guidance:
      "Sometimes Williams lists related pronouns or variants in one line (e.g. I / you / he). Treat each form separately when practicing.",
    example: "Neèn, Keèn, Ewò",
  },
  {
    id: "slow",
    pattern: "Pace",
    guidance:
      "Speak slowly. Oral first: listen, then echo. Speed comes later; dignity comes first.",
  },
];

export const ORTHOGRAPHY_PRACTICE_ORDER = [
  "Listen once without looking at English",
  "Look at the historical spelling",
  "Say it slowly, syllable by syllable",
  "Only then check the English gloss",
  "Mark Practiced when you have given it real attention — no scores needed",
] as const;
