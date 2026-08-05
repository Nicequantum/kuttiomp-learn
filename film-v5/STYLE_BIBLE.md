# Film V5 — Style & Cast Bible

**Locked 2026-08-05 (kids-platform Native American revision)**  
Style: kids educational animation · Length: ~15:00 master · Full Day: windows into master

## Medium

**Kids-platform educational animation** — soft warm digital illustration matching the Kids Scenes look (`greeting-kids`, `meal-kids`).  
Friendly, dignified, quiet observational.  
**Not** photoreal documentary. **Not** cartoon slapstick. **Not** multi-ethnicity generic animation.

## Non-negotiable cast rule (reject if broken)

**Every human face is Northeastern coastal Algonquian / Narragansett Native American only.**

- Warm brown to deep brown skin tones  
- Dark brown / black hair (Host may show silver)  
- Kind dark eyes, high cheekbones, respectful everyday presence  
- Pre-contact coastal everyday dress — deerskin, woven fiber, shell accents  
- **No** white / European faces  
- **No** East Asian feature drift  
- **No** Plains war headdresses or pan-Indigenous costume clichés  
- **No** invented extra family faces on camera  

If a shot drifts ethnicity, **discard and regenerate** from locked cast refs.

## Palette

- Dawn: cool blue-lavender → warm amber through doorway  
- Day: soft greens, marsh silver, sand, sky blue  
- Evening: copper, ember orange, indigo  
- Night: deep indigo, moon silver, fire gold  
- Skin: natural warm brown tones only  
- Costume: deerskin, woven sash, shell necklace — coastal Algonquian everyday

## Geography (continuous)

Wetu clearing (coastal forest edge) → short path → corn hills → pine forest trail → salt marsh / canoe shore → return path → wetu fire circle → night sky over marsh.

One continuous world. Same wetu, same trees, same shore curve.

## Cast (only speaking people)

### Host (elder of the wetu)
- Age ~55–65, calm authority, silver-black hair, kind eyes  
- Soft hide tunic, woven sash, simple shell necklace  
- Locked ref: `film-v5/refs/host_kids.jpg` · `stills/native/host_door.jpg`

### Guest (traveler)
- Age ~25–35, respectful, curious  
- Dark hair, travel cloak / carry pouch  
- Locked ref: `film-v5/refs/guest_kids.jpg` · `stills/native/guest_path.jpg`

### Two-shot
- Locked ref: `film-v5/refs/cast_kids_native.jpg` · `stills/native/both_greet.jpg`

### Nature only
- Marsh, fire, path, sky, canoe, corn — no new human faces  

## Language first

1. Narragansett language audio is **primary** (packaged `public/audio/one-day/od*.mp3`).  
2. Master MP4 **embeds** language + soft ambient via `scripts/mux-language-sequential.py`.  
3. Player defaults film soundtrack **on** for Stories / Full Day so language is heard without a second control.  
4. Learn mode still uses the oral path line-by-line.  
5. Picture is secondary to clear, hearable language.

## Camera

- Vertical 9:16 (480×720 export)  
- Slow push-ins / Ken Burns when I2V unavailable  
- Prefer medium shots and two-shots for language moments  

## Continuity rules

1. Same faces every shot (edit from cast refs only)  
2. Exit frame of shot N informs first frame of shot N+1  
3. Time-of-day light progresses monotonically  
4. Crossfade 8–12 frames at every join  
5. Continuous language + ambient under entire master  
6. Reject ethnicity / costume drift  

## Authority

Reconstruction · historical Williams forms · modern English gloss  
Not living ceremony · not keeper film · community upload supersedes  

## Production lock

| Item | Value |
|------|-------|
| Master | ~900 s · 10 × 90 s act windows |
| Character base | Kids-platform Native American only |
| Cast refs | `film-v5/refs/*_kids.jpg`, `stills/native/` |
| Language mux | `scripts/mux-language-sequential.py` |
| Encode | 480×720 · H.264 · AAC language · CRF 20–23 · +faststart |

## Master prompt block (paste into gens)

```
Kids educational animation of northeastern coastal Algonquian life,
soft warm digital illustration matching Indigenous children's language apps,
dignified and quiet. Vertical 9:16. ONLY Northeastern Native American characters:
warm brown skin, dark hair, deerskin everyday dress, shell accents.
Host is an elder with silver-black hair and kind eyes; Guest is a younger
traveler with dark hair and a travel pouch. Same continuous world: wetu,
pine path, corn hills, salt marsh. Not photoreal, not multi-ethnic cast,
no Plains headdresses.
```

## Reject criteria (do not ship shot)

- Face not clearly Native American (any ethnicity drift)  
- Costume Plains / pan-Indigenous cliché  
- Photoreal “found footage” reading  
- Ceremony or sacred performance staging  
- New human faces beyond Host/Guest  
- Silent master with no language track  
