# Full Key lexicon build (Phase A)

**Source:** Roger Williams, *A Key into the Language of America* (1643), public domain (Project Gutenberg #63701).  
**Artifact:** `src/lib/content/seed-williams.json`  
**Stats:** `docs/williams/lexicon-build-stats.json`

## What we did

1. Extracted two-column dictionary lines from all **32 chapters**.
2. Modernized **English glosses** for learner clarity (historical wording kept in `englishHistorical` when different).
3. Left **Narragansett spellings as Williams wrote them** — colonial ear, not community orthography.
4. Added structure for learning:
   - `semanticDomain`, `category`, `sensitivity` (`everyday` | `careful` | `sensitive`)
   - `modesAllowed` (Little Ones / Young Learner filter sensitive material)
   - `scholarlyNote` (framing, not “corrections” over living speech)
   - 32 chapter **paths** + chapter library UI (`/app/key`)

## Authority (non-negotiable)

- This is a **demo historical scaffold**.
- Living Narragansett Knowledge Keepers and speakers **supersede** every form.
- We do **not** rewrite Williams’ Indigenous spellings as if AI “fixed” the language.
- Scholarly notes explain colonial recording limits; they are not tribal doctrine.

## Mode filtering

| Mode | Seed visibility |
|------|-----------------|
| Little Ones / Young Learner | Everyday (+ careful where allowed); no `sensitive` / `isSacred` |
| Core Adult / Elder | Full 32-chapter historical seed |

## Next phases (not in this commit)

- B: Scene dialogues + optional reconstructed video
- C: Richer domain worlds UI
- Living API cutover when Keepers publish
