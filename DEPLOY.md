# Kuttiomp Learn — Deploy & Environment Guide

This is the **learner frontend** (what speakers and families open).  
Your existing Vercel app is the **Keeper portal / API** (where language work is done).

Keep them as **two related deployments**, linked by buttons — not one mixed UI.

---

## Recommended architecture

| App | Audience | Deploy |
| --- | --- | --- |
| **Kuttiomp Learn** (this project) | Learners / demo for Keepers | **New Vercel project** (or Cloudflare Pages) |
| **Keeper portal** (`apps/admin` + `apps/api`) | Keepers / speakers only | Your **existing** Vercel project |

### Why separate?

- Keepers tools stay private-ish; learners never see editors by accident  
- Different auth, caching, and env vars  
- One click each way: “Open learner demo” / “Open Keeper portal”

### Can Keepers open the learner app from the backend site?

**Yes.** After both are live:

1. On **this** project set `VITE_KEEPER_PORTAL_URL=https://kuttiomp-admin.vercel.app`  
2. On **admin** set `NEXT_PUBLIC_LEARN_APP_URL=https://kuttiomp-learn.vercel.app`  
   (local pairing: `http://localhost:8080`). The sidebar **Open learner demo** control uses that URL.

No special Vercel networking is required — just two HTTPS URLs.

### Cloudflare?

Optional. Vercel is enough if admin is already there. Use Cloudflare only if you want a second host or custom edge rules. Not required.

---

## Environment variables — **Learner app** (this project)

Add these in **Vercel → Project → Settings → Environment Variables**  
(Production + Preview as needed).

| Variable | Required? | Example | Purpose |
| --- | --- | --- | --- |
| `XAI_API_KEY` | **Yes for voice** | `xai-...` | Server-only. Never prefix with `VITE_`. |
| `XAI_VOICE_AGENT_ID` | **Yes for your agent** | `agent_…` | Your Voice Agent. Learn / Hear / Watch all speak through this. |
| `XAI_TTS_VOICE` | Optional | `ara` | REST TTS voice **only if** no agent id is set. Do not put `agent_…` here unless you skip `XAI_VOICE_AGENT_ID`. |
| `VITE_CONTENT_CORPUS` | Optional | `demo_historical` | `demo_historical` (Williams seed + merge live words) until Keepers cut over. Use `keeper_only` only then. |
| `VITE_API_BASE_URL` | **After FastAPI is hosted** | *(your FastAPI origin)* | Public lexicon origin, no trailing slash. Vite bakes this in at **build** time. There is no production FastAPI URL yet — set this on Vercel only after you host FastAPI (Railway / Fly / Render). Local pairing uses `http://localhost:8000` (see `.env.example`). |
| `VITE_KEEPER_PORTAL_URL` | Recommended | `https://kuttiomp-admin.vercel.app` | Shows “Open Keeper portal” in learner Profile. Local: `http://localhost:3000`. |

### Do **not** put the API key in chat or in `VITE_*` vars

Code reads `XAI_API_KEY` and `XAI_VOICE_AGENT_ID` at **request time** on the server (`/api/tts`) so Vercel runtime values are used — they are not baked in at build. Both must be set for Production **and** Preview if you want the agent on preview deploys.

---

## Environment variables — **Keeper portal** (existing project)

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_LEARN_APP_URL` | Local: `http://localhost:8080`. Production: `https://kuttiomp-learn.vercel.app`. Sidebar **Open learner demo**. |

(Your existing Supabase/Clerk/Grok keys for admin stay as they are.)

---

## Deploy steps (Vercel) for this frontend

1. Create a **new** Vercel project from this app’s repo/folder (or connect the monorepo and set Root Directory to this app).  
2. Framework: Vite / Nitro (TanStack Start build already outputs Vercel).  
3. Build command: `npm run build`  
4. Add env vars above.  
5. Deploy → copy the URL (e.g. `https://kuttiomp-learn.vercel.app`).  
6. Optional: custom domain `learn.yourdomain.org`.  
7. On admin, add the learner URL button.

### iPhone home screen

1. Open the **public HTTPS** URL in **Safari**  
2. Share → **Add to Home Screen**  
3. Opens as a standalone app (PWA)

---

## Voice notes

- **Grok TTS** (`POST /api/tts` → `https://api.x.ai/v1/tts`) is for demo human-quality speech.  
- It is **not** a Narragansett native speaker. Historical spellings remain approximations.  
- Production path: speaker-attributed recordings from Keepers replace TTS entry-by-entry.  
- Optional later: xAI **custom voice** from a consented speaker sample (cultural approval required).

---

## Scenic backgrounds

Land photography (woodland sunset, coastal marsh, forest stream) is baked into `/public/scenery/`.  
No extra env vars. Modes slightly change which scene is shown.

---

## Checklist before showing Keepers

- [ ] Learner deployed on HTTPS  
- [ ] `XAI_API_KEY` + `XAI_VOICE_AGENT_ID` set → Profile shows “Your Voice Agent is connected”  
- [ ] `VITE_KEEPER_PORTAL_URL` set (optional)  
- [ ] Admin has “Open learner demo” link  
- [ ] Tested Add to Home Screen on one iPhone  

## Public lexicon (demo → production)

See [docs/PUBLIC_LEXICON_CONTRACT.md](docs/PUBLIC_LEXICON_CONTRACT.md).

| Variable | Values |
|----------|--------|
| `VITE_CONTENT_CORPUS` | `demo_historical` (default, merge path) or `keeper_only` (cutover) |
| `VITE_API_BASE_URL` | Local: `http://localhost:8000`. Production: set on Vercel **after** FastAPI is hosted. Do not invent a host. |

Kuttiomp exposes `GET /api/v1/public/health` and `GET /api/v1/public/lexicon`. FastAPI is **not** on Vercel. For local pairing, copy `.env.example` → `.env` (`VITE_API_BASE_URL=http://localhost:8000`) and run the API from Kuttiomp `apps/api`. CORS must include `http://localhost:8080` and `https://kuttiomp-learn.vercel.app`. Then `npm run verify:hydrate` and `npm run verify:contract`.
