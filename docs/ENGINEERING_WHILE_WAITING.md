# Engineering while Keepers build the corpus

Work that advances the product **without** waiting on live lexicon data.

## Already in place

- Public Lexicon Contract v1 + adapter + hydrate
- Demo Williams seed for Keepers demos
- Land Night UI + Elder photo + white cards
- Mock living pipeline (opt-in only: `VITE_USE_MOCK_PUBLIC_API=true` in **local** engineering; production stays seed-only until `VITE_API_BASE_URL` is set)
- Progress + listen resume cursor
- Error boundary
- `npm run verify:contract`

## High-value next tracks (priority order)

| Priority | Track | Why |
|----------|--------|-----|
| P0 | Keep demo stable + deploy green | Trust with speakers |
| P0 | Mock living pipeline demos | Show “this is how production feels” |
| P1 | Prefer real audio in player | Ready when first clips land |
| P1 | Domain shelves / focus polish | Better learning with seed alone |
| P1 | Accessibility pass (Elder, contrast, focus) | Protocol 11 |
| P2 | Offline read of cached words (safe SW or Cache API for `/scenery` only) | Field use |
| P2 | Export progress JSON | Learners keep a sense of history |
| P2 | Phonetic reading guide for Williams orthography | Demo education, labeled historical |
| P3 | Shared design tokens package with admin | Brand unity |
| P3 | Performance budget (LCP scenery, code-split) | Phone demos |

## Env cheatsheet

```bash
# Default demo
VITE_CONTENT_CORPUS=demo_historical

# Engineering: test living merge without API (local only — never production)
VITE_USE_MOCK_PUBLIC_API=true

# When Kuttiomp public API exists (the one env Learn needs)
VITE_API_BASE_URL=https://your-api.example.com
VITE_CONTENT_CORPUS=demo_historical   # merge
# or
VITE_CONTENT_CORPUS=keeper_only       # production cutover
```

## Commands

```bash
npm run typecheck
npm run verify:contract
npm run build
npm run dev
```

## What not to overbuild while waiting

- Full conversational AI elder personas
- Complex auth in Learn
- Writing to Supabase from the learner app
- Gamification / streaks
