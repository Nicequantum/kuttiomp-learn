# Full Day journey & long film — length limits & how it grows

## Film V5 master-window model (current)

| Layer | Limit |
|-------|--------|
| **Master film** `one-day-story.mp4` | **~15 min / 900s** (stylized cinematic animation) |
| Full Day **act** | **90s window** into the master (not a separate act mp4 as primary) |
| Full Day package (10 acts) | **15 minutes** film (10 × 90s) |
| Long story “One day” | **Same master** — full continuous watch |
| Practice with line-paced speech | **~30–40 minutes** across all acts |
| Community upload | **Any length** (per-act or full master override) |

There is no 30-minute single AI generation. The master is many short shots concatenated (or your real camera files).

### How acts use the master

1. Packaged `videoSrc` for every Full Day act is `/scenes/long/one-day-story.mp4`
2. Each act sets `windowStartSec` / `windowEndSec` (0–90, 90–180, … 810–900)
3. `ScenePlayer` seeks to the window start, seeks only inside the window, and stops at window end
4. Learn mode still uses local line times `0..practiceSec`; the player maps them into the window
5. Community upload at `public/scenes/day/uploads/{act-id}.mp4` **replaces** the master window for that act (self-contained clip; no window applied)

## Film V5 pipeline (long story / master)

1. **Dialogue first** — Host + Guest only (Williams 1643 Narragansett + modern English)
2. **Beat plan** — 10 acts × ~8 beats × 12s ≈ 900s → `film-v5/BEAT_PLAN.json`
3. **Style** — stylized cinematic animation (hand-painted, dignified northeastern coastal Algonquian life)
4. **Stitch** → `public/scenes/long/one-day-story.mp4`

Rules:

- Only **Host** (elder) and **Guest** (traveler) appear as people
- Nature-only breathers allowed (marsh, path, sky) with no new faces
- App player: **Play full film** (Stories) runs continuous end-to-end; **Full Day acts** play windows into the same file

## What ships for Full Day acts

10 acts, dawn → night (windows into master under `/app/day`):

| # | Act | Master window |
|--:|-----|---------------|
| 1 | Dawn in the wetu | 0–90s |
| 2 | Kin at morning | 90–180s |
| 3 | Morning meal | 180–270s |
| 4 | On the path | 270–360s |
| 5 | Land and corn | 360–450s |
| 6 | Forest trail | 450–540s |
| 7 | At the water | 540–630s |
| 8 | Sky and weather | 630–720s |
| 9 | Evening talk (discourse only — **not** living ceremony) | 720–810s |
| 10 | Night return | 810–900s |

## Replace with your long footage

```text
public/scenes/long/uploads/one-day-story.mp4   # full master override
public/scenes/day/uploads/{act-id}.mp4         # per-act override (no window)
```

## Ceremony note

Living ceremony is **not** reconstructed in demo media. Evening is **discourse/news** language only.

## Legacy (v4)

Earlier packages used separate ~1.5–2 min act mp4s under `/scenes/day/` and a ~25 min 12 s long story. V5 supersedes that with the master-window model above; act posters under `/scenes/day/` remain as still thumbnails.
