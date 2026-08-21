# Kuttiomp system — two apps, one language pipeline

This is the map for a **production teaching product**: Knowledge Keepers and
scholars (including Charente’s linguistic work) enter language in the **Keeper
backend**, and learners of every age see only what is approved, public, and
non-sacred in **this learner app**.

## Do not merge the git repositories

The two codebases are **supposed to stay separate GitHub repos and separate
deployments**. They are already designed to attach over HTTP.

| Piece | Audience | Repo (intended) | Deploy |
| --- | --- | --- | --- |
| **Learn** (this repo) | Youth, young adults, adults, elders | `Nicequantum/kuttiomp-learn` | Public HTTPS (Vercel / similar) |
| **Keeper portal + API** | Keepers, speakers, scholars | intended `Nicequantum/Kuttiomp` (or whatever name you publish) | Separate admin + API origin |

Reasons they stay split:

- Learners must never open lexicon editors, draft audio, or sacred workflow.
- Auth, CORS, and secrets differ (SSO/admin vs public read-only).
- One env flip on Learn (`VITE_CONTENT_CORPUS=keeper_only` + `VITE_API_BASE_URL`)
  is the production cutover — no rewrite.

They **are** attached, but only by the **Public Lexicon Contract**:

1. Keeper publishes a form (approved + public + attributed + not sacred).
2. API serves `GET /api/v1/public/lexicon`.
3. Learn hydrates those rows into the same word cards, listen queue, and paths
   used by the Williams demo seed.
4. If a Keeper recording URL is present, that audio plays **before** demo TTS.

Contract: [PUBLIC_LEXICON_CONTRACT.md](./PUBLIC_LEXICON_CONTRACT.md).  
Backend sketch: [BACKEND_IMPLEMENTATION_NOTES.md](./BACKEND_IMPLEMENTATION_NOTES.md).  
Assessment & phases: [BACKEND_ASSESSMENT_ROADMAP.md](./BACKEND_ASSESSMENT_ROADMAP.md).

## What Cloud Agents can and cannot see

A Cloud Agent only has the repository it was launched against (unless you create
a Cursor **environment** that lists **both** repo URLs).

- Opening **this** repo as a new GitHub project **did** grant access to Learn.
- Going back to the previous Keeper/backend agent will **not** automatically
  pull Learn.
- Pasting the backend into chat does **not** give filesystem access to Learn,
  and vice versa.

### How to review and fix both together (recommended)

1. Push the Keeper/backend code to GitHub as its own repository (same pattern
   as `kuttiomp-learn`). As of 2026-08-21, **`Nicequantum/Kuttiomp` does not
   exist** on GitHub, so no agent can clone it.
2. In Cursor Cloud, create an **environment** whose `repos` list includes:
   - `github.com/Nicequantum/kuttiomp-learn`
   - `github.com/<you>/<keeper-backend>`
3. Start a new Cloud Agent on that environment. It can then implement the
   public API on the backend and verify Learn against it in one pass.

Until step 1 happens, only this learner repo can be audited and patched.

## Does Learn “clear” the backend bugs?

**No.** This frontend does not replace a missing or buggy Keeper API.

Today Learn can run as a **demo** on the Williams 1643 seed (clearly labeled
historical). Production teaching requires the backend to:

- Store Charente’s and Keepers’ forms with orthography, gloss, domain, and notes.
- Store speaker-attributed audio.
- Enforce the publish gate (never drafts, sacred, or clan-only on public routes).
- Expose CORS-open `GET /api/v1/public/*` for the Learn origin.

Until those routes exist, `VITE_API_BASE_URL` stays empty and learners do not
see living corpus.

## Charente → learner path (production)

```
Scholar / Keeper work
        │
        ▼
Keeper portal (admin)  ── drafts, audio studio, approvals
        │
        ▼  “Publish for learners”
API  GET /api/v1/public/lexicon  (+ optional /paths, audio URLs)
        │
        ▼  VITE_API_BASE_URL
kuttiomp-learn  ── modes: Little Ones / Student / Adult / Elder
```

What Charente should put in the **backend** (not in this frontend):

- Living orthography and learner gloss (not Williams spellings as authority).
- Semantic domain, phrase vs word, seasonal usage.
- Speaker / Keeper attribution.
- Approved audio clips (`primaryAudio.url`).
- Optional learning paths (`wordIds` lists) when ready.

What this **frontend** already has for display:

- Four learning modes (little ones, youth, adult, elder).
- Word cards, listen-first player, paths, stories/scenes/day films.
- Adapter that drops sacred or unpublishable rows even if the API misbehaves.
- Production empty state if the living corpus is not yet public.

## Learner-side holes addressed in this pass

- Living speaker recordings were skipped whenever demo TTS was configured.
- Hydrate updated in-memory corpus but the UI tree did not re-render.
- Public lexicon fetch stopped at 200 rows.
- Mock “living” fixture defaulted on in production builds.
- `keeper_only` with an empty API had no honest empty state.

## Remaining (needs the backend repo)

Full phased checklist: [BACKEND_ASSESSMENT_ROADMAP.md](./BACKEND_ASSESSMENT_ROADMAP.md).

- Implement `GET /api/v1/public/health`, `/lexicon`, `/lexicon/{id}`, CORS.
- Admin “Publish for learners” action.
- Point Learn `VITE_API_BASE_URL` at that origin and flip
  `VITE_CONTENT_CORPUS=keeper_only` when Keepers are ready to replace Williams.

Copy the contract + roadmap into the backend repo when it is published so both
sides stay in sync.
