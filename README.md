# Kuttiomp Learn

**Learner frontend** for the Kuttiomp Narragansett language revitalization platform.

This is the app speakers, families, and learners open — **not** the Knowledge Keeper portal (lexicon editor, audio studio, approvals).

- **Demo corpus:** historical seed from Roger Williams’ *A Key into the Language of America* (1643), clearly labeled  
- **Living corpus:** set `VITE_API_BASE_URL` when the Kuttiomp public lexicon is up; later `VITE_CONTENT_CORPUS=keeper_only`  
- **Voice:** living speaker recordings first; machine TTS only as a labeled stand-in  
- **PWA:** installable to iPhone Home Screen after HTTPS deploy  

Related monorepo (backend + Keeper portal): [Nicequantum/Kuttiomp](https://github.com/Nicequantum/Kuttiomp)  
Backend readiness / cutover: [docs/BACKEND_ASSESSMENT_ROADMAP.md](./docs/BACKEND_ASSESSMENT_ROADMAP.md)

This app only **reads** approved + public + non-sacred rows. Keepers write language only in Kuttiomp.

---

## Quick start (local)

```bash
npm install
npm run dev
```

Open the app (default port **8080**).

## Deploy on Vercel (second project)

1. Import **this** repo as a **new** Vercel project (do not overwrite the Keeper portal project).  
2. Framework: Vite / Nitro (TanStack Start). Build: `npm run build`.  
3. Add environment variables (see below and [DEPLOY.md](./DEPLOY.md)).  
4. Deploy → share the HTTPS URL.  
5. On the Keeper portal, add a button: “Open learner demo” → that URL.

### Environment variables

| Name | Where | Purpose |
| --- | --- | --- |
| `VITE_API_BASE_URL` | Client | **The one env that connects to Kuttiomp.** Origin of `GET /api/v1/public/lexicon` (no trailing slash). Leave empty until that API is deployed — Williams seed stays the demo corpus. |
| `VITE_CONTENT_CORPUS` | Client | `demo_historical` (default) or `keeper_only` |
| `VITE_KEEPER_PORTAL_URL` | Client | Link to admin portal |
| `VITE_USE_MOCK_PUBLIC_API` | Client | **Dangerous.** Must stay `false`/unset in production. Explicit `true` only for local engineering (fake living rows). Ignored when `VITE_API_BASE_URL` is set. |
| `XAI_API_KEY` | Server only | Machine TTS (Grok). Never a living speaker. |
| `XAI_TTS_VOICE` | Server only | Optional voice (`ara` default) |

**Never** put `XAI_API_KEY` in a `VITE_*` variable or commit it to git.

When the Kuttiomp API is up, set **only** `VITE_API_BASE_URL` on this app. The API’s CORS allowlist **must** include `https://kuttiomp-learn.vercel.app` (plus local `http://localhost:8080` for `npm run dev`).

## iPhone Home Screen

Safari → Share → **Add to Home Screen** (requires public HTTPS URL).

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Dev server on `0.0.0.0:8080` |
| `npm run build` | Production build (Vercel output) |
| `npm run typecheck` | TypeScript check |
| `npm run verify` | Typecheck + lexicon contract + living-audio policy |

## Cultural note

Living Narragansett Knowledge Keepers and speakers hold absolute authority over language content. Historical seed is scaffolding for demos only.

---

*Kuttiomp — a gathering place for the language of the people.*
