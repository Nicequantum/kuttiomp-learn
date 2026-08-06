# Little Ones — Mouth ↔ Voice Pipeline Audit & Fine-Tune Plan

**Date:** 2026-08-06  
**Scope:** How picture mouth motion is built vs how oral language is heard  
**Goal:** Cinematic stills stay beautiful; mouth motion becomes **realistic speech**, locked to language  
**Constraint (now):** No new video-gen quota assumed — plan must include **code/asset-only** fixes first  

---

## 1. What the system actually does today (truth map)

```
┌──────────────────────────────┐     ┌──────────────────────────────────┐
│  PICTURE (MP4, silent)       │     │  VOICE (app oral path, separate) │
│  5×6s shots, 1080×1920       │     │  TTS / packaged mp3 at runtime   │
│  Mouth baked at encode time  │     │  Fired when line becomes active  │
└──────────────┬───────────────┘     └────────────────┬─────────────────┘
               │                                      │
               │  NO SHARED CLOCK                     │
               └──────────────────╳───────────────────┘
                    lips ≠ what you hear
```

| Layer | File(s) | Role today |
|-------|---------|------------|
| Stills | `film-kids/stills-v2/<clip>/{closed,open,soft}/` | Two (or three) full-frame images per line |
| Mouth encode | [`scripts/speak-kenburns-shot.py`](../scripts/speak-kenburns-shot.py) | Blends closed→soft on **text-estimated** syllable peaks + Ken Burns |
| Stitch | [`scripts/rebuild-kids-speak-v3.py`](../scripts/rebuild-kids-speak-v3.py) | Concat 5 shots → `public/scenes/*-kids.mp4` |
| Line timing | `timed()` in [`scenes-data.ts`](../src/lib/content/scenes-data.ts) | Even slots: 30s / 5 lines = 6s each |
| Oral audio | [`ScenePlayer.tsx`](../src/components/scenes/ScenePlayer.tsx) + [`speak.ts`](../src/lib/audio/speak.ts) | TTS at line start; kids **have no packaged mp3** |
| Film audio | kids masters | **`has_audio=false`** — soundtrack never carries language |

Critical player rule:

```ts
// ScenePlayer: dual-speak only suppressed when the *video file* has audio
const filmCarriesLanguage = isContinuous && ambientOn && mediaHasAudio === true;
// Kids: mediaHasAudio === false → oral TTS always overlays independently
```

Kids line IDs (`k1`, `mk1`, `ck1`…) are **not** in the packaged-audio path (only `od*`, `dw*`, `kg*`, day prefixes).  
`public/audio/kids/` **does not exist**.

---

## 2. Root causes (ranked)

### P0 — Full-frame morph = “head nod / glitch”  ← matches your report

**Mechanism:** Open stills are **separate AI images**, not mouth-only edits of the closed still.  
When the compositor does:

```text
frame = closed × (1−α) + soft × α
soft  ≈ closed × 0.70 + open × 0.30
```

**any** difference between closed and open becomes motion:

- head position / scale  
- shoulder pose  
- eye gaze / smile shape  
- background parallax  

As α pulses each syllable, the **whole figure jitters** → looks like a nod, warp, or digital glitch.

**Measured face-band misalignment (closed vs open):**

| Risk | Clip · shot | Face Δ | Shift (approx) |
|------|-------------|--------|----------------|
| Worst | greeting-kids · 04 | 13.9 | (+6.9, −7.8) px |
| High | water-kids · 01 | 11.5 | (+2.7, −2.5) |
| High | count-kids · 03 | 10.0 | (−1.0, +3.4) |
| High | sleep-kids · 05 | 9.8 | (+6.4, −3.1) |
| Safe | path-kids · 02 | 1.9 | (~0, ~0) |

Ken Burns zoom (`kenburns_crop` every frame) **amplifies** that jitter.

**This is a geometry bug, not a “mouth too open” tuning knob.** Soft-mix 0.30 only *reduces* scream; it does **not** fix misaligned poses.

---

### P0 — Voice and lips do not share a clock

| Mouth bake | Voice play |
|------------|------------|
| Fixed lead **0.30s** into each 6s shot | TTS starts when line becomes active + network/API latency |
| Peaks from **vowel-count heuristic** on text | Actual spoken duration unknown at bake time |
| Ends ~1–2s into shot for most lines | TTS may last longer/shorter; often **starts after** mouth already finished |
| No audio in MP4 | Player cannot use `filmCarriesLanguage` lock |

So even a perfect mouth animation would still **feel wrong** until audio and picture are one timeline.

---

### P1 — Only one viseme axis (closed ↔ “openish”)

Real speech uses multiple mouth shapes (closed, slight, wide, rounded, etc.).  
We only interpolate toward one soft still. That can never look like true pronunciation — only “talking vaguely.”

---

### P1 — Syllable model is approximate

[`syllable_spans`](../scripts/speak-kenburns-shot.py) counts vowel runs. Fine for pacing demos; wrong for:

- consonant clusters  
- Narragansett orthography edge cases  
- actual spoken rhythm of Grok TTS or a living speaker  

`audio_peaks()` (RMS) exists but is **never used** for kids (no audio files).

---

### P2 — Soft still sources are mixed quality

- Most `soft/` stills = procedural 30% open mix (inherits open misalignment)  
- A few greeting softs = full re-edits (can change pose more)  
- No QA gate that rejects soft/open if face shift > N px  

---

### P2 — Oral primacy vs picture lock (product tension)

Product rule: **language first**.  
Current kids path: language is oral TTS; picture is silent reconstruction.  
That’s correct for sovereignty/oral primacy **until** we bake language into the film.  
For “mouth says the word,” we need either:

1. **Baked oral track in the MP4** (lips driven from same file), or  
2. **Runtime mouth** driven from the same audio element playing (WebGL/canvas overlay)  

Bake is simpler and offline-stable; runtime is more flexible for living speakers later.

---

## 3. What is *not* the main problem

- Resolution / cinematic grade of stills (already strong)  
- Cast lock (Tan + Teal bible is the right direction)  
- Shot-per-line structure (5 × 6s is good pedagogy)  
- “Need more constant flapping” — opposite of truth; flapping without alignment/audio is worse  

---

## 4. Target architecture (realistic “top quality”)

```
                    ┌─────────────────────────┐
                    │  Authoritative audio    │
                    │  living speaker > TTS   │
                    │  public/audio/kids/ID   │
                    └───────────┬─────────────┘
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                 │
              ▼                 ▼                 ▼
     RMS / phoneme        Duration +           Mux into
     envelope             start offset         MP4 soundtrack
              │                 │                 │
              └────────┬────────┘                 │
                       ▼                          │
              Mouth shapes on                     │
              SINGLE base still                   │
              (mouth-ROI only)                    │
                       │                          │
                       └──────────► master MP4 ◄──┘
                              filmCarriesLanguage = true
                              no dual TTS echo in watch mode
```

**Non-negotiable for “says the word”:**

1. **One base plate** per shot (closed pose).  
2. Mouth change is **mouth-region only** (or perfectly pose-locked open).  
3. Envelope comes from **the same audio** the learner hears.  
4. Audio is **on the picture timeline** for watch mode (oral Learn mode can still solo-line).

---

## 5. Fine-tune path (phased — no gen required for Phase A–B)

### Phase A — Stop the glitch (code only, ship first)

**Goal:** Kill head-nod / morph artifacts immediately.

| Change | Why |
|--------|-----|
| A1. **Disable full-frame open blend** by default | Removes morph jitter |
| A2. Ken Burns only on **closed** plate (or freeze zoom during speech peaks) | Zoom + morph = double glitch |
| A3. Optional: very low soft-mix (≤0.12) **only if** faceΔ < threshold after alignment | Safety valve |
| A4. Per-shot **glitch score** in rebuild: fail or skip mouth if faceΔ > e.g. 5.0 | Prevents shipping bad pairs |

**Interim UX:** Cinematic locked still + Ken Burns + oral TTS.  
Honest: mouths may be static, but **no broken morph**. Better product than glitch.

---

### Phase B — Align then blend (code + existing stills)

**Goal:** If we keep two stills, make open a **warp of closed**.

| Step | Method |
|------|--------|
| B1. Face/landmark align open → closed (OpenCV / mediapipe if available, else phase-corr on face band) | Removes head shift |
| B2. Difference mask: only high-Δ mouth ROI contributes to soft still | Background & body stay closed |
| B3. Soft = closed + ROI-masked (open−closed) × gain | True “mouth only” |
| B4. Smooth envelope stays; max alpha lower (0.5–0.7) | Subtle speech |

No new image gen required if open stills exist.

---

### Phase C — Audio is the clock (product + pipeline)

**Goal:** Mouth and voice share one timeline.

| Step | Detail |
|------|--------|
| C1. Generate or record per-line audio → `public/audio/kids/<lineId>.mp3` | TTS batch offline OK as interim; living speaker later |
| C2. Wire `line.audioSrc` for kids lines in `scenes-data.ts` | Player already supports `audioSrc` |
| C3. Rebuild mouths with `--audio` → **RMS envelope** (code already half there) | Real energy, not vowel guess |
| C4. Mux line audio into each 6s shot (silence pad after speech) | `mediaHasAudio=true` |
| C5. Watch mode: `filmCarriesLanguage` → no echo TTS | Oral Learn still uses line clips |

---

### Phase D — Visemes / multi-shape (quality leap)

| Step | Detail |
|------|--------|
| D1. From one closed plate, produce 3–4 **pose-locked** mouth states: rest, slight, mid, round | Edit-image **mouth only** when quota returns; or ROI warp |
| D2. Map vowels → shape, consonants → brief rest | Simple rule table first |
| D3. Interpolate shapes with short crossfades (≤2 frames) | Stops “pop” |

---

### Phase E — When video gen is available again (highest ceiling)

Use gen **only** for assets that code cannot invent:

1. **Mouth-only** edits of closed plates (strict identity lock prompts).  
2. Reject any result with global face shift > threshold (auto QA).  
3. Optional I2V: micro breathing / eye blink on **aligned** plate, **no** competing lip random motion if audio drives lips.  
4. Never full-scene re-roll for a syllable.

Do **not** return to fixed-Hz flap or unaligned open stills.

---

## 6. Code hotspots to change

| Priority | Location | Issue |
|----------|----------|-------|
| A | `speak-kenburns-shot.py` `render_shot` | Full-frame blend of misaligned stills |
| A | `kenburns_crop` during speech | Amplifies morph |
| B | New `scripts/align_mouth_still.py` | Missing alignment + ROI mask |
| C | `rebuild-kids-speak-v3.py` | Never passes kids audio (none exist) |
| C | `scenes-data.ts` kids lines | No `audioSrc` |
| C | `ScenePlayer` packaged path | Kids IDs not in mp3 pattern |
| D | Viseme table + multi soft inputs | Not implemented |

---

## 7. Acceptance tests (definition of done)

1. **Glitch:** Scrub any shot at 0.1s steps during speech — no head bob, no background jump.  
2. **Rest:** After speech window, face identical to closed plate (pixel-stable aside from Ken Burns).  
3. **Audio lock:** Mouth peaks align within **±2 frames** of packaged audio RMS peaks.  
4. **Watch mode:** One language source only (film track **or** oral, not both).  
5. **Short word:** `Nip` / `Yòh` → one soft motion pulse, not multi-flap.  
6. **Long word:** `Ascowequassunnúmmis` → multiple soft pulses matching spoken cadence.  
7. **Cross-section template:** Same pipeline works for Young / Adult / Elder with different cast bibles.

---

## 8. Recommended order of work (this week, no gen)

1. **Ship Phase A** — freeze morph glitch (static elegant stills + oral).  
2. **Implement Phase B** — ROI-aligned soft mouth from existing open/closed.  
3. **Phase C1–C2** — offline batch TTS → `public/audio/kids/`, wire `audioSrc`.  
4. **Phase C3–C5** — rebuild mouths from audio + mux.  
5. Document as **Speak-v6 template** for other learner sections.  
6. When gen returns → Phase D/E only for mouth plates that fail QA.

---

## 9. Honest quality ceiling

| Approach | Realism | Cast lock | Needs gen | Needs audio |
|----------|---------|-----------|-----------|-------------|
| Unaligned full-frame blend (current) | Poor (glitch) | Medium | No | No |
| Closed still only + oral | Medium (static face) | Excellent | No | Optional |
| ROI-aligned soft blend + audio RMS | Good | Excellent | No | Yes |
| Multi-viseme + audio | Very good | Excellent | Mild | Yes |
| Audio-conditioned I2V lips | Best-in-class *when it works* | Risky drift | Yes | Yes |

**For this product (oral language + locked Native kids cast):**  
**ROI-aligned multi-viseme + packaged audio** is the correct primary path.  
I2V is a spice, not the foundation.

---

## 10. One-line summary

> The cinematic plates are fine; the pipeline **cross-fades two different poses** on a **guessed** syllable clock while the **real voice plays on another clock** — that is the glitch and the mismatch. Fix alignment + shared audio timeline before more generation.
