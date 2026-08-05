# Little Ones — Cinematic Speak-v3 (all 12)

**Shipped to app:** all 12 Little Ones clips  
**Masters:** **1080×1920** · ~30s · 5 shots × 6s · H.264 high · ~4–5.5 Mbps  
**Pipeline:** open/closed mouth pairs + Ken Burns speak flap (`scripts/speak-kenburns-shot.py` + `scripts/rebuild-kids-speak-v3.py`)  
**Docs:** `PRODUCTION_BRIEF.md` · `PROMPT_PACK.md` · `SHOT_LIST_V2.md` · `CAST_LOCK.md`  
**Bible:** `film-kids/bible/` (cast-duo, family, wetu)

## What shipped

| | Old cartoon | Prior I2V pack | **Speak-v3 (now)** |
|--|-------------|----------------|---------------------|
| Resolution | 448×672 | upscaled ~720–1080 | **Native package 1080×1920** |
| Structure | 1 ambient loop | shot-per-line | **shot-per-line** |
| Style | Soft flat cartoon | Cinematic stills | **Cinematic storybook only** |
| Mouth | None | Often frozen in I2V | **Guaranteed open/closed flap every line** |
| Cast | Mixed | Friend Tan + Teal | **Locked Tan + Teal + family bible** |
| Clips | partial | 8 of 12 | **All 12** |

## Clip list (all live)

1. greeting-kids · 2. meal-kids · 3. count-kids · 4. family-kids  
5. home-kids · 6. day-kids · 7. seasons-kids · 8. birds-kids  
9. water-kids · 10. sleep-kids · 11. path-kids · 12. land-kids  

## Why speak flap (not I2V lips)

I2V cinematic motion looked richer in body/camera, but mouths often stayed closed.  
Speak-v3 alternates locked **open-mouth** and **closed-mouth** stills at ~3.2 Hz with a slow push-in/out so every dialogue line clearly talks. Language audio remains the app oral path timed to lines.

## Rebuild

```bash
python3 scripts/rebuild-kids-speak-v3.py              # all 12
python3 scripts/rebuild-kids-speak-v3.py water-kids   # one clip
```

Requires `film-kids/stills-v2/<id>/{open,closed}/01.jpg`…`05.jpg`.
