# ONE4Team — Roadmap (Football-first)

This roadmap is derived from the MVP epics and is designed to:
- ship a sellable football-first club management SaaS fast
- keep the data model extensible for other sports
- de-risk multi-tenancy/security early

Assumption: 1–2 devs, quality-first, weekly releases. Adjust timelines as needed.

**Recently shipped (2026-03-28):** ONE4AI (`/co-trainer`) with club LLM settings, edge health check, chat persistence (`ai_conversations`), and member audit timeline migrations — see `CHANGELOG.md` § 2026-03-28 and `MEMORY_BANK.md`.

**Production readiness / scale (2026-03-30):** Analytics RPCs, guarded hotspot indexes, Members server search + server-paged roster, keyset pagination (matches/messages), platform-admin RBAC/audit, RLS integration tests, CI guardrails/bundle budget, Edge correlation logging, ops templates and runbooks — doc sync: `CHANGELOG.md` § 2026-03-30, `MEMORY_BANK.md`, `ops/PRODUCTION_READINESS_ARTIFACTS.md`, `PROJECT_STATUS.md`, `TASKS.md`, `DEPLOYMENT.md`.

**Club reporting + RBAC polish (2026-05-01):** `/reports` admin KPI dashboard (Recharts: weekly activity, coach coverage, member growth, trainings by weekday/month), `usePermissions` fallback via `is_club_admin` RPC when role-assignment reads fail, migration `20260430173000` for safer `club_role_assignments` SELECT, marketing footer dedupe + cookie dialog height fix — see `CHANGELOG.md` § 2026-05-01, `MEMORY_BANK.md`, `TASKS.md`.

**Public club microsite wave (2026-05-03):** Supabase migrations `20260502120000`–`20260503143000` (draft/publish, public visibility, privacy, schedule/matches/events, documents/join/contact, join request v2); Club Page Admin publication badges, responsive preview viewports, nav `showInNav` parity, hero overlay toggle + strength slider, homepage default order — see `CHANGELOG.md` § 2026-05-03, `MEMORY_BANK.md`, `TASKS.md` **MICROSITE-***.

**Public club UI polish (2026-05-03):** Client-only **accessibility/visual** pass — light-brand **`--club-*`** token adjustments, **`readableTextOnSolid`** on club-primary buttons, shared **`accent`** (crimson) hover utilities for public CTAs (matches app `Button` outline language). See `CHANGELOG.md` second **2026-05-03** entry and `TASKS.md` **MICROSITE-UX-001**.

---

## Phase 0 — Foundation (Week 0–1)
**Goal:** SaaS-correct tenant isolation + roles baseline.

**Deliverables**
- EPIC A: Multi-tenant foundation
  - clubs + memberships + RLS tenant boundaries
  - active-club selection
- EPIC B: RBAC baseline
  - roles defined + permission map seeded

**Exit criteria**
- A user can create a club
- can only access their club’s data
- role-based nav is enforced (UI) and writes are enforced (RLS/API)

---

## Phase 1 — Invite-only onboarding + club front entry (Week 1–2)
**Goal:** acquisition funnel exists without opening security holes.

**Deliverables**
- EPIC C: Invite-only onboarding + invite requests
  - admin invites (copy link)
  - acceptance flow
  - public request-invite form on club page
  - admin inbox view to approve/reject

**Exit criteria**
- Invite-only works
- public can request invite
- admin can approve and onboard new users

---

## Phase 2 — Scheduling engine (Week 2–3)
**Goal:** core club operations (trainings/events) work.

**Deliverables**
- EPIC D: Activities + attendance
  - activities list/create
  - attendance tracking
  - basic team/field/trainer assignment

**Exit criteria**
- Trainers can schedule trainings
- members can confirm/decline
- admin sees attendance overview

---

## Phase 3 — Matches + football stats (Week 3–4)
**Goal:** football-specific differentiator + sticky daily usage.

**Deliverables**
- EPIC E: Matches + stats
  - match creation
  - match events logging
  - leaderboards + player profiles

**Exit criteria**
- Match events produce correct stats
- player profile shows match history + impact

---

## Phase 4 — Manual dues tracking (Week 4–5)
**Goal:** admin value without Stripe complexity.

**Deliverables**
- EPIC F: Manual dues tracking
  - dues table + admin UI
  - unpaid widget
  - CSV export

**Exit criteria**
- Clubs can run dues operations without external payments

---

## Phase 5 — Partner portal stub (Week 5)
**Goal:** reserve the second half of the vision without scope explosion.

**Deliverables**
- EPIC G: Partner portal stub
  - partners data model
  - placeholder screens + nav

**Exit criteria**
- Partners module exists as a skeleton

---

## Phase 6 — AI copilots v1 (Week 5–6)
**Goal:** AI adds immediate operational value (not a gimmick).

**Deliverables**
- EPIC H: AI copilots
  - Co-Trainer weekly plan
  - Co-AImin admin digest
  - ai_requests logging + club scoping

**Exit criteria**
- AI outputs are reproducible and club-scoped
- AI requests are logged for audit/debug

---

## Phase 7 — Production hardening + launch (Week 6–7)
**Goal:** make it real SaaS.

**Deliverables**
- Minimal E2E tests for golden path
- rate limits / abuse controls (invite request spam)
- error monitoring + logging
- deploy (Vercel) + staging/prod Supabase separation

**Exit criteria**
- stable deployment
- onboarding flow works in production
- tenant isolation verified

---

## Phase 8 — Internationalization, Public Pages & Deploy Readiness (Week 7–8) ✅
**Goal:** make the app presentable, multi-language, and deployment-ready.

**Deliverables**
- EPIC I: Full i18n (DE/EN)
  - LanguageContext + useLanguage hook + LanguageToggle
  - Centralized translations (en.ts, de.ts) covering all pages
  - Browser language auto-detection + localStorage persistence
  - Animated football background chat bubbles translated
- EPIC J: Public pages
  - Features page with feature showcase + use cases
  - Clubs & Partners page (TSV Allach 09 + Sportecke München)
  - Pricing page with translated cards + comparison table
  - About page
- EPIC K: Theme & UX
  - Dark/light mode toggle
  - Animated football background on Auth page
  - Test Mode Banner (dismissible, translated)
  - Auth improvements (Back button, RequireAuth guard)
- EPIC L: Deployment
  - vercel.json with SPA rewrites
  - Production build verified
  - Dashboard sidebar routes fixed
  - NotFound page translated

**Exit criteria**
- All pages translated EN/DE ✅
- Language toggle works across all pages ✅
- Public pages render correctly ✅
- Production build succeeds ✅
- vercel.json present for Vercel deployment ✅

---

## Phase 9 — Dashboard Pages & Personalization (Week 8) ✅
**Goal:** complete the dashboard experience with Shop, Club Page management, and Settings.

**Deliverables**
- EPIC M: Dashboard pages
  - Shop page with Products/Orders/Categories (local state, demo data)
  - Club Page Admin with General Info, Branding, Contact, Social, SEO
  - Settings with Profile, Club, Notifications, Account tabs
  - Sidebar routes and pathToId mappings for all new pages
  - Comprehensive EN + DE translations for all three pages
- EPIC N: UX personalization
  - Dashboard greeting uses user's first name from profile data
  - Fallback to email prefix when no display name is set

**Exit criteria**
- All three pages render correctly with full translations ✅
- Sidebar highlights active page for shop/clubpage/settings ✅
- Shop CRUD works with demo data ✅
- Settings toggles persist in localStorage ✅
- Dashboard greeting shows personalized first name ✅

---

## Phase 10 — Legal, Compliance & Deployment (Week 8) ✅
**Goal:** make the app legally compliant for German market and fix deployment issues.

**Deliverables**
- EPIC O: Legal pages
  - Terms of Service (14 sections, TMG/BGB/GDPR compliant)
  - Privacy Policy (11 sections, DSGVO/GDPR compliant)
  - Impressum (8 numbered sections, Section 5 TMG)
  - All pages translated EN + DE
- EPIC P: Cookie Consent
  - GDPR-compliant cookie consent banner (Accept All / Essential Only)
  - localStorage persistence with timestamp
- EPIC Q: Footer & social
  - Legal navigation links in footer
  - X.com and email social icons
- EPIC R: Deployment hardening
  - Supabase client graceful fallback for missing env vars
  - Explicit Vite framework config in vercel.json

**Exit criteria**
- All legal pages render correctly in EN + DE ✅
- Cookie consent banner appears on first visit ✅
- Footer shows legal links and social icons ✅
- App loads on Vercel even without env vars ✅

---

## Phase 11 — Communication Platform & Club Operations (Week 9–10) ✅
**Goal:** transform communication and member operations from baseline flows into robust day-to-day workflows.

**Deliverables**
- EPIC S: Communication platform
  - Channel-first communication UI (announcements + club/team chats)
  - Reliable send states with retry UX
  - Date separators and improved chat readability
  - Message search and attachment support
- EPIC T: External bridge foundation
  - Supabase Edge Function skeleton (`chat-bridge`)
  - Connector config + events tables
  - In-app connector settings and bridge health panel
- EPIC U: Member operations
  - Bulk member import (Excel/CSV) with validation report
  - Invite payload enrichment (`team`, `age_group`, `position`) persisted to memberships
- EPIC V: Club branding and public page polish
  - Expanded club branding controls + media references
  - Preview-mode flow + storage diagnostics

**Exit criteria**
- Communication hub supports reliable send/retry and channel-scoped chat ✅
- Bridge skeleton is callable and connector lifecycle is manageable in-app ✅
- Bulk member import handles validation and invite payload mapping ✅
- Club branding changes flow through admin and public club page ✅

---

## Phase 12 — Environment Integrity & Production Rollout (Week 10–11) ⏳
**Goal:** eliminate schema/environment drift and harden production operations.

**Deliverables**
- Apply-order enforcement for bundles + incremental migrations
- Public club-page join onboarding model (manual/auto + reviewer policy) integrated and migration-backed
- Save-first member list workflow (draft members before invite send) integrated and migration-backed
- Staging/prod Supabase separation + Vercel env alignment
- Abuse controls/rate limiting for invite requests
- Expanded high-risk automated tests (invite/onboarding/chat/save flows)

**Exit criteria**
- No schema-cache missing-table incidents in active environments
- Staging and production are reproducible and isolated
- Abuse controls and regression tests are active in CI

---

## v2 Roadmap (post-MVP)

### v2.1 Payments & billing
- Stripe for ONE4Team SaaS subscription (per club)
- optional: club-member payments (likely Stripe Connect)

### v2.2 Shop
- products, inventory, orders
- merch checkout + fulfillment basics

### v2.3 Partner portal real workflows
- contracts, invoices, tasks, renewals
- partner CRM-lite + reminders

### v2.4 Sport expansion
- abstraction layer for sport-specific stats/events
- templates per sport

### v2.5 Automation
- reminders (attendance, dues)
- scheduled digests
- AI-triggered suggestions with approvals
