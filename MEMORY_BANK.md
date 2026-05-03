# ONE4Team — Memory Bank

Last updated: 2026-05-03 (public club microsite admin polish, hero overlay config, nav `showInNav` parity, doc sync + changelog)

## Purpose
Persistent handoff context for future agents so work can continue without re-discovery.

## Current Product State
- **Public club microsite — admin + layout (2026-05-02 / 2026-05-03):** **`ClubPageAdmin`** status strip uses **badges** for site visibility (live vs hidden), published snapshot vs never published, and draft in sync vs unpublished changes. **Live public preview** supports **Desktop / Tablet / Mobile** viewport framing (`club-page-admin-live-public-preview.tsx`). **`public-page-flex-config.ts`:** each nav page has **`showInNav`**; **`getEnabledPublicPages`** only lists routes that are enabled **and** shown in nav (matches admin “Show in navigation”). **Homepage default sort** uses spaced orders (10–90) so marketing order stays Stats → Next up → News → Teams → Events → Matches → Join → Partners with gallery last (`club-page-settings-helpers.ts`, `DEFAULT_HOMEPAGE_ORDERS`). **Hero branding:** published/draft JSON **`assets.hero_club_color_overlay`** and **`assets.hero_tint_strength`** (0–1); **`PublicClubHero`**, **`HeroImageTint`** (`clubTintEnabled` turns off club-color duotone; neutral readability gradient remains). **Join requests v2:** migration **`20260503143000_public_join_request_flow_v2.sql`** (and related **`2026050212*`–`2026050312*`** microsite migrations) — apply in filename order; **`Members`** admin review path and **`/club/:slug/join`** public form as implemented in branch. Regenerate **`src/integrations/supabase/types.ts`** after apply if RPCs/columns drift.
- **Reports / club KPI dashboard (2026-05-01):** Route **`/reports`** maps to **`PlayerStats.tsx`**. For **admin** persona: **Recharts** cards — weekly club activity (trainings / matches / events, last 12 weeks, Monday week start via **`date-fns`**), **coach coverage** (teams with vs without **`team_coaches`**), **new active members** per week, **trainings by weekday** and **by month**. Activity rows are categorized with a **normalized `type`** (handles casing and common aliases). Snapshot KPI “trainings next 14d” uses **`.ilike("type","training")`** on **`activities`**. Charts are empty when there is genuinely no data in range (e.g. no teams / no **`activities`** rows); **next:** optionally merge **`training_sessions`** if that table is the primary schedule source in some envs.
- **RBAC / admin route access (2026-04-30):** **`usePermissions`** falls back to **`is_club_admin`** RPC when **`club_role_assignments`** select fails, so **`RequireAdmin`** routes do not bounce to player incorrectly. Migration **`20260430173000_fix_club_role_assignments_select_policy.sql`** hardens the SELECT policy with **named** `is_member_of_club` args. Cookie consent helpers live in **`src/lib/cookie-consent.ts`** (keeps **`cookie-consent.tsx`** react-refresh clean).
- **Marketing footer UX (2026-05-01):** Removed the **duplicate** signed-out **fixed** footer from **`App.tsx`** (text-only bar); marketing pages keep **`src/components/landing/Footer.tsx`** (logo + legal + **Cookie settings**). Copyright line **left-aligned** in that footer.
- **Cookie consent + privacy preference centre (2026-04-29):** `CookieConsent` (`src/components/ui/cookie-consent.tsx`) — bottom **banner** (Accept all / Reject non-essential / Cookie settings) plus **dialog** “privacy preference centre” with tabs: overview (**Your privacy**), strictly necessary (always on), functional / analytics / marketing with **Switch** toggles. Persistence: **`localStorage` key `one4team.cookieConsent`**, schema **`{ v: 2, preferences, savedAt }`**; migrates legacy **`{ level: "all" | "essential" }`**. **`requestOpenCookieSettings()`** dispatches **`one4team:open-cookie-settings`** (from **`landing/Footer.tsx`** and any caller importing **`@/lib/cookie-consent`**). Full **EN/DE** copy under **`t.cookieConsent`** in **`src/i18n/en.ts`** / **`de.ts`** (em dash removed from cookie strings per product copy pass). **`Dialog` overlay/content z-index** raised in **`src/components/ui/dialog.tsx`** so modals stack above the cookie banner (`z-[100]`). Preference dialog uses **fixed height** `h-[min(90vh,720px)]` so tab switches do not resize the modal.
- **Public club team page + schedule reads (2026-04):** Route **`/club/:clubSlug/team/:teamId`** → **`ClubTeamPage.tsx`** (lazy in **`App.tsx`**). Migration **`20260429130000_public_club_schedule_and_team_page.sql`**: broadened **`activities`** SELECT for **`anon`** when club **`is_public`**, optional guarded policy on **`training_sessions`** if table exists, **`get_public_club_team_page(slug, team_id)`** security-definer JSON for roster/schedule without exposing full profile rows to anonymous clients. **`ClubPage.tsx`** links into team cards as applicable; regenerate **`src/integrations/supabase/types.ts`** after apply.
- **Coach placeholders + pitch/import keys (2026-04):** Migrations **`20260426121000_coach_placeholders_and_team_coaches_polymorphic.sql`**, **`20260426122000_activity_pitch_booking_link_and_import_keys.sql`** — polymorphic team coaches, activity–pitch booking linkage, import keys as designed in filenames. Admin UI: **`/coach-placeholders`** → **`CoachPlaceholderResolution.tsx`** ( **`RequireAdmin`** ).
- **Training plan import (2026-04):** Route **`/training-plan-import`** → **`TrainingPlanImport.tsx`** (admin); supporting model/helpers under **`src/lib/training-plan-import/`**. Apply migrations and ship Edge/backend only if/when import persistence is tied to Supabase.
- **Public page sections / ONE4AI messaging (2026-04):** Migration **`20260330160000_public_page_sections_matches_messages_one4ai.sql`** (small follow-up to public sections / matches / messages flags — confirm filename order relative to other `20260330*` files before apply).
- App is in post-Phase-12 local implementation with major onboarding/member operations upgrades completed in code.
- **Public club page (`/club/:slug`) (2026-03-29):** `AppHeader` supports **`variant="clubPublic"`** — on **mobile (`max-md`)** one hamburger opens a **unified menu** (section jumps + Open dashboard/Request invite from `clubPublicMenuTop`, then auth user blocks, language, theme, sign-out). **Header subtitle** (long club description) is **hidden on mobile** for this variant. **Hero:** shortcut row and main CTAs share a **`max-w-md`** column; shortcuts use **`max-md` grid** + tight **`gap-1`**; CTAs and shortcuts use **`rounded-full`**. **“Powered by ONE4Team”** links to **`/`** with a **small logo** beneath. **EN** hero label **`trainingSchedule`** = **“Trainings”**. Section visibility from **`clubs.public_page_sections`** (`20260329000000`) + `src/lib/club-public-page-sections.ts`; **ClubPageAdmin** edits toggles; **ClubPage** filters nav/sections. See **`CHANGELOG.md` § 2026-03-29** for file-level detail.
- **Stripe / shop / RLS / Edge (2026-03-29):** New migrations **`20260328203000`**–**`20260329000000`** (webhook idempotency, billing fields, RLS helper fix, Edge LLM rate limit, shop images + orders entitlement, clubs contact/SEO columns, public page sections). Edge **`_shared`:** `cors`, `edge_guard`, `plan_entitlements`, `stripe_checkout_prices`, `stripe_webhook_claim`; **`stripe-checkout`** / **`stripe-webhook`** and LLM functions updated. Client: **`plan-gate`** / **`use-plan-guard`** loading behavior, **`Shop`** + **`shop-product-images`**, **`.env.example`** Stripe vars, **`Health`**, optional **`SupportFaq`** route, **`observability`** wiring in **`main`**. Ops: **`ops/PRODUCTION_READINESS_ARTIFACTS.md`**, **`k6/`** + **`npm run k6:*`**. Apply migrations in order; deploy affected Edge functions; set **`EDGE_ALLOWED_ORIGINS`**, **`STRIPE_*`** secrets per **`PRODUCTION_READINESS_ARTIFACTS`**.
- **Production readiness wave (2026-03-30):** Migrations **`20260329103000`** through **`20260330120000`** — platform admin RBAC (`is_platform_admin` / `platform_admins`), analytics RPCs (head-to-head, batch chemistry/heatmap, player stats aggregate, season awards + player radar), `is_member_of_club` arg-order fix in analytics, **guarded** hotspot composite indexes (**apply full** `20260329132000_hotspot_composite_indexes.sql` only), billing reconciliation, `get_club_member_stats`, platform admin audit (`log_platform_admin_action`), **`search_club_members_page`** for full-club roster search. App: **`Members.tsx`** server paging + debounced search (≥2 chars), club-switch reset fix; **`Matches.tsx`** / **`Communication.tsx`** keyset pagination; **`PlatformAdmin.tsx`** audit on load; **`Health.tsx`** PostgREST root probe; **`supabase-error-message`**. Tests: **`src/test/rls.integration.test.ts`** (JWT env-gated). Edge: **`request_context.ts`** correlation logging on **`co-trainer`**, **`stripe-checkout`**, **`chat-bridge`**, **`stripe-webhook`**. Tooling: **`npm run guardrails`**, **`policies:drift`**, **`budget:bundle`**, **`replay:stripe-checklist`**; **`.github/workflows/ci.yml`**. Ops docs: tenant/privileged/fan-out templates, index/EXPLAIN/hotspot migration notes, realtime soak, Section L/M checklists, CSP + Wave3, game-day drill log, monthly cost/perf review, Stripe webhook backlog runbook (T-034). Staged load: **`k6 run k6/staged-dashboard-reads.js`**. See **`CHANGELOG.md` § 2026-03-30**.
- **ONE4AI / LLM (2026-03-28):** `club_llm_settings` (`20260328200000`) stores per-club provider/model/API key; edge `resolveLlmCredentials` prefers club row, else `OPENAI_API_KEY` / `OPENAI_MODEL` secrets. `co-trainer` supports `mode: "health"` for admins (`pingLlm`, `assertClubAdmin`). `CoTrainer.tsx` surfaces real errors (no silent demo when Supabase URL exists); SSE flush + stream error lines; `getEdgeFunctionAuthHeaders` uses `refreshSession` if needed. Settings AI card shows live connection status and uses `supabase.functions.invoke("co-trainer")` for checks. Apply migrations `20260328100000`, `20260328133000`, `20260328150000`, `20260328180000`, `20260328200000` in target env; deploy `co-trainer` after `llm.ts` changes.
- **i18n (2026-03-27):** Third pass on high-traffic screens: `Auth` placeholders and country labels; `Settings` toasts, role-switch copy, placeholders, and locale-aware month names; `Shop` + public `ClubPage` shop strings aligned to `shopPage` keys; `Members` registry import column label.
- **Mobile UX (2026-03-27):** Members bulk-import table uses horizontal scroll + minimum table width; larger tap targets on expand/remove; Shop tab strip scrolls on narrow widths with 44px-class targets on primary actions.
- **Members / master data (2026-03-25):**
  - `club_member_master_records` + guardian links + email listing RPCs; draft rows can store `master_data` JSON before invite.
  - **Club role assignments** (`club_role_assignments`) backfill and updated `is_club_admin` / `is_club_trainer`; legacy membership `admin` still used for some RLS write paths to avoid recursion.
  - **Members page:** tabbed registry UI (`src/components/members/master-data-tabs.tsx`) in detail panel, bulk-add expanded rows, and draft edit; eighth tab **Club Card** with ID preview and PNG download (editable contexts).
  - **RLS:** apply `20260324201000` so trainers/admins can SELECT master rows; `20260324140000` optional but recommended for assignment-based permissions consistency.
- Core UX now supports SaaS-style return behavior:
  - returning users resume dashboard context,
  - onboarding is skipped when active memberships already exist.
- Club website onboarding now supports configurable approval:
  - manual request approval,
  - auto-join,
  - reviewer policy (admin-only or admin+trainer).
- Pricing promo banner now targets April 10 with aligned EN/DE copy and verified live countdown behavior on `/pricing`.
- German brand copy standardization pass completed:
  - About hero wording now uses `Sportvereine`,
  - all known `Hobbyverein`/`Hobbyvereine` occurrences were replaced.
- Post-plan execution waves (2–6) now committed in code:
  - abuse slice 4 schema/policy automation migration,
  - billing + shop live schema and UI wiring,
  - partner workflows schema and tabbed UI,
  - multi-sport catalog baseline and team sport normalization,
  - automation schema + AI server-first generation path (with fallback).
- Property planner model now includes full map element and booking primitives:
  - pitch/element grid definitions (`club_pitches`),
  - booking records (`pitch_bookings`),
  - optional parent split relation and reconfirmation workflow fields.
- Club property mapping now supports layer contexts and typed elements:
  - layer catalog (`club_property_layers`) for training/admin/operations views,
  - element type classification and optional per-element `display_color`.
- Teams map create/edit element modal UX has been hardened for density:
  - scrollable modal body with fixed save footer,
  - color section collapses by default and expands on demand.
- Dropdown UX is now unified app-wide:
  - all native `<select>` controls in `src/` replaced by Shadcn `Select`,
  - select trigger/content/item geometry aligned for consistent visual rhythm.
- Compact filter dropdown rhythm has a mobile-first standard:
  - `w-full sm:w-[180px]` + `h-9`,
  - consistent spacing behavior from phone to desktop.
- German navigation localization polish applied:
  - sidebar `Property-Ebenen` and `Veranstaltungen` labels updated.
- Phase 12 closure status:
  - Supabase migrations applied and verified in target environments,
  - validation matrix signed off,
  - go/no-go checklist completed and governance gate moved to Continue.

## Session 5 Realized Work (code complete, needs migration parity in target env)
- `ClubPageAdmin` input remount issue fixed (field typing stable).
- Auth/onboarding persistence alignment:
  - `one4team.activeRole` standardized.
  - Active club key scoped by user (`one4team.activeClubId:{userId}`).
- Footer behavior for logged-out users improved and legal links present.
- Members page reworked to save-first member drafts and per-member invite sending.
- Members workbook export upgraded to structured `.xlsx` with template + current data sheets.
- DE/EN localization expanded for updated member and onboarding flows.
- Public club page registration flow moved to authenticated, policy-aware join requests.
- Reviewer policy enforcement added to both UI and Supabase access paths.
- Abuse-control first slice implemented:
  - request limiter table + helper in Supabase,
  - rate limits enforced in `request_club_invite` and `register_club_join_request`,
  - user-facing rate-limit toast added to public club-page flow.
- Abuse-control second slice implemented:
  - device-aware signals captured from request headers (IP + user-agent fingerprint),
  - escalation cooldown path after repeated blocked attempts,
  - reviewer/admin abuse audit RPC and minimal invites-tab dashboard.
- Abuse-control third slice implemented:
  - gateway heuristics (bot-score + user-agent + country/IP signals),
  - sustained-abuse alert hooks (`abuse_alerts` + `raise_abuse_alert`),
  - reviewer alert retrieval/resolve RPCs with invites-tab alert queue UI.
- Phase 12 rollout guardrail package implemented:
  - `supabase/PHASE12_VERIFY.sql` (single verification block),
  - `supabase/APPLY_CHECKLIST_PHASE12.md`,
  - `ENVIRONMENT_MATRIX.md`,
  - `PHASE12_VALIDATION_MATRIX.md`,
  - `PHASE12_GO_NO_GO_CHECKLIST.md`.
- CI/test gate hardening implemented:
  - `scripts/audit-phase12.cjs` + `npm run audit:phase12`,
  - CI step for Phase 12 audit,
  - Playwright continuity suite `e2e/continuity.spec.ts`.
- Auth continuity hardening implemented:
  - protected route redirects preserve `returnTo`,
  - auth consumes sanitized `returnTo`,
  - club public join request flow preserves return context when redirecting to auth.

## Recently Applied Migrations In Supabase
1. `20260305193000_member_drafts.sql`
2. `20260305204500_club_public_join_flow.sql`
3. `20260305220000_invite_join_rate_limits.sql`
4. `20260305224500_abuse_slice2_device_escalation_audit.sql`
5. `20260305231500_abuse_slice3_gateway_alert_hooks.sql`
6. `20260319190000_abuse_slice4_notifications.sql`
7. `20260319191500_v21_v22_billing_shop.sql`
8. `20260319193000_v23_partner_workflows.sql`
9. `20260319194500_v24_v25_multisport_automation.sql`
10. `20260319212000_pitch_planner_and_bookings.sql`
11. `20260319220000_pitch_split_and_confirmation.sql`
12. `20260319231500_club_property_layers_and_elements.sql`
13. `20260319233000_club_pitches_display_color.sql`
14. `20260324120000_club_member_master_records.sql` (and follow-ups as listed in `CHANGELOG.md`)
15. `20260324140000_club_role_assignments.sql`
16. `20260324201000_club_member_master_records_select_broaden.sql`
17. `20260324210000_club_member_drafts_master_data.sql`
18. `20260325220000_redeem_invite_guardian_links.sql` (`redeem_club_invite` + optional `invite_payload.guardian_membership_ids`)
19. `20260328100000_club_invites_ensure_invite_payload.sql`
20. `20260328133000_club_member_audit_events.sql`
21. `20260328150000_club_member_audit_draft_timeline.sql`
22. `20260328180000_ai_conversations.sql`
23. `20260328200000_club_llm_settings.sql`
24. `20260328203000_stripe_webhook_idempotency.sql`
25. `20260328203100_billing_subscription_status_expand.sql`
26. `20260328204000_fix_rls_helper_argument_order.sql` (large RLS touch — verify in staging first)
27. `20260328205000_edge_llm_rate_limit.sql`
28. `20260328220000_shop_product_images.sql`
29. `20260328231000_shop_orders_plan_entitlement.sql`
30. `20260328232000_ensure_clubs_contact_and_seo_columns.sql`
31. `20260329000000_club_public_page_sections.sql`
32. `20260329103000_platform_admin_rbac.sql`
33. `20260329112000_head_to_head_stats_rpc.sql`
34. `20260329115000_analytics_rpc_batch.sql`
35. `20260329122000_player_stats_aggregate_rpc.sql`
36. `20260329130000_season_awards_player_radar_rpc.sql`
37. `20260329131000_fix_analytics_rpc_is_member_arg_order.sql`
38. `20260329132000_hotspot_composite_indexes.sql` (guarded `to_regclass`; apply full file)
39. `20260329133000_billing_reconciliation_rpc.sql`
40. `20260329140000_club_member_stats_rpc.sql`
41. `20260329141000_platform_admin_audit.sql`
42. `20260330120000_search_club_members_page.sql`
43. `20260330160000_public_page_sections_matches_messages_one4ai.sql` (if present in repo; order with other `20260330*` migrations)
44. `20260426121000_coach_placeholders_and_team_coaches_polymorphic.sql`
45. `20260426122000_activity_pitch_booking_link_and_import_keys.sql`
46. `20260429130000_public_club_schedule_and_team_page.sql`
47. `20260430173000_fix_club_role_assignments_select_policy.sql`
48. `20260502120000_club_public_page_draft_publish.sql` through `20260503143000_public_join_request_flow_v2.sql` (public microsite draft/publish, sections, privacy, schedule flags, join/contact/documents, extended publish/unpublish, privacy/team RPC, join request v2 — **apply in strict filename order**; see `CHANGELOG.md` § 2026-05-03)

Also ensure previously listed communication migrations remain applied in the same project:
- `20260301152000_add_chat_bridge_connectors_and_events.sql`
- `20260301164000_ensure_messages_table_exists.sql`
- `20260301173500_add_message_attachments_and_storage.sql`
- `20260301181500_ensure_announcements_table_exists.sql`

## Known Operational Risk
- Most regressions seen recently come from migration/environment drift rather than frontend code defects.
- If behavior mismatches local code expectations, verify app env vars point to the same Supabase project where all required migrations are applied.

## Suggested Next Implementation Steps
- **Reports:** If clubs store schedule only in **`training_sessions`**, extend **`/reports`** queries to union or prefer that table when **`activities`** is sparse; add “no data in range” empty states with links to **Schedule** / **Teams**.
- **Deploy bundle (2026-03-30):** Apply migrations 24–42 above in filename order in each Supabase env; deploy Edge functions touched by Stripe/LLM/chat changes (**`stripe-checkout`**, **`stripe-webhook`**, **`co-trainer`**, **`chat-bridge`** as applicable); complete **`ops/PRODUCTION_READINESS_ARTIFACTS.md`** rows; optional policy name drift check: generate **`ops/pg_policies.snapshot.txt`** from staging then **`PG_POLICIES_SNAPSHOT_FILE=ops/pg_policies.snapshot.txt npm run policies:drift`** (see script header); **`npm run k6:smoke`** and **`k6 run k6/staged-dashboard-reads.js`** on staging if k6 installed. Include **47** when applying April–May RBAC fix.
- **Public club:** Optional E2E for `/club/:slug` hash navigation + mobile menu; confirm **`?draft=1`** admin preview path still matches RLS expectations; SSR/meta for public routes remains a follow-up if SEO hardening is required.
- **Members:** On member join from draft, merge `club_member_drafts.master_data` into `club_member_master_records` (server trigger or app flow); optional photo upload to storage instead of URL-only.
- **Club card:** Persist `club_pass_generated_at` / internal ID server-side validation if clubs require sequential IDs.
- **RLS audit:** Revisit policies that still key only on `club_memberships.role` where assignment-based admins need parity.
- Add production workers/dispatch for:
  - abuse notification event delivery,
  - automation run execution lifecycle.
- Harden Stripe integration:
  - webhook event ingestion and idempotency handling,
  - entitlement transitions tied to billing state.
- Expand authenticated E2E coverage for new v2 flows (shop/partners/billing/automation) and **Members** registry + drafts.
