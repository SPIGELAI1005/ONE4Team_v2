# ONE4Team (clubhub-connect) — Project Status

Last updated: 2026-03-01 (Session 4, Europe/Berlin)

## Summary
The project is **beyond Phase 10** and now includes a significantly expanded operations layer:
- channel-based communication hub with bridge connector foundation (WhatsApp/Telegram),
- reliable chat send/retry UX, attachments, and search,
- professional member import/invite workflows (Excel/CSV + validation),
- enhanced club-page branding studio and public club experience.

The main remaining blockers are still **environment consistency + infrastructure rollout**:
apply all required Supabase migrations/bundles in the same active project, then complete staging/prod separation and abuse controls.

## Current Release Snapshot
Go-live readiness checklist (one-screen):

- [ ] **DB bundles/migrations:** Baseline bundles applied and incremental communication migrations applied:
  - `20260301152000_add_chat_bridge_connectors_and_events.sql`
  - `20260301164000_ensure_messages_table_exists.sql`
  - `20260301173500_add_message_attachments_and_storage.sql`
  - `20260301181500_ensure_announcements_table_exists.sql`
- [ ] **Environment variables:** app points to the intended Supabase project (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`) in each environment (local/staging/prod).
- [ ] **Core smoke tests:** auth, onboarding/invite, members, settings save, club page admin save, and club public page preview pass.
- [ ] **Communication checks:** announcements load, chat send/retry works, attachments upload/open works, connector save/list works, no missing-table schema errors.
- [ ] **Build/quality gates:** `npm run lint`, `npm test`, and `npm run build` pass in CI for target release branch.

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
- Invite-request rate limiting / abuse controls
- True end-to-end golden path e2e with real auth + data

## Recommended next actions
1) In the active Supabase project, apply missing bundles + incremental migrations listed in `HOLD.md`.
2) Verify `/communication` end-to-end after apply (announcements, messages, attachments, bridge connectors).
3) Set up staging/prod Supabase + Vercel env separation and validate tenant isolation on staging.
4) Implement invite-request abuse controls/rate limiting.
5) Move AI from deterministic local output to server-side model calls with audit trail preservation.
6) Replace Shop demo/local state with real tables (`products`, `orders`, `categories`).
7) Expand meaningful unit/integration/E2E coverage for invite, onboarding, chat, and save flows.

## Repo
- GitHub: https://github.com/SPIGELAI1005/ONE4Team_v2
- Local path: `C:\Users\georg\ONE4Team_v2\ONE4Team_v2`
