# ONE4Team (clubhub-connect) — Project Status

Last updated: 2026-03-19 (Execution Waves 2–6, Europe/Berlin)

## Summary
The project is **beyond Phase 12 local implementation scope** and now includes a significantly expanded operations layer:
- channel-based communication hub with bridge connector foundation (WhatsApp/Telegram),
- reliable chat send/retry UX, attachments, and search,
- professional member import/invite workflows (Excel/CSV + validation),
- enhanced club-page branding studio and public club experience,
- authenticated public club-page join flow with configurable approval/reviewer policy,
- Phase 12 rollout guardrails (verification SQL, env matrix, validation matrix, go/no-go checklist, CI audit gate).

The main remaining blockers are still **environment consistency + infrastructure rollout**:
apply all required Supabase migrations/bundles in the same active project, complete staging/prod separation, and close release evidence/sign-off.

## Current Release Snapshot
Go-live readiness checklist (one-screen):
- Evidence artifact: `RELEASE_NOTES_PHASE12.md`
- Governance gate log: `GOVERNANCE_MONTHLY_GATES.md`

- [ ] **DB bundles/migrations:** Baseline bundles applied and incremental migrations applied:
  - `20260301152000_add_chat_bridge_connectors_and_events.sql`
  - `20260301164000_ensure_messages_table_exists.sql`
  - `20260301173500_add_message_attachments_and_storage.sql`
  - `20260301181500_ensure_announcements_table_exists.sql`
  - `20260305193000_member_drafts.sql`
  - `20260305204500_club_public_join_flow.sql`
  - `20260305220000_invite_join_rate_limits.sql`
  - `20260305224500_abuse_slice2_device_escalation_audit.sql`
  - `20260305231500_abuse_slice3_gateway_alert_hooks.sql`
- [ ] **Environment variables:** app points to the intended Supabase project (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`) in each environment (local/staging/prod).
- [ ] **Core smoke tests:** auth, onboarding/invite, members, settings save, club page admin save, and club public page preview pass.
- [ ] **Communication checks:** announcements load, chat send/retry works, attachments upload/open works, connector save/list works, no missing-table schema errors.
- [ ] **Build/quality gates:** `npm run lint`, `npm test`, `npm run build`, `npm run audit:phase12`, and continuity e2e pass in CI for target release branch.

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

### Legal & Compliance (2026-02-14, Session 3)
- **Terms of Service** (`/terms`): 14-section AGB, German law compliant (TMG, BGB, GDPR)
- **Privacy Policy** (`/privacy`): 11-section DSGVO/GDPR-compliant policy
- **Impressum** (`/impressum`): 8-section German legal notice per Section 5 TMG
- **Cookie Consent Banner**: GDPR-compliant with Accept All / Essential Only, localStorage persistence
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

### i18n status (2026-03-01)
- Full EN/DE localization expanded to include all newly added communication and bridge strings (`communicationPage` keys).
- Provider/status labels for connector UI are localized consistently.

## Current UX focus
- Full i18n (German/English) across all pages and components
- Animated football field background on landing hero and auth page
- Professional partner showcase pages with integrated images
- Trainer-first weekly workflow (schedule hub, attendance, nudge)

## HOLD / Blocked (requires Supabase / infra)
See `HOLD.md`. Key items:
- Apply Supabase SQL bundles (Baseline → Phase6)
- Apply latest incremental safety migrations (messages, announcements, chat bridge, attachments)
- Staging/prod Supabase projects + Vercel environment separation
- Phase 12 release evidence completion (`ENVIRONMENT_MATRIX.md`, verify SQL outputs, validation matrix sign-off)
- True end-to-end golden path e2e with real auth + data

## Recommended next actions
1) Apply missing migrations in active Supabase project (including Session 5 migrations listed above).
2) Verify public club join flow in both modes (manual + auto) and both reviewer policies (admin-only + admin+trainer).
3) Set up staging/prod Supabase + Vercel env separation and validate tenant isolation on staging.
4) Close Phase 12 evidence loop (fill environment matrix, archive verify SQL outputs, complete validation matrix, and record owner sign-off in release notes).
5) Implement abuse-control slice 4 (outbound notification/webhook integration and policy automation).
6) Move AI from deterministic local output to server-side model calls with audit trail preservation.
7) Replace Shop demo/local state with real tables (`products`, `orders`, `categories`).
8) Expand meaningful unit/integration/E2E coverage for invite, onboarding, chat, join-approval, and save flows.

## Repo
- GitHub: https://github.com/SPIGELAI1005/ONE4Team_v2
- Local path: `C:\Users\georg\ONE4Team_v2\ONE4Team_v2`
