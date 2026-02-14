# ONE4Team (clubhub-connect) — Project Status

Last updated: 2026-02-14 (Session 2, Europe/Berlin)

## Summary
The project is **roadmap-complete through Phase 9** with **full internationalization (DE/EN)**, **4 new public pages**, **3 new dashboard pages** (Shop, Club Page Admin, Settings), **animated football background**, **dark/light theme**, **personalized greetings**, and **Vercel deployment readiness**.
All remaining work is primarily **Supabase/infra-dependent** (apply bundles, staging/prod separation, abuse controls).

## What is DONE (local readiness)

### Phase 0 — Foundation
- Tenant isolation scaffolding and audits
- Baseline RLS helpers + hardened RLS bundle
- CI pipeline and automated audits

### Phase 1 — Invite-only onboarding
- Invite creation + acceptance flows
- Public invite requests + admin inbox

### Phase 2 — Scheduling
- `activities` + `activity_attendance` bundles
- Schedule page with RSVP

### Phase 3 — Matches + stats
- Competitions/matches + match events + voting + stats bundles
- Existing matches/stats UI

### Phase 4 — Manual dues
- `membership_dues` bundle + Dues UI + CSV export
- Bulk dues create + member names in UI/CSV

### Phase 5 — Partners (stub → useful contacts)
- `partners` bundle + Partners UI
- Contact fields + search

### Phase 6 — AI copilots v1
- `ai_requests` bundle + AI hub page
- Stub copilots (deterministic output) + logging

### Phase 7 — Production hardening (Supabase-independent)
- ErrorBoundary + minimal logger
- `/health` debug endpoint
- Playwright E2E scaffold + route smoke + protected-route redirect tests
- CI runs e2e (Playwright browsers install)
- Deployment docs + release checklist + rollback notes
- Bundle size report script
- Protected routes redirect unauth users to `/auth`

### Landing & Public Pages (2026-02-14)
- **Internationalization (i18n):** Full DE/EN support with language toggle, browser auto-detection, centralized translation files (`src/i18n/en.ts`, `src/i18n/de.ts`)
- **Theme system:** Dark/light mode toggle with system preference detection
- **Features page** (`/features`): Club features, partner features, AI features, use cases
- **Clubs & Partners page** (`/clubs-and-partners`): TSV Allach 09 + Sportecke München partner showcase with images and testimonials
- **Pricing page** (`/pricing`): Translated pricing cards, comparison table, price calculator
- **About page** (`/about`): Company overview and vision
- **Animated football background** on Auth page with translated chat bubbles
- **Test Mode Banner**: Dismissible beta disclaimer on all pages (translated)
- **Auth improvements**: Back button, RequireAuth guard with loading state, removed inline fallbacks
- **Vercel deployment**: `vercel.json` with SPA rewrites, production build verified
- **Dashboard sidebar fixes**: All nav items properly routed
- **NotFound page**: Fully translated 404 page

### Dashboard Pages — Shop, Club Page Admin, Settings (2026-02-14, Session 2)
- **Shop page** (`/shop`): Products grid with CRUD, Orders management, Categories. Demo data with local state (Supabase tables planned for v2.2).
- **Club Page Admin** (`/club-page-admin`): Manage public club page (info, branding, contact, social, SEO). Reads/saves via Supabase.
- **Settings page** (`/settings`): Profile, Club settings (admin-only), Notification preferences (localStorage), Account & Security (password reset, sign out, danger zone).
- **Personalized greeting**: Dashboard header shows "Welcome back, {FirstName}" from profile data
- All three pages fully translated (EN/DE) with comprehensive translation keys
- Sidebar routes and pathToId mappings updated for all new pages

## Current UX focus
- Full i18n (German/English) across all pages and components
- Animated football field background on landing hero and auth page
- Professional partner showcase pages with integrated images
- Trainer-first weekly workflow (schedule hub, attendance, nudge)

## HOLD / Blocked (requires Supabase / infra)
See `HOLD.md`. Key items:
- Apply Supabase SQL bundles (Baseline → Phase6)
- Staging/prod Supabase projects + Vercel environment separation
- Invite-request rate limiting / abuse controls
- True end-to-end golden path e2e with real auth + data

## Recommended next actions
1) Deploy to Vercel (project is deployment-ready with `vercel.json`).
2) When ready, apply SQL bundles using the order in `HOLD.md`.
3) After apply: run Phase smoke scripts in PHASE*_INDEX.md docs.
4) Set up staging/prod Supabase + Vercel envs.
5) Implement invite-request abuse controls.
6) Create Supabase tables for Shop (products, orders, categories) — v2.2 roadmap.
7) Wire Club Page Admin save to full Supabase columns (branding, contact, social, SEO).
8) Implement real push notification preferences (backend integration).

## Repo
- GitHub: https://github.com/SPIGELAI1005/ONE4Team_v2
- Local path: `C:\Users\georg\ONE4Team_v2\ONE4Team_v2`
