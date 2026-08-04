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

| id | Title | Chapter | Notes |
|----|--------|---------|--------|
| greeting-dawn | Greeting at dawn | 1 | cinematic |
| greeting-kids | Hello, friend (kids) | 1 | cartoon |
| meal-share | Stay and eat | 2 | cinematic |
| meal-kids | Share the bowl (kids) | 2 | cartoon |
| sleep-lodge | Rest for the night | 3 | cinematic |
| count-shells | Counting shells | 4 | cinematic |
| family-kin | Our family | 5 | cinematic |
| home-fire | Home by the fire | 6 | cinematic |
| news-marsh | News by the marsh | 8 | cinematic |
| day-hours | Hours of the day | 9 | cinematic |
| seasons-year | Through the year | 10 | cinematic |
| seasons-kids | Four seasons (kids) | 10 | cartoon |
| ask-path | Show me the way | 11 | cinematic |
| sky-moon | Moon and stars | 12 | cinematic |
| weather-sky | Reading the weather | 13 | cinematic |
| wind-rise | Reading the winds | 14 | cinematic |
| birds-marsh | Birds of the marsh | 15 | cinematic |
| birds-kids | Bird friends (kids) | 15 | cartoon |
| earth-fruits | Gifts of the earth | 16 | cinematic |
| forest-deer | Deer in the forest | 17 | cinematic |
| canoe-shore | At the shore | 18 | cinematic |
| fish-water | Fish and fishing | 19 | cinematic |
| trade-shore | Trade at the shore | 25 | Adult/Elder |
| hunt-trail | On the hunt trail | 27 | cinematic, no violence |
| wampum-count | Shells of exchange | 24 | **awaiting your upload** (Adult/Elder) |
| clothing-words | Clothing words | 20 | **awaiting your upload** (Adult/Elder) |

## Timing dialogue to your video

Edit line `startSec` / `endSec` in `src/lib/content/scenes-data.ts` for that scene so subtitles and line-step match your cut.

Optional: set `wordId` on a line to link into the Williams demo lexicon Words page.

## Labels

Keep the in-app notice: reconstructions and demo language until Keepers publish living forms and you swap media.

## Sensitive chapters not packaged yet

Religion, war, death, marriage, sickness, and government chapters stay out of the default catalog until Keepers and community media guide presentation. Upload scaffolds can be added later without inventing ceremonial content.
