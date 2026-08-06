# Little Ones — Live QA Audit (post Hybrid v8)

**Date:** 2026-08-06  
**Method:** Master probe (audio/video), mouth side-car logs, residual scores, motion-energy samples, ScenePlayer packaging rules  
**Goal:** List every hole before surgical per-clip repair. **No mass rewrite.**

---

## What you saw (mapped to causes)

| Your observation | Root cause (measured) |
|------------------|------------------------|
| Greeting is furthest along | Only **greeting** + **count** have real I2V body plates (`motion-v7`). Rest use procedural body-life. |
| Lips almost match but not 100% | **Two clocks**: mouth baked from text peaks; voice is separate TTS with latency. |
| Glitch on one greeting section | Shot **04** (Cowaúnckamish): face residual **13.27** → procedural-jaw fallback (open still misaligned). Shot **05** residual 8.18 same class. |
| Other videos get worse | No I2V body; weaker / procedural mouths; same dual-clock; short words finish mouth before voice. |
| No audio at all (some) | **All 12 kids MP4s are silent** (`has_audio = false`). Language is **only** runtime TTS/browser. If TTS API fails → silence. |
| Audio + glitch, little animation | Oral TTS works; picture is subtle body warp + mouth composite — can read as “static + glitch.” |

---

## Truth map (current system)

```
  VIDEO (public/scenes/*-kids.mp4)
  • Always silent — no language track
  • Mouth motion pre-baked from TEXT syllable/viseme guess
  • Body: I2V (2 clips) or procedural gesture (10 clips)

  AUDIO (player)
  • NOT from the video file
  • speakLine() → line.audioSrc? → no for kids
  • packaged path only: od* / dw* / day prefixes — kids ids (k1, mk1…) SKIPPED
  • public/audio/kids/ is EMPTY
  • Falls through to /api/tts then browser speechSynthesis
  • Starts AFTER network/API latency vs video line start
```

**Shared clock = missing.** That alone explains “close but not lined up” on the best clip.

---

## Per-clip scorecard (masters in `public/scenes/`)

| # | Clip | Size | Dur | Video audio | Body source | Mouth (5 shots) | Notes |
|---|------|------|-----|-------------|-------------|-----------------|-------|
| 1 | greeting-kids | 22 MB | 30s | **none** | **I2V** (10 files) | 3 multi-viseme, **2 procedural-jaw** | Best overall; glitch risk shots 04–05 |
| 2 | meal-kids | 12 MB | 30s | none | procedural ×5 | 5 multi-viseme | Solid stills; body subtler than I2V |
| 3 | count-kids | 23 MB | 30s | none | **I2V** | 3 multi / **2 procedural** | Good body; short words → tiny mouth windows |
| 4 | family-kids | 14 MB | 30s | none | procedural ×5 | 5 multi | |
| 5 | home-kids | 14 MB | 30s | none | procedural ×5 | 5 multi | |
| 6 | day-kids | 14 MB | 30s | none | procedural ×5 | 5 multi | |
| 7 | seasons-kids | 12 MB | 30s | none | procedural ×5 | 1 procedural + 4 multi | Shot 01 residual 9.4 |
| 8 | birds-kids | 11 MB | 30s | none | procedural ×5 | 5 multi | |
| 9 | water-kids | 11 MB | 30s | none | procedural ×5 | 1 procedural + 4 multi | Shot 01 *Nip* residual 11.5 |
| 10 | sleep-kids | 11 MB | 30s | none | procedural ×5 | 4 multi + 1 procedural | Shot 05 residual 10.9 |
| 11 | path-kids | 12 MB | 30s | none | procedural ×5 | 4 multi + 1 procedural | |
| 12 | land-kids | 11 MB | 30s | none | procedural ×5 | 4 multi + 1 procedural | |

**Packaged kids oral:** `public/audio/kids/` exists, **0 mp3 files**.  
**Contrast:** one-day has 114 mp3; day journey has 106. Kids never got that pass.

---

## Bug / hole inventory (ranked)

### P0 — Dual clock (lips ≠ heard language) — ALL 12 clips

| Layer | What happens |
|-------|----------------|
| Bake | Mouth peaks from **text** (`syllable_viseme_keys`), lead ~0.32s, often ends by ~1–2.5s |
| Play | TTS fetch or browser voice starts when line activates — **not** locked to those peaks |
| Result | Mouth moves on video timeline; voice arrives late/early and lasts different length |

Greeting feels “closest” because I2V body sells presence; lips still drift vs audio.

**Evidence — greeting k1 *Ascowequassunnúmmis*:**
- Baked mouth window: **0.32s → 2.28s** (20 peaks)
- Audio: runtime only, starts after TTS latency (often hundreds of ms–seconds)
- No `audioSrc` on kids lines in `scenes-data.ts`
- ScenePlayer packaging only matches `od*`, `dw*`, day prefixes — **not** `k1`/`mk1`/…

### P0 — Zero language on the film file — ALL 12

Probe: **no Audio stream** on any `*-kids.mp4`.  
Watch mode cannot use `filmCarriesLanguage`.  
“Soundtrack” toggle does nothing useful for kids.  
If TTS is down in deploy → **silent session** (matches “no audio at all”).

### P0 — Glitch shots (misaligned open still → residual gate)

Open plate is a different AI pose; residual after align > 7 → procedural-jaw (or historically full morph).

| Clip · shot | Line | Residual | Mode |
|-------------|------|----------|------|
| greeting · 04 | Cowaúnckamish | **13.27** | procedural-jaw ← likely “one glitchy section” |
| count · 03 | Nìsh | 12.14 | procedural-jaw |
| water · 01 | Nip | 11.53 | procedural-jaw |
| sleep · 05 | Mattannauke | 10.94 | procedural-jaw |
| seasons · 01 | Séquan | 9.42 | procedural-jaw |
| path · 04 | Taubotneanawáyean | 8.78 | procedural-jaw |
| greeting · 05 | Taubotneanawáyean | 8.18 | procedural-jaw |
| count · 04 | Yòh | 7.58 | procedural-jaw |
| land · 03 | Scannémeneash | 7.14 | procedural-jaw |

### P1 — Body quality cliff after greeting/count

| Body path | Clips | Feel |
|-----------|-------|------|
| Real I2V (`motion-v7`) | greeting, count | Living hands/wave — “furthest along” |
| Procedural warp (`motion-v8`) | other 10 | Breath/gesture warp — can look like mild Ken Burns or “not animated” |

Not a missing file for those 10 — intentional fallback — but quality gap is real.

### P1 — Short words finish mouth before speech

Count/home short forms (*Nquít*, *Yòh*, *Wetu*): mouth span **0.4–0.8s**.  
Any TTS delay → lips done while voice still speaking (or vice versa).

### P2 — Runtime jaw overlay is decorative only

`MouthOverlay` + `syntheticEnvelopeFromText` pulse in Learn mode — not a real lip composite on the face, and still text-timed (not audio RMS). Does not fix dual clock.

### P2 — No per-line audio duration metadata

Even with perfect bake, we never store “this line’s audio is 1.84s” to scale peaks.

---

## What is *not* broken

- Cast lock / cinematic still quality  
- 5×6s shot structure and 30s masters  
- Player oral-primacy path (works when TTS is configured)  
- ROI multi-viseme code path on low-residual shots  
- v6 backup / stills preserved  

---

## Surgical repair order (one clip at a time)

Do **not** re-scaffold. Fix shared foundations, then re-encode **one master** at a time.

### Phase 0 — Shared foundations (unblocks all 12)

1. **Package oral audio** for kids lines → `public/audio/kids/<lineId>.mp3` (TTS batch or keeper).  
2. **Wire** `audioSrc: /audio/kids/${id}.mp3` on kids lines (or extend ScenePlayer id pattern).  
3. **Drive mouth bake from audio RMS** (`--audio` already half-built) so peaks = heard energy.  
4. **Mux** line audio into each 6s shot (silence pad after speech) → `mediaHasAudio=true` → optional Watch without dual TTS.  
5. Align **mouth lead** with muxed audio start (same file = one clock).

### Phase 1 — Per-clip surgical queue (recommended)

| Order | Clip | Why first | Surgical actions |
|------:|------|-----------|------------------|
| 1 | **greeting-kids** | Already best; your reference | Fix residual on shots 04–05 (new pose-locked open or force closed+procedural clean); re-bake mouths from **packaged audio**; remux; ship only this master |
| 2 | **count-kids** | Has I2V body | Same audio lock; fix shots 03–04 residual; short-word peak stretch to real audio length |
| 3 | **home-kids** | High pedagogy value | Audio lock + mouth re-bake; keep procedural body until I2V optional |
| 4 | **meal-kids** | | same |
| 5 | **family-kids** | | same |
| 6–12 | remaining | | same template; optional I2V body only if stills warrant |

Each clip: **touch only** that clip’s 5 shots → stitch → `public/scenes/<id>.mp4` + poster. No full pipeline rewrite.

### Phase 2 — Body upgrades (optional, after lips lock)

Replace procedural body with I2V **per shot** only when lips already share the audio clock. Prompt: body/gesture only, mouth calm.

---

## Acceptance tests (per clip before calling it done)

1. **One clock:** scrub video; mouth peaks align within ±2 frames of packaged/muxed audio RMS.  
2. **No dual speak:** Watch mode = one language source (film **or** oral, not both).  
3. **Glitch:** no head bob during speech (residual gate or closed-only if open unusable).  
4. **Short word:** one clear pulse matching spoken length.  
5. **Long word:** multi pulses matching spoken cadence.  
6. **Silent fallback:** if audio missing, fail closed (static) rather than random flap.

---

## One-line diagnosis

> Greeting looks best because it has real body motion; **every** kids film is still **silent**, with lips baked from a **text guess** while the voice is a **separate late TTS** — and a few shots still use misaligned opens. Fix **shared audio clock + wire kids mp3**, then re-encode **one clip at a time** starting with greeting shots 04–05.

---

## Next step when you say go

1. Package/wire kids audio (shared).  
2. Surgical re-bake **greeting-kids only** (audio-RMS mouth + fix 04/05 + remux).  
3. You review in preview.  
4. Repeat for count → home → …  

No mass file rewrite required.

---

## GREETING V9 STATUS (surgical fix shipped)

| Item | Status |
|------|--------|
| Packaged oral k1–k5 | `public/audio/kids/k*.mp3` |
| audioSrc on lines | wired in scenes-data |
| Mouth = hybrid audio-text | peaks warped to RMS window (±0.04s) |
| Soft plates for 04/05 | residual 13.3→4.2, 8.2→2.8; all multi-viseme |
| Language muxed in MP4 | real AAC, speech each 6s slot |
| Player single clock | Watch continuous uses film audio; no dual TTS |
| Rebuild | `python3 scripts/fix-greeting-kids-v9.py` |

Other 11 clips still on pre-v9 audit state — repair one-by-one next.
