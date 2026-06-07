# Deploying BenchBot to Railway

This deploys the **full real experience** — live web-search competitor discovery,
real Playwright screenshots, real AI reports, and persistent shared data — on a
single container with a mounted volume.

> Why Railway and not Vercel? BenchBot uses Playwright (Chromium) for real
> screenshots and writes data to disk. Serverless platforms can't run Chromium
> reliably or persist files. Railway runs our Docker image with a real disk.

---

## One-time setup (~15 min)

### 1. Create the project
1. Go to [railway.app](https://railway.app) and sign in with GitHub.
2. **New Project → Deploy from GitHub repo → `brisnit/Benchbot`**.
3. Railway detects the `Dockerfile` and starts building. (First build ~5–8 min —
   the Playwright image is large.)

### 2. Add a persistent volume (so audits/screenshots survive restarts)
1. In your service, open the **Variables / Settings** area and find **Volumes**.
2. **+ New Volume**, set the **mount path** to exactly:
   ```
   /app/.data
   ```
3. Save. (This is where `db.json` and captured screenshots live.)

### 3. Set environment variables
In the service's **Variables** tab, add:

| Variable | Value |
| --- | --- |
| `OPENAI_API_KEY` | your `sk-...` key |
| `OPENAI_MODEL` | `gpt-4o-mini` |
| `ENABLE_REAL_CRAWL` | `true` |
| `DEMO_MODE` | `true` |
| `NEXT_PUBLIC_APP_URL` | *(fill in after step 4)* |

> Do **not** commit your key — it lives only here and in your local `.env.local`
> (which is gitignored).

### 4. Get your public URL
1. **Settings → Networking → Generate Domain**.
2. Copy the URL (e.g. `https://benchbot-production.up.railway.app`).
3. Paste it as the value of `NEXT_PUBLIC_APP_URL` (step 3) and **redeploy**.

### 5. Verify
- Visit `https://<your-domain>/api/health` → should show
  `{"ok":true,"realCrawl":true,"aiEnabled":true,...}`.
- Log in with the demo account (`demo@benchbot.app` / `benchbot`) or sign up.
- Run a real audit and confirm the green “Found via live web search” banner and
  real screenshots.

---

## Sharing with reviewers
- Send them the Railway URL.
- They can **sign up** with their own email (each gets their own workspace), or
  use the demo account to explore the seeded sample audit.

## Notes & cost
- Railway is usage-based (~$5/mo for a small always-on service). The volume is a
  few cents.
- Each real audit makes several OpenAI calls (~1–5¢ on `gpt-4o-mini`) and takes
  ~15–60s while it crawls.
- Single instance keeps the file-backed store consistent. For large multi-tenant
  scale, switch the data layer to Supabase (schema + RLS already in
  `supabase/migrations/`).

## Updating the live site
Every `git push` to `main` triggers an automatic Railway redeploy.
