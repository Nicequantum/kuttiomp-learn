# Little Ones HQ v11

**Status:** Shipped — all 12 masters continuous body + shared-clock lips + verified audio  
**Supersedes:** Hybrid v7/v8, greeting v9, HQ v10 as shipping paths  

## Architecture

```
oral mp3 (public/audio/kids/<id>.mp3)  →  sole time authority
closed still  →  I2V continuous body (mouth-calm)  →  motion-v11/
open plate (if residual ≤ 7) else soft else procedural jaw
hybrid visemes (text shapes × audio window)  →  ROI composite
mux oral AAC  →  stitch  →  public/scenes/<clip>.mp4
```

## Rules

1. **Audio is the clock.** Living-speaker drop-in: same filename → re-run rebuild.
2. **Body ≠ lips.** I2V prompts keep mouth soft-closed; lips from hybrid envelope.
3. **Open plate preferred** when face residual ≤ 7.0 (soft was killing mouth delta).
4. **Continuous motion required** for ship: I2V motion-v11 (or motion-v7 for greeting/count).
5. **Ken Burns is not shipping** unless every I2V path fails (then flag QA).
6. Encode: 1080×1920 · 24 fps · CRF 16 · AAC with peak check every 6 s slot.

## Rebuild

```bash
python3 scripts/rebuild-kids-hq-v11.py              # all 12
python3 scripts/rebuild-kids-hq-v11.py meal-kids    # one clip
python3 scripts/rebuild-kids-hq-v11.py --body-only meal-kids  # normalize I2V only
python3 scripts/rebuild-kids-hq-v11.py --force meal-kids      # re-normalize + rebuild
```

## Acceptance (per clip) — fail closed

- Duration 29.85–30.15 s  
- Audio peak > 500 in each of 5 slots  
- Continuous body (motionΔ ≥ 2.5; not still+zoom)  
- Mouth via open/soft plate when residual ≤ 7 else procedural jaw (no residual morph)  
- Cast: Friend Tan + Friend Teal only  

## Shipped inventory (2026-08-06)

| Clip | Body source | Notes |
|------|-------------|-------|
| greeting-kids | motion-v7 | continuous I2V |
| count-kids | motion-v7 | continuous I2V |
| meal-kids | motion-v11 | continuous I2V |
| family-kids | motion-v11 | continuous I2V |
| home-kids | motion-v11 | continuous I2V |
| day-kids | motion-v11 | continuous I2V |
| seasons-kids | motion-v11 | continuous I2V |
| birds-kids | motion-v11 | continuous I2V |
| water-kids | motion-v11 | I2V from closed stills |
| sleep-kids | motion-v11 | I2V from closed stills |
| path-kids | motion-v11 | I2V from closed stills |
| land-kids | motion-v11 | I2V from closed stills |

All 12 pass duration + 5-slot audio + continuous-body gates. Masters + posters in `public/scenes/`.
