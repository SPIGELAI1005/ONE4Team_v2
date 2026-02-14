# ONE4Team — Roadmap (Football-first)

This roadmap is derived from the MVP epics and is designed to:
- ship a sellable football-first club management SaaS fast
- keep the data model extensible for other sports
- de-risk multi-tenancy/security early

Assumption: 1–2 devs, quality-first, weekly releases. Adjust timelines as needed.

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
