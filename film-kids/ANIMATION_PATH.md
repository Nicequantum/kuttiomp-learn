# Animation vs freeze-frame — path for perfect language lip-sync

## Status (2026-08-06)

**Hybrid v8 is shipped** for all 12 Little Ones masters.  
See [`HYBRID_V8.md`](./HYBRID_V8.md) for rebuild commands and architecture.

```text
Cinematic locked plate
        +
Body language (I2V ambient OR procedural gesture life)
        +
Multi-viseme mouth layer (phoneme / audio RMS)
        =
Living film · lips match language · cast locked
```

---

## Short answer

**Yes — we move the *mouth* to a true animation layer.**  
We do **not** throw away cinematic plates or use full AI video as the lip-sync engine.

Best product architecture for a **language app that sounds out syllables**:

```text
Cinematic locked plate (or gentle body-life / I2V)
        +
Animated mouth layer driven by the SAME audio the learner hears
        =
Lips match language. Cast stays locked. No morph glitch.
```

---

## Why freeze-frame morph failed

| Approach | What happens |
|----------|----------------|
| Crossfade closed ↔ open stills | Any pose difference becomes head-nod / glitch |
| Guess syllables from text only | Mouth clock ≠ TTS clock (until packaged audio) |
| Silent MP4 + separate TTS | Two timelines until audio is muxed |

Freeze-frame **cinematics** can stay. Freeze-frame **lip-sync** is the wrong tool.

---

## Options ranked for *this* app

### 1. Hybrid (SHIPPED as v8) — cinematic + body + animated mouth

**Picture:** Friend Tan / Teal stills + body language layer.  
**Mouth:** Multi-viseme ROI driven by phoneme map (text) or audio RMS when packaged.

### 2. 2D puppet / Rive (optional later for Little Ones storybook mode)

### 3. Full AI I2V as lip engine — rejected (cast drift, wrong mouths)

Use I2V for **body/ambient only** — already the rule for motion-v7 and I2V prompts.

---

## Pass plan (updated)

| Pass | Status |
|------|--------|
| Phase A/B ROI + glitch gate | Done (v6) |
| Hybrid body + multi-viseme mouth | **Done (v8)** |
| Packaged kids audio + RMS | Next fine-tune |
| Mux language into MP4 | Next fine-tune |
| Pose-locked viseme plates from gen | When quota returns |

---

## Rebuild

```bash
python3 scripts/rebuild-kids-hybrid-v8.py
```

Do **not** wait for perfect full-scene AI acting.  
**Dial syllables on an animation layer** controlled by the language audio — that is how language apps hit “fairly perfect.”
