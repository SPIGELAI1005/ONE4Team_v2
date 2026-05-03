# ONE4Team — TASKS

Legend: **NOW** / NEXT / BLOCKED / DONE

This file is the execution queue derived from `MVP_PLAN.md`, `ROADMAP.md`, and Phase 0 artifacts.

---

## NOW (top priority)

### Public club microsite — May 2026 wave (2026-05-03) — code in repo
- [x] **MICROSITE-ADMIN-001** Publication status **badges** on **`ClubPageAdmin`** (live/hidden, snapshot, draft vs published).
- [x] **MICROSITE-ADMIN-002** Live public preview **Desktop / Tablet / Mobile** viewport framing.
- [x] **MICROSITE-NAV-001** **`showInNav`** reflected in **`getEnabledPublicPages`** / resolved layout (`public-page-flex-config.ts`).
- [x] **MICROSITE-HERO-001** Config + UI: **`hero_club_color_overlay`**, **`hero_tint_strength`**; **`HeroImageTint`** `clubTintEnabled`; public **`PublicClubHero`** wired.
- [x] **MICROSITE-HOME-001** Default homepage module numeric order (join before partners; gallery last).
- [x] **MICROSITE-UX-001** (2026-05-03) Public club **contrast** (light-brand **`--club-*`** token flip, **`readableTextOnSolid`** on primary/support fills, draft empty-hint panel) + **accent hovers** on CTAs (**`public-club-cta-classes.ts`**: fill + outline patterns); wired on navbar, home, join, documents, news, contact, event detail, team detail, **`club-page-admin-live-public-preview`**. No new SQL.
- [ ] **MICROSITE-OPS-001** Operator: apply Supabase migrations **`20260502120000`** through **`20260503143000`** in filename order; run **`supabase gen types`** if needed; smoke **`/club-page-admin`**, **`/club/:slug`**, **`/club/:slug/join`**, **`?draft=1`**.

### Cookie consent + public team / import surfaces (2026-04-29) — code in repo
- [x] **COOKIE-001** Banner + privacy preference centre (`cookie-consent.tsx`), granular categories + toggles, **`one4team.cookieConsent` v2** + legacy migration.
- [x] **COOKIE-002** EN/DE **`cookieConsent`** strings; **`requestOpenCookieSettings()`** from **`@/lib/cookie-consent`** in **`landing/Footer.tsx`** (and any other callers).
- [x] **COOKIE-003** **`dialog.tsx`** z-index so preference modal stacks above footer and banner.
- [x] **COOKIE-004** (2026-05-01) Removed duplicate signed-out fixed footer from **`App.tsx`**; marketing pages use **`landing/Footer`** only; preference dialog **fixed height** so tabs do not resize the modal.
- [x] **PUBLIC-TEAM-001** Route **`/club/:clubSlug/team/:teamId`**, **`ClubTeamPage.tsx`**, migration **`20260429130000_public_club_schedule_and_team_page.sql`** (`get_public_club_team_page`, public **`activities`** read policy).
- [x] **ADMIN-IMPORT-001** Routes **`/training-plan-import`**, **`/coach-placeholders`** (admin) + **`src/lib/training-plan-import/`**; migrations **`20260426121000`**, **`20260426122000`**, optional **`20260330160000`**.
- [ ] **PUBLIC-TEAM-002** Operator: apply **`20260330160000`** (if used), **`20260426*`**, **`20260429130000`**, **`20260430173000`** in filename order on each Supabase env; **`supabase gen types`** → commit **`types.ts`** if drift.

### Reports + RBAC (2026-05-01)
- [x] **REPORTS-001** **`/reports`** admin charts (Recharts): weekly activity, coach coverage, new members, trainings by weekday/month; activity type normalization + **`.ilike`** for training KPI counts.
- [x] **RBAC-001** **`usePermissions`**: **`is_club_admin`** RPC fallback when **`club_role_assignments`** read fails; migration **`20260430173000_fix_club_role_assignments_select_policy.sql`**.
- [ ] **REPORTS-002** If env uses **`training_sessions`** as primary schedule: merge counts into reports (or document that **`activities`** must be populated).

### Production readiness — code landed (2026-03-30)
- [x] **PROD-PR-001** Migrations `20260329103000`–`20260330120000` in repo: platform admin RBAC/audit, analytics RPCs, guarded hotspot indexes, billing reconciliation, club member stats, `search_club_members_page`.
- [x] **PROD-PR-002** Members: server-paged roster + debounced RPC search (≥2 chars); club-switch state reset fix (`setMembersServerPage` / search pivot).
- [x] **PROD-PR-003** Matches + Communication keyset-style pagination; Platform Admin `log_platform_admin_action`; Health PostgREST probe; `supabase-error-message`.
- [x] **PROD-PR-004** `src/test/rls.integration.test.ts` (env-gated); Edge `request_context` correlation on co-trainer, stripe-checkout, chat-bridge, stripe-webhook.
- [x] **PROD-PR-005** CI/tooling: `npm run guardrails`, `policies:drift`, `budget:bundle`, `replay:stripe-checklist`; `.github/workflows/ci.yml`; ops templates under `ops/` (see `CHANGELOG.md` § 2026-03-30).

### Public club + production bundle (2026-03-29)
- [x] **CLUB-PWA-001** `AppHeader` `clubPublic` variant: one mobile menu; subtitle hidden `max-md`; `clubPublicMenuTop` + desktop `rightSlot` only.
- [x] **CLUB-PWA-002** `ClubPage` hero: aligned shortcut grid + `rounded-full` CTAs; Powered-by `Link` `/` + logo; EN **Trainings** label.
- [x] **CLUB-SECTIONS-001** `public_page_sections` migration + `club-public-page-sections.ts` + ClubPageAdmin toggles + ClubPage filtered sections.
- [x] **PROD-EDGE-001** Stripe webhook/checkout shared modules; migrations `20260328203000`–`20260329000000`; plan-gate + Shop + Health + observability wiring (see `CHANGELOG.md`).
- [x] **PROD-OPS-001** `k6/` scripts + `npm run k6:*`; `ops/PRODUCTION_READINESS_ARTIFACTS.md`.
- [x] **PROD-DEPLOY-001** Repo-side production-readiness deliverables: consolidated index [`ops/PRODUCTION_READINESS_EVIDENCE_LOG.md`](ops/PRODUCTION_READINESS_EVIDENCE_LOG.md); CSP deferral record [`ops/CSP_ROLLOUT.md`](ops/CSP_ROLLOUT.md); degraded-mode UX (retry + errors) on Settings, Shop, Matches. **Operator still required:** staging/prod migrations, secrets (Phase B), Section L dashboards, Section M evidence rows, `supabase functions deploy health`, k6/realtime soak — fill the evidence log and checklists.

### ONE4AI / LLM operations (2026-03-28)
- [x] **AI-HEALTH-001** Settings: AI provider connection status + Test connection via `supabase.functions.invoke("co-trainer", { body: { mode: "health", club_id } })`.
- [x] **AI-HEALTH-002** Edge: `co-trainer` health branch, `pingLlm`, `assertClubAdmin` in `_shared/llm.ts`.
- [x] **AI-CHAT-001** `CoTrainer.tsx`: stop masking failures with demo responses when backend exists; improve SSE + error surfacing; `edge-function-auth` refreshSession fallback.
- [ ] **AI-OPS-001** In each Supabase env: apply `20260328200000_club_llm_settings` (+ related `20260328*` migrations as needed), set secrets, **`supabase functions deploy co-trainer`**.

### i18n + mobile polish (2026-03-27)
- [x] **I18N-AUTH-SETTINGS** Third i18n pass on `Auth.tsx` and `Settings.tsx` (placeholders, toasts, role UI, locale-aware club settings).
- [x] **MOB-MEMBERS-SHOP** Mobile audit: Members bulk table horizontal scroll + touch targets; Shop tabs/actions and related copy.

### P12-010 Environment integrity + migration parity
- [x] **P12-010a** Apply latest incremental migrations in the active Supabase project:
  - `20260301152000_add_chat_bridge_connectors_and_events.sql`
  - `20260301164000_ensure_messages_table_exists.sql`
  - `20260301173500_add_message_attachments_and_storage.sql`
  - `20260301181500_ensure_announcements_table_exists.sql`
  - `20260305193000_member_drafts.sql`
  - `20260305204500_club_public_join_flow.sql`
  - `20260305220000_invite_join_rate_limits.sql`
  - `20260305224500_abuse_slice2_device_escalation_audit.sql`
  - `20260305231500_abuse_slice3_gateway_alert_hooks.sql`
- [x] **P12-010b** Validate `/communication` in target environment for:
  - announcements channel load
  - chat send/retry
  - attachment upload/open
  - connector save/list health
- [x] **P12-010c** Document environment matrix (local/staging/prod) and confirm each uses intended Supabase project + env vars.
- [x] **P12-010d** Run `supabase/PHASE12_VERIFY.sql` in staging + production and archive results in release notes.

### P12-030 Public club onboarding rollout validation (Session 5)
- [x] **P12-030a** Validate club-page join flow in both modes:
  - `join_approval_mode=manual` -> request lands in invites inbox
  - `join_approval_mode=auto` -> user joins directly and lands in dashboard
- [x] **P12-030b** Validate reviewer policy:
  - `join_reviewer_policy=admin_only` -> trainer cannot approve
  - `join_reviewer_policy=admin_trainer` -> trainer can approve
- [x] **P12-030c** Verify default assignment behavior from club page:
  - `join_default_role` and `join_default_team` propagate to membership.

### P12-040 Members operations stabilization (Session 5)
- [x] **P12-040a** Validate `club_member_drafts` workflow end-to-end:
  - save selected rows,
  - per-row invite send,
  - invited/draft status transitions.
- [x] **P12-040b** Validate workbook export in real admin usage:
  - template headers accepted by import parser,
  - current-members snapshot useful for club operators.

### P12-050 Members master registry + RBAC (2026-03-25)
- [x] **P12-050a** Apply migrations: `20260324120000`, `20260324140000`, `20260324201000`, `20260324210000`, `20260325220000` (order: master records → role assignments → SELECT broaden → draft `master_data` → redeem invite guardians).
- [x] **P12-050b** Members UI: tabbed master data, draft inline edit with `master_data`, bulk add expand + XLSX column merge, detail Club Card tab, larger list/draft controls.
- [x] **P12-050c** App permissions aligned with `club_role_assignments` + legacy membership roles (`permissions.ts`, hooks).
- [ ] **P12-050d** Follow-up: merge draft `master_data` into `club_member_master_records` on invite acceptance (server trigger or app); optional E2E for registry paths.
- [x] **P12-050e** Guardians UX + data path (2026-03-25): draft Safety tab (Player role only) with `__draft_guardian_membership_ids` in `master_data`; roster Safety tab guardians only for `player` role; `invite_payload.guardian_membership_ids` on draft invite; migration `20260325220000` extends `redeem_club_invite` to create `club_member_guardian_links`; non-player inline save removes ward guardian rows.

### P12-020 Abuse controls + quality gates
- [x] **P12-020a** Add first abuse-control slice for invite/join rate limiting (DB ledger + RPC enforcement + user feedback).
- [x] **P12-020a.1** Add second abuse-control slice:
  - IP/device-aware signal from request headers (DB-level),
  - escalation cooldown path for repeated blocked attempts,
  - minimal reviewer/admin abuse audit panel in invites flow.
- [x] **P12-020a.2** Add third abuse-control slice:
  - gateway heuristics and bot-score signal scoring,
  - sustained abuse alert hooks with resolve workflow,
  - reviewer alert visibility in Members invites surface.
- [x] **P12-020a.3** Add fourth abuse-control slice:
  - outbound webhook/notification integration for high-severity alerts,
  - automated escalation policies per club risk profile.
- [x] **P12-020b** Add high-risk tests for invite/onboarding/chat/save paths (unit + integration + Playwright).
  - Added: continuity E2E (`e2e/continuity.spec.ts`) and CI Phase 12 audits.
  - Remaining: authenticated join-policy/member-drafts end-to-end tests in staging data.

### P11 closure (completed in current run)
- [x] **P11-010a** Communication hub upgraded to channel-first model with reliable send state + retries + date separators.
- [x] **P11-010b** Connector settings modal + bridge health panel implemented.
- [x] **P11-010c** Attachments + in-thread search implemented.
- [x] **P11-010d** EN/DE localization completed for all new communication/bridge UI strings.
- [x] **P11-010e** Added schema-missing resilience for `messages` + `announcements` tables.

### P0-001 Project index + execution hygiene
- [x] **P0-001a** Create `PHASE0_INDEX.md` linking all Phase 0 artifacts (audits, RLS bundles, apply order, rollback, checklists).
- [x] **P0-001b** Keep `TASKS.md` updated as source-of-truth for what’s next.

### P0-010 Tenant isolation: active club context (app)
- [x] **P0-010a** Locate current “active club” mechanism (storage key, context/provider) and document it in `PHASE0_INDEX.md`.
- [x] **P0-010b** Implement/confirm **Active Club selector UI** and persistence (localStorage + user settings if present).
- [x] **P0-010c** Add a guardrail: any data-fetch hook must require an active `clubId` and return empty/loading without it.

### P0-020 Code audit: scoping correctness
- [x] **P0-020a** Audit codebase for Supabase reads/writes and ensure scoping by `club_id` (or parent key) is consistently enforced (baseline scan added: `scripts/list-supabase-tables-used.ps1`).
- [x] **P0-020b** Re-run `npm run audit:phase0` and fix any findings (currently OK).

### P0-030 Database: schema + RLS baseline
- [x] **P0-030a** Consolidate baseline schema into a clean Supabase apply bundle (see `supabase/APPLY_BUNDLE_BASELINE.sql`).
- [x] **P0-030b** Validate/align `supabase/MVP_SCHEMA_RLS.sql` with existing bundles + migrations: keep it explicitly as **DRAFT/REFERENCE** and document missing tables in `supabase/SCHEMA_STATUS.md`.
- [x] **P0-030c** Add a “seed/dev helper” to create first club + admin membership for the logged-in user (included in baseline bundle as `create_club_with_admin`).

### P0-040 RBAC baseline
- [x] **P0-040a** Define roles + permissions mapping (code map: `src/lib/permissions.ts`).
- [x] **P0-040b** Implement `hasPermission()` helper used by nav + actions (`usePermissions`).
- [x] **P0-040c** Enforce permissions server-side (RLS bundles Phase 0/1/2 + audits).

---

## NEXT (once Phase 0 is stable)

### P1-010 Invite-only onboarding
- [x] **P1-010a** Ensure Phase 1 bundles are correct and documented: `supabase/APPLY_BUNDLE_PHASE1.sql` + checklist (fixed policy arg types; added `PHASE1_INDEX.md`).
- [x] **P1-010b** Implement admin invite creation UI + copy-link flow (see `src/pages/Members.tsx`).
- [x] **P1-010c** Implement invite acceptance flow → membership activation (see `src/pages/Onboarding.tsx` + RPC `redeem_club_invite`).
- [x] **P1-010d** Implement public “request invite” form on club page (see `src/pages/ClubPage.tsx` + RPC `request_club_invite`).
- [x] **P1-010e** Implement admin inbox for invite requests (see `src/pages/Members.tsx`).

### P1-020 Phase 1 closure (local readiness)
- [x] **P1-020a** Add Phase 1 exit criteria section to `PHASE1_INDEX.md` (bundle OK, flows exist, apply order documented).
- [x] **P1-020b** Add Phase 1 “smoke script” doc for manual testing after applying SQL (admin create/revoke; public request; redeem).
- [x] **P1-020c** Ensure no legacy `is_club_admin(...::text)` calls remain in SQL bundles (search + assert).

### P2-010 Scheduling engine
- [x] **P2-010a** Add `activities` table (training/match/event) + RLS (`supabase/APPLY_BUNDLE_PHASE2.sql`).
- [x] **P2-010b** Add `activity_attendance` + RLS (`supabase/APPLY_BUNDLE_PHASE2.sql`).
- [x] **P2-010c** Implement activities list/create + RSVP UI (`src/pages/Activities.tsx`).

### P2-020 Phase 2 closure (local readiness)
- [x] **P2-020a** Add `PHASE2_INDEX.md` with apply order + exit criteria.
- [x] **P2-020b** Add Phase 2 apply checklist (`supabase/APPLY_CHECKLIST_PHASE2.md`).
- [x] **P2-020c** Ensure Phase 0 audits include the new tables (writes/selects).

### P3-010 Matches + football stats
- [x] **P3-010a** Create Phase 3 apply bundle (`supabase/APPLY_BUNDLE_PHASE3.sql`) + checklist.
- [x] **P3-010b** Add `PHASE3_INDEX.md`.
- [x] **P3-010c** Confirm Phase 3 local readiness gates are green (lint/test/build/audit) and mark PASS.

### P4-010 Manual dues tracking
- [x] **P4-010a** Create Phase 4 apply bundle (`supabase/APPLY_BUNDLE_PHASE4.sql`) + checklist.
- [x] **P4-010b** Add `PHASE4_INDEX.md`.
- [x] **P4-010c** Add Dues page + route + nav.
- [x] **P4-010d** Confirm Phase 4 local readiness gates are green (lint/test/build/audit) and mark PASS.

### P5-010 Partner portal stub
- [x] **P5-010a** Create Phase 5 apply bundle (`supabase/APPLY_BUNDLE_PHASE5.sql`) + checklist.
- [x] **P5-010b** Add `PHASE5_INDEX.md`.
- [x] **P5-010c** Add Partners placeholder page + route + nav.
- [x] **P5-010d** Confirm Phase 5 local readiness gates are green (lint/test/build/audit) and mark PASS.

### P6-010 AI copilots v1
- [x] **P6-010a** Create Phase 6 apply bundle (`supabase/APPLY_BUNDLE_PHASE6.sql`) + checklist.
- [x] **P6-010b** Add `PHASE6_INDEX.md`.
- [x] **P6-010c** Add AI hub page (Co‑Trainer + Co‑AImin) with club-scoped logging.
- [x] **P6-010d** Confirm Phase 6 local readiness gates are green (lint/test/build/audit) and mark PASS.

### P7-010 Production hardening (Supabase-independent)
- [x] **P7-010a** Add ErrorBoundary + minimal logger.
- [x] **P7-010b** Add Playwright E2E scaffold + smoke test.
- [x] **P7-010c** Wire e2e smoke into CI.
- [x] **P7-010d** Add deployment docs (`DEPLOYMENT.md`) and `PHASE7_INDEX.md`.

### P7-020 Production hardening (HOLD — needs Supabase)
- [x] **P7-020a** Add invite-request rate limits / spam controls.
- [ ] **P7-020b** Staging + prod Supabase projects and env separation.
- [ ] **P7-020c** Tenant isolation verification on staging.

### V2 execution waves (implemented in repo; rollout depends on migrations/env)
- [x] **V2-020a** Abuse controls slice 4 schema + policy automation + notification queue migration added.
- [x] **V2-030a** Billing subscription schema and pricing-page plan selection persistence added.
- [x] **V2-030b** Shop backend schema and live table wiring added (with fallback mode if schema missing).
- [x] **V2-040a** Partner workflows schema added (contracts, invoices, tasks) and Partners page upgraded with tabs.
- [x] **V2-050a** Multi-sport abstraction baseline added (`sports.ts` + Teams sport catalog selection).
- [x] **V2-060a** AI server-first generation path enabled via edge invocation with deterministic fallback.
- [x] **V2-060b** Automation schema baseline added with manual queue trigger on AI page.
- [x] **V2-070a** Pitch planner foundation migrations added:
  - `club_pitches` + `pitch_bookings`,
  - RLS policies for member visibility and admin/trainer management.
- [x] **V2-070b** Pitch split and booking reconfirmation schema added:
  - `parent_pitch_id`,
  - reconfirmation status/request metadata.
- [x] **V2-070c** Club property layers and typed map elements added:
  - `club_property_layers`,
  - `club_pitches.layer_id` and `club_pitches.element_type`.
- [x] **V2-070d** Per-element map color persistence added:
  - `club_pitches.display_color`.
- [x] **V2-070e** Teams create/edit element modal UX optimized for large forms:
  - scrollable properties window with fixed footer actions,
  - collapsible color section to reduce vertical clutter.
- [x] **V2-070f** App-wide dropdown system migration completed:
  - remaining native `<select>` elements replaced with Shadcn `Select` across `src/`.
- [x] **V2-070g** Responsive dropdown rhythm standardization completed:
  - compact dropdown token unified to `w-full sm:w-[180px]` + `h-9`,
  - standard form dropdown spacing and rounding aligned.
- [x] **V2-070h** Sidebar i18n polish completed (DE):
  - `Property-Ebenen`, `Veranstaltungen`.

### P8-010 Internationalization (i18n)
- [x] **P8-010a** Create `LanguageContext`, `useLanguage` hook, and `LanguageToggle` component.
- [x] **P8-010b** Create centralized translation files (`src/i18n/en.ts`, `src/i18n/de.ts`).
- [x] **P8-010c** Translate all pages and components (Landing, Auth, Pricing, Dashboard, Members, etc.).
- [x] **P8-010d** Add browser language auto-detection with localStorage persistence.
- [x] **P8-010e** Translate animated football background chat bubbles (player, coach, supporter, ref phrases).

### P8-020 Public pages
- [x] **P8-020a** Create Features page (`/features`) with feature showcase, use cases, and CTA.
- [x] **P8-020b** Create Clubs & Partners page (`/clubs-and-partners`) with TSV Allach 09 and Sportecke München.
- [x] **P8-020c** Integrate partner images with custom green/blue chrome gradients.
- [x] **P8-020d** Create About page (`/about`).
- [x] **P8-020e** Create translated Pricing page (`/pricing`) with comparison table.

### P8-030 Theme & UX polish
- [x] **P8-030a** Add dark/light theme toggle (`ThemeContext`, `ThemeToggle`).
- [x] **P8-030b** Apply animated football background on Auth page.
- [x] **P8-030c** Add "Back" pill button on Auth page.
- [x] **P8-030d** Add Test Mode Banner (dismissible, translated, all pages).
- [x] **P8-030e** Fix flickering registration button.
- [x] **P8-030f** Rename "Watch Demo" → "Find out More" linked to Features page.

### P8-040 Deployment readiness & bug fixes
- [x] **P8-040a** Create `vercel.json` with SPA rewrite rules.
- [x] **P8-040b** Fix dashboard sidebar missing routes (partners, schedule, messages).
- [x] **P8-040c** Add `RequireAuth` with loading state to all protected routes.
- [x] **P8-040d** Remove inline "Please sign in" fallbacks from 13 pages.
- [x] **P8-040e** Translate NotFound (404) page.
- [x] **P8-040f** Fix `DEPLOYMENT.md` env var name mismatch.
- [x] **P8-040g** Verify production build (`vite build`) succeeds.

### P9-010 Dashboard pages: Shop, Club Page Admin, Settings
- [x] **P9-010a** Add EN + DE translation keys for Shop, ClubPageAdmin, and Settings pages (`shopPage`, `clubPageAdmin`, `settingsPage`).
- [x] **P9-010b** Create Shop page (`/shop`) with Products/Orders/Categories tabs, product cards, modal forms, demo data.
- [x] **P9-010c** Create Club Page Admin (`/club-page-admin`) with General Info, Branding, Contact, Social Links, SEO sections.
- [x] **P9-010d** Create Settings page (`/settings`) with Profile/Club/Notifications/Account tabs.
- [x] **P9-010e** Add routes in `App.tsx`, sidebar routes + `pathToId` in `DashboardSidebar.tsx`.

### P9-020 Dashboard UX improvements
- [x] **P9-020a** Personalize dashboard greeting with user's first name from `profiles.display_name`.

### P10-010 Legal pages & compliance
- [x] **P10-010a** Create Terms of Service page (`/terms`) with 14 sections, German law compliant.
- [x] **P10-010b** Create Privacy Policy page (`/privacy`) with 11 sections, DSGVO/GDPR compliant.
- [x] **P10-010c** Create Impressum page (`/impressum`) with 8 numbered sections per Section 5 TMG.
- [x] **P10-010d** Add EN + DE translations for all legal content.
- [x] **P10-010e** Add routes in `App.tsx` for `/terms`, `/privacy`, `/impressum`.

### P10-020 Cookie Consent & Footer
- [x] **P10-020a** Create GDPR-compliant Cookie Consent Banner component.
- [x] **P10-020b** Update Footer with legal navigation links.
- [x] **P10-020c** Add X.com and email social icons to Footer.

### P10-030 Deployment fixes
- [x] **P10-030a** Fix blank page on Vercel (Supabase client handles missing env vars gracefully).
- [x] **P10-030b** Add explicit `framework`, `buildCommand`, `outputDirectory` to `vercel.json`.

---

## QUALITY / DELIVERY
- [x] **Q-001** Add CI workflow: lint + test + build + `audit:phase0`.
- [ ] **Q-002** Add/extend Supabase apply checklists + rollback notes for the full Phase 0/1/2/3 set.

---

## BLOCKED
- **Applying Supabase bundles** requires you to run SQL in the Supabase Dashboard (unless we set up CLI/service access).
