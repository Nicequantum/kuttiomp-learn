# Little Ones HQ v10

**Status:** All 12 masters rebuilt with shared-clock lips + vocals + HD plates.

## Pipeline (one script)

```bash
python3 scripts/rebuild-kids-hq-v10.py              # all 12
python3 scripts/rebuild-kids-hq-v10.py greeting-kids
```

## What each shot does

1. **Body** — I2V (`motion-v7`) when present (greeting, count); else **full-res Ken Burns** from closed still (no soft half-res warp).
2. **Mouth** — soft still preferred when residual better; hybrid **audio-text** visemes (shapes from orthography, timing from packaged oral).
3. **Voice** — `public/audio/kids/<lineId>.mp3` muxed into the same 6s shot (silence pad after speech).
4. **Player** — `audioSrc` wired; continuous Watch uses film audio as single language clock.

## Quality rules

- CRF 16 · 1080×1920 · high profile
- Never zero-length silence concat (that wiped oral tracks)
- Residual gate via soft plates (no full-frame morph glitch)
- Stills / v6 backup / motion-v7 preserved

## Oral source

Packaged interim TTS for timing lock. Living-speaker replacements drop into `public/audio/kids/` with same filenames → re-run rebuild.
