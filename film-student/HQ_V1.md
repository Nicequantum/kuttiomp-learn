# Young Path HQ v1 (Student)

**Status:** Shipping path for Young Learner / Student mode  
**Parallel to:** Little Ones HQ v11  
**Does not modify:** kids masters

## Architecture

```
oral mp3 (public/audio/student/<id>.mp3)  →  sole time authority
closed still  →  I2V continuous body (preferred) OR procedural body-life
                →  film-student/motion/
open plate (if residual ≤ 7) else soft else procedural jaw
hybrid visemes (text shapes × audio window)  →  ROI composite
mux oral AAC  →  stitch  →  public/scenes/<clip>-student.mp4
```

## Rules

1. **Audio is the clock.** Living-speaker drop-in: same filename → re-run rebuild.
2. **Body ≠ lips.** I2V / body-life prompts keep mouth soft-closed; lips from hybrid envelope.
3. **Open plate preferred** when face residual ≤ 7.0.
4. **Continuous motion required** for ship (motionΔ ≥ 2.5). Prefer I2V; if missing, procedural body-life with line gestures.
5. Encode: 1080×1920 · 24 fps · CRF 16 · AAC peak-check every 6 s slot.
6. Cast: Friend Tan + Friend Teal teens only (`CAST_LOCK.md`).

## Rebuild

```bash
python3 scripts/rebuild-student-hq-v1.py              # all 12
python3 scripts/rebuild-student-hq-v1.py meal-student # one clip
python3 scripts/rebuild-student-hq-v1.py --body-only  # bodies only
python3 scripts/rebuild-student-hq-v1.py --force meal-student
```

## Acceptance (per clip) — fail closed

- Duration 29.85–30.15 s  
- Audio peak > 500 in each of 5 slots  
- Continuous body (motionΔ ≥ 2.5)  
- Cast: Friend Tan + Friend Teal teens only  
