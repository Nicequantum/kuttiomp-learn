# Adult Path HQ v1

**Status:** Shipping path for Core Adult mode  
**Parallel to:** Little Ones HQ v11 · Young Path HQ v1  
**Does not modify:** kids or student masters

## Lessons from the first 24 (locked into this pipeline)

| Failure mode (kids/student) | Adult Path fix |
|---|---|
| Mouth drifts from language | **Oral is the sole clock** — normalize (trim silence → lead 0.22s) then bake + mux the *same* WAV |
| Silent frames still flap | Hybrid visemes **RMS-gated** — near-silent frames stay nearly closed |
| Open plate morph glitch | Residual gate **≤ 5.0** (stricter than 7.0); soft blend when open is high; else procedural jaw |
| Mouth ROI drifts on body | **Always face-track** mouth ROI (`--track on` for bodylife / film-adult) |
| Static body / low motion | Body-life + amplify if motionΔ < 2.3; I2V preferred when available |
| Dual TTS echo in player | Masters carry AAC; player uses `filmCarriesLanguage` |

## Architecture

```
oral seed (student TTS same language)
  → normalize_oral_slot(lead=0.22, total=6s)  →  public/audio/adult/<id>.mp3
closed still  →  body-life / I2V  →  film-adult/motion/
open plate if residual ≤ 5  else soft blend  else procedural jaw
hybrid visemes (text shapes × audio window, RMS strength)
  →  ROI composite (face-track on)  →  mux same oral AAC
  →  stitch 5×6s  →  public/scenes/<clip>-adult.mp4
```

## Rules

1. **Audio is the clock.** Living-speaker drop-in: same filename → re-run rebuild.
2. **Body ≠ lips.** Body-life / I2V keep mouth soft-closed; lips from hybrid envelope only.
3. **Open plate preferred** when face residual ≤ 5.0; soft blend plates auto-built under that gate.
4. **Continuous motion required** (motionΔ ≥ 2.3). Amplify path if weak.
5. Encode: 1080×1920 · 24 fps · CRF 16 · AAC peak-check every 6 s slot · master 29.85–30.15 s.
6. Cast: Friend Tan + Friend Teal as adults only (`CAST_LOCK.md`).

## Rebuild

```bash
python3 scripts/rebuild-adult-hq-v1.py --prepare-audio   # normalize oral slots
python3 scripts/rebuild-adult-hq-v1.py                   # all 12
python3 scripts/rebuild-adult-hq-v1.py meal-adult        # one clip
python3 scripts/rebuild-adult-hq-v1.py --force greeting-adult
```

## Acceptance (per clip) — fail closed

- Duration 29.85–30.15 s  
- Audio peak > 500 in each of 5 slots  
- Continuous body (motionΔ ≥ 2.3)  
- Plate residual open or soft ≤ 5.0 when open mode used  
- Cast: Friend Tan + Friend Teal adults only  
- Language on master matches line text (same WAV baked + muxed)
