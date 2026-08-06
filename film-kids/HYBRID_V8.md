# Hybrid v8 — Body language + multi-viseme mouth

**Shipped:** 2026-08-06  
**Goal:** Upgrade still / freeze-frame kids masters to **living film** without losing cast lock, stills, or Speak-v6 progress.

## Architecture (non-negotiable)

```
closed still (cast-locked)
        │
        ├─► I2V body plate (motion-v7) when present
        │         OR
        └─► procedural body-life (motion-v8): gesture + breath + blink
                │
                ▼
        face-tracked multi-viseme mouth ROI
        (phoneme keys from line text · audio RMS when packaged)
                │
                ▼
        6s shot → 5-shot master → public/scenes/*-kids.mp4
```

**Lips are never the I2V job.** Body moves; mouth is a controlled layer on the same clock as the language line.

## What v8 adds over v6 / v7

| Layer | v6 Speak | v7 Hybrid | **v8 Hybrid** |
|-------|----------|-----------|---------------|
| Body | Ken Burns only | I2V on 2 clips | I2V **or** intentional gesture life on **all 12** |
| Mouth | ROI closed↔open | ROI on motion, text peaks | **5 visemes** (rest/slight/mid/wide/round) + phoneme map |
| Misaligned open stills | closed-only skip | closed-only skip | **procedural jaw** (still speaks, no head-nod) |
| Face track on I2V | n/a | static mask | phase-corr track (motion-v7) |
| Runtime Learn cue | none | none | soft `MouthOverlay` pulse with oral text |
| Assets preserved | — | stills + v6 backup | stills, v6 backup, motion-v7, **additive** v8 |

## Gesture library (body language)

Every line id maps to an intentional gesture (see `scripts/kids_animation_lib.py` → `LINE_GESTURES`):

wave · open_hand · heart · bow · thank · point_self · beckon · count · offer · listen · settle · yawn · nod · look · idle

Examples:

- `k1` Ascowequassunnúmmis → **wave**
- `k3` Asnpaumpmaúntam → **heart**
- `ck1`–`ck5` numbers → **count**
- `hk3` Wunnégin → **beckon**
- `hk4` / `skids3` sleepy → **yawn**

## Mouth / pronunciation

1. Align open → closed (phase correlation).  
2. Build 5 mouth plates inside a soft ellipse ROI (or procedural jaw if residual > 7).  
3. Map Narragansett orthography → viseme keys (a→wide, e/i→slight, o/u→round, consonants→micro rest).  
4. Smooth alpha + optional face track onto body plate.  
5. When `public/audio/kids/<id>.mp3` exists → **audio RMS** envelope wins over text.

## Rebuild (never deletes stills / v6)

```bash
# all 12
python3 scripts/rebuild-kids-hybrid-v8.py

# one clip
python3 scripts/rebuild-kids-hybrid-v8.py greeting-kids

# regenerate procedural body plates
python3 scripts/rebuild-kids-hybrid-v8.py home-kids --force-body
```

Paths:

| Path | Role |
|------|------|
| `film-kids/stills-v2/` | locked plates (untouched) |
| `film-kids/export-v6-backup/` | Speak-v6 safety net |
| `film-kids/motion-v7/` | real I2V body (preferred) |
| `film-kids/motion-v8/` | procedural gesture body |
| `film-kids/shots-v8/` | mouth-composited shots |
| `film-kids/export-v8/` | concat masters |
| `public/scenes/*-kids.mp4` | shipped |

## Scripts

| Script | Role |
|--------|------|
| `scripts/kids_animation_lib.py` | shared core: visemes, gestures, track, body life |
| `scripts/render-kids-body-life.py` | procedural body plate |
| `scripts/composite-mouth-on-motion.py` | multi-viseme mouth on motion |
| `scripts/rebuild-kids-hybrid-v8.py` | orchestrate → public |

## Runtime (Learn mode)

- `src/lib/audio/mouth-envelope.ts` — synthetic + analyser helpers  
- `src/components/scenes/MouthOverlay.tsx` — soft jaw glow with oral pulse  
- Wired in `ScenePlayer` for Little Ones / `speak` tags  

Baked lips carry Watch mode; overlay reinforces that speech is live in Learn.

## Next fine-tunes (safe, no progress loss)

1. Package TTS → `public/audio/kids/<id>.mp3` → re-composite with `--audio` (true shared clock).  
2. Mux oral into MP4 for Watch-mode `filmCarriesLanguage`.  
3. Replace procedural body with more I2V plates using `i2v_body_prompt()` (mouth stays closed in prompt).  
4. Pose-locked viseme stills from edit-image when gen quota returns.  
5. Dial `PEAK_ALPHA` / gesture strengths per clip after visual QA.

## Acceptance

- All 12 kids masters ~30s, 1080×1920.  
- Every shot has mouth motion (multi-viseme or procedural-jaw).  
- Body is alive (I2V or gesture life) — not a freeze-frame morph.  
- No full-frame open/closed morph glitch.  
- stills-v2 + export-v6-backup intact.
