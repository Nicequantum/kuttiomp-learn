# Film V5 — status (kids-platform Native American + language-first)

**Date:** 2026-08-05  
**Master:** `public/scenes/long/one-day-story.mp4` (~900s / 15 min)  
**Style:** Kids educational animation · **cast:** Northeastern coastal Algonquian Native American only  
**Language:** Narragansett embedded in film AAC track (language first)

## What was wrong (prior master)

1. **Character base drift** — master frames showed multi-ethnicity / non-Native faces (including pale European-looking figures). Not acceptable.  
2. **Language missing from picture track** — only near-silent ambient; learners who watched the film without catching oral overlay heard no Algonquian.

## Fixes shipped

| Fix | Detail |
|-----|--------|
| Cast lock | Regenerated Host/Guest kids-platform Native American refs + all 80 act stills under `film-v5/stills/native/` and act folders |
| Reject old I2V | Cleared prior character I2V that drifted ethnicity |
| Restitch | Ken Burns master from locked stills → ~900s |
| Language mux | `scripts/mux-language-sequential.py` places all 114 `od*.mp3` lines on the timeline (scaled to video length) + soft ambient; mean speech ≈ −15 dB |
| Player | Film soundtrack **on by default** for Stories / Full Day; continuous watch does not dual-speak oral when soundtrack is on |
| Docs | `STYLE_BIBLE.md`, `CAST_SHEETS.md` locked to kids-platform Native American + language-first |

## Verify

- Frames at t=100,200,400,600: Host + Guest brown-skin Native American kids animation  
- Audio samples t=20…700: speech present (~−14 to −17 dB mean)  
- `npm run typecheck` pass  
- HTTP 200 for app + master video  

## Rebuild commands

```bash
python3 /workspace/scripts/stitch-film-v5.py
python3 /workspace/scripts/mux-language-sequential.py
```

## Follow-ups (optional)

- I2V motion pass **only** from `stills/native/*` with cast lock in prompt  
- More beat variety stills (8 unique per act) when generation budget allows  
- Community living-speaker audio supersedes synthetic TTS in oral path  
