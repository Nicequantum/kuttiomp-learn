# Little Ones — Status + Mouth Sync

**Shipped masters:** all 12 clips · 1080×1920 · shot-per-line  
**Current mouth mode:** Speak-v5 soft blend (known issues — see audit)

## Read this first

**Deep audit + fine-tune plan:** [`MOUTH_SYNC_AUDIT.md`](./MOUTH_SYNC_AUDIT.md)

### Known issues (do not ignore)

1. **Head-nod / glitch** — full-frame blend of misaligned open/closed stills  
2. **Lips ≠ voice** — mouth baked from text syllables; voice is separate runtime TTS  
3. **Kids MP4s are silent** — no packaged `public/audio/kids/` yet  
4. **One viseme axis** — not true pronunciation shapes  

### Next work (Phase A → C, no gen required)

See audit §5–§8. Phase A = stop morph glitch; Phase B = mouth-ROI only; Phase C = audio is the clock.

## Rebuild (current)

```bash
python3 scripts/rebuild-kids-speak-v3.py
python3 scripts/rebuild-kids-speak-v3.py greeting-kids
```
