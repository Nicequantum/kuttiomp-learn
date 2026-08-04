# Uploading your own scene videos

**Prefer the unified guide:** [COMMUNITY_MEDIA.md](./COMMUNITY_MEDIA.md)

That document covers Scenes, Full Day acts, and continuous Stories, plus the
in-app media catalog at `/app/media`.

## Quick start (short scenes)

1. Export MP4 (H.264), ideally 20–40 seconds.
2. Name it after the scene id, e.g. `greeting-dawn.mp4`.
3. Place at `public/scenes/uploads/{scene-id}.mp4`.
4. Redeploy. The player prefers the upload when it is a real video file.

Optional poster: `public/scenes/{scene-id}.jpg`.

## Player defaults

| Control | Default |
|---------|---------|
| Hear | Narragansett |
| Subtitles | English |
| Mode | Learn (line-by-line); Watch for continuous |

Community footage always supersedes reconstruction when present.
