# Little Ones — Speak-v4 syllable mouth (all 12)

**Shipped to app:** all 12 Little Ones clips  
**Masters:** **1080×1920** · ~30s · 5 shots × 6s · H.264 high  
**Pipeline:** open/closed stills + **syllable-timed mouth** (`scripts/speak-kenburns-shot.py` + `scripts/rebuild-kids-speak-v3.py`)  
**Docs:** `PRODUCTION_BRIEF.md` · `PROMPT_PACK.md` · `SHOT_LIST_V2.md` · `CAST_LOCK.md`  
**Bible:** `film-kids/bible/` (cast-duo, family, wetu)

## Mouth sync (v4 fix)

| | Speak-v3 (broken) | **Speak-v4 (now)** |
|--|-------------------|---------------------|
| Mouth drive | Fixed **3.2 Hz** square flap | **Syllable peaks** of Narragansett text |
| Rest of shot | Kept flapping | **Closed** after speech ends |
| Short words (Nip, Yòh) | Same endless flap | **One open pulse** |
| Long words | Same endless flap | **One open per syllable** |
| Optional upgrade | — | Drop `public/audio/kids/<lineId>.mp3` → **RMS energy** drives mouth |

Each shot writes a sidecar `NN.mouth.txt` listing open intervals for QA.

## Clip list (all live)

1. greeting-kids · 2. meal-kids · 3. count-kids · 4. family-kids  
5. home-kids · 6. day-kids · 7. seasons-kids · 8. birds-kids  
9. water-kids · 10. sleep-kids · 11. path-kids · 12. land-kids  

## Template for other sections (Young / Adult / Elder)

1. Lock cast bible (open + closed mouth stills per shot).  
2. List lines: `(line_id, narragansett)` in rebuild script.  
3. `python3 scripts/speak-kenburns-shot.py closed.jpg open.jpg out.mp4 --text "…"`  
4. Concat shots → public scene master.  
5. Optional: package living-speaker mp3 as `public/audio/kids/<lineId>.mp3` for RMS-true lips.

## Rebuild

```bash
python3 scripts/rebuild-kids-speak-v3.py              # all 12
python3 scripts/rebuild-kids-speak-v3.py water-kids   # one clip
```

Requires `film-kids/stills-v2/<id>/{open,closed}/01.jpg`…`05.jpg`.
