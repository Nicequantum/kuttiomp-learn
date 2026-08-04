# Full Day journey & long film — length limits & how it grows

## Hard limits (generation platform)

| Layer | Limit |
|-------|--------|
| Single AI reconstruction shot | **≤ 12 seconds** |
| One Full Day **act** (stitched) | **~1.5–2 minutes** film (5+ shots) |
| Full Day package (10 acts) | **~17 minutes** of film |
| **Long story “One day” film** | **~25 min 12 s** (126 × 12s narrative shots) |
| Practice with line-paced speech | **~30–40 minutes** across all acts |
| Community upload | **Any length** |

There is no 30-minute single AI generation. Long films are always **many short shots concatenated** (or your real camera files).

## Film v4 pipeline (long story)

Narrative-first rebuild — **do not** stitch practice-scene shorts.

1. **Dialogue first** — Host + Guest only (Williams 1643 Narragansett + modern English) in `scripts/build-film-v4-plan.mjs` / `src/lib/content/long-stories-data.ts`
2. **Shot plan** — 126 shots × 12s = 25m 12s, fixed cast, visual beat per line → `film-build/narrative/`
3. **Stills** — generated from locked Host / Guest / Both refs (same two faces throughout)
4. **Motion** — **Track 6 complete**: AI I2V on all **20 narrative keyshots** (`film-build/shots/*.mp4`); Ken Burns from stills for the other ~106. Status: `film-build/logs/track6-i2v-status.json`
5. **Stitch** — `python3 scripts/stitch-film-v4.py` → `public/scenes/long/one-day-story.mp4` (prefers `film-build/shots/*.mp4` over Ken Burns)

Rules:

- Only **Host** (elder) and **Guest** (traveler) appear as people
- Nature-only breathers allowed (marsh, path, sky) with no new faces
- App player: **Play full film** runs continuous end-to-end (watch mode + stall recovery)

## Track 6 keyshots (I2V anchors across the day)

| Time | Shot | Cast | Beat |
|------|-----:|------|------|
| 0:00 | 0 | nature | Dawn marsh |
| 0:36 | 3 | host | Host by fire |
| 1:12 | 6 | host | Host outside wetu |
| 2:24 | 12 | both | Kin greeting |
| 3:36 | 18 | both | Two-shot kin |
| 4:48 | 24 | both | Morning meal |
| 6:00 | 30 | guest | Guest with bowl |
| 7:12 | 36 | both | Path ready |
| 8:24 | 42 | both | Path walk |
| 9:36 | 48 | both | Numbers / shells |
| 10:48 | 54 | host | Land / corn |
| 13:12 | 66 | both | Forest enter |
| 14:24 | 72 | host | Snare check |
| 15:36 | 78 | nature | Canoe shore |
| 16:48 | 84 | both | Fishing together |
| 18:00 | 90 | both | Reading the sky |
| 20:24 | 102 | both | Evening discourse by fire |
| 21:36 | 108 | host | Host offers respects |
| 22:48 | 114 | nature | Night moon over marsh |
| 24:00 | 120 | guest | Guest settles for night |

## What ships for Full Day acts

10 acts, dawn → night (separate shorter films under `/app/day`):

1. Dawn in the wetu  
2. Kin at morning  
3. Morning meal  
4. On the path  
5. Land and corn  
6. Forest trail  
7. At the water  
8. Sky and weather  
9. Evening talk (discourse only — **not** living ceremony)  
10. Night return  

## Replace with your long footage

```text
public/scenes/long/uploads/one-day-story.mp4
public/scenes/day/uploads/{act-id}.mp4
```

## Ceremony note

Living ceremony is **not** reconstructed in demo media. Evening is **discourse/news** language only.
