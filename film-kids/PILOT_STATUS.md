# Little Ones — Speak-v5 elegant soft mouth (all 12)

**Shipped to app:** all 12 Little Ones clips  
**Masters:** **1080×1920** · ~30s · 5 shots × 6s · H.264 high  
**Pipeline:** soft-speak stills + smooth syllable envelopes  
(`scripts/speak-kenburns-shot.py` + `scripts/rebuild-kids-speak-v3.py`)

## Mouth quality (v5)

| | v3 metronome | v4 hard syllable | **v5 soft elegant** |
|--|--------------|------------------|---------------------|
| Open still | Wide scream | Wide scream on/off | **Soft mix ~30%** (gentle parted lips) |
| Transition | Hard cut | Hard on/off | **Raised-cosine fade** |
| Amplitude | Full open | Full open | **Subtle** — teaching speech, not shout |
| Timing | Fixed 3.2 Hz | Syllable peaks | **Syllable peaks + stress weight** |
| Rest | Flapping | Closed | **Closed** |

Soft stills live in `film-kids/stills-v2/<id>/soft/` (procedural closed+open mix; optional AI soft stills when available).

## Rebuild

```bash
python3 scripts/rebuild-kids-speak-v3.py              # all 12
python3 scripts/rebuild-kids-speak-v3.py water-kids   # one clip
```

## Template for other sections

1. Closed + open stills per line (open can be wider; soft is derived).  
2. Line list `(id, narragansett)`.  
3. `speak-kenburns-shot.py closed open out --text "…" --soft soft.jpg --soft-mix 0.30`  
4. Concat → public master.  
5. Optional: `public/audio/kids/<lineId>.mp3` → RMS envelope.
