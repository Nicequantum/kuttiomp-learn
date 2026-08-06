# Little Ones — Status

**Masters:** all 12 · 1080×1920 · shot-per-line · **Hybrid v8**  
**Mouth:** multi-viseme + phoneme map (+ procedural jaw fallback)  
**Body:** I2V (greeting/count) or procedural gesture life (all others)

## Docs

| Doc | What |
|-----|------|
| [`HYBRID_V8.md`](./HYBRID_V8.md) | **Current** body + mouth architecture |
| [`MOUTH_SYNC_AUDIT.md`](./MOUTH_SYNC_AUDIT.md) | Root causes of glitch + dual clocks |
| [`ANIMATION_PATH.md`](./ANIMATION_PATH.md) | Why hybrid animated mouth beats freeze morph |

## What v8 does now

- **Body language** per line (wave, heart, bow, count, beckon, yawn, …)  
- **Multi-viseme** mouth (rest / slight / mid / wide / round) on mouth ROI only  
- Face-track mouth on I2V plates; static ROI on procedural body  
- Misaligned open stills → procedural jaw (still pronounces, no head-nod)  
- Runtime Learn-mode jaw cue (`MouthOverlay`)  
- stills-v2 + export-v6-backup **preserved**

## Rebuild

```bash
python3 scripts/rebuild-kids-hybrid-v8.py
python3 scripts/rebuild-kids-hybrid-v8.py greeting-kids
python3 scripts/rebuild-kids-hybrid-v8.py home-kids --force-body
```

## Next fine-tunes

1. Package kids oral audio → RMS mouth + mux  
2. More I2V body plates (prompt keeps mouth closed)  
3. Pose-locked viseme plates when gen returns  
