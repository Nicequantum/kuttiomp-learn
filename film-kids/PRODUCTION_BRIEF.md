# Little Ones HQ Production Brief — Cinematic Speak-v3

**Grade target:** Showcase cinematic storybook — rich detail, volumetric light, locked Northeastern cast. **Not** flat cartoon. **Not** photoreal live-action.

**Culture:** Southern New England coastal Algonquian (Narragansett / related woodland peoples). Everyday life. Language first (Williams 1643 kids-safe forms).

**Hero cast (every clip):** Friend Tan + Friend Teal only as speaking leads.  
**Supporting cast (when the word needs them):** Father, Mother, Elder man, Elder woman — locked bible designs only.

**World lock:** Accurate **wetu** (bent sapling; bark sheets / cattail mats; smoke hole; low doorway). Pine, oak, marsh, shell path, wooden bowls. No Plains tipí, no yurt, no pan-Indigenous warbonnet pile.

## Non-negotiable quality rules (v3)

1. **Style:** Cinematic storybook only. Scrap all soft-flat cartoon masters.  
2. **Cast lock:** Same two children (and locked family) in every Little Ones video — forever for this section.  
3. **Speak-first:** Every dialogue line has **open + closed mouth stills**. Packaged motion **flaps the mouth** for the full shot (not frozen I2V smile).  
4. **Export master:** **1080×1920** · H.264 high · CRF ≤17 · ~30s (5×6s shots) · `scripts/rebuild-kids-speak-v3.py`.  
5. **Language:** App oral path timed to lines; picture serves the word.  
6. **Cartoon scrap:** No cartoon-tagged Little Ones media in the catalog.

## Pipeline

1. Bible stills from `film-kids/bible/` (cast + wetu + family).  
2. **Open + closed still per line** under `film-kids/stills-v2/<id>/`.  
3. Speak-Ken Burns 6s flap + zoom.  
4. Stitch → `public/scenes/{id}.mp4` + `.jpg`.  
5. `scenes-data.ts`: `style: "cinematic"`, `durationSec: 30`, tags `hq`, `cinematic`, `speak`.

## All 12 clips

| # | id | Title |
|---|-----|-------|
| 1 | greeting-kids | Hello, friend |
| 2 | meal-kids | Share the bowl |
| 3 | count-kids | Count with me |
| 4 | family-kids | Our family words |
| 5 | home-kids | Home wetu |
| 6 | day-kids | Day light |
| 7 | seasons-kids | Four seasons |
| 8 | birds-kids | Bird friends |
| 9 | water-kids | By the water |
| 10 | sleep-kids | Night rest |
| 11 | path-kids | Little path |
| 12 | land-kids | Corn and land |

## Reject

- Flat cartoon / muddy soft style  
- Wrong dwelling or Plains warbonnets on children  
- Frozen closed mouths on dialogue lines  
- Random third child / wrong faces  
- Horizontal masters  
- Masters left at 448×672 cartoon resolution  
