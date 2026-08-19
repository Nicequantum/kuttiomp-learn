# Little Ones clip pipeline — syllable clock

Quality floor: greeting-kids v13. Two voices (Tan / Teal) from meal onward.

## Why mouths drift

Image-to-video does not hear the oral file. If the prompt counts *letters*,
the model invents a different conversation than the language. The clock is
the **hyphenated phonetic scaffold**.

| Line | Scaffold | Beats |
|------|----------|-------|
| Téaquacumméich | Tay-ah-kwah-kum-meech | 5 |
| Aupúminea-nawsaùmp | Ow-poo-min-ee-ah now-sowmp | 7 |
| Namitch, commetesímmin | Nah-mitch, koh-meh-teh-sim-min | 7 |
| Taubotneanawáyean | Tow-bot-nee-ah-nah-why-yan | 7 |
| Cowaúnckamish | Koh-wawn-kah-mish | 4 |

## Order (do not skip)

1. Freeze language + phonetic hyphens in the contract.  
2. `stitch_oral.py` — two voices, oral clock.  
3. `syllable_plan.py` — beat list.  
4. `prompt_from_contract.py` — “exactly N mouth openings, one per syllable.”  
5. One continuous I2V from the locked still.  
6. Visual QA: same-speaker bursts only.  
7. `align_oral_to_picture.py` — snap audio to those bursts. **Never** place Tan’s words on Teal’s mouth.  
8. `mux_and_accept.py`  
9. Steward watch. Freeze before replace.

## Meal-kids review (2026-08-17)

Surgical remux of the current take was **not** applied. Frame QA shows Teal
carrying most openings. Snapping the oral clock would put Tan’s lines on
Teal’s face. Picture left untouched. Freeze:
`public/freeze/meal-pre-align/`.

The player now lights each syllable in time with the oral file. That clock
is exact. The next I2V take must be generated from this prompt builder.
