# Pilot HQ status — judge before full 12

**Shipped to app:** `greeting-kids`, `home-kids`, `family-kids`  
**Masters:** 720×1280 · ~30s · 5 shots × 6s · H.264 high · ~3–6 Mbps  
**Docs:** `PRODUCTION_BRIEF.md` · `PROMPT_PACK.md` · `SHOT_LIST_PILOT.md` · `CAST_LOCK.md`  
**Tooling:** `scripts/stitch-kids-hq.py`  
**Bible:** `film-kids/bible/` (cast-duo, wetu exterior/interior)

## What changed vs old kids pack

| | Old | HQ pilot |
|--|-----|----------|
| Resolution | 448×672 | **720×1280** |
| Structure | 1 ambient loop / 5 words | **1 shot per line** |
| Style | Soft flat cartoon | Cinematic storybook |
| Wetu | Fabric / yurt drift | Bark-mat **dome** wetu |
| Family words | Two kids only | Father / mother / elders **on screen** |
| Duration | ~18s | **~30s** (matches 5×6s) |

## Known limits (honest)

1. **I2V native pixels** are still ~400–448 wide from the video tool; we **upscale** to 720 for packaging. Detail is far above the old pack but not native 1080p showcase export yet.
2. **Language audio** is still app oral (TTS/line speak) timed to lines — not phoneme lip-sync baked into the MP4. Actions match the **word meaning**; mouths are natural motion, not exact Narragansett visemes.
3. Remaining 9 Little Ones clips still use the old single-loop 448 assets until approved for rebuild.

## Approve / iterate

- If pilot grade is good → rebuild remaining 9 with same pipeline.  
- If wetu or faces need tighter lock → fix bible stills first, then re-I2V only weak shots.  
- Next quality leap: longer/higher native I2V when available + per-line Narragansett AAC mux.
