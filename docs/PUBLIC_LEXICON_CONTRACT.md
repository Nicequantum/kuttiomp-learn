# Public Lexicon Contract (v1)

**Status:** Frozen for implementation  
**Consumers:** `kuttiomp-learn` (learner app)  
**Producers:** `Nicequantum/Kuttiomp` API + Supabase (Knowledge Keepers)  
**Last updated:** 2026-08-02

This document is the **shared source of truth** for how approved language leaves the Keeper system and enters the public learner app.

---

## 1. Goals

1. Keepers build language only in the **admin / API** monorepo.
2. Learners only ever see content that is **approved + public + non-sacred**.
3. Demo (Williams historical seed) and production (Keeper corpus) share one **frontend word shape**.
4. One env flip moves Learn from demo → production without a rewrite.

---

## 2. Publish gate (non-negotiable)

A lexical entry is **eligible for the public learner** only if **all** are true:

| Rule | Backend fields (typical) |
|------|---------------------------|
| Approved | `approval_status = 'approved'` |
| Public visibility | `visibility = 'public'` |
| Not sacred / restricted | Not `sacred` / `elders_only` / spiritual restricted |
| Has gloss | Non-empty English (or approved learner gloss) |
| Speaker attribution preferred | `primary_speaker_id` or explicit attribution text |

**Never** expose: drafts, pending, clan-only, family-only, elders-only, sacred, or unapproved audio.

---

## 3. Environments

### Learner (`kuttiomp-learn`)

| Variable | Purpose |
|----------|---------|
| `VITE_CONTENT_CORPUS` | `demo_historical` (default) or `keeper_only` |
| `VITE_API_BASE_URL` | Origin of Kuttiomp API, e.g. `https://api.example.com` (no trailing slash) |
| `VITE_KEEPER_PORTAL_URL` | Link to admin UI |

### API (Kuttiomp monorepo)

| Variable | Purpose |
|----------|---------|
| CORS allowlist | Must include `https://kuttiomp-learn.vercel.app` (+ preview domains if needed) |
| Public routes | **No** Clerk/SSO required for `GET /api/v1/public/*` |
| Storage | Approved audio served via long-lived signed or public CDN URLs |

---

## 4. HTTP surface (v1)

Base: `{VITE_API_BASE_URL}`

### 4.1 Health

```http
GET /api/v1/public/health
```

```json
{
  "ok": true,
  "service": "kuttiomp-public",
  "corpusVersion": "2026-08-02T12:00:00Z",
  "wordCount": 0
}
```

### 4.2 Lexicon list (primary)

```http
GET /api/v1/public/lexicon
  ?limit=100
  &offset=0
  &domain=kinship
  &q=good
```

**Server MUST apply the publish gate.** Client never filters sacred.

```json
{
  "corpusVersion": "2026-08-02T12:00:00Z",
  "total": 42,
  "limit": 100,
  "offset": 0,
  "words": [ /* PublicWord */ ]
}
```

### 4.3 Single word

```http
GET /api/v1/public/lexicon/{id}
```

- `200` + `PublicWord`
- `404` if missing or not publishable (do not leak existence of sacred entries)

### 4.4 Paths (optional v1.1)

```http
GET /api/v1/public/paths
```

```json
{
  "paths": [
    {
      "id": "uuid",
      "title": "Greetings",
      "description": "Everyday salutation",
      "stage": 1,
      "wordIds": ["uuid", "uuid"]
    }
  ]
}
```

Until paths exist in the backend, Learn may synthesize paths from `semanticDomain` / tags.

### 4.5 Audio

Preferred: embed `primaryAudio` on `PublicWord`.

Optional:

```http
GET /api/v1/public/lexicon/{id}/audio
```

```json
{
  "recordings": [
    {
      "id": "uuid",
      "url": "https://cdn.../clip.mp3",
      "speakerName": "…",
      "speakerRole": "grandmother",
      "durationMs": 1200
    }
  ]
}
```

---

## 5. Wire type: `PublicWord` (API → network)

JSON field names are **camelCase** on the wire for the public API (API layer may map from snake_case DB).

```ts
type PublicWord = {
  id: string;                     // UUID
  wordNarragansett: string;
  wordNormalized?: string;
  englishGloss: string;
  category?: string;              // noun | verb | phrase | …
  semanticDomain: string;         // kinship | flora | …
  seasonalUsage?: string[];
  isPhrase?: boolean;
  orthographyNote?: string;
  speakerAttribution: string;     // human-readable; required for public
  speakerId?: string;
  speakerRole?: string;
  elderApproved: true;            // always true if publish gate passed
  isSacred: false;                // always false on public wire
  source: "keeper_approved";
  authority: "living_speaker";
  primaryAudio?: {
    url: string;
    contentType?: string;
    durationMs?: number;
    speakerName?: string;
  };
  tags?: string[];
  updatedAt?: string;             // ISO-8601
};
```

### Mapping from Supabase (illustrative)

| PublicWord | DB / relations |
|------------|----------------|
| `id` | `lexical_entries.id` |
| `wordNarragansett` | `word_narragansett` |
| `englishGloss` | `english_gloss` |
| `semanticDomain` | domain enum / join |
| `speakerAttribution` | speakers.name + role |
| `primaryAudio.url` | approved `audio_recordings` URL |
| `elderApproved` | derived from approval + elder workflow |

---

## 6. Frontend type: `LexicalWord` (Learn UI)

Public rows are adapted into the existing Learn model:

| LexicalWord | From PublicWord / demo seed |
|-------------|------------------------------|
| `id` | `id` |
| `wordNarragansett` | same |
| `englishGloss` | same |
| `semanticDomain` | same |
| `source` | `keeper_approved` or `historical_seed` |
| `authority` | `living_speaker` or `colonial_record` |
| `elderApproved` | true for public API |
| `isSacred` | always false for displayed public |
| `speakerAttribution` | same |
| `primaryAudioUrl` | `primaryAudio.url` (optional) |
| `chapter` / `chapterNum` | demo seed only; production may use domain label |

Audio priority in UI:

1. `primaryAudioUrl` (living speaker)  
2. Cloud TTS / Voice Agent (demo)  
3. Browser speech (last resort)

---

## 7. Corpus modes

| `VITE_CONTENT_CORPUS` | Behavior |
|-----------------------|----------|
| `demo_historical` | Load Williams seed. Optionally **merge** public API words if `VITE_API_BASE_URL` is set (API words win on id collision). |
| `keeper_only` | Load **only** public API. If API empty/unavailable → empty state + honest message (no Williams). |

---

## 8. Error & empty states

| Situation | Learn behavior |
|-----------|----------------|
| No `VITE_API_BASE_URL` | Seed only (demo) |
| API 5xx / network | Demo: keep seed; Production: empty + “content temporarily unavailable” |
| API 200, `words: []` | Production empty state: “Keepers are building the living corpus” |
| Audio URL fails | Fall back to TTS if configured |

---

## 9. Versioning

- Contract version: **v1** (this file).
- `corpusVersion` ISO timestamp from API; Learn may cache with `Cache-Control` / ETag later.
- Breaking changes → `v2` path prefix (`/api/v2/public/...`).

---

## 10. Security summary

- Public routes are **read-only**.
- No service role keys in Learn.
- No sacred leakage via 404 differentiation beyond generic not found.
- Admin remains separate (SSO / Clerk); Learn only links via `VITE_KEEPER_PORTAL_URL`.

---

## 11. Implementation checklist

### Kuttiomp monorepo (backend)

- [ ] `GET /api/v1/public/health`
- [ ] `GET /api/v1/public/lexicon` with publish gate
- [ ] `GET /api/v1/public/lexicon/{id}`
- [ ] CORS for Learn origins
- [ ] Map DB snake_case → public camelCase
- [ ] Admin: clear “Publish for learners” sets `visibility=public` + `approval_status=approved`

### kuttiomp-learn (this repo)

- [x] Contract documented (`docs/PUBLIC_LEXICON_CONTRACT.md`)
- [x] Wire types + adapter stubs
- [x] `loadCorpus()` / hydrate with seed fallback
- [x] Env: `VITE_API_BASE_URL`, `VITE_CONTENT_CORPUS`
- [x] Prefer `primaryAudioUrl` in OralPlayer / `speakWord` when present (before machine TTS)
- [x] Production empty state when `keeper_only` + empty
- [x] Paginate public lexicon (`limit`/`offset` until exhausted or cap)
- [x] Mock living fixture is **opt-in** (`VITE_USE_MOCK_PUBLIC_API=true`) — never default on
- [x] Adapter drops missing id/gloss, sacred, and `elderApproved === false`

---

## 12. Copy for both repos

This file should be kept in sync:

- `kuttiomp-learn/docs/PUBLIC_LEXICON_CONTRACT.md`
- `Kuttiomp/docs/PUBLIC_LEXICON_CONTRACT.md` (paste same content)

Backend-specific notes for FastAPI implementers:  
`docs/BACKEND_IMPLEMENTATION_NOTES.md` in this repo (copy into monorepo).
