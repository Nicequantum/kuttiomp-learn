# Little Ones HQ Production Brief

**Grade target:** Showcase-level Grok Imagine video — rich detail, cinematic light, storybook realism for children. Not soft flat cartoon. Not photoreal live-action.

**Culture:** Southern New England coastal Algonquian (Narragansett / related woodland peoples). Pre-contact and early-contact everyday life. Language first (Narragansett forms from Williams 1643 kids-safe set).

**Hero cast (every clip):** Friend Tan + Friend Teal only as speaking leads.  
**Supporting cast (family lesson only):** Father, Mother, Elder man, Elder woman — locked designs, same world, never replace the two friends as leads.

**World lock:** Accurate **wetu** (bent sapling frame; winter bark sheets or summer cattail mats; smoke hole; oval/dome woodland lodge). Pine, oak, marsh edge, shell path, wooden bowls, mats. No Plains tipí, no yurt, no circus tent, no bright painted fabric dome, no pan-Indigenous headdress pile.

**Pipeline (non-negotiable):**
1. Bible stills (cast + wetu + world) at **9:16**, max detail.
2. **One still per line** (shot-per-word).
3. **I2V 6s per shot** — one clear action + one camera move.
4. **FFmpeg concat** (re-encode only if fps/size mismatch; prefer stream copy when uniform).
5. Export master **720×1280** (or native gen if higher), H.264 high profile, ~8–12 Mbps target.
6. Language: app oral path always; mux AAC when line packs exist.
7. QA: reject bad wetu, wrong faces, third random kids, mute mouths with no timed action.

**Pilot clips (judge quality before full 12):**
1. `greeting-kids` — Hello, friend  
2. `home-kids` — Home wetu  
3. `family-kids` — Our family words  

**App contract:** `public/scenes/{id}.mp4` + `.jpg` poster; `scenes-data.ts` durationSec + line timing must match stitched length.
