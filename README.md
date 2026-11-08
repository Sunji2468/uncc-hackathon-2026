# TasteHeist

Photograph a restaurant dish and it becomes a sticker: what it costs to cook at home versus the menu price, estimated calories and protein, and a recipe. **Mystery Box** turns a photo of your counter into a recipe that uses only those ingredients. A **macro budget** suggests a meal sized to what is left of your day, and the **Community Fridge** lets people react to each other's dishes.

**The model identifies, databases compute.** OpenAI names the dish and estimates ingredient weights. Calories and protein come from USDA FoodData Central. Cost comes from our price table. Every number is labelled an estimate.

## Run it locally

You need Node 20+ and Docker.

```bash
npm install
cp .env.example .env          # then fill in the keys (see below)
docker compose up -d          # Postgres on :5432
npx prisma migrate dev        # create the tables
npm run db:seed               # sample Community Fridge posts
npm run dev                   # http://localhost:3000
```

### Environment

| Variable | Needed for | Notes |
|---|---|---|
| `DATABASE_URL` | everything | The local default in `.env.example` matches `docker-compose.yml`. |
| `OPENAI_API_KEY` | live AI | Not needed in demo mode. |
| `OPENAI_MODEL` | live AI | Default `gpt-5.4-mini`. Use a larger model if dish identification is weak. |
| `YOUTUBE_API_KEY` | recipe videos | Enable YouTube Data API v3 in Google Cloud and create an API key restricted to that API. Keep it server-side. |
| `USDA_API_KEY` | USDA nutrition | Free at https://fdc.nal.usda.gov/api-key-signup. Without it, nutrition falls back to model estimates. |
| `AI_DAILY_LIMIT` | cost guard | AI calls per user per day (default 40). |
| `DEMO_MODE` | demos | `true` serves saved results for every AI feature. No keys needed. |
| `APP_SECRET` | swaps, twists | Random string that signs server results (`openssl rand -hex 32`). |
| `OPENAI_REASONING_EFFORT` | optional | `low`, `medium` and so on, for reasoning models. Unset by default. |
| `SIGNUPS_PER_HOUR` | abuse guard | Sign-ups per IP per hour (default 10). Raise it only for automated test servers. |

### Demo mode

Two ways to run without API keys or wifi:

- **Whole server:** `DEMO_MODE=true npm run dev`.
- **One browser:** Goals and diet, then **Demo mode**. The sidebar shows a "Demo mode on" badge.

Demo mode skips every AI call. Dish photos become one of three sample dishes, ingredient detection returns a sample counter, and Mystery recipes, swaps and smart twists come from saved recipes. Everything still goes through the normal validation, USDA lookup and rescaling. The "Try a sample dish" buttons on New sticker always work this way.

## Checks

```bash
npm test                 # unit tests (Vitest), all of src/lib
npm run typecheck
npm run lint
npm run test:e2e         # Playwright: full flow on phone and desktop, plus an axe accessibility scan
```

`test:e2e` runs against `http://localhost:3000`. To test another server, for example the deployed one: `E2E_BASE_URL=https://your-app.vercel.app npm run test:e2e`. Run it with `DEMO_MODE=true` to avoid AI costs.

## Deploy (Vercel with Supabase or Neon)

1. **Database.** Use one of these:
   - **Supabase:** go to Connect, then **Session pooler**, and copy the string (`...pooler.supabase.com:5432/postgres`). Don't use the direct `db.<ref>.supabase.co` host: on the free plan it is IPv6-only, and Vercel uses IPv4. Don't use the transaction pooler on port 6543 either: Prisma migrations need session mode.
   - **Neon:** copy the **direct** (non-pooled) connection string.
2. **Vercel.** Choose Add New, then Project, and import this GitHub repo. Next.js is detected automatically.
3. **Environment variables** in Vercel: `DATABASE_URL`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `USDA_API_KEY`, `AI_DAILY_LIMIT`, `DEMO_MODE=false` and `APP_SECRET` (a fresh `openssl rand -hex 32`).
4. **Deploy.** The `vercel-build` script runs `prisma migrate deploy` and then `next build`.
5. **Seed** the Fridge once from your machine: `DATABASE_URL=<same url> npm run db:seed`.
6. **Verify:** `E2E_BASE_URL=https://<your-app>.vercel.app npm run test:e2e`. This calls the AI unless the deployment has `DEMO_MODE=true`.

## How it is built

- **Next.js 15** App Router with TypeScript in strict mode, and Route Handlers for the API. **Tailwind v4** with the design tokens in `src/app/globals.css`.
- **PostgreSQL with Prisma** (`prisma/schema.prisma`). Totals, ranges and costs are never stored; they are computed from ingredient rows by `src/lib/sticker-view.ts`, so edits and swaps never go stale.
- **AI** (`src/lib/ai`): one OpenAI call per operation with Structured Outputs. Every answer is checked with zod plus rules (`src/lib/ai/retry.ts`). A bad answer is retried once with the problems spelled out, then fails with a friendly message.
- **Safety nets:** a keyword-based diet and allergy guard (`src/lib/diet.ts`), the Mystery "only these ingredients" rule (`src/lib/mystery.ts`), and a USDA sanity check that falls back to the model's estimate when USDA disagrees by more than 2.5x (`src/lib/usda.ts`).
- **Never trusting the browser:** meal macros, Fridge prices, swaps and twists are recomputed or verified on the server. Swaps and twists use signed tokens.
- **Accounts, with guest mode:** anyone can start as a guest (an httpOnly `th_uid` cookie). Signing up claims that guest, so nothing is lost. Logging in on a new device merges that browser's guest work into the account. Passwords are hashed with scrypt (`src/lib/password.ts`). Sessions are random tokens in an httpOnly `th_session` cookie, and only their SHA-256 is stored (`src/lib/auth.ts`). Log-in and sign-up are rate-limited, and every write API accepts only JSON as a CSRF guard.
- **Landing page:** `/` is a three.js hero (React Three Fiber) of floating stickers, with one flipping between its photo and recipe sides. It loads lazily, falls back to a static collage without WebGL, and holds still for people who prefer reduced motion. The app itself lives at `/board`.

## 90-second demo script

Set up beforehand: turn on demo mode (or set `DEMO_MODE=true`), sign up or log in, and set your calorie and protein goals. Open the landing page (`/`) for the intro, then click **Open your board**.

| Time | Do | Say |
|---|---|---|
| 0:00 | Board | "This $25 plate of cacio e pepe costs about $1.70 to make at home. TasteHeist turns any restaurant dish into a sticker that tells you that." |
| 0:10 | **New sticker**, then **Smash burger** | "Snap a dish, or use a sample. The AI only names the dish and estimates the portion. The numbers come from USDA data." The card waits, then flips. |
| 0:25 | Drag the **Servings** slider to 4 | "Cooking for four? Amounts, cost and 'you keep' update instantly. Each number shows a range, because these are estimates." |
| 0:35 | Edit an ingredient, then **Suggest swaps** | "Too much cheese? Edit it, or swap it, and see what each swap saves in dollars and calories." |
| 0:45 | **Mystery Box**: add eggs, cooked rice and tomatoes, then **Open the box** | "Photo of your counter, a time limit, and a recipe that uses only what you have. The server rejects any ingredient you didn't list." |
| 0:60 | **Macro budget**: press **Eat**, then **Size a meal for me** | "Log what you ate, and it sizes dinner to exactly what's left, rescaled server-side to hit the target." |
| 0:75 | Sticker page: **Share to Fridge**, then react on the Fridge | "Share the heist. Friends react with stickers and leave notes." |
| 0:85 | **Start cooking** | "And cook it, one step at a time, with timers. That's TasteHeist." |

## Notes

- Prices in `src/lib/prices.ts` are a placeholder table of USD per 100 g, labelled as estimates throughout.
- The Fridge has no realtime connection. It refetches when the tab regains focus, plus a "Refresh now" button.
- Design reference: `design/` holds the screens extracted from `TasteHeist.html`. `specs.md` is the build spec.

### Mystery Box cooking time and videos

The dial offers 15 min, 30 min, 1 hr, 2 hr, and Custom (1–600 whole minutes). The limit includes prep and cooking; the recipe may take less time.

Mystery recipes show up to three related YouTube videos in embedded players, including when reopened from the board. Set `YOUTUBE_API_KEY` in `.env` and in your deployment environment, then restart/redeploy. Results are cached for 24 hours by recipe title. Missing configuration, unavailable YouTube results, and quota errors leave the recipe usable and show a video status message. Video recipes may use different ingredients or timings. Demo mode skips AI calls but video recommendations still require YouTube access.
