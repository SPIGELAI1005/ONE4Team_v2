# ONE4Team (clubhub-connect) — CHANGELOG

This log is maintained by the agent during local-first execution.
It records notable changes, features, and hardening steps.

## 2026-03-27 (i18n: Auth & Settings; mobile: Members bulk table & Shop)

### i18n (EN/DE)
- **Auth (`Auth.tsx`):** Login/signup placeholders use shared `placeholders` keys (email, password mask, club/company URLs, admin email, phone). Country selects use `onboarding.countryOptionLabels` so labels localize while stored values stay stable.
- **Settings (`Settings.tsx`):** Toasts use `common.error` plus localized fallbacks; profile role switcher and database-role hints/toasts fully keyed; display name, avatar URL, phone, and new-email placeholders localized; default language options and season-start month names follow UI language (`en` / `de`).
- **Shop / public club page:** Shop banner, demo subtitle suffix, schema-missing toast, and empty “no club” copy keyed; `ClubPage` product stock badges use `shopPage.inStock` / `outOfStock`.
- **Members:** Registry import preview table “Email” column header uses `membersPage.registryImportEmailColumn`.

### Mobile / touch / wide tables
- **Members:** Bulk-add spreadsheet table sits in a horizontal scroll container with `min-w-[900px]` so small screens scroll instead of stretching the page; expand-row and remove-row controls use larger touch targets (`min-h-11` / `min-w-11`); footer tip + save row stacks on narrow viewports.
- **Shop:** Tab row scrolls horizontally with non-wrapping labels; tabs and modal actions use `min-h-11` and `touch-manipulation` where it matters.

## 2026-03-25 (Members registry, RBAC, and UX)

### Database
- `20260324120000_club_member_master_records.sql` — `club_member_master_records`, guardian links, membership email RPCs.
- `20260324140000_club_role_assignments.sql` — scoped role assignments, backfill, `is_club_admin` / `is_club_trainer` updates (apply before relying on assignment-based admin in RLS).
- `20260324201000_club_member_master_records_select_broaden.sql` — SELECT on master records for `is_club_admin()` + legacy trainer membership (no dependency on `club_role_assignments`).
- `20260324210000_club_member_drafts_master_data.sql` — `master_data jsonb` on `club_member_drafts` for pre-invite registry fields.
- `20260325220000_redeem_invite_guardian_links.sql` — `redeem_club_invite` creates guardian links from optional `invite_payload.guardian_membership_ids`.

### App / Members (`/members`)
- Member master schema + XLSX import/export (`member-master-schema`, `member-master-xlsx`), full registry dialog, guardian linking.
- Saved draft list: inline edit, persist `master_data`, show-all drafts, larger typography for badges and actions.
- “Add members professionally”: expandable row with **More details / Less** control, tabbed master data (`MasterDataTabs`), CSV/XLSX maps extra columns into `masterData`.
- Detail panel: tabbed read-only registry + **Club Card** tab (preview, generate internal ID, download pass when not read-only); consistent sizing across tabs; section titles aligned (Identity & Participation, Performance & Achievements, Financials & Banking, etc.).
- Permissions: `club-role-assignments`, extended `permissions.ts`, `use-permissions` / `use-active-club` with assignment-aware flags.

### i18n
- EN/DE keys for drafts, master sections, club card, more/less expand labels.

### Guardians (drafts + roster, player-only) — 2026-03-25 follow-up
- **Database:** `20260325220000_redeem_invite_guardian_links.sql` — extends `redeem_club_invite` to insert `club_member_guardian_links` when `invite_payload.guardian_membership_ids` (JSON array of membership UUIDs) is present.
- **Saved member list (drafts):** Under **Safety & Emergencies**, linked guardians UI when draft **Role** is **Player**. Guardian membership IDs persist in `club_member_drafts.master_data` under `__draft_guardian_membership_ids` (stripped from tab field values via `mergeDraftMasterValuesForTabs`). Changing role away from Player clears draft guardian picks; save drops the key for non-players.
- **Invite from draft:** `invite_payload` includes `guardian_membership_ids` only for player drafts; invite **role** uses the in-editor role when that draft is open.
- **Roster (expanded member):** Same guardian block only when effective role is **Player** (saved membership or `editMemberForm.role` while inline editing). `MasterDataTabs` uses `safetyTabExtraEnabled` so the extra Safety slot is off for admin, trainer, etc.
- **Role change cleanup:** Saving inline membership edit with a non-player role deletes all `club_member_guardian_links` rows for that ward and refreshes local guardian state.

## 2026-03-19 (Phase 12 closure)
### Release closure artifacts finalized
- Completed Phase 12 evidence and decision artifacts:
  - `PHASE12_GO_NO_GO_CHECKLIST.md` (all go criteria checked),
  - `PHASE12_VALIDATION_MATRIX.md` sign-off completed,
  - `RELEASE_NOTES_PHASE12.md` set to GO with owner sign-off,
  - `ENVIRONMENT_MATRIX.md` finalized with owner-confirmed mappings,
  - `GOVERNANCE_MONTHLY_GATES.md` Week 12 moved to `Continue`.
- Updated project operational docs to reflect closure and post-Phase-12 next actions:
  - `PROJECT_STATUS.md`,
  - `TASKS.md`,
  - `MEMORY_BANK.md`.

## 2026-03-19 (Session 8)
### Property planner schema expansion
- Added migration `20260319212000_pitch_planner_and_bookings.sql`:
  - `club_pitches` (grid-based property elements),
  - `pitch_bookings` (time-boxed pitch reservations),
  - RLS policies for member read and admin/trainer management.
- Added migration `20260319220000_pitch_split_and_confirmation.sql`:
  - parent-child pitch hierarchy (`parent_pitch_id`),
  - booking reconfirmation workflow fields and indexes.
- Added migration `20260319231500_club_property_layers_and_elements.sql`:
  - `club_property_layers` for map contexts (training/admin/ops),
  - `club_pitches.layer_id` and typed element support (`element_type`).
- Added migration `20260319233000_club_pitches_display_color.sql`:
  - optional per-element color storage (`display_color`) for map rendering.

### Teams map element modal UX hardening
- Updated `src/pages/Teams.tsx` create/edit element modal to support large forms safely:
  - bounded modal height with scrollable body,
  - fixed footer action row for always-visible save action.
- Added a collapsible color section in the element modal:
  - collapsed by default,
  - inline color preview in collapsed state,
  - expandable advanced color controls (picker, hex, swatches).
- Added new EN/DE i18n keys in `src/i18n/en.ts` and `src/i18n/de.ts` for expand/collapse labels.

## 2026-03-19 (Session 9)
### Dropdown system unification (app-wide)
- Replaced all remaining native `<select>` elements in `src/` with Shadcn `Select` components.
- Updated affected pages/components so dropdown behavior and visuals are consistent in all contexts:
  - Teams, Matches, Activities, Settings, Partners, Communication, Shop,
  - Club Page Admin, Dues, Events, Payments, Player Stats,
  - Members, ClubSwitcher, and analytics Head-to-Head.
- Standardized select surface styling:
  - `SelectTrigger` and `SelectContent` rounded geometry aligned to app chrome,
  - consistent item corner styling for list readability and hover/focus rhythm.

### Responsive dropdown rhythm + compact width token pass
- Applied a compact dropdown width convention across the app:
  - compact triggers now use `h-9` and `w-full sm:w-[180px]`.
- Kept mobile-first behavior for narrow screens:
  - compact filters stack and fill available width on phones,
  - desktop/tablet keeps predictable `180px` rhythm for scanability.
- Normalized standard form dropdown rhythm:
  - standard form selects use `h-10` with consistent rounding and spacing.

### Translation polish (sidebar focus)
- Updated German navigation labels for better localization quality:
  - `sidebar.propertyLayers` -> `Property-Ebenen`,
  - `sidebar.events` -> `Veranstaltungen`.

## 2026-03-05 (Session 7)
### Pricing promo countdown + copy alignment
- Updated pricing promo countdown deadline to `2026-04-10T23:59:59` in `src/pages/Pricing.tsx`.
- Updated promo banner copy in EN and DE translations:
  - EN: "🔥 Early Bird Special: 20% OFF all plans until April 10th!"
  - DE: "... bis zum 10. April!"
- Live-verified `/pricing` countdown rendering and second-by-second ticking behavior at `http://localhost:8081/pricing`.

### About page DE wording standardization
- Updated German About hero copy from "Hobbyvereine" to "Sportvereine".
- Removed dash punctuation in the DE hero second line for cleaner sentence flow.
- Replaced all remaining `Hobbyverein`/`Hobbyvereine` occurrences with `Sportverein`/`Sportvereine` in German translations.

## 2026-03-19 (Execution Waves 2–6)
### Abuse-control slice 4 (schema + policy automation)
- Added migration `20260319190000_abuse_slice4_notifications.sql`.
- Added endpoint registry + escalation policy tables and notification event queue.
- Added helper RPCs `queue_abuse_notifications(...)` and `apply_abuse_escalation_policy(...)`.

### v2.1 Billing + v2.2 Shop operationalization
- Added migration `20260319191500_v21_v22_billing_shop.sql` with:
  - `billing_subscriptions`, `billing_events`,
  - `shop_categories`, `shop_products`, `shop_orders`,
  - RLS policies and order-total trigger.
- Updated `src/pages/Pricing.tsx` to persist selected plan/cycle to `billing_subscriptions` when user + active club are available.
- Refactored `src/pages/Shop.tsx` to load/write live Supabase shop tables with fallback mode when schema is unavailable.

### v2.3 Partner workflows
- Added migration `20260319193000_v23_partner_workflows.sql` with:
  - `partner_contracts`, `partner_invoices`, `partner_tasks` (+ RLS).
- Upgraded `src/pages/Partners.tsx` from contacts-only to tabbed workflows (Partners, Contracts, Invoices, Tasks) with create/read operations.

### v2.4 Multi-sport baseline
- Added `src/lib/sports.ts` catalog + helpers (`resolveSportId`, `resolveSportLabel`).
- Updated `src/pages/Teams.tsx` to use catalog-driven sport selection and normalized sport IDs.

### v2.5 Automation + AI server path
- Added migration `20260319194500_v24_v25_multisport_automation.sql` with:
  - `sports_catalog`, `club_sports`, `sport_stat_templates`,
  - `automation_rules`, `automation_runs`,
  - RPC `enqueue_automation_run(...)`.
- Added edge function `supabase/functions/co-aimin/index.ts`.
- Updated `src/pages/AI.tsx` to use server-first generation via edge function, keep deterministic fallback, and allow queuing digest automation runs.

## 2026-03-05 (Session 5)
### Auth + onboarding continuity hardening (SaaS resume behavior)
- Fixed login return flow so existing users with active memberships land back in dashboard context instead of being forced into onboarding every time.
- Added onboarding short-circuit for returning users (keeps invite flow and `force=1` override behavior intact).
- Standardized role persistence (`one4team.activeRole`) and removed legacy role-key drift across dashboard surfaces.
- Scoped active-club persistence by user (`one4team.activeClubId:{userId}`) to avoid cross-account club bleed on shared browsers.

### Club Page Admin UX + form stability + footer/legal polish
- Fixed `ClubPageAdmin` input blur/remount behavior by moving inline helper components to module scope.
- Added unauthenticated fixed footer behavior on auth/public pre-login pages with legal links and branded ONE4Team text styling.
- Updated auth copy and onboarding progress visuals (step-track adjustments + branded logo marker).

### Members operations upgrade (save-first invite workflow)
- Added persisted draft-member workflow:
  - save imported/manual rows first,
  - invite selected members later (individually) from saved list.
- Added migration: `20260305193000_member_drafts.sql` (`club_member_drafts` + RLS/policies).
- Improved import template export to formatted `.xlsx` with:
  - template sheet,
  - current-members snapshot sheet,
  - richer profile-oriented columns.
- Localized members roles and upload/import helper content in DE/EN.

### Club website onboarding flow (public registration with controlled approval)
- Added club-level onboarding controls in Club Page Admin:
  - join mode: manual vs auto approve,
  - reviewer policy: admin-only vs admin+trainer,
  - default role/team for new joins.
- Implemented authenticated club-page join RPC flow:
  - auto mode: immediate membership activation + dashboard redirect,
  - manual mode: join request appears for reviewers.
- Added reviewer-aware approval flow in Members invites tab:
  - trainers can review if club policy allows,
  - members tab remains admin-only.
- Added migration: `20260305204500_club_public_join_flow.sql` (columns, reviewer helper, RLS policies, join/approve RPCs).

### Create Invite modal consistency
- Updated invite modal subtitle copy to “ONE4Team: simple, clear, fast.”
- Replaced native selects with app-consistent styled Select components.

### Abuse controls slice (rate limiting)
- Added migration: `20260305220000_invite_join_rate_limits.sql`.
- Added centralized request limiter ledger (`request_rate_limits`) and helper `enforce_request_rate_limit(...)`.
- Enforced rate limits in:
  - `request_club_invite` (3 requests / 24h per club+email),
  - `register_club_join_request` (10 requests / hour per club+user).
- Added user-facing rate-limit feedback on public club page request flow (EN/DE localized).

### Abuse controls slice 2 (device signals + escalation + audit)
- Added migration: `20260305224500_abuse_slice2_device_escalation_audit.sql`.
- Upgraded limiter helper to capture request-header signals (IP + user-agent fingerprint/device key) for device-aware throttling.
- Added escalation cooldown behavior after repeated blocked attempts from the same device in 24h windows.
- Added reviewer/admin audit RPC `get_club_request_abuse_audit(...)` for minimal operational visibility.
- Added lightweight abuse overview panel in Members → Invites with last-24h totals, blocked attempts, unique identifiers/devices, and last attempt time.

### Abuse controls slice 3 (gateway heuristics + alert hooks)
- Added migration: `20260305231500_abuse_slice3_gateway_alert_hooks.sql`.
- Added sustained-abuse alert table `abuse_alerts` with reviewer RLS and status lifecycle (`open`/`resolved`).
- Extended limiter helper with gateway-aware heuristics:
  - bot-score-aware risk scoring (`x-bot-score` / `cf-bot-score`),
  - user-agent risk markers,
  - country/IP signal capture for alert metadata.
- Added alert hook function `raise_abuse_alert(...)` and reviewer RPCs:
  - `get_club_abuse_alerts(...)`,
  - `resolve_club_abuse_alert(...)`.
- Added active alert panel to Members → Invites with inline resolve action.

### Phase 12 rollout package (execution + gates)
- Added `supabase/PHASE12_VERIFY.sql` to verify required Phase 12 tables/columns/functions/policies in one pass.
- Added `supabase/APPLY_CHECKLIST_PHASE12.md` with strict apply order and fail-fast rule.
- Added `ENVIRONMENT_MATRIX.md`, `PHASE12_VALIDATION_MATRIX.md`, and `PHASE12_GO_NO_GO_CHECKLIST.md` to operationalize staging/prod rollout.
- Added `scripts/audit-phase12.cjs` + `npm run audit:phase12` and wired it into CI.
- Added continuity hardening and tests:
  - protected-route redirects preserve `returnTo`,
  - auth honors sanitized `returnTo` after login,
  - Playwright suite `e2e/continuity.spec.ts` verifies deep-link continuity.

## 2026-03-01 (Session 4)
### Communication hub overhaul (channels + bridge foundation)
- Reworked `Communication` into a channel-first experience with announcements, club general chat, and team chat channels.
- Added bridge backend skeleton integration path (Supabase Edge Function + connector/event tables) for WhatsApp/Telegram connector lifecycle.
- Added connector settings modal with provider config fields and a bridge health panel showing processed/failed counters.

### Reliable chat delivery + UX reliability
- Implemented optimistic send states (`sending`, `failed`) with in-thread retry action.
- Added date separators in message timeline and improved message rendering consistency.
- Added robust fallback behavior for schema-missing environments:
  - `public.messages` missing
  - `public.announcements` missing
  - `messages.attachments` column missing

### Attachments + search
- Added chat attachments upload flow and signed URL rendering in message bubbles.
- Added `chat-attachments` storage bucket migration + member-scoped storage RLS.
- Added in-thread message search (content + sender name).

### Members + invites hardening
- Upgraded member invite modal with professional bulk import flow (Excel/CSV), row-level validation, template download, and issue reporting.
- Added invite payload persistence (`team`, `age_group`, `position`) and redemption propagation into memberships.
- Added RPC `lookup_club_member_emails` to detect already-registered members during import.

### Club page branding + storage diagnostics
- Extended Club Page Admin with richer brand system (secondary/tertiary/support colors, favicon, reference images, uploads).
- Added live brand preview and preview-mode banner (`?preview=1`) on public club pages.
- Added in-app storage diagnostics line with live read/write/delete check + last-checked timestamp.

### New safety migrations
- Added `20260301152000_add_chat_bridge_connectors_and_events.sql`.
- Added `20260301164000_ensure_messages_table_exists.sql`.
- Added `20260301173500_add_message_attachments_and_storage.sql`.
- Added `20260301181500_ensure_announcements_table_exists.sql`.

### i18n completion for communication
- Added `communicationPage` translations in EN/DE and localized newly introduced chat/bridge strings.
- Localized provider/status UI labels for connector-related surfaces.

## 2026-02-14 (Session 3)
### Legal pages & compliance
- **Terms of Service** (`/terms`): 14-section AGB compliant with German law (TMG, BGB, GDPR). Covers scope, service description, registration, user obligations, data protection, intellectual property, availability, subscriptions, liability (Kardinalpflichten), termination, governing law (Munich jurisdiction), dispute resolution (EU ODR), and severability.
- **Privacy Policy** (`/privacy`): 11-section DSGVO/GDPR-compliant policy covering data controller, data categories, legal basis (Art. 6 GDPR), data sharing (Supabase, Vercel), cookies, retention, GDPR rights (Art. 15-21), security measures, children's privacy (Art. 8), and supervisory authority (BayLDA Ansbach).
- **Legal Notice / Impressum** (`/impressum`): Full German legal notice per Section 5 TMG with numbered sections (1-8): company info (SPIGEL AI UG), registration, VAT ID, content responsibility (Section 18(2) MStV), EU dispute resolution, liability for content/links, copyright.
- All legal pages follow the About page design language: parallax hero, glass-card sections, FadeInSection animations
- Full EN + DE translations for all legal content
- Company representative: George Neacsu, Website: https://www.one4team.com

### Cookie Consent Banner
- GDPR-compliant cookie consent banner with "Accept All" and "Essential Only" options
- Animated slide-up glass-card design on first visit
- Links to Privacy Policy for detailed information
- Consent stored in localStorage with timestamp
- Fully translated (EN/DE)

### Footer enhancements
- Added legal navigation links: Terms of Service, Privacy Policy, Legal Notice / Impressum
- Added X.com icon linking to https://x.com/CO_FE_X
- Added email icon linking to spigelai@gmail.com
- Improved layout with social icons next to logo and legal links on the right

### Deployment fix
- Fixed blank page on Vercel: Supabase client now handles missing env vars gracefully with fallback values
- Added explicit `framework`, `buildCommand`, `outputDirectory` to `vercel.json`

## 2026-02-14 (Session 2)
### New dashboard pages: Shop, Club Page Admin, Settings
- **Shop page** (`/shop`): Tabbed page with Products (grid cards, search, category filter, add/edit/delete modals), Orders (status management: pending/confirmed/shipped/delivered), and Categories management. Uses local state with demo data (Supabase tables planned for v2.2). Full CRUD for admins, browse-only for players.
- **Club Page Admin** (`/club-page-admin`): Admin tool for managing the public club page. Sections: General Info (name, slug, description, public toggle), Branding (logo, color picker, cover image), Contact Details (address, phone, email, website), Social Links (Facebook, Instagram, X/Twitter), and SEO (meta title, meta description). Reads/saves club data via Supabase.
- **Settings page** (`/settings`): Four-tab settings page. Profile (display name, avatar, phone, read-only email), Club (default language, timezone, season start month - admin only), Notifications (5 toggle switches stored in localStorage), Account (password reset via Supabase, sign out, danger zone with placeholder account deletion).
- Added routes for `/shop`, `/club-page-admin`, `/settings` inside the `DashboardLayout` route group
- Updated `DashboardSidebar` with `route` properties for shop, clubpage, and settings nav items (admin + player menus) and `pathToId` entries for active-state highlighting
- Added comprehensive EN + DE translation keys for all three pages (`shopPage`, `clubPageAdmin`, `settingsPage`)

### Dashboard greeting personalization
- Dashboard header now shows "Welcome back, {FirstName}" instead of hardcoded "Welcome back, Admin"
- First name is fetched from the user's `profiles.display_name` field (takes first word)
- Falls back to capitalized email prefix if no display name is set

## 2026-02-14
### Internationalization (i18n) — Full DE/EN support
- Added `LanguageContext` + `useLanguage` hook + `LanguageToggle` component
- Created centralized translation files (`src/i18n/en.ts`, `src/i18n/de.ts`)
- Translated all pages and components: Landing, Auth, Pricing, Dashboard, Members, etc.
- Language toggle in header (next to theme toggle) on all pages
- Browser language auto-detection with localStorage persistence

### New pages: Features, Clubs & Partners, About, Pricing
- **Features page** (`/features`): comprehensive feature showcase with club features, partner features, AI features, "Who Benefits" section, and 4 real-world use cases
- **Clubs & Partners page** (`/clubs-and-partners`): partner showcase with TSV Allach 09 (green chrome gradient) and Sportecke München (blue chrome gradient), including integrated images, testimonials, and CTA for new partners
- **Pricing page** (`/pricing`): translated pricing cards with consistent 3-line descriptions, feature comparison table, and price calculator
- **About page** (`/about`): company overview and vision

### Animated football background on Auth page
- Applied `FootballFieldAnimation` canvas animation (from hero section) as background on `/auth`
- Chat bubbles in the animation now translate to German when language is switched
- Full German phrase banks for player chat, coach instructions, supporter cheers, referee calls, set-piece labels, and goal celebrations

### Auth & navigation improvements
- "Back" pill button on Auth page linking to landing page (translated)
- `RequireAuth` route guard with loading state — all protected routes auto-redirect to `/auth`
- Removed all inline "Please sign in" fallbacks from 13 pages (centralized in route guard)
- "Watch Demo" button renamed to "Find out More" and linked to Features page

### Test Mode Banner
- Dismissible red banner under header on all app pages (Auth + Dashboard)
- Professional message informing users about beta/test mode
- "Report an Issue" mailto link
- Session-persistent dismiss (sessionStorage)
- Fully translated (EN/DE)

### Theme toggle
- Dark/light mode toggle with system preference detection
- `ThemeContext` + `useTheme` hook + `ThemeToggle` component

### Bug fixes & polish
- Fixed flickering registration button (replaced animated `bg-gradient-gold` with static `bg-gradient-gold-static`)
- Fixed blank page caused by German typographic quotes in `de.ts` string literals
- Fixed `t is not defined` error on Pricing page (missing `useLanguage` hook)
- Pricing card descriptions now always occupy 3 lines (`line-clamp-3`)
- Bespoke plan name stays "Bespoke" in German translation

### Vercel deployment readiness
- Created `vercel.json` with SPA rewrite rules for client-side routing
- Production build verified (`vite build` succeeds)
- Fixed `DEPLOYMENT.md` env var name (`VITE_SUPABASE_PUBLISHABLE_KEY`)

### Dashboard sidebar fixes
- Added missing routes: partners → `/partners`, schedule → `/activities`, messages → `/communication`
- Fixed for all roles: admin, trainer, player, sponsor, supplier, service, consultant

### 404 page translated
- NotFound page now uses i18n translations (EN/DE)

## 2026-02-13
### Trainer-first UX pass (Schedule / Dues / Partners / Dashboard / Profile)
- Schedule became the central hub:
  - Added filters (type/team/mine/past)
  - Added trainer attendance summaries per activity
  - Added trainer attendance detail drawer (confirmed/declined/unconfirmed + member lists)
  - Added "Week template" action (creates 2 trainings + 1 match, uses team filter if set)
  - Added "Nudge unconfirmed" placeholder (copies message to clipboard; real send is HOLD)
- Dues improvements:
  - Added bulk create dues for active members (with role filter)
  - Include member display names in UI and CSV export
- Partners improvements:
  - Contact-card fields (website/email/phone/notes)
  - Search across partner fields
- Dashboard improvements:
  - Added trainer "Getting started" checklist
  - Best-effort upcoming list + KPIs from DB when available (falls back safely when not)
- Player profile polish:
  - Added dues summary (due/paid) as best-effort block in Overview
- Navigation polish:
  - Trainer sidebar + mobile nav include Schedule

### Phase 7 hardening (local readiness)
- Auth redirect semantics: protected routes redirect to `/auth`.
- ErrorBoundary + minimal logger wired.
- Health/debug endpoint: `/health`.
- E2E:
  - Playwright scaffold with webServer.
  - Route smoke coverage and protected-route redirect coverage.
  - CI runs Playwright (installs browsers).
- Bundle report:
  - Added `npm run build:report` / `bundle:report`.

## Previous phases (local readiness)
- Phase 2: activities + attendance (bundle + page + audits)
- Phase 3: matches + stats (bundle + docs)
- Phase 4: manual dues (bundle + Dues page)
- Phase 5: partners stub (bundle + placeholder page)
- Phase 6: AI hub (ai_requests logging + stub copilots)

---

## HOLD (requires Supabase / infra)
See `HOLD.md`.
