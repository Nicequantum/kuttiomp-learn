# Shot list — Pilot 3 clips (shot-per-line)

Each line = one still + one 6s I2V. Stitch in order. Target ~30s per clip.

Timing in `scenes-data.ts`: durationSec 30, lines evenly spaced (~6s each).

---

## 1) greeting-kids — Hello, friend

| # | line id | Narragansett | English | Still beat | I2V motion |
|---|---------|--------------|---------|------------|------------|
| 1 | k1 | Ascowequassunnúmmis | Good morning. | Wetu-edge dawn; both friends face camera; Teal mid-wave; gold sun through pines | Teal completes friendly wave; soft sun shaft drifts; slow push-in |
| 2 | k2 | Askuttaaquompsín | How are you? | Teal leans in kindly; Tan listens with open posture | Teal tilts head, hand opens in a question; leaves stir |
| 3 | k3 | Asnpaumpmaúntam | I am very well. | Tan hand over heart, warm smile; Teal relieved joy | Tan nods once, hand settles on heart; gentle parallax |
| 4 | k4 | Cowaúnckamish | My respects to you. | Both slight respectful bow, hands near heart | Slow bow and rise together; camera holds steady with micro push |
| 5 | k5 | Taubotneanawáyean | I thank you. | Both smile, open-hand thank-you gesture | Soft hand gesture outward; warm light bloom |

**Poster:** frame from shot 1.  
**Cast:** Tan + Teal only.

---

## 2) home-kids — Home wetu

| # | line id | Narragansett | English | Still beat | I2V motion |
|---|---------|--------------|---------|------------|------------|
| 1 | hk1 | Wetu | A house / dwelling. | Hero wetu (WETU_LOCK) fills frame; friends small at path for scale | Slow orbit/push toward wetu; smoke wisps from smoke hole |
| 2 | hk2 | Wetuômuck | At home. | Friends at low doorway, touching bark mat edge, belonging | They step closer to doorway; mat cloth stirs |
| 3 | hk3 | Wunnégin | Welcome. | Tan at doorway welcomes Teal inside; interior mats visible | Tan beckoning gesture; Teal steps in; warm interior light |
| 4 | hk4 | Nkàtaquaum | I am sleepy. | Inside wetu on cattail mats; Teal yawns; fire glow soft | Yawn and stretch; embers pulse; camera slow push |
| 5 | hk5 | Cowwêtuck | Let us sleep. | Both settle under soft hides on mats; peaceful | Eyes soften, lie down; camera eases back |

**Poster:** wetu exterior from shot 1.  
**Cast:** Tan + Teal only. Wetu must pass WETU_LOCK QA.

---

## 3) family-kids — Our family words

| # | line id | Narragansett | English | Still beat | I2V motion |
|---|---------|--------------|---------|------------|------------|
| 1 | fk1 | (father form in scene data) | Father | Tan+Teal beside Father (supporting); kids look up proudly | Father rests hand gently on Tan’s shoulder; soft smile |
| 2 | fk2 | Mother line | Mother | Tan+Teal with Mother at bowl/basket by wetu | Mother offers wooden bowl; kids lean in |
| 3 | fk3 | Child line | Child | Close two-shot: Tan+Teal gesture to themselves | Both point to own chests lightly; joyful bounce |
| 4 | fk4 | Elder man line | Elder man | Kids sit before Elder man with staff at fire mat | Elder nods slowly; kids listen; firelight flicker |
| 5 | fk5 | Elder woman line | Elder woman | Kids with Elder woman on mat; bead/fiber nearby | Elder woman warms hands; kids scoot closer |

**Poster:** family group shot 1 or 2.  
**Cast:** Tan+Teal leads + locked supporting adults (family lesson only).

---

## Stitch order

```
shots-hq/{clip}/01.mp4 … 05.mp4  →  export-hq/{clip}.mp4  →  public/scenes/{clip}.mp4
poster: stills-hq/{clip}/01.jpg → public/scenes/{clip}.jpg (scaled 720×1280)
```
