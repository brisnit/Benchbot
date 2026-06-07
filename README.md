# BenchBot

**AI-powered competitive website audits for UX, strategy & marketing teams.**

BenchBot turns days of competitive UX research into a 15-minute, client-ready report:
AI competitor discovery, automated screenshots, heuristic UX scoring, visual sitemaps,
content-gap analysis, conversion & AI-visibility (GEO) audits, and executive recommendations.

Built with Next.js (App Router), TypeScript, Tailwind, shadcn-style UI, Supabase-ready
data/auth, OpenAI for analysis, and Playwright for crawling/screenshots.

---

## Quick start

```bash
npm install          # also installs Playwright Chromium
npm run dev          # http://localhost:3000
```

**That's it.** With no environment variables, BenchBot runs in **demo mode**:

- a file-backed local store stands in for Supabase (`.data/db.json`),
- cookie-based mock auth replaces Supabase Auth,
- deterministic, clearly-labelled "AI-estimated" analysis replaces OpenAI,
- realistic branded SVG "screenshots" replace real crawling.

This makes the entire flow — sign up, create a workspace, run an audit, view the
dashboard, export the report — fully reviewable without any external services.

### Demo account

`DEMO_MODE=true` (the default in `.env.local`) seeds a ready-made workspace:

```
email:    demo@benchbot.app
password: benchbot
```

It includes one completed sample audit (Acme Cloud vs. Vercel / Netlify / Linear).

---

## Core flow

1. Landing (`/`) → Sign up / Log in
2. Dashboard home — recent audits, usage, empty states
3. **New audit wizard** (`/dashboard/audits/new`):
   1. Website URL + site type
   2. Audit goal
   3. AI competitor discovery (direct / indirect / inspiration) + custom URLs, up to 10
   4. Crawl settings + devices (desktop / mobile / both)
   5. Review & run
4. **Run screen** — live progress through the pipeline (finding competitors → capturing
   screenshots → … → building report → complete)
5. **Audit dashboard** — Executive Summary, Competitor Matrix, Heuristic Review, Screenshots
   Library, Visual Sitemap, IA Comparison, Content Gaps, Conversion Audit, AI Visibility Audit
6. **Report builder** (`/dashboard/audits/[id]/report`) — copy executive summary, copy full
   markdown, export PDF (print), export PowerPoint (stub)

---

## Architecture

```
src/
  app/
    (marketing)/        # public: /, /pricing, /example-report
    (auth)/             # /login, /signup (server actions)
    dashboard/          # authenticated app + audit views
    api/                # route handlers (see below)
  components/
    ui/                 # shadcn-style primitives (button, card, dialog, …)
    brand/              # logo
    marketing/          # public header/footer
    dashboard/          # sidebar, topbar, cards, empty states
    audit/              # wizard, run view, result sections, report builder
  lib/
    db.ts               # storage-agnostic data access layer
    auth.ts             # session helpers (mock cookie auth / Supabase swap-in)
    runner.ts           # audit pipeline orchestration + progress
    analysis/           # OpenAI discovery + analysis, Zod schemas
    crawler/            # Playwright crawler (gated by ENABLE_REAL_CRAWL)
    demo/               # deterministic data generator + seed + example bundle
    supabase/           # browser/server clients (production)
    store/              # local file-backed store (demo backend)
supabase/migrations/    # full schema + Row Level Security
```

**Design principle:** probabilistic AI handles reasoning; deterministic code handles
execution and storage. The data layer (`lib/db.ts`) is the only thing the app talks to,
so the backend can move from the local store to Supabase without touching pages.

### API routes

| Method | Route | Purpose |
| --- | --- | --- |
| POST | `/api/competitors/discover` | AI competitor suggestions (grouped) |
| POST / GET | `/api/audits` | Create / list audits |
| GET / DELETE | `/api/audits/[id]` | Full audit bundle / delete |
| GET / POST | `/api/audits/[id]/competitors` | Save / list selected competitors |
| POST | `/api/audits/[id]/run` | Start the pipeline (fire-and-forget) |
| GET | `/api/audits/[id]/status` | Poll progress for the run screen |
| GET | `/api/audits/[id]/report/copy` | Report content for copy/export |

Every analysis response is validated with **Zod** before it touches storage; an invalid or
missing OpenAI response fails closed and falls back to the deterministic generator. Crawl
failures never crash an audit — failed pages are recorded and partial results are shown.

---

## Going to production

Set the variables in `.env.example` (copy to `.env.local`):

1. **Supabase** — create a project, run `supabase/migrations/0001_init.sql`
   (`supabase db push`). It creates all tables, RLS policies scoping every row to the
   user's workspace, and a public `screenshots` storage bucket. Set
   `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`.
   Then swap `lib/db.ts` / `lib/auth.ts` to use `lib/supabase/*` (clients are already wired).
2. **OpenAI** — set `OPENAI_API_KEY` (and optionally `OPENAI_MODEL`). Discovery and analysis
   automatically use the model; output is still labelled AI-estimated until live web search
   is added.
3. **Real crawling** — set `ENABLE_REAL_CRAWL=true` to capture live screenshots and page
   data with Playwright instead of placeholders.
4. **Stripe** — architecture is billing-ready; keys are present in `.env.example` and the
   billing UI is stubbed.

---

## Scripts

```bash
npm run dev         # dev server
npm run build       # production build
npm run start       # serve production build
npm run typecheck   # tsc --noEmit
```

## Notes

- No TypeScript errors; production build is clean.
- Responsive: dark sidebar + mobile bottom nav, fluid layouts throughout.
- Brand system (colors, fonts, logo) derived from the provided brand guidelines.
- Everything in `.data/` is disposable demo state and is git-ignored.
