# Adult Path — Cast Lock (Core Adult)

**Authority:** Only these faces appear in Adult Path. Same two friends as Little Ones / Young Path, aged to adults (~30s).

**Grade:** Premium cinematic storybook (photoreal-adjacent, not cartoon).  
**Export:** **1080×1920** · 5 lines × 6s · hybrid lips · continuous body.

## Bible files (`film-adult/bible/`)

| File | Role |
|------|------|
| `cast-duo-adult.jpg` | **Leads** Friend Tan + Friend Teal as adults (closed mouth) |
| `cast-duo-adult-open.jpg` | Open-mouth plate lock for residual gate |
| `cast-duo-adult-720.jpg` | Compact preview |

## Leads (every clip)

| ID | Look |
|----|------|
| **Friend Tan** | Adult woman, longer dark braid, **tan hide tunic**, wampum choker, bone/shell chest piece, one small feather in hair, warm light-brown skin — **same person as Little Ones / Young Path Tan, aged up** |
| **Friend Teal** | Adult woman, twin braids, **teal hide tunic**, purple-white wampum necklace, shell earrings, bracelet, warm light-brown skin — **same person as Little Ones / Young Path Teal, aged up** |

## Rules

- Northeastern woodland regalia only (wampum, soft hide, copper — no Plains warbonnets, no modern clothes, no tipí)
- Never invent a third adult lead
- Do not mix Host/Guest Full Day cast into Adult Path
- Freeform `generate_image` drifts cast — **always** lock stills via `edit_image` from `cast-duo-adult.jpg`
- Living-speaker oral may replace TTS under the same `/audio/adult/<id>.mp3` filenames

## Pipeline

See `HQ_V1.md` and `scripts/rebuild-adult-hq-v1.py`.
