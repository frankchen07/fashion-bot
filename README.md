# Fashion Bot

React Native / Expo app that analyzes outfit photos and returns menswear expert recommendations, grounded in a RAG knowledge base scraped from 8 menswear publications.

---

## What It Does

1. You pick or photograph an outfit
2. The app sends the image to a backend function, which calls OpenAI Vision to break down the garments (fit, fabric, silhouette, styling)
3. On the Recommendations tab, a second backend function vectorizes the outfit description, searches a Supabase pgvector knowledge base of menswear articles, and generates publication-specific recommendations in the voice of each source (Derek Guy, Permanent Style, etc.)
4. Analysis and recommendations are cached on-device — subsequent views cost zero API calls

---

## Architecture

```
Phone (Expo Go)
  │
  ├── :8081 ──────► Metro bundler (Mac) ──► serves JS bundle
  │
  └── :54321 ─────► Kong (Mac, via Docker)
                        │
                        ├── /rest/v1/*      ──► PostgREST ──► Postgres
                        ├── /auth/v1/*      ──► GoTrue
                        ├── /storage/v1/*   ──► Storage
                        └── /functions/v1/* ──► Deno runtime (edge functions)
                                                    ├── analyze-outfit
                                                    └── get-recommendations
```

### Key services

**Kong** — the reverse proxy/router. Every request to port 54321 hits Kong first, which looks at the URL path and routes to the right internal service. You never call PostgREST or GoTrue directly.

**PostgREST** — reads your Postgres schema and auto-generates a REST API from it. `supabase.from('articles').select()` in the app hits PostgREST, which translates it to SQL. No backend code needed for standard CRUD.

**GoTrue** — Supabase's auth microservice (sign-up, sign-in, JWT issuance). Not actively used yet — no user accounts — but part of the stack.

**Edge Functions** — Deno (TypeScript) serverless functions for anything PostgREST can't do. Each is a small HTTP handler you write yourself. Used here to keep OpenAI API keys server-side and to run the full RAG pipeline.

---

## OpenAI Call Breakdown

Per outfit analyzed: **3 OpenAI calls total**

| Step | Function | OpenAI call | What it does |
|---|---|---|---|
| 1 | `analyze-outfit` | Vision (gpt-4o-mini) | Sends base64 image, returns garment breakdown JSON |
| 2 | `get-recommendations` | Embeddings (text-embedding-3-small) | Vectorizes outfit description for similarity search |
| 3 | `get-recommendations` | Chat (gpt-4o-mini) | Writes recommendations in each publication's voice |

Recommendations are cached in AsyncStorage after the first load — tapping the tab again on a previously-viewed outfit makes zero API calls.

---

## Data Flow

```
[Photo picked]
  → aiService.analyzeOutfit()
  → supabase.functions.invoke("analyze-outfit")
    → OpenAI Vision API  [call 1]
  → normalizeAnalysis()
  → storageService.saveAnalysis()  ← saves to AsyncStorage + copies image to documentDirectory/wardrobe/

[Recommendations tab tapped]
  → storageService.getRecommendations(entryId)  ← checks AsyncStorage cache
  → if cached: render immediately, done
  → if not: aiService.generateRecommendations()
    → supabase.functions.invoke("get-recommendations")
      → OpenAI Embeddings  [call 2]
      → supabase.rpc("match_articles")  ← pgvector similarity search
      → OpenAI Chat  [call 3]
    → storageService.saveRecommendations()  ← cache result
```

---

## Where Data Lives

| Data | Where |
|---|---|
| Outfit history + analysis JSON | AsyncStorage, key: `wardrobe_history` |
| Recommendations | AsyncStorage, key: `wardrobe_recommendations` (keyed by entry ID) |
| Outfit images | Device filesystem: `documentDirectory/wardrobe/{id}.jpg` |
| Articles knowledge base | Supabase Postgres (`articles` table with pgvector embeddings) |

Nothing is written to Supabase from the app. Supabase is read-only from the app's perspective — the `articles` table is the RAG knowledge base only. All user history stays on-device.

---

## Local Dev Setup

### Prerequisites

- Docker Desktop running
- Supabase CLI installed
- `.env` with `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `OPENAI_API_KEY`

### Start local Supabase

```bash
supabase start
supabase functions serve --env-file .env
```

`SUPABASE_URL` in `.env` must match your Mac's current LAN IP (check with `ifconfig | grep "inet 192"`). This gets baked into the app bundle at build time — if your IP changes, update `.env` and restart Expo with `--clear`.

### Start Expo

```bash
npx expo start --clear
```

Open in Expo Go on your phone. Phone must be on the same WiFi network as your Mac.

### Supabase Studio

Local dashboard at `http://127.0.0.1:54323` — browse tables, run SQL, inspect data.

---

## Scripts (Knowledge Base)

Scrapers live in `scripts/` and require `SUPABASE_SERVICE_ROLE_KEY` in `.env` (service role bypasses RLS for writes).

```bash
cd scripts && npm install

node scraper.js              # dieworkwear.com
node scrape-multi.js         # 7 additional menswear sites
node embed-missing.js        # backfill any rows missing embeddings
```

---

## Dev 

One thing worth noting: the IP problem will bite you every time you switch networks or get a new DHCP lease.

Worth making that a habit — before starting dev, run `ifconfig | grep "inet 192"`, check it matches your `.env`, update + `expo start --clear` if not.

## Production

When ready to ship to others:

1. Deploy edge functions: `supabase functions deploy analyze-outfit && supabase functions deploy get-recommendations`
2. Set secrets: `supabase secrets set OPENAI_API_KEY=sk-...`
3. Update `.env` to use cloud project URL (`https://<project-id>.supabase.co`)
4. Rebuild app bundle

Note: Supabase free tier has a 2-second wall-clock limit on edge functions. OpenAI Vision takes 10-30s. Pro plan required for production.
