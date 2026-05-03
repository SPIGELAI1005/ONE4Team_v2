# ONE4Team (clubhub-connect) — Project Status

Last updated: 2026-05-03 (public club microsite admin + migrations wave, documentation sync)

## Summary
The project is **beyond Phase 12 local implementation scope** and now includes a significantly expanded operations layer:
- channel-based communication hub with bridge connector foundation (WhatsApp/Telegram),
- reliable chat send/retry UX, attachments, and search,
- professional member import/invite workflows (Excel/CSV + validation),
- enhanced club-page branding studio and public club experience,
- authenticated public club-page join flow with configurable approval/reviewer policy,
- Phase 12 rollout guardrails (verification SQL, env matrix, validation matrix, go/no-go checklist, CI audit gate).
- **Members (2026-03-25):** `club_member_master_records` + draft `master_data`, club role assignments, tabbed registry UI, XLSX import/export, Club Card tab, broadened SELECT RLS, guardian linking (player-only on roster; Player-role drafts get Safety-tab guardians + invite payload); redeem migration `20260325220000` (see `CHANGELOG.md`).
- **UX/i18n (2026-03-27):** Auth and Settings strings consolidated in EN/DE; Members bulk table and Shop flows improved for small screens (horizontal scroll, touch targets). See `CHANGELOG.md` § 2026-03-27.
- **ONE4AI / LLM (2026-03-28):** Per-club AI configuration (`club_llm_settings`), reliable chat error handling in `CoTrainer.tsx`, session refresh for edge calls, Settings **AI provider** card with connection status + `invoke("co-trainer")` health check. Edge: `co-trainer` `mode: "health"`, `pingLlm`, `assertClubAdmin`. Apply migrations `20260328100000`–`20260328200000` (see `CHANGELOG.md` § 2026-03-28) and deploy `co-trainer` in each environment.
- **Public club + PWA-style chrome (2026-03-29):** `/club/:slug` uses **`AppHeader` `variant="clubPublic"`** — single mobile menu, description hidden in header on small screens, hero shortcut grid aligned with CTAs, **Powered by** link + logo to `/`. Configurable sections via **`public_page_sections`** + admin UI. See `CHANGELOG.md` § 2026-03-29.
- **Billing / shop / Edge hardening (2026-03-29):** Migrations **`20260328203000`–`20260329000000`** (Stripe webhook idempotency, subscription fields, RLS helper fixes, Edge LLM rate limit, shop images & order entitlements, club contact/SEO columns). Shared Edge modules for CORS, guards, Stripe prices, webhook claims. Client plan-gate loading fixes, Shop image parsing, `.env.example` updates. Load-test scripts **`k6/`** and **`ops/PRODUCTION_READINESS_ARTIFACTS.md`**. Apply and deploy per `MEMORY_BANK.md` migration list 24–31.
- **Production readiness implementation (2026-03-30):** Migrations **`20260329103000`** through **`20260330120000`** — platform admin RBAC and audit, analytics RPC batch, player stats/season awards/radar, hotspot indexes (guarded migration file), billing reconciliation, club member stats, **`search_club_members_page`**. Client: Members server paging + search, keyset pagination on Matches and Communication, Platform Admin audit RPC, Health PostgREST probe, `supabase-error-message`. **`src/test/rls.integration.test.ts`** for env-gated RLS checks. CI: **`guardrails`**, **`policies:drift`**, **`budget:bundle`**, workflow updates. Edge correlation logging via **`request_context.ts`**. Ops templates and runbooks under **`ops/`** (see **`CHANGELOG.md` § 2026-03-30**). Apply migrations 32–42 in order per `MEMORY_BANK.md`.
- **Cookie UX + compliance copy (2026-04-29):** Granular cookie **banner** and **privacy preference centre** (category tabs, toggles, EN/DE `cookieConsent` strings), **`localStorage` v2** consent object, footer shortcuts to reopen settings. **`CHANGELOG.md` § 2026-04-29** and **`MEMORY_BANK.md`**.
- **Public club team surface (2026-04):** **`/club/:clubSlug/team/:teamId`** with **`get_public_club_team_page`** + RLS for public **`activities`** reads; migrations **`20260426*`**, **`20260429130000`** — apply in filename order with types regeneration. Admin: **`/training-plan-import`**, **`/coach-placeholders`**.
- **Reports / club management KPIs (2026-05-01):** **`/reports`** (**`PlayerStats.tsx`**) for admins: **Recharts** — weekly activity (trainings / matches / events), coach coverage (teams with/without **`team_coaches`**), new members trend, trainings by weekday and month; resilient **`activities.type`** normalization and **`.ilike`** for KPI counts. See **`CHANGELOG.md` § 2026-05-01**.
- **RBAC fix (2026-04-30):** **`usePermissions`** uses **`is_club_admin`** RPC fallback when role-assignment reads fail; migration **`20260430173000_fix_club_role_assignments_select_policy.sql`** for safer **`club_role_assignments`** SELECT policy.
- **Marketing UX (2026-05-01):** Duplicate signed-out fixed footer removed from **`App.tsx`**; single marketing footer in **`landing/Footer.tsx`** with left-aligned copyright and **Cookie settings**.
- **Public club microsite — admin UX + config (2026-05-03):** **`ClubPageAdmin`** publication **badges** (live/hidden, snapshot, draft vs live). **Live preview** **Desktop / Tablet / Mobile** width presets. **`showInNav`** honored in **`getEnabledPublicPages`** (`public-page-flex-config.ts`). **Hero** persisted **`hero_club_color_overlay`** + **`hero_tint_strength`** in page config JSON; admin slider/switch; public hero + **`HeroImageTint`** `clubTintEnabled`. **Homepage** default module order aligned (join before partners strip). **Supabase:** migrations **`20260502120000`** … **`20260503143000`** (draft/publish, visibility, privacy, schedule/matches/events, documents/join/contact, publish RPCs, join v2) — operator applies in filename order; see **`CHANGELOG.md` § 2026-05-03** and **`MEMORY_BANK.md`** migration **48**.

Phase 12 release closure is complete: migration parity, verification SQL, validation matrix, and governance sign-off are recorded.

## Current Release Snapshot
Go-live readiness checklist (one-screen):
- Evidence artifact: `RELEASE_NOTES_PHASE12.md`
- Governance gate log: `GOVERNANCE_MONTHLY_GATES.md`

- [x] **DB bundles/migrations:** Baseline bundles applied and incremental migrations applied:
  - `20260301152000_add_chat_bridge_connectors_and_events.sql`
  - `20260301164000_ensure_messages_table_exists.sql`
  - `20260301173500_add_message_attachments_and_storage.sql`
  - `20260301181500_ensure_announcements_table_exists.sql`
  - `20260305193000_member_drafts.sql`
  - `20260305204500_club_public_join_flow.sql`
  - `20260305220000_invite_join_rate_limits.sql`
  - `20260305224500_abuse_slice2_device_escalation_audit.sql`
  - `20260305231500_abuse_slice3_gateway_alert_hooks.sql`
  - `20260319190000_abuse_slice4_notifications.sql`
  - `20260319191500_v21_v22_billing_shop.sql`
  - `20260319193000_v23_partner_workflows.sql`
  - `20260319194500_v24_v25_multisport_automation.sql`
  - `20260319212000_pitch_planner_and_bookings.sql`
  - `20260319220000_pitch_split_and_confirmation.sql`
  - `20260319231500_club_property_layers_and_elements.sql`
  - `20260319233000_club_pitches_display_color.sql`
  - `20260324120000_club_member_master_records.sql`
  - `20260324140000_club_role_assignments.sql`
  - `20260324201000_club_member_master_records_select_broaden.sql`
  - `20260324210000_club_member_drafts_master_data.sql`
  - `20260328100000_club_invites_ensure_invite_payload.sql`
  - `20260328133000_club_member_audit_events.sql`
  - `20260328150000_club_member_audit_draft_timeline.sql`
  - `20260328180000_ai_conversations.sql`
  - `20260328200000_club_llm_settings.sql`
  - `20260328203000_stripe_webhook_idempotency.sql` through `20260329000000_club_public_page_sections.sql` (see `CHANGELOG.md` § 2026-03-29; apply in filename order)
  - `20260329103000_platform_admin_rbac.sql` through `20260330120000_search_club_members_page.sql` (see `CHANGELOG.md` § 2026-03-30; apply in filename order; use full `20260329132000` file for hotspot indexes)
- [x] **Environment variables:** app points to the intended Supabase project (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`) in each environment (local/staging/prod). For ONE4AI platform fallback, set Supabase secrets `OPENAI_API_KEY` (and optional `OPENAI_MODEL`) and deploy `co-trainer`. Stripe: follow `.env.example` + `ops/PRODUCTION_READINESS_ARTIFACTS.md` for publishable key and Edge `STRIPE_*` secrets.
- [x] **Core smoke tests:** auth, onboarding/invite, members, settings save, club page admin save, and club public page preview pass.
- [x] **Communication checks:** announcements load, chat send/retry works, attachments upload/open works, connector save/list works, no missing-table schema errors.
- [x] **Build/quality gates:** `npm run lint`, `npm test`, `npm run build`, `npm run audit:phase12`, `npm run guardrails`, `npm run budget:bundle`, and continuity e2e pass in CI for target release branch (`policies:drift` is a no-op in CI unless `PG_POLICIES_SNAPSHOT_FILE` is set).

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

### Reports & analytics (2026-05-01)
- **Reports** (`/reports`): Admin-oriented club health and scheduling KPIs with charts (**Recharts**); extends existing player stats / filters for trainer/player personas.

### Legal & Compliance (2026-02-14, Session 3)
- **Terms of Service** (`/terms`): 14-section AGB, German law compliant (TMG, BGB, GDPR)
- **Privacy Policy** (`/privacy`): 11-section DSGVO/GDPR-compliant policy
- **Impressum** (`/impressum`): 8-section German legal notice per Section 5 TMG
- **Cookie consent (updated 2026-04-29 / 2026-05-01):** Banner + **privacy preference centre** dialog (necessary / functional / analytics / marketing), Accept all / Reject non-essential, **`one4team.cookieConsent` v2** in localStorage, EN/DE copy; **Cookie settings** on marketing **`Footer`** opens the dialog (duplicate signed-out footer bar removed)
- **Footer**: Legal links, X.com social icon, email contact icon
- **Deployment fix**: Supabase client handles missing env vars gracefully (no more blank page on Vercel)

### Communication, bridge foundation, and resilience (2026-03-01)
- **Communication page** (`/communication`) upgraded to a channel-first model:
  - Announcements channel
  - Club general chat
  - Team-specific chat channels
- **Bridge backend skeleton wired**:
  - Edge Function: `supabase/functions/chat-bridge/`
  - Tables: `chat_bridge_connectors`, `chat_bridge_events`
  - In-app connector settings modal + health panel
- **Reliable send UX**:
  - optimistic `sending` state
  - `failed` state + retry
  - date separators in chat timeline
- **Attachments + search**:
  - file attachments with signed URLs
  - message search by sender/content
- **Schema-missing resilience**:
  - explicit fallback UX when `public.messages` or `public.announcements` is missing
  - attachment-column compatibility fallback when `messages.attachments` is not yet present

### Membership operations and club branding expansion (2026-03-01)
- **Members page** bulk import flow is production-style:
  - Excel/CSV import
  - template download
  - row-level validation and issue badges
  - invite payload persistence (`team`, `age_group`, `position`)
- **Club Page Admin / public club page** upgraded:
  - richer branding (favicon, secondary/tertiary/support colors, reference images)
  - storage diagnostics with last-checked timestamp
  - preview mode support on public club page (`?preview=1`)

### Session 5 execution snapshot (2026-03-05)
- **Auth/onboarding continuity fixed**:
  - returning users now resume dashboard context after login,
  - onboarding is skipped for existing memberships (except invite/forced flows),
  - role/club local state keys normalized and user-scoped.
- **Members workflow upgraded**:
  - save-first member drafts before invite send,
  - per-member invite send from saved list,
  - expanded member import workbook output (template + current snapshot).
- **Public club-page join model expanded**:
  - manual vs auto join approval per club,
  - reviewer policy toggle (admin-only vs admin+trainer),
  - default role/team assignment for incoming members from public club page.
- **UX/polish delivered**:
  - Club Page Admin form input focus stability fix,
  - unauth footer visibility and legal/nav branding improvements,
  - invite modal copy + design consistency.

### Session 6 rollout enablement snapshot (2026-03-06)
- Added fail-fast rollout artifacts:
  - `supabase/PHASE12_VERIFY.sql`,
  - `supabase/APPLY_CHECKLIST_PHASE12.md`,
  - `ENVIRONMENT_MATRIX.md`,
  - `PHASE12_VALIDATION_MATRIX.md`,
  - `PHASE12_GO_NO_GO_CHECKLIST.md`.
- Added CI-enforced Phase 12 guardrail:
  - `scripts/audit-phase12.cjs`,
  - workflow step `Phase 12 audits`.
- Added continuity hardening for auth redirects:
  - protected routes now preserve `returnTo`,
  - auth login honors sanitized `returnTo`,
  - public join request flow sends unauth users to auth with return context.
- Added continuity Playwright coverage:
  - `e2e/continuity.spec.ts` validates deep-link context retention.

### Session 7 product copy snapshot (2026-03-05)
- Pricing promo countdown deadline moved to April 10 (`2026-04-10T23:59:59`) and synchronized with EN/DE banner copy.
- Live check confirmed promo countdown is rendering and ticking correctly on `/pricing`.
- German About copy standardized:
  - hero line updated to "Sportvereine",
  - all remaining `Hobbyverein`/`Hobbyvereine` instances replaced with `Sportverein`/`Sportvereine`,
  - dash punctuation removed from the DE hero second line.

### Execution waves 2–6 snapshot (2026-03-19)
- Added abuse-control slice 4 migration package:
  - endpoint registry, escalation policy table, and notification queue/events.
- Added commercial core schema and runtime wiring:
  - billing subscriptions/events,
  - shop categories/products/orders with RLS and order-total trigger,
  - pricing plan selection persistence for authenticated club context.
- Upgraded partner module from contact cards to workflow-ready tabs:
  - contracts, invoices, tasks (schema + UI load/create paths).
- Added multi-sport baseline:
  - shared sports catalog helper and Teams sport-id normalization.
- Added automation + AI operational layer:
  - automation rules/runs schema and queue RPC,
  - server-first AI generation via new `co-aimin` edge function with deterministic fallback.

### Session 8 property planner + Teams UX snapshot (2026-03-19)
- Added pitch/property planner schema baseline:
  - `club_pitches` and `pitch_bookings` tables with RLS and update triggers.
- Extended planner workflow:
  - pitch split hierarchy (`parent_pitch_id`),
  - reconfirmation lifecycle fields for booking updates.
- Added club property layer and typed element model:
  - `club_property_layers` with admin-managed creation,
  - `club_pitches.layer_id` and `club_pitches.element_type` for map contexts.
- Added optional per-element map color persistence:
  - `club_pitches.display_color`.
- Improved Teams element modal usability for dense layouts:
  - scrollable properties body with fixed save footer,
  - collapsible color section (collapsed-by-default) with preview swatch.

### Session 9 UI consistency + responsiveness snapshot (2026-03-19)
- Completed app-wide dropdown component migration:
  - all native `<select>` replaced with Shadcn `Select` in `src/`.
- Completed visual rhythm normalization for dropdowns:
  - standardized trigger/content/item rounding and spacing.
- Added compact-dropdown responsive token standard:
  - compact controls now follow `w-full sm:w-[180px]` with `h-9`,
  - maintains phone readability while preserving desktop alignment rhythm.
- Applied targeted i18n quality pass for sidebar navigation:
  - German labels refined for `Property-Ebenen` and `Veranstaltungen`.

### i18n status (2026-03-01)
- Full EN/DE localization expanded to include all newly added communication and bridge strings (`communicationPage` keys).
- Provider/status labels for connector UI are localized consistently.

## Current UX focus
- Full i18n (German/English) across all pages and components
- Animated football field background on landing hero and auth page
- Professional partner showcase pages with integrated images
- Trainer-first weekly workflow (schedule hub, attendance, nudge)

## HOLD / Blocked (requires Supabase / infra)
See `HOLD.md`. Remaining items are post-Phase-12 infrastructure optimization and non-blocking follow-ups.

## Recommended next actions
1) Monitor production behavior for new v2 schema surfaces (billing/shop/partners/automation) and resolve runtime drift quickly.
2) Expand authenticated golden-path E2E coverage with real env credentials for billing/shop/partner workflows.
3) Introduce Stripe webhook lifecycle handling for subscription state transitions and entitlements.
4) Add delivery workers for abuse notification events and automation run execution.
5) Continue v2 commercialization roadmap (payments hardening, partner reporting, multi-sport templates, automation safeguards).
6) Apply the **April–May 2026** migrations on each Supabase env when releasing reporting/RBAC fixes (`20260426121000`, `20260426122000`, `20260429130000`, `20260430173000`, optional `20260330160000`); extend **`/reports`** if schedule data also lives in **`training_sessions`**.

## Repo
- GitHub: https://github.com/SPIGELAI1005/ONE4Team_v2
- Local path: `C:\Users\georg\ONE4Team_v2\ONE4Team_v2`
