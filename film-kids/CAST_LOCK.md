# Little Ones — Cast Lock (HQ)

**Authority faces:** Hello Kid Friends pair (Friend Tan + Friend Teal), upgraded to **cinematic storybook HQ** while keeping identity.
**Refs:** `film-kids/bible/` (cast sheets) · `film-kids/refs/hello-frame-*.jpg` (identity seed)
**Grade:** Premium children’s cinematic storybook — see `PROMPT_PACK.md` STYLE_MASTER.
**Export:** **720×1280**, shot-per-line I2V stitch (`scripts/stitch-kids-hq.py`).

## Leads (every clip)

| ID | Look |
|----|------|
| Friend Tan | ~8, longer dark braid, **tan hide tunic**, warm brown skin |
| Friend Teal | ~7, shorter/twin-braid dark hair, **teal hide tunic**, warm brown skin |

## Supporting (family-kids only)

Father · Mother · Elder man · Elder woman — same people/world; never steal lead focus.

## Wetu

Bent-sapling frame, bark or cattail mats, smoke hole — `PROMPT_PACK.md` WETU_LOCK.

## Pipeline

1. Bible stills in `film-kids/bible/`
2. Per-line stills in `film-kids/stills-hq/<clip>/`
3. 6s I2V → `film-kids/shots-hq/<clip>/`
4. `python3 scripts/stitch-kids-hq.py <clip>`
5. Wire durationSec to stitched length in `scenes-data.ts`
