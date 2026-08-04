# Uploading your own scene videos

You can replace any reconstructed clip without changing app code.

## How the player works (important)

| Control | Default | Options |
|---------|---------|---------|
| **Hear** (spoken) | **Narragansett** | Narragansett · English · Both · Off |
| **Subtitles** | **English** | English · Narragansett · Both · Off |
| **Mode** | **Learn** (line-by-line with speech) | Learn · Watch (continuous video) |

- **Play** opens **fullscreen**; on-screen controls auto-hide so they don’t cover the picture.
- Ambient reconstruction audio is **muted by default** (language comes from the speech track).
- Dialogue length is the **practice timeline** (~20–30s of lines). Short video files still work: Learn mode maps each line onto the clip.

## Option A — Drop-in by scene id (recommended)

1. Export your video as **MP4** (H.264 + AAC), ideally **16:9 or 9:16**, under ~50 MB.
2. Prefer **~24–40 seconds** when you can — enough for 6–10 spoken lines with context.
3. Name it exactly after the scene id, for example:
   - `greeting-dawn.mp4`
   - `meal-share.mp4`
   - `earth-fruits.mp4`
4. Put it in the repo at:

```text
public/scenes/uploads/{scene-id}.mp4
```

5. Commit and redeploy (or open a PR).
6. The player **prefers** `/scenes/uploads/{id}.mp4` when that file exists; otherwise it uses the packaged reconstruction.

Optional poster: replace `public/scenes/{scene-id}.jpg`.

## Option B — Replace the packaged file

Overwrite:

```text
public/scenes/{scene-id}.mp4
public/scenes/{scene-id}.jpg   # optional new poster frame
```

## Timing dialogue to your video

Edit line `startSec` / `endSec` (or the whole `lines` list) in `src/lib/content/scenes-data.ts` so Learn/Watch pacing matches your cut. Aim for **~3 seconds per line** so speech has room.

## Scene ids currently in the app

| id | Title | Practice length | Notes |
|----|--------|-----------------|--------|
| greeting-dawn | Greeting at dawn | ~28s | cinematic |
| greeting-kids | Hello, friend (kids) | ~20s | cartoon |
| meal-share | Stay and eat | ~28s | cinematic |
| meal-kids | Share the bowl (kids) | ~20s | cartoon |
| sleep-lodge | Rest for the night | ~28s | cinematic |
| count-shells | Counting shells | ~30s | numbers 1–10 |
| family-kin | Our family | ~28s | cinematic |
| home-fire | Home by the fire | ~28s | cinematic |
| news-marsh | News by the marsh | ~28s | cinematic |
| day-hours | Hours of the day | ~28s | cinematic |
| seasons-year | Through the year | ~28s | cinematic |
| seasons-kids | Four seasons (kids) | ~20s | cartoon |
| ask-path | Show me the way | ~28s | cinematic |
| sky-moon | Moon and stars | ~28s | cinematic |
| weather-sky | Reading the weather | ~28s | cinematic |
| wind-rise | Reading the winds | ~28s | cinematic |
| birds-marsh | Birds of the marsh | ~28s | cinematic |
| birds-kids | Bird friends (kids) | ~18s | cartoon |
| earth-fruits | Gifts of the earth | ~28s | cinematic |
| forest-deer | Deer in the forest | ~24s | cinematic |
| canoe-shore | At the shore | ~28s | cinematic |
| fish-water | Fish and fishing | ~28s | cinematic |
| trade-shore | Trade at the shore | ~28s | Adult/Elder |
| hunt-trail | On the hunt trail | ~28s | no violence shown |
| wampum-count | Shell money words | ~24s | **awaiting your upload** |
| clothing-words | Clothing words | ~20s | **awaiting your upload** · careful |

## Labels

Keep the in-app notice: reconstructions and demo language until Keepers publish living forms and you swap media. Spoken Narragansett in the app is **practice synthesis** until living recordings land.
