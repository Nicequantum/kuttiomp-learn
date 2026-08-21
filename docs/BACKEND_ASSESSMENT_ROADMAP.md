# Backend assessment & implementation roadmap

**Status:** Assessment (Learn-side ready; Keeper API not yet on GitHub)  
**Date:** 2026-08-21  
**Audience:** Whoever publishes and implements `Nicequantum/Kuttiomp` (or renamed Keeper/API repo)  
**Companion docs:** [PUBLIC_LEXICON_CONTRACT.md](./PUBLIC_LEXICON_CONTRACT.md) · [BACKEND_IMPLEMENTATION_NOTES.md](./BACKEND_IMPLEMENTATION_NOTES.md) · [SYSTEM.md](./SYSTEM.md)

This is the checklist to move Charente’s and Knowledge Keepers’ living forms from the **Keeper portal** into the **production teaching app** (`kuttiomp-learn`). It does **not** require merging the two git repositories.

---

## 1. Verdict (current state)

| Layer | Status | Notes |
|-------|--------|-------|
| Learn frontend contract + adapter | **Ready** | Wire types, hydrate, mock pipeline, sacred filter |
| Learn deploy / demo corpus | **Ready** | Williams 1643 seed labeled historical |
| Public Lexicon Contract v1 | **Frozen** | Source of truth for both repos |
| Keeper / FastAPI public routes | **Blocked / missing** | `Nicequantum/Kuttiomp` is not on GitHub as of this date |
| End-to-end living corpus in Learn | **Blocked** | Needs `VITE_API_BASE_URL` pointing at real public API |

**Bottom line:** The learner app can consume a living corpus today. Nothing production-grade will appear until the Keeper backend ships `GET /api/v1/public/*` with the publish gate and CORS for Learn.

---

## 2. What Learn already does (do not rebuild)

When `VITE_API_BASE_URL` is set, Learn:

1. Calls `GET /api/v1/public/lexicon` (and optionally `/paths`).
2. Maps camelCase `PublicWord` → UI `LexicalWord` via `src/lib/content/adapter.ts`.
3. Drops rows that fail a client-side safety net (`isSacred`, missing gloss, wrong `source`).
4. Merges into demo seed (`demo_historical`) or replaces it (`keeper_only`).
5. Prefers `primaryAudio.url` over demo TTS when present (see attach-lexicon PR / `speak.ts`).

Offline verification: `npm run verify:contract`.

Env cutover (after API exists):

```bash
VITE_API_BASE_URL=https://your-api.example.com
VITE_CONTENT_CORPUS=keeper_only
```

---

## 3. Blocker: publish the Keeper repo

As of 2026-08-21, **`Nicequantum/Kuttiomp` returns 404 on GitHub**. Cloud Agents on this Learn-only environment cannot implement or audit the API.

### Unblock sequence

1. Push Keeper portal + API to GitHub (public or private), e.g. `Nicequantum/Kuttiomp`.
2. Copy into that repo:
   - `docs/PUBLIC_LEXICON_CONTRACT.md`
   - `docs/BACKEND_IMPLEMENTATION_NOTES.md`
   - this file (`docs/BACKEND_ASSESSMENT_ROADMAP.md`)
3. Create a Cursor Cloud **environment** with **both** repo URLs.
4. Start a dual-repo agent to implement Phase A–C below and verify against Learn.

Until step 1, treat backend work as a local/manual track; Learn stays on demo + optional mock.

---

## 4. Phased roadmap (backend)

### Phase A — Public read API (must-have)

**Goal:** Learn can list approved words over HTTPS with no auth.

| # | Work item | Done when |
|---|-----------|-----------|
| A1 | `GET /api/v1/public/health` | Returns `{ ok, service, corpusVersion, wordCount }` |
| A2 | `GET /api/v1/public/lexicon?limit&offset&domain&q` | Publish gate applied server-side; camelCase `PublicWord[]` |
| A3 | `GET /api/v1/public/lexicon/{id}` | `200` publishable / `404` otherwise (no sacred leakage) |
| A4 | CORS allowlist | Learn prod + local `http://localhost:8080`; `GET` + `OPTIONS` |
| A5 | Snake_case DB → camelCase wire | Matches contract §5 mapping helper |
| A6 | Deploy API origin | Stable HTTPS URL for `VITE_API_BASE_URL` |

**Publish gate (non-negotiable, server-side):**

- `approval_status = approved`
- `visibility = public`
- Not sacred / elders-only / spiritual-restricted
- Non-empty English gloss
- Speaker attribution preferred (`primary_speaker_id` or explicit text)

Never return drafts, pending, clan-only, or unapproved audio.

**Suggested location:** `apps/api/app/routers/public_lexicon.py` (see implementation notes).

### Phase B — Keeper UX to publish

**Goal:** Scholars/Keepers (including Charente) can mark a form safe for learners without SQL.

| # | Work item | Done when |
|---|-----------|-----------|
| B1 | Admin action **“Publish for learners”** | Sets `visibility=public` + `approval_status=approved` |
| B2 | Validation | Blocks sacred/restricted; requires gloss + attribution |
| B3 | Audio attach | Approved clip URL lands in `primaryAudio` on public wire |
| B4 | Attribution display | `speakerAttribution` / role readable on Learn cards |

### Phase C — Hardening for teaching demos

| # | Work item | Done when |
|---|-----------|-----------|
| C1 | Pagination correctness | `total` / `limit` / `offset` accurate; Learn can page past 200 |
| C2 | Optional `GET /api/v1/public/paths` | Or Learn keeps synthesizing from `semanticDomain` |
| C3 | Audio CDN / signed long-lived URLs | Learner phones can play without auth cookies |
| C4 | Rate limits / caching | Public GET safe under classroom load |
| C5 | Contract sync | Same `PUBLIC_LEXICON_CONTRACT.md` in both repos |

### Phase D — Production cutover (ops, not code)

| # | Work item | Done when |
|---|-----------|-----------|
| D1 | Seed a small living set (greetings, kinship, water, land) | Health `wordCount > 0` |
| D2 | Set Learn `VITE_API_BASE_URL` on Vercel | Hydrate shows living rows in demo merge |
| D3 | Keeper review of first public set | No sacred / no Williams-as-authority confusion |
| D4 | Flip `VITE_CONTENT_CORPUS=keeper_only` | Demo seed gone; empty state honest if API empty |

---

## 5. Acceptance tests (API)

Run against the deployed API origin (replace `BASE`):

```bash
BASE=https://your-api.example.com

# Health
curl -sS "$BASE/api/v1/public/health" | jq .

# Lexicon page
curl -sS "$BASE/api/v1/public/lexicon?limit=10&offset=0" | jq '{total, corpusVersion, n:(.words|length), sample:.words[0]}'

# CORS preflight from Learn origin
curl -sS -D - -o /dev/null -X OPTIONS "$BASE/api/v1/public/lexicon" \
  -H "Origin: https://kuttiomp-learn.vercel.app" \
  -H "Access-Control-Request-Method: GET"
```

**Pass criteria:**

- Health `ok: true` and `wordCount` matches list `total` for the gated set.
- Every word has `source: "keeper_approved"`, `elderApproved: true`, `isSacred: false`.
- Every word has non-empty `wordNarragansett`, `englishGloss`, `speakerAttribution`.
- Sacred / draft IDs return `404` on single-get (same as missing).
- Learn with `VITE_API_BASE_URL=$BASE` and mock off shows living forms; with `keeper_only` and empty API shows the empty state (not Williams).

**Learn-side smoke after API is live:**

```bash
VITE_API_BASE_URL=$BASE VITE_USE_MOCK_PUBLIC_API=false npm run dev
# Open Words — living attribution visible; play uses primaryAudio when set
```

---

## 6. Security & cultural constraints (assessment)

| Risk | Mitigation |
|------|------------|
| Sacred / restricted leakage | Gate on server; Learn adapter is defense-in-depth only |
| Service role keys in Learn | Forbidden — public read routes only |
| Vercel SSO on public API | Forbidden — learners have no admin session |
| Historical seed mistaken for living authority | Keep labels until `keeper_only` cutover |
| Unapproved audio URLs | Only approved recordings on public wire |

---

## 7. What not to do on the Learn repo

While waiting for Phase A:

- Do not write to Supabase from Learn.
- Do not put Clerk/SSO on the learner app for lexicon read.
- Do not dump Keeper admin UI into this frontend.
- Do not create a third “combined dump” git repo before the public API works.
- Do not treat `VITE_USE_MOCK_PUBLIC_API` as production authority.

Preferred parallel work on Learn: [ENGINEERING_WHILE_WAITING.md](./ENGINEERING_WHILE_WAITING.md).

---

## 8. Suggested owner split

| Owner | Owns |
|-------|------|
| Keepers / Charente (content) | Orthography, gloss, domains, audio, publish decisions |
| Backend engineer | Routes A1–A6, B1–B4, CORS, deploy |
| Learn / frontend | Env vars, hydrate, UI empty states, audio priority (mostly done) |
| Dual-repo Cloud Agent | Implement + verify A–C once both repos are in one environment |

---

## 9. One-page cutover checklist

- [ ] Keeper repo on GitHub
- [ ] Contract files copied into Keeper repo
- [ ] Phase A routes live + CORS green
- [ ] At least one Keeper-published word with attribution
- [ ] Optional: one approved `primaryAudio.url`
- [ ] Learn `VITE_API_BASE_URL` set on preview deploy
- [ ] Manual smoke: Words page + listen
- [ ] Keeper sign-off on first public set
- [ ] Production `VITE_CONTENT_CORPUS=keeper_only`

When the last box is checked, the teaching product is on living authority.
