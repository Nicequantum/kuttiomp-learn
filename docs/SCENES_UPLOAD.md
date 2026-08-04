# Uploading your own scene videos

You can replace any reconstructed clip without changing app code.

## Option A — Drop-in by scene id (recommended)

1. Export your video as **MP4** (H.264 + AAC), ideally 9:16 or 16:9, under ~30 MB.
2. Name it exactly after the scene id, for example:
   - `greeting-dawn.mp4`
   - `meal-share.mp4`
   - `earth-fruits.mp4`
3. Put it in the repo at:

```text
public/scenes/uploads/{scene-id}.mp4
```

4. Commit and redeploy (or open a PR).
5. The player **prefers** `/scenes/uploads/{id}.mp4` when that file exists; otherwise it uses the packaged reconstruction.

Optional poster:

```text
public/scenes/uploads/{scene-id}.jpg
```

(Poster override can be wired later; today poster stays the packaged `.jpg` unless you also replace `public/scenes/{id}.jpg`.)

## Option B — Replace the packaged file

Overwrite:

```text
public/scenes/{scene-id}.mp4
public/scenes/{scene-id}.jpg   # optional new poster frame
```

## Scene ids currently in the app

| id | Title | Notes |
|----|--------|--------|
| greeting-dawn | Greeting at dawn | cinematic |
| greeting-kids | Hello, friend (kids) | cartoon |
| meal-share | Stay and eat | cinematic |
| meal-kids | Share the bowl (kids) | cartoon |
| home-fire | Home by the fire | cinematic |
| count-shells | Counting shells | cinematic |
| news-marsh | News by the marsh | cinematic |
| ask-path | Show me the way | cinematic |
| weather-sky | Reading the weather | cinematic |
| canoe-shore | At the shore | cinematic |
| trade-shore | Trade at the shore | Adult/Elder |
| earth-fruits | Gifts of the earth | **awaiting your upload** |
| fish-water | Fish and water | **awaiting your upload** |

## Timing dialogue to your video

Edit line `startSec` / `endSec` in `src/lib/content/scenes-data.ts` for that scene so subtitles and line-step match your cut.

## Labels

Keep the in-app notice: reconstructions and demo language until Keepers publish living forms and you swap media.
