# ONE4Team (clubhub-connect)

Club/team management SaaS with an iOS-style glass UI, full internationalization (DE/EN), and an animated football field background.

## Features
- **Multi-language**: Full German and English support with auto-detection
- **Dark/Light theme**: System preference detection + manual toggle
- **Animated football field**: Canvas-based match simulation with translated chat bubbles
- **Public pages**: Features, Clubs & Partners, Pricing, About
- **Legal pages**: Terms of Service, Privacy Policy, Impressum (GDPR/TMG compliant)
- **Cookie consent**: Bottom banner plus **privacy preference centre** (categories + toggles), Accept all / Reject non-essential, EN/DE copy; choices stored in **`localStorage`** (`one4team.cookieConsent` v2); **Cookie settings** in the marketing **`Footer`** (duplicate signed-out bar removed)
- **Dashboard**: Role-based views (Admin, Trainer, Player, Sponsor, Supplier, etc.) with personalized greeting
- **Shop**: Product catalog, orders management, categories (demo data)
- **Club Page Admin**: Manage public club page (branding, contact, social, SEO, **which sections** appear on `/club/:slug` via `public_page_sections`); **publication status badges**, **Desktop/Tablet/Mobile** live preview framing; **hero** club-color overlay toggle + **strength** slider; **Pages** tab “show in navigation” matches the public navbar
- **Public club page (`/club/:slug`)**: PWA-friendly mobile header (single menu), hero shortcuts aligned with CTAs, **Powered by ONE4Team** → marketing home (`/`); **Support FAQ** at `/support`; optional **public team page** at **`/club/:slug/team/:teamId`** when migrations and data are applied; **light-brand contrast** + **accent (crimson) hovers** on public CTAs (`CHANGELOG.md` § 2026-05-03 UI polish)
- **Reports** (`/reports`): Club KPI snapshot for admins (charts: weekly activity, coach coverage, member growth, trainings by weekday/month; **Recharts**)
- **Members**: Server-paged roster with debounced **full-club search** (RPC `search_club_members_page`, ≥2 characters) where migrations are applied
- **Settings**: Profile, club config, notification preferences, account security
- **ONE4AI (`/co-trainer`)**: Club-scoped chat with structured context; per-club LLM keys in **Settings → Club → AI provider** (`club_llm_settings`) or platform fallback via Supabase secrets `OPENAI_API_KEY` / `OPENAI_MODEL`. Settings shows a live **connection status** and **Test connection** (calls deployed `co-trainer` with `mode: "health"`).
- **AI copilots**: Co-Trainer (ONE4AI) + Co-AImin with club-scoped logging and optional server generation
- **Partner showcase**: TSV Allach 09 + Sportecke München with images and testimonials
- **Test Mode Banner**: Dismissible beta disclaimer across all pages

## Stack
- Vite + React + TypeScript
- shadcn-ui + Radix UI + Tailwind CSS
- Framer Motion (animations)
- Supabase (Auth + Postgres)
- Vercel (deployment-ready)

## Local development

### 1) Install
```bash
npm install
```

### 2) Configure environment
Create a `.env` file (see `.env.example`).

Required:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

Optional (Edge Functions — set in **Supabase Dashboard → Edge Functions → Secrets**, not in Vite `.env`):
- `OPENAI_API_KEY` — platform-wide OpenAI fallback when a club has not saved its own key
- `OPENAI_MODEL` — e.g. `gpt-4o-mini`

After changing Edge code, deploy: `supabase functions deploy co-trainer` (and other functions as needed).

### 3) Run
```bash
npm run dev
```

## Scripts
```bash
npm run build        # Production build
npm run lint         # Lint check
npm test             # Run tests
npm run guardrails   # Production guardrail assertions (env/build checks)
npm run policies:drift  # Optional: set PG_POLICIES_SNAPSHOT_FILE (see scripts/assert-pg-policies-drift.cjs)
npm run budget:bundle   # Assert bundle size budget after build
npm run replay:stripe-checklist  # Stripe webhook replay checklist helper
npm run build:report # Bundle size report
npm run k6:smoke     # k6 smoke (requires k6 CLI; point at staging URLs)
npm run k6:journeys  # k6 critical journeys
npm run k6:staged-reads  # staged dashboard read profile (requires k6 CLI + staging URLs in scripts)
npm run k6:edge-co-trainer  # low-rate edge LLM smoke (use sparingly)
```

## Deployment (Vercel)
- `vercel.json` is configured with SPA rewrite rules
- See `DEPLOYMENT.md` for full deployment guide
- Set environment variables in Vercel dashboard

## Project documentation
- `MEMORY_BANK.md` — agent handoff and migration ordering notes
- `CHANGELOG.md` — detailed change log
- `PROJECT_STATUS.md` — current project state
- `ROADMAP.md` — development roadmap (Phase 0–12 + v2)
- `TASKS.md` — execution queue with task status
- `DEPLOYMENT.md` — Vercel deployment guide
- `HOLD.md` — items blocked on Supabase/infra
- `ops/PRODUCTION_READINESS_ARTIFACTS.md` — go-live checklist, rollback, monitoring, k6 phases

## Current Release Snapshot
Go-live readiness checklist:

- [ ] **DB ready:** baseline bundles + communication migrations + Stripe/public-club wave (`20260328203000`–`20260329000000`) + production-readiness wave (`20260329103000`–`20260330120000`) applied in filename order. Use the full `20260329132000_hotspot_composite_indexes.sql` file only (guarded indexes).
- [ ] **Env vars correct:** `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` match the intended Supabase project per environment.
- [ ] **Smoke tests pass:** auth, onboarding/invites, members flow (including server search if RPC deployed), settings save, club-page admin save, public club preview.
- [ ] **Communication verified:** announcements, chat send/retry, attachments, connector save/list, and no schema-cache missing-table errors.
- [ ] **Quality gates green:** `npm run lint`, `npm test`, `npm run build`, `npm run guardrails`, and `npm run budget:bundle` pass for the release branch (`npm run ci` when Playwright and optional DB steps are configured).

## Notes
- Do **not** commit `.env` (use `.env.example`).
- Route-level code splitting is already implemented for all pages.
- All pages are fully translated (EN/DE) via `src/i18n/`.
