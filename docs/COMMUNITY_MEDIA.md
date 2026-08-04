# Community media — replace reconstructions

Community / Keeper footage is **authoritative** when present. The player probes
upload paths at runtime and prefers real video files over packaged AI
reconstructions.

## Folders

| Surface | Path pattern | Example |
|---------|--------------|---------|
| Short scenes | `public/scenes/uploads/{id}.mp4` | `greeting-dawn.mp4` |
| Full Day acts | `public/scenes/day/uploads/{id}.mp4` | `dawn-wake.mp4` |
| Continuous stories | `public/scenes/long/uploads/{id}.mp4` | `one-day-story.mp4` |

After deploy, the same paths are public URLs:

- `/scenes/uploads/greeting-dawn.mp4`
- `/scenes/day/uploads/dawn-wake.mp4`
- `/scenes/long/uploads/one-day-story.mp4`

## Format

- **Container:** MP4
- **Video:** H.264
- **Audio:** AAC if you have living speech (optional; app TTS still works)
- **Long films:** add `+faststart` (moov atom at front) so playback can start quickly
- **Scenes:** prefer ~20–40 seconds for 6–10 spoken lines
- **Day acts:** multi-minute is fine; Learn mode still paces by line times
- **Stories:** one continuous file matching the published duration as closely as practical

## How the app decides what to play

1. HEAD (or Range GET) the `uploadSrc`
2. Reject HTML/text SPA fallbacks (status 200 alone is **not** enough)
3. Reject tiny files (< ~10 KB)
4. If valid video → play community file and show **Community recording**
5. If missing or broken at play time → fall back to packaged reconstruction with a notice

In-app catalog: **App → Community media** (`/app/media`) lists every slot and
live-probes whether a community file is present.

## Timing dialogue to a new cut

Edit line `startSec` / `endSec` in:

- Scenes → `src/lib/content/scenes-data.ts`
- Day acts → `src/lib/content/day-journey-data.ts`
- Stories → `src/lib/content/long-stories-data.ts` (or player contract JSON)

Aim for ~3 seconds per practice line when speech is TTS-driven.

## Cultural rules

- Everyday discourse only — no invented living ceremony
- Living speakers and Keepers supersede historical scaffold forms when approved
- Label careful chapters honestly (e.g. clothing)

## Related

- Short-scene notes (legacy): `docs/SCENES_UPLOAD.md`
- Full Day notes: `docs/FULL_DAY.md`
- Video system program: `artifacts/specs/VIDEO_SYSTEM_PROGRAM.md`
