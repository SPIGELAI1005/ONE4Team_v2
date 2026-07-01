# ONE4Team (clubhub-connect)

Club/team management SaaS with an iOS-style glass UI, full internationalization (DE/EN), and an animated football field background.

## Features
- **Multi-language**: Full German and English support with auto-detection
- **Dark/Light theme**: System preference detection + manual toggle
- **Animated football field**: Canvas-based match simulation with translated chat bubbles
- **Public pages**: Features, Clubs & Partners, Pricing, About — refreshed EN/DE copy (2026-07-01): public microsites, Sommerfest, integrated AI, TSV Allach pilot; **Features** AI-Powered Innovation hero with scroll-triggered intro video and theme-aware glass card
- **Legal pages**: Terms of Service, Privacy Policy, Impressum (GDPR/TMG compliant)
- **Cookie consent**: Bottom banner plus **privacy preference centre** (categories + toggles), Accept all / Reject non-essential, EN/DE copy; choices stored in **`localStorage`** (`one4team.cookieConsent` v2); **Cookie settings** in the marketing **`Footer`** (duplicate signed-out bar removed)
- **Dashboard**: Role-based views (Admin, Trainer, Player, Sponsor, **Supplier/partner personas**) with personalized greeting; **dual-world** club vs partner portal routes (`/partner-*`, `/supplier-page` **Partner Page**); persona switch in Settings
- **Financial reporting**: Admin **`FinancialSummary`** on dashboard; full report at **`/reports?section=financial`** (revenue from Payments/Dues/Shop, costs from **`club_expenses`**, monthly P&L charts, CSV export)
- **Payments (`/payments`)**: Admin fee **packages** (currency, categories, price components, notes); **payment lines** per member; multi-package record + bulk assign; annual summary by member type (membership + shared levy). Separate from legacy **`/dues`** manual dues tracking.
- **Reports** (`/reports`): Club KPI snapshot for admins (Operations | **Financial** | Performance tabs; **Recharts** charts)
- **Members**: Server-paged roster with debounced **full-club search** (RPC `search_club_members_page`, ≥2 characters); **German Mitgliederliste** CSV import profile for club exports; **team assignment** to `team_players` / `team_coaches`; **Club Card** tab (role, team, date of birth, club logo, PNG download)
- **Teams**: Team list with **search** (name, sport, age group, league, coach, player count)
- **Shop**: Product catalog, orders management, categories (revenue surfaced in financial report when orders exist)
- **Club Page Admin**: Manage public club page (branding, contact, social, SEO, **which sections** appear on `/club/:slug` via `public_page_sections`); publication status badges, responsive preview viewports, hero overlay toggle + strength slider
- **Public club page (`/club/:slug`)**: PWA-friendly mobile header, hero shortcuts, **Powered by ONE4Team** → marketing home (`/`); Support FAQ at `/support`; optional public team page at `/club/:slug/team/:teamId`; light-brand contrast + accent hovers on public CTAs; **hero team filter** (`?team=`); **training/match RSVP** with **team attendance overview** for signed-in members; **Messages hub** (Updates + channels); embedded **Communication** modal; **club favicon** from admin branding; public **Shop**, **Reports**, **Live scores** when enabled; **TSV Allach**: multi-step **online membership application** on `/join`, **Sommerfest 2026** live tournament board at `/tournament/sommerfest-2026`, **JAKO shop** catalog, match **opponent logos** on schedule, news carousel, mobile hero CTA stack (team filter → next training → AI 4 T → dashboard)
- **Communication (`/communication`)**: Club chat channels, announcements with poster upload, **External Bridge (Beta)** for WhatsApp Business API / Telegram (setup guide: **`docs/backlog/WHATSAPP_EXTERNAL_BRIDGE_SETUP.md`**)
- **Tasks (`/tasks`)**: Assign club tasks to members; notifications; dashboard summary card
- **Settings**: Profile, club config, notification preferences, account security
- **AI 4 T (`/co-trainer`)**: Club-scoped chat with structured context and fair-use scope (training, match prep, club ops — not general news/shopping). Per-club LLM keys in **Settings → Club → AI provider** or platform fallback via Edge secrets. **Pro plan**, active trial subscription, or **feature trial** required. Settings shows **connection status** and **Test connection**. **Agent tab:** propose → confirm → execute workflows (trainings, member drafts, announcements) with audit trail; **Bot** icon; theme-aware tab pills. **Voice** input/output (Web Speech API). Dashboard **AI 4 T Agent** shortcut (bubble logo) opens contextual Agent sheet on Teams, Members, Activities. **Public club modal** (Chat | Agent | Guide). See **`DEPLOYMENT.md` § AI 4 T** and **§ AI 4 T Agent**.
- **Partner portal (2026-07-01)**: External personas use **`/partner-marketplace`**, **`/partner-messages`**, **`/partner-tasks`**, **`/partner-reports`**, **`/partner-ai`**, **`/supplier-page`** (**Partner Page**). Dual-role users switch persona in **Settings**. Partner **Agent** tab shows marketplace/listing actions — not club training workflows. See **`docs/rbac-dashboard-plan.md`** §10.
- **Schedule (`/activities`)**: Training/match list with member RSVP (confirm/decline + reason), **team attendance overview**, trainer roster panel; training RSVP closes **1 hour before start**
- **Matches (`/matches`)**: Match management with **AI 4 T analysis** modal; Sommerfest 2026 tournament publish/sync and live scores for TSV Allach pilot
- **Support & FAQ (`/support`)**: Expanded FAQs for AI 4 T, billing trials, imports, and reports — written for club users (no backend setup jargon).
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
- **Production go-live:** [`docs/PRODUCTION_RELEASE_CHECKLIST.md`](docs/PRODUCTION_RELEASE_CHECKLIST.md)
- **Project audit (code, UX, market):** [`docs/PROJECT_COMPREHENSIVE_AUDIT.md`](docs/PROJECT_COMPREHENSIVE_AUDIT.md) · technical readiness: [`ops/PRODUCTION_READINESS_ARTIFACTS.md`](ops/PRODUCTION_READINESS_ARTIFACTS.md)
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

- [ ] **DB ready:** baseline bundles + communication migrations + Stripe/public-club wave (`20260328203000`–`20260329000000`) + production-readiness wave (`20260329103000`–`20260330120000`) + public microsite wave (`20260502120000`–`20260503143000`) + **`20260614120000_club_expenses.sql`** applied in filename order. Use the full `20260329132000_hotspot_composite_indexes.sql` file only (guarded indexes).
- [ ] **Env vars correct:** `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` match the intended Supabase project per environment.
- [ ] **Smoke tests pass:** auth, onboarding/invites, members flow (including server search if RPC deployed and German CSV import), settings save, club-page admin save, public club preview, admin dashboard financial summary, `/reports?section=financial`.
- [ ] **Communication verified:** announcements, chat send/retry, attachments, connector save/list, and no schema-cache missing-table errors.
- [ ] **Quality gates green:** `npm run lint`, `npm test`, `npm run build`, `npm run guardrails`, and `npm run budget:bundle` pass for the release branch (`npm run ci` when Playwright and optional DB steps are configured).

## Notes
- Do **not** commit `.env` (use `.env.example`).
- Route-level code splitting is already implemented for all pages.
- All pages are fully translated (EN/DE) via `src/i18n/`.
