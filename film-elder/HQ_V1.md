# Elder Path HQ v1

**Status:** Shipping path for Elder mode  
**Cast:** Friend Tan + Friend Teal as tribal elders (same two friends aged through kids → teens → adults → elders)  
**Content:** Solemn **public** discourse from Williams 1643 — **not** living ceremony

## Cultural guardrail (non-negotiable)

- **Religion and the Soul** and **Death and Burial** are `isSacred: true` in the seed lexicon — **never** packaged here.
- Elder Path uses only **public** forms from careful/sensitive/everyday chapters: council, discourse, sky, wampum, trade, marriage-custom language, care, hunt, games, peace-making, weather.
- Labels: historical colonial record for practice; living speakers supersede same filenames under `/audio/elder/`.

## Architecture (stronger than Adult)

```
edge-tts / gTTS seed → normalize_oral_slot (lead 0.22s) → public/audio/elder/<id>.mp3
closed still → body-life (+ amplify if weak) → film-elder/motion/
open plate if residual ≤ 5 else soft blend (max α under residual 5)
hybrid visemes (text × audio RMS) + always face-track
mux same WAV AAC → stitch → public/scenes/<clip>-elder.mp4  (actually *-elder id without suffix pattern: council-elder.mp4)
```

## Clips (12)

| # | id | Theme | Williams chapter |
|--:|----|-------|------------------|
| 1 | council-elder | Council fire | Government and Justice |
| 2 | word-elder | Let the word stand | Government and Justice |
| 3 | discourse-elder | Evening words | Discourse and News |
| 4 | sky-elder | Sky and moon | Heavenly Lights |
| 5 | wampum-elder | Shell and strand | Coin and Wampum |
| 6 | trade-elder | Fair trade | Buying and Selling |
| 7 | match-elder | Making a match | Marriage (public custom language) |
| 8 | care-elder | Visit the sick | Sickness |
| 9 | hunt-elder | The hunt | Hunting |
| 10 | games-elder | Dance and play | Sports and Gaming |
| 11 | peace-elder | Make peace | Wars (peace language only) |
| 12 | weather-elder | Read the sky | Weather |

## Rebuild

```bash
python3 scripts/prepare_elder_audio.py
python3 scripts/rebuild-elder-hq-v1.py
python3 scripts/rebuild-elder-hq-v1.py council-elder
```

## Acceptance

- Duration 29.85–30.15 s  
- Audio peak > 500 every 6 s slot  
- Body motionΔ ≥ 2.3  
- Mouth residual gate ≤ 5.0 (open or soft)  
- Elder mode lists **only** Elder Path  
