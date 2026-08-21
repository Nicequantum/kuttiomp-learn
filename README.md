# Kuttiomp Learn

**Learner frontend** for the Kuttiomp Narragansett language revitalization platform.

This is the app speakers, families, and learners open — **not** the Knowledge Keeper portal (lexicon editor, audio studio, approvals).

- **Demo corpus:** historical seed from Roger Williams’ *A Key into the Language of America* (1643), clearly labeled  
- **Production:** set `VITE_CONTENT_CORPUS=keeper_only` so only elder-approved Keeper content is served  
- **Voice:** Grok Text-to-Speech when `XAI_API_KEY` is set on the server  
- **PWA:** installable to iPhone Home Screen after HTTPS deploy  

Related monorepo (backend + Keeper portal): [Nicequantum/Kuttiomp](https://github.com/Nicequantum/Kuttiomp)

---

## Quick start (local)

```bash
cp .env.example .env
npm install
npm run dev
```

Open the app (default port **8080**). `.env.example` points Learn at Kuttiomp FastAPI on `http://localhost:8000` and keeps `VITE_CONTENT_CORPUS=demo_historical` (Williams seed plus live public words when the API is up).

Start the API from the Kuttiomp repo (`apps/api`, port 8000) if you want live hydration. Without it, Learn falls back to the demo seed.

## Deploy on Vercel (second project)

1. Import **this** repo as a **new** Vercel project (do not overwrite the Keeper portal project).  
2. Framework: Vite / Nitro (TanStack Start). Build: `npm run build`.  
3. Add environment variables (see below and [DEPLOY.md](./DEPLOY.md)).  
4. Deploy → share the HTTPS URL.  
5. On the Keeper portal, set `NEXT_PUBLIC_LEARN_APP_URL` (local `http://localhost:8080`, production `https://kuttiomp-learn.vercel.app`). The sidebar already has **Open learner demo**.

### Environment variables

| Name | Where | Purpose |
| --- | --- | --- |
| `XAI_API_KEY` | Server only | Grok TTS |
| `XAI_TTS_VOICE` | Server only | Optional voice (`ara` default) |
| `VITE_CONTENT_CORPUS` | Client | `demo_historical` (keep until Keepers cut over) or `keeper_only` |
| `VITE_API_BASE_URL` | Client (build-time) | Local: `http://localhost:8000`. On Vercel, set this **after** you host FastAPI — there is no production API URL yet. |
| `VITE_KEEPER_PORTAL_URL` | Client | Keeper portal: local `http://localhost:3000`, production `https://kuttiomp-admin.vercel.app` |

**Never** put `XAI_API_KEY` in a `VITE_*` variable or commit it to git.

## iPhone Home Screen

Safari → Share → **Add to Home Screen** (requires public HTTPS URL).

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Dev server on `0.0.0.0:8080` |
| `npm run build` | Production build (Vercel output) |
| `npm run typecheck` | TypeScript check |
| `npm run verify:contract` | Offline adapter + seed contract checks |
| `npm run verify:hydrate` | Live public lexicon: Wunnegan / Kuttiomp as `keeper_approved` |

## Cultural note

Living Narragansett Knowledge Keepers and speakers hold absolute authority over language content. Historical seed is scaffolding for demos only.

---

*Kuttiomp — a gathering place for the language of the people.*
