# Little Ones — Cast Lock (Cinematic Speak-v3)

**Authority:** Only these faces appear in Little Ones. Never invent a third child or random adults.

**Grade:** Premium children’s **cinematic storybook** (not cartoon).  
**Export:** **1080×1920** via `scripts/rebuild-kids-speak-v3.py` · shot-per-line · **speaking mouth flap** on every line.

## Bible files (`film-kids/bible/`)

| File | Role |
|------|------|
| `cast-duo-v2.jpg` | **Leads** Friend Tan + Friend Teal (regalia) |
| `father-v2.jpg` | Supporting — Father |
| `mother-v2.jpg` | Supporting — Mother |
| `elder-man-v2.jpg` | Supporting — Elder man |
| `elder-woman-v2.jpg` | Supporting — Elder woman |
| `wetu-exterior-v2.jpg` / `wetu-interior-v2.jpg` | Architecture lock |
| `family-sheet-v2.jpg` | Reference grid only (do not use as sole face source) |

## Leads (every clip)

| ID | Look |
|----|------|
| **Friend Tan** | ~8, longer dark braid, **tan hide tunic**, wampum choker, bone/shell chest piece, one small feather in hair, warm light-brown skin, moccasins |
| **Friend Teal** | ~7, twin braids, **teal hide tunic**, purple-white wampum necklace, shell earrings, bracelet, warm light-brown skin, moccasins |

## Supporting (when the word needs them)

| ID | When |
|----|------|
| Father | family-kids “father”; optional silent presence meal/home |
| Mother | family-kids “mother”; meal-kids may show mother with bowl |
| Elder man | family-kids “elder man” |
| Elder woman | family-kids “elder woman” |

Kids remain the emotional center even when adults are on screen.

## Regalia rules (Northeastern woodland)

- Light brown / copper-brown skin  
- Purple & white **wampum** shell beads, copper, soft hide, quill/bead trim  
- Single eagle feather ornaments for Father (and small for Tan) — **not** full Plains warbonnets  
- No modern clothes, no tipí, no yurt  

## Pipeline (Speak-v3)

1. One **open-mouth** still + one **closed-mouth** still per line (`stills-v2/<id>/open|closed/NN.jpg`) from locked cast  
2. `speak-kenburns-shot.py` → 6s 1080×1920 mouth flap + slow zoom  
3. `rebuild-kids-speak-v3.py <clip-id>` → `public/scenes/`  
4. `scenes-data.ts`: `style: "cinematic"`, `durationSec: 30`, tags include `speak`  

## Section rule (product)

Little Ones = **this cast only** for every video in the kids learning section.  
Other modes get their own locked casts (young learners, adults, elders) generated separately with the same traditional regalia standard — never mixed into Little Ones.
