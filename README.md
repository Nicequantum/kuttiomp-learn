# Kuttiomp Learn

**Learner frontend** for the Kuttiomp Narragansett language revitalization platform.

This is the app speakers, families, and learners open — **not** the Knowledge Keeper portal (lexicon editor, audio studio, approvals).

- **Demo corpus:** historical seed from Roger Williams’ *A Key into the Language of America* (1643), clearly labeled  
- **Production:** set `VITE_CONTENT_CORPUS=keeper_only` so only elder-approved Keeper content is served  
- **Voice:** Grok Text-to-Speech when `XAI_API_KEY` is set on the server  
- **PWA:** installable to iPhone Home Screen after HTTPS deploy  

Related monorepo (backend + Keeper portal): [Nicequantum/Kuttiomp](https://github.com/Nicequantum/Kuttiomp)  
Backend readiness / cutover: [docs/BACKEND_ASSESSMENT_ROADMAP.md](./docs/BACKEND_ASSESSMENT_ROADMAP.md)

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
| `XAI_API_KEY` | Server only | Grok TTS |
| `XAI_TTS_VOICE` | Server only | Optional voice (`ara` default) |
| `VITE_CONTENT_CORPUS` | Client | `demo_historical` or `keeper_only` |
| `VITE_KEEPER_PORTAL_URL` | Client | Link to admin portal |

**Never** put `XAI_API_KEY` in a `VITE_*` variable or commit it to git.

## iPhone Home Screen

Safari → Share → **Add to Home Screen** (requires public HTTPS URL).

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Dev server on `0.0.0.0:8080` |
| `npm run build` | Production build (Vercel output) |
| `npm run typecheck` | TypeScript check |

## Cultural note

Living Narragansett Knowledge Keepers and speakers hold absolute authority over language content. Historical seed is scaffolding for demos only.

---

*Kuttiomp — a gathering place for the language of the people.*
