# Animation vs freeze-frame — path for perfect language lip-sync

## Short answer

**Yes — we can and should move the *mouth* to a true animation layer.**  
We should **not** throw away the cinematic plates or try to make “full AI video of everything” the lip-sync engine.

Best product architecture for a **language app that sounds out syllables**:

```text
Cinematic locked plate (or gentle Ken Burns video)
        +
Animated mouth layer driven by the SAME audio the learner hears
        =
Lips match language. Cast stays locked. No morph glitch.
```

That is easier to dial in than freeze-frame crossfades of two AI stills.

---

## Why freeze-frame morph failed

| Approach | What happens |
|----------|----------------|
| Crossfade closed ↔ open stills | Any pose difference becomes head-nod / glitch |
| Guess syllables from text | Mouth clock ≠ TTS / speaker clock |
| Silent MP4 + separate TTS | Two timelines forever |

Freeze-frame **cinematics** can stay. Freeze-frame **lip-sync** is the wrong tool.

---

## Options ranked for *this* app

### 1. Hybrid (recommended final path) — cinematic + animated mouth

**Picture:** Keep Friend Tan / Teal cinematic stills (or light I2V body ambient).  
**Mouth:** Controlled animation driven by audio:

- **Runtime (best for Learn mode):** Web Audio `AnalyserNode` on the oral clip → jaw open amount → canvas/SVG/Rive mouth overlay, **or** swap pre-baked mouth sprites on the video timeline when packaged audio is used.
- **Bake (best for Watch mode):** Same envelope written into the MP4 (ROI mouth composite we started in Phase B) **from packaged audio RMS**.

**Why this wins for language:**

- Syllables / RMS / visemes map cleanly to a **single axis** (or 3–4 visemes).  
- Changing pronunciation audio does not require re-rolling a whole film.  
- Cast identity never drifts.  
- Works offline, deterministic, testable.

### 2. 2D puppet / Rive / Live2D style character (full animated show)

Whole character is rigged (jaw, eyes, blink). Viseme keys are trivial.

| Pros | Cons |
|------|------|
| Perfect mouth control | Looks “animated show,” less photographic cinematic |
| Cheap to iterate lines | New art pipeline + rigging per age section |
| Great for kids pedagogy | Different aesthetic than current bible |

**Good for:** Little Ones if you *want* storybook animation.  
**Keep cinematic hybrid for:** Young / Adult / Elder if you want film look.

### 3. Full AI I2V / “Elon showcase” continuous video

Generate 6s motion per line with “speaking” prompts.

| Pros | Cons |
|------|------|
| Impressive motion | Mouth not phoneme-locked; often wrong |
| | Cast / wetu / regalia drift |
| | Expensive; hard to re-sync when audio changes |
| | Quota-bound |

Use I2V for **body/ambient only** after lips are solved — not as the lip engine.

### 4. Status quo freeze morph

Rejected for production lip-sync (audit).

---

## “Second / third / final pass” video generation plan

When gen is available again, order matters:

| Pass | Asset | Purpose |
|------|-------|---------|
| **Pass 0 (now, no gen)** | Code Phase A/B | Stop glitch; ROI mouth; safe fallback |
| **Pass 1** | Packaged oral audio per line | Shared clock |
| **Pass 2** | Mouth-only plates from **same** closed still (rest / slight / mid / round) | True visemes, pose-locked |
| **Pass 3 (optional)** | I2V ambient on closed plate: breath, blink, hair — **mouth frozen or driven by Pass 2** | Living film without random lips |
| **Final** | Runtime + bake hybrid: Learn = audio-driven overlay; Watch = baked audio+mouth in MP4 | Language-first product |

---

## Runtime animation sketch (platform upgrade)

```
oral Audio element / TTS blob
        │
        ▼
AudioContext + AnalyserNode (or precomputed envelope JSON)
        │
        ▼
mouthOpen 0..1  (+ optional viseme id from syllable table)
        │
        ▼
<canvas> or Rive jaw / sprite sheet over cinematic <video|img>
```

Envelope JSON can also be produced offline:

```json
{ "lineId": "k1", "fps": 24, "open": [0,0,0.2,0.8,0.5,...] }
```

Same file drives bake and runtime → perfect match.

---

## What we can code **without** new video gen

1. Phase A/B encoder (ROI + align + no-morph fallback) — **done in this pass**  
2. Batch TTS → `public/audio/kids/<id>.mp3` when API available  
3. `audioSrc` on kids lines + mux into masters  
4. Optional: `MouthOverlay` React component driven by oral audio analyser  
5. Viseme sprite sheets from **one** closed plate when gen returns  

---

## Recommendation

| Section | Visual system |
|---------|----------------|
| Little Ones | Hybrid cinematic plate + **animated mouth** (simplest visemes) |
| Young learner | Same hybrid, slightly richer visemes |
| Adult / Elder | Same, calmer motion |

Do **not** wait for perfect full-scene AI acting.  
**Dial syllables on an animation layer** controlled by the language audio — that is how language apps hit “fairly perfect.”
