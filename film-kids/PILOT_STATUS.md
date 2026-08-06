# Little Ones — Status

**Masters:** all 12 · 1080×1920 · shot-per-line  
**Mouth encode:** Speak-v6 **ROI + glitch gate** (Phase A/B)

## Docs

| Doc | What |
|-----|------|
| [`MOUTH_SYNC_AUDIT.md`](./MOUTH_SYNC_AUDIT.md) | Root causes of glitch + dual clocks |
| [`ANIMATION_PATH.md`](./ANIMATION_PATH.md) | Why hybrid animated mouth beats freeze morph |

## What v6 does now

- Align open → closed; blend **mouth ROI only** (not full-frame morph)
- If face residual > 6.5 → **closed-only** (no head-nod)
- ~47/60 shots ROI mouth; ~13/60 safe static (bad open stills)
- Still text-syllable timed until packaged kids audio exists

## Next (no gen required for C)

1. Package oral audio per line → `public/audio/kids/<id>.mp3`  
2. Drive envelopes from audio RMS + mux into MP4  
3. Runtime `MouthOverlay` driven by same oral audio (language Learn mode)  
4. When gen returns: pose-locked viseme plates from closed only  

## Rebuild

```bash
python3 scripts/rebuild-kids-speak-v3.py
python3 scripts/rebuild-kids-speak-v3.py greeting-kids --mode roi
```
