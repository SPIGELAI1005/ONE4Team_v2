# ONE4Team — Memory Bank

Last updated: 2026-07-05 (public messaging forward/share, microsite polish, Sommerfest mobile refinements)

## Purpose
Persistent handoff context for future agents so work can continue without re-discovery.

## Current Product State
- **Public club messaging — forward + embedded UX (2026-07-05):** Embedded Communication modal — readable chat input (**`clubEmbeddedLightInput*`** classes); **Forward** per message via **`message-forward-button.tsx`** (WhatsApp / native share / copy) with header **`Message forwarded from ONE4Team - {club}`** + From/Team lines (**`share-utils.ts`**). Dropdown **`z-[80]`** above modal. CTA **Open Messages** / **Nachrichten öffnen**. See **`CHANGELOG.md`** § **2026-07-05 (Public messaging…)**.
- **Public club microsite polish (2026-07-05):** Team detail mobile CTA dedupe; announcement delete hover contrast; news section symmetric **`max-w-6xl`** container; DE **AI 4 T** home title. See **`CHANGELOG.md`** same section.
- **Sommerfest 2026 mobile hero (2026-07-05):** Tournament hero — mobile **club logo** + circular live pulse (**`.sommerfest-hero-logo-live-wrap`**); desktop poster unchanged; pitch filters 5-column grid on mobile. See **`CHANGELOG.md`** same section.
- **Sommerfest 2026 tournament UX — public page (2026-07-05):** **`/club/:slug/tournament/sommerfest-2026`** — hero poster full-height flush-right + **Share tournament** (**`sommerfest-share-button.tsx`**); **live backlight** on poster left edge when **`hasSommerfestLiveMatches()`** or festival in progress (**`sommerfest-live-pulse.ts`**). Board: 5 KPIs incl. **Goals**, high-contrast live red UI, **team logos** on cards (**`sommerfestSlotSideLogos`**), mobile bottom live bar; Messages FAB compact/lifted when live bar open. See **`CHANGELOG.md`** § **2026-07-05 (Sommerfest tournament UX…)**.
- **Public club AI 4 T RBAC (2026-07-05):** **`public-club-ai-role.ts`** — role → guide prompts, agent tab gate, context scope; modal + embed use role; **`co-trainer`** Edge resolves role server-side (**`ai4team_scope.ts`**). Deploy **`co-trainer`** for prod. Tests: **`public-club-ai-role.test.ts`**. See **`CHANGELOG.md`** § **2026-07-05**.
- **Public match detail fix (2026-07-05):** **`public-club-match-detail-page.tsx`** — `enabled` declared before SEO `useEffect` (TDZ crash fix).
- **Member invite UX — public club flow (2026-07-03):** Invite emails and copy links open **`/club/{slug}?invite=TOKEN`**. **`PublicClubMemberInviteAcceptModal`** auto-opens with **`preview_club_invite`** RPC; Edge **`complete-club-invite-signup`** confirms user without Supabase confirmation email, redeems invite, sends Resend welcome email. Post-join congratulations with **View club page** / **Open dashboard**. Migrations **`20260731230000`**, **`20260731240000`**. See **`CHANGELOG.md`** § **2026-07-03**.
- **Dashboard club page return (2026-07-03):** **`DashboardTopBar`** **Club page** link uses active membership or **`sessionStorage`** return context (**`public-club-return.ts`**) when a logged-in user browses a public club then opens dashboard without club membership. See **`CHANGELOG.md`** § **2026-07-03**.
- **Club-branded social + iOS (2026-07-03):** Vercel **`middleware.ts`** + **`api/club-social-preview.ts`** serve club OG tags to crawlers (WhatsApp, etc.); **`apple-touch-icon`** from club logo. Refresh Facebook Sharing Debugger cache after deploy. See **`CHANGELOG.md`** § **2026-07-03**.
- **Sommerfest banner animation (2026-07-03):** **`PublicSommerfestTournamentBanner`** uses **`.sommerfest-public-banner`** CSS (gradient, sweep, accent line, icon pulse); live/festival variants; **`prefers-reduced-motion`**. See **`CHANGELOG.md`** § **2026-07-03**.
- **Dashboard nav fix (2026-07-03):** Sidebar persona routes no longer all redirect to **`/dashboard/club_admin`**. See commit **`02aabbc`**.
- **AI 4 T pilot UX — Phase 4.2 (2026-07-01):** Persona-scoped **`buildClubContext()`** (`staff` / `player` / `member` / `public` + team IDs + `?team=`). **Agent tab hidden** for player/member (`canUseClubAgentWorkflows` + gate role in **`AiAgentProvider`**). **`Ai4tPersonaHint`**, follow-up chips, thread trim (`prepareChatMessagesForApi`), mapped Edge errors (DE/EN + Settings link). Public modal: guide role can/cannot, team filter in embed. History: intent/status filters. **`Ai4tAdminUsageCard`** on club admin dashboard (`get_club_ai_usage_stats`, 7d). Partner **`buildPartnerAiContext()`**. Ops SQL + **`docs/AI4T_RELEASE_REVIEW.md`**; **`e2e/ai4t-smoke.spec.ts`** (skipped until auth fixtures). **`TASKS.md` AI4T-P4-002**. Pilot metrics **AI4T-PILOT-001**–**005** still open.
- **AI 4 T Agent composer — dark mode (2026-07-01):** **`Ai4tChatComposer`** `variant="dashboard"` + `frameless` in **`AiAgentWorkspace`** — theme tokens (`bg-card`, `border-border`) instead of public-embed white styling; compact public modal footer uses `bg-background/90`.
- **Sommerfest banner fix (2026-07-01):** **`sommerfestBannerMatchStats()`** only counts completed/in-progress after kickoff; generic subtitle before tournament day; republish no longer overwrites **`status`** on existing rows (**`tsv-allach-sommerfest-competition.ts`**). Tests: **`sommerfest-live-pulse.test.ts`**.
- **Copy polish — em dash removal (2026-07-01):** UI strings reformulated EN/DE (`i18n`), marketplace/supplier copy, **`ai-4-t-role-prompts.ts`**; placeholder `"—"` → `"-"` in components; marketing pages aligned.
- **Persona data scoping — player / member (2026-07-01):** **`useModuleGateRole`** drives message and task visibility in **`Communication.tsx`**, **`Tasks.tsx`**, **`public-club-messages-hub.tsx`** (not raw **`isAdmin`**). **Player:** team-scoped messages + own tasks only. **Member:** club-wide messages (Announcements + Club General, no team channels); club-wide dashboard upcoming (events only via **`fetchClubWideDashboardUpcoming`**); no payments in sidebar. Lib: **`club-message-access.ts`**, **`club-task-access.ts`**, **`use-club-tasks.ts`**, **`use-user-team-ids.ts`** (players + coaches). Dual-role users must switch persona in Settings. See **`CHANGELOG.md`** § **2026-07-01 (Persona data scoping…)**.
- **Public club Live Scores UI (2026-07-01):** Home section card matches **Reports** typography — **`liveScoresTitle`** + description; CTA right on desktop. **`public-club-live-scores-section.tsx`**. See **`CHANGELOG.md`** same section.
- **Partner / supplier portal (2026-07-01):** Dual-world routing — club URLs vs **`/partner-*`** + **`/supplier-page`**. **`PersonaPortalGate`** + **`useModuleGateRole`** enforce portal side. **Partner Page** admin at **`/supplier-page`** (parity with **`/club-page-admin`**); sidebar label **Partner Page**; hidden for **club_admin** persona. Partner AI at **`/partner-ai`** with **`PartnerAiAgentWorkspace`** (no club training workflows). Settings persona switch via **`switch-dashboard-persona.ts`**. Marketplace provider portal + club hub; migrations **`20260731120000`**–**`20260731220000`**. Docs: **`docs/rbac-dashboard-plan.md`**, **`docs/marketplace-implementation-plan.md`**. See **`CHANGELOG.md`** § **2026-07-01 (Partner portal…)**.
- **Marketing site refresh (2026-07-01):** Home, **Features**, **About**, **Clubs & Partners**, **Pricing** EN/DE copy updated (public microsites, Sommerfest, tasks, integrated AI, TSV Allach pilot). **Features** **AI-Powered Innovation** hero: portrait intro video (`Ai4TIntroLogoVideo`), glass logo assets, viewport play + last-frame hold, side-by-side layout all breakpoints, **`glass-card`** light/dark theming, **`max-w-6xl`** aligned with AI feature cards. **`BrandedText ai4tOnly`:** plain ONE4Team, red **4** only in **AI 4 T**. Early Bird pricing deadline **13 Dec 2026**. See **`CHANGELOG.md`** § **2026-07-01**.
- **Public club polish (2026-07-01):** Club **favicon** upsert in `PublicClubDocumentHead`. **Match opponent logos** — Berlin-day fixture link, lookup map, dedupe, UI shared helpers. Public **Shop**, **Reports**, **Live scores** routes + sections. **TSV Allach JAKO shop** catalog + migrations **`20260730120000`**–**`20260730140000`**. Admin **`OpponentLogoField`** on **`/matches`**. See **`CHANGELOG.md`** § **2026-07-01**.
- **Member payments + fee packages (2026-06-30):** Admin **`/payments`** — define **membership packages** (`membership_fee_types`: currency, categories, price components, notes) and **payment lines** per member (`payments`). **Fee Types** tab: packages table + **annual summary** (membership vs shared levy; Sonderumlage from components or standalone levy package). **Record payment** supports **multiple packages** per member; **bulk assign**; multi-select package filter; in-page Record/Bulk buttons. Migrations **`20260728120000`**–**`20260728140000`**. Lib: **`membership-fee-packages.ts`**, **`member-payments.ts`**. **`PlayerProfile`** links to payments. See **`CHANGELOG.md`** § **2026-06-30**.
- **Club invite email (2026-06-30):** Resend delivery via Edge **`send-club-invite-email`**; **`Members.tsx`** send/resend/create invite; secrets **`RESEND_*`**, **`PUBLIC_SITE_URL`**, **`EDGE_ALLOWED_ORIGINS`**. Operator checklist: **`docs/PRODUCTION_RELEASE_CHECKLIST.md`**. See **`CHANGELOG.md`** § **2026-06-30**.
- **Members ops + club member card (2026-06-28):** **`/members`** search UX hardened (no focus loss on refetch; aligned search icon); saved-list + roster search match badges; draft save resolves rows outside first 500 via **`resolveDraftById`**; success toasts. **Team assignment** from **`/members`** and **`/teams`** via **`team_players`** / **`team_coaches`** (**`member-team-assignments.ts`**, **`member-team-assignment-field.tsx`**). **Club Card** tab shows club **`logo_url`**, role, team, date of birth; **AI 4 T** logo on **Generate club ID**; PNG export via **`club-pass-capture.ts`** (image inlining + decoration hide for html2canvas). Header clipping / empty card stretch fixes in **`master-data-tabs.tsx`**. **`/teams`** team search filter. Dashboard header **AI 4 T Agent** button (**`Ai4TLogo`**). Repair migrations **`20260725140000`** (`list_club_membership_emails`), **`20260725150000`** (`images-avatars` bucket). See **`CHANGELOG.md`** § **2026-06-28**.
- **Communication hub + public Messages (2026-06-25):** **`PublicClubMessagesHub`** on club microsite (Updates/Channels, announcement detail, Communication modal embed). Team-scoped message RLS + notification fan-out. Announcement moderation (edit/delete, orphan notification cleanup). Tasks module **`/tasks`** with **`club_tasks`** + dashboard summary. See **`CHANGELOG.md`** § **2026-06-25**.
- **Training attendance overview (2026-06-25):** RSVP cards show team stats + who is coming/not coming; **1-hour training cutoff**; roster-only RSVP; member self-RSVP migration **`20260725130000`**. White glass **Can't make it** dialog on public club. Messages FAB moves above toasts. Lib: **`training-attendance-overview.tsx`**, **`isMemberInvitedToActivity`**, **`supabase-error.ts`**.
- **WhatsApp bridge setup (backlog):** Operator guide **`docs/backlog/WHATSAPP_EXTERNAL_BRIDGE_SETUP.md`** — Business API only (no personal QR); Meta webhook GET verify still TODO (**BRIDGE-WA-001**).
- **Sommerfest 2026 tournament (2026-06-27, UX 2026-07-05):** TSV Allach cup **`Sommerfest 2026`** — 22 fixtures synced to **`matches`** with notes **`tsv-sommerfest-2026:mXX`**. Admin **`/matches`**: publish/sync, score updates (kick-off / full time). Public **`/club/:slug/tournament/sommerfest-2026`**: live board (20s poll), category filters, team logos, goals KPI, high-contrast live UI, mobile bottom live bar, hero share + live glow. Pulsating **Live tournament board** CTA from **11 Jul 2026**. Lib: **`tsv-allach-sommerfest-competition.ts`**, **`tsv-allach-sommerfest-match-sync.ts`**, **`sommerfest-live-pulse.ts`**. See **`CHANGELOG.md`** § **2026-06-27**, § **2026-07-05**.
- **TSV Allach membership application (2026-06-27):** Multi-step join form mirroring [onlineanmeldung](https://www.tsvallach09.de/onlineanmeldung) — personal, address, player data, membership, SEPA/consents. **`application_payload`** on **`club_invite_requests`**; migration **`20260628120000_club_invite_application_payload.sql`**. Role pills + styled form on **`/club/:slug/join`** when **`isTsvAllachClub()`**. Components: **`tsv-allach-membership-application-form.tsx`**, **`tsv-allach-membership-application.ts`**.
- **Football camp events (2026-06-27):** **`events`** camp metadata + **`import_key`** — migration **`20260627120000_club_events_camp_fields.sql`**; admin templates in **`Events.tsx`**; seed **`supabase/scripts/seed_tsv_allach_football_camps.sql`**.
- **TSV Allach public content (2026-06-27):** Curated news/events/matches helpers (**`tsv-allach-public-*`**, **`youth-team-label.ts`**, **`public-club-friendly-teams.ts`**); news carousel/card components.
- **Public club UX polish (2026-06-27):** Mobile hero CTA order (team filter → next training → AI 4 T → dashboard); uniform full-width buttons; **Contact** removed from header nav (footer only); **AI 4 T analysis** label in match analysis modal. Fixes: **`PublicClubContactPage`** import in **`App.tsx`**; **`cn`** on schedule page.
- **Training attendance (2026-06-24):** Members RSVP to trainings/matches via **`activity_attendance`** (`confirmed` / `declined` + `notes` for absence reason). **Dashboard `/activities`:** polished RSVP UI, decline dialog with presets, trainer roster sheet (team-scoped via **`team_players`**), attendance summary bar. **Public club:** same flows on **Next up**, **schedule**, **matches**, and home **matches preview** for signed-in members (`PublicClubAttendanceRsvp`, `PublicClubAttendanceProvider`, `resolvePublicClubRsvpActivityId`). Anonymous users see sign-in prompt. See **`CHANGELOG.md`** § **2026-06-24**.
- **Public club home team filter (2026-06-24):** Hero **View teams** dropdown sets **`?team=`** filter; home modules (Next up, stats, featured teams, matches) scope to selected team; schedule/matches links preserve param. **`PublicClubHeroTeamFilter`**, **`homeTeamFilterId`** in **`public-club-context`**.
- **AI 4 T pilot Phases 1–4 (2026-06-24, code complete):** Golden context tests + manual harness; chat **Sources:** line; **`ai_message_feedback`**; richer club context; DE-first replies; agent shortcuts + outcome links; **`duplicate_training_week`** + team-scoped training RBAC; public club **AI 4 T modal** (Chat | Agent | Guide); club AI instructions + usage stats. Migrations **`20260624120000`**–**`20260626120000`**. Pilot success metrics **AI4T-PILOT-001**–**005** still open. Docs: **`docs/AI4T_ROADMAP.md`**, **`docs/AI4T_GOLDEN_QUESTIONS.md`**, **`docs/AI4T_PILOT_SUCCESS_METRICS.md`**. See **`TASKS.md`** AI4T-P* items.
- **AI 4 T Agent (2026-06-15):** Club-scoped **propose → confirm → execute** workflows via Edge **`ai4team-agent`** and Postgres RPCs. Six intents: create/cancel training, plan training week, notify trainers, add member draft, send club announcement. **`ai_agent_runs`** audit table; migrations **`20260615120000`**–**`20260615150000`**. Co-Trainer **3 tabs** (Chat | Agent | History). **Contextual entry:** `AiAgentProvider` in **`DashboardLayout`**, Sparkles header button + **`AiAgentSheet`** on Teams/Members/Activities; pages register context via **`use-register-ai-agent-context`**. **Voice:** Web Speech STT/TTS in Chat/Agent (`use-ai4team-voice`, **`Ai4TeamVoiceControls`**). **NL interpret:** **`ai4team_agent_interpret.ts`** maps natural language to workflow intents. Chat **`/agent`** slash commands. Co-Trainer UX: **Bot** agent icon, theme-aware tab pills, intro modal without logo on dashboard, chat watermark light-mode-only. See **`CHANGELOG.md`** § **2026-06-15** and **`docs/AI4TEAM_AGENT_IMPLEMENTATION_PLAN.md`**.
- **AI 4 T rebrand + trials + scope (2026-06-14):** Product name **AI 4 T** (was ONE4AI) across i18n and UI; public page section **`ai4team`** with legacy **`one4ai`** read. **`club_feature_trials`** migration **`20260614140000`** grants time-boxed **`ai`** / **`shop`** access — checked in **`plan_entitlements.ts`** before subscription plan map; client **`club-feature-trials.ts`** + **`use-plan-guard`**. **`ai4team_scope.ts`** enforces club-only fair use in **`co-trainer`**, **`co-aimin`**, **`ai-match-analysis`** (heuristic + system prompt). Support & FAQ expanded with user-facing answers (no Supabase jargon). Operator script **`supabase/scripts/fix_tsv_allach_ai_access.sql`** for Allach pilot clubs. See **`CHANGELOG.md`** § **2026-06-14 (AI 4 T rebrand…)**.
- **Financial reporting (2026-06-14):** Admin **`FinancialSummary`** on dashboard; full **`FinancialReportPanel`** at **`/reports?section=financial`**. Data from **`payments`**, **`membership_dues`**, **`shop_orders`**, **`club_expenses`** via **`club-financial-snapshot.ts`**. Migration **`20260614120000_club_expenses.sql`** — apply per env; admin CRUD for expenses; net = collected − costs. Outstanding KPI shows € amount with overdue badge.
- **Admin dashboard live ops (2026-06-14):** **`club-dashboard-snapshot.ts`** feeds admin KPIs, upcoming schedule, club setup card (name, category, address, public page status, teams/members, links to **`/club/:slug`** and **`/club-page-admin`**). **`dashboard-section-visibility.ts`** — admin dashboard emphasizes finances/ops + **AI 4 T** weekly digest; trainer/player keep sports widgets (analytics, season progression, achievements); sponsor minimal.
- **German Mitgliederliste import (2026-06):** **`german-mitgliederliste-import.ts`** + tests; **`Members.tsx`** bulk/registry paths; Option B matches drafts; pending-import KPI; email normalization and duplicate detection across full import batch.
- **Dashboard responsiveness (2026-06):** **`dashboard-page-shell.ts`** shared tokens; many pages aligned (**`Members`**, **`Teams`**, **`DashboardContent`**, etc.).
- **Icon system (2026-06):** Lucide-based notification types, achievement badges, season awards, event badges — no emoji chips on dashboard chrome.
- **Public club microsite — admin + layout (2026-05-02 / 2026-05-03):** **`ClubPageAdmin`** status strip uses **badges** for site visibility (live vs hidden), published snapshot vs never published, and draft in sync vs unpublished changes. **Live public preview** supports **Desktop / Tablet / Mobile** viewport framing (`club-page-admin-live-public-preview.tsx`). **`public-page-flex-config.ts`:** each nav page has **`showInNav`**; **`getEnabledPublicPages`** only lists routes that are enabled **and** shown in nav (matches admin “Show in navigation”). **Homepage default sort** uses spaced orders (10–90) so marketing order stays Stats → Next up → News → Teams → Events → Matches → Join → Partners with gallery last (`club-page-settings-helpers.ts`, `DEFAULT_HOMEPAGE_ORDERS`). **Hero branding:** published/draft JSON **`assets.hero_club_color_overlay`** and **`assets.hero_tint_strength`** (0–1); **`PublicClubHero`**, **`HeroImageTint`** (`clubTintEnabled` turns off club-color duotone; neutral readability gradient remains). **Join requests v2:** migration **`20260503143000_public_join_request_flow_v2.sql`** (and related **`2026050212*`–`2026050312*`** microsite migrations) — apply in filename order; **`Members`** admin review path and **`/club/:slug/join`** public form as implemented in branch. Regenerate **`src/integrations/supabase/types.ts`** after apply if RPCs/columns drift.
- **Public club microsite — UI polish (2026-05-03, client-only):** **`club-theme-provider`** adjusts tokens when club secondary/tertiary are very light so foreground/muted/outline controls stay AA-friendly. **`readableTextOnSolid`** on primary/support **Buttons** and key pills. Shared **`public-club-cta-classes.ts`** maps primary/outline hovers to app **`accent`** (crimson), consistent with **`button-variants`** outline behavior. Touched: navbar, home, join, documents, news, contact, event detail, team detail, admin live preview. See **`CHANGELOG.md`** § **2026-05-03 (Public club microsite — UI polish)**.
- **Reports / club KPI dashboard (2026-05-01):** Route **`/reports`** maps to **`PlayerStats.tsx`**. For **admin** persona: **Recharts** cards — weekly club activity (trainings / matches / events, last 12 weeks, Monday week start via **`date-fns`**), **coach coverage** (teams with vs without **`team_coaches`**), **new active members** per week, **trainings by weekday** and **by month**. Activity rows are categorized with a **normalized `type`** (handles casing and common aliases). Snapshot KPI “trainings next 14d” uses **`.ilike("type","training")`** on **`activities`**. Charts are empty when there is genuinely no data in range (e.g. no teams / no **`activities`** rows); **next:** optionally merge **`training_sessions`** if that table is the primary schedule source in some envs.
- **RBAC / admin route access (2026-04-30):** **`usePermissions`** falls back to **`is_club_admin`** RPC when **`club_role_assignments`** select fails, so **`RequireAdmin`** routes do not bounce to player incorrectly. Migration **`20260430173000_fix_club_role_assignments_select_policy.sql`** hardens the SELECT policy with **named** `is_member_of_club` args. Cookie consent helpers live in **`src/lib/cookie-consent.ts`** (keeps **`cookie-consent.tsx`** react-refresh clean).
- **Marketing footer UX (2026-05-01):** Removed the **duplicate** signed-out **fixed** footer from **`App.tsx`** (text-only bar); marketing pages keep **`src/components/landing/Footer.tsx`** (logo + legal + **Cookie settings**). Copyright line **left-aligned** in that footer.
- **Cookie consent + privacy preference centre (2026-04-29):** `CookieConsent` (`src/components/ui/cookie-consent.tsx`) — bottom **banner** (Accept all / Reject non-essential / Cookie settings) plus **dialog** “privacy preference centre” with tabs: overview (**Your privacy**), strictly necessary (always on), functional / analytics / marketing with **Switch** toggles. Persistence: **`localStorage` key `one4team.cookieConsent`**, schema **`{ v: 2, preferences, savedAt }`**; migrates legacy **`{ level: "all" | "essential" }`**. **`requestOpenCookieSettings()`** dispatches **`one4team:open-cookie-settings`** (from **`landing/Footer.tsx`** and any caller importing **`@/lib/cookie-consent`**). Full **EN/DE** copy under **`t.cookieConsent`** in **`src/i18n/en.ts`** / **`de.ts`** (em dash removed from cookie strings per product copy pass). **`Dialog` overlay/content z-index** raised in **`src/components/ui/dialog.tsx`** so modals stack above the cookie banner (`z-[100]`). Preference dialog uses **fixed height** `h-[min(90vh,720px)]` so tab switches do not resize the modal.
- **Public club team page + schedule reads (2026-04):** Route **`/club/:clubSlug/team/:teamId`** → **`ClubTeamPage.tsx`** (lazy in **`App.tsx`**). Migration **`20260429130000_public_club_schedule_and_team_page.sql`**: broadened **`activities`** SELECT for **`anon`** when club **`is_public`**, optional guarded policy on **`training_sessions`** if table exists, **`get_public_club_team_page(slug, team_id)`** security-definer JSON for roster/schedule without exposing full profile rows to anonymous clients. **`ClubPage.tsx`** links into team cards as applicable; regenerate **`src/integrations/supabase/types.ts`** after apply.
- **Coach placeholders + pitch/import keys (2026-04):** Migrations **`20260426121000_coach_placeholders_and_team_coaches_polymorphic.sql`**, **`20260426122000_activity_pitch_booking_link_and_import_keys.sql`** — polymorphic team coaches, activity–pitch booking linkage, import keys as designed in filenames. Admin UI: **`/coach-placeholders`** → **`CoachPlaceholderResolution.tsx`** ( **`RequireAdmin`** ).
- **Training plan import (2026-04):** Route **`/training-plan-import`** → **`TrainingPlanImport.tsx`** (admin); supporting model/helpers under **`src/lib/training-plan-import/`**. Apply migrations and ship Edge/backend only if/when import persistence is tied to Supabase.
- **Public page sections / AI 4 T messaging (2026-04):** Migration **`20260330160000_public_page_sections_matches_messages_one4ai.sql`** (legacy filename; section id in app is **`ai4team`** — confirm filename order relative to other `20260330*` files before apply).
- App is in post-Phase-12 local implementation with major onboarding/member operations upgrades completed in code.
- **Public club page (`/club/:slug`) (2026-03-29):** `AppHeader` supports **`variant="clubPublic"`** — on **mobile (`max-md`)** one hamburger opens a **unified menu** (section jumps + Open dashboard/Request invite from `clubPublicMenuTop`, then auth user blocks, language, theme, sign-out). **Header subtitle** (long club description) is **hidden on mobile** for this variant. **Hero:** shortcut row and main CTAs share a **`max-w-md`** column; shortcuts use **`max-md` grid** + tight **`gap-1`**; CTAs and shortcuts use **`rounded-full`**. **“Powered by ONE4Team”** links to **`/`** with a **small logo** beneath. **EN** hero label **`trainingSchedule`** = **“Trainings”**. Section visibility from **`clubs.public_page_sections`** (`20260329000000`) + `src/lib/club-public-page-sections.ts`; **ClubPageAdmin** edits toggles; **ClubPage** filters nav/sections. See **`CHANGELOG.md` § 2026-03-29** for file-level detail.
- **Stripe / shop / RLS / Edge (2026-03-29):** New migrations **`20260328203000`**–**`20260329000000`** (webhook idempotency, billing fields, RLS helper fix, Edge LLM rate limit, shop images + orders entitlement, clubs contact/SEO columns, public page sections). Edge **`_shared`:** `cors`, `edge_guard`, `plan_entitlements`, `stripe_checkout_prices`, `stripe_webhook_claim`; **`stripe-checkout`** / **`stripe-webhook`** and LLM functions updated. Client: **`plan-gate`** / **`use-plan-guard`** loading behavior, **`Shop`** + **`shop-product-images`**, **`.env.example`** Stripe vars, **`Health`**, optional **`SupportFaq`** route, **`observability`** wiring in **`main`**. Ops: **`ops/PRODUCTION_READINESS_ARTIFACTS.md`**, **`k6/`** + **`npm run k6:*`**. Apply migrations in order; deploy affected Edge functions; set **`EDGE_ALLOWED_ORIGINS`**, **`STRIPE_*`** secrets per **`PRODUCTION_READINESS_ARTIFACTS`**.
- **Production readiness wave (2026-03-30):** Migrations **`20260329103000`** through **`20260330120000`** — platform admin RBAC (`is_platform_admin` / `platform_admins`), analytics RPCs (head-to-head, batch chemistry/heatmap, player stats aggregate, season awards + player radar), `is_member_of_club` arg-order fix in analytics, **guarded** hotspot composite indexes (**apply full** `20260329132000_hotspot_composite_indexes.sql` only), billing reconciliation, `get_club_member_stats`, platform admin audit (`log_platform_admin_action`), **`search_club_members_page`** for full-club roster search. App: **`Members.tsx`** server paging + debounced search (≥2 chars), club-switch reset fix; **`Matches.tsx`** / **`Communication.tsx`** keyset pagination; **`PlatformAdmin.tsx`** audit on load; **`Health.tsx`** PostgREST root probe; **`supabase-error-message`**. Tests: **`src/test/rls.integration.test.ts`** (JWT env-gated). Edge: **`request_context.ts`** correlation logging on **`co-trainer`**, **`stripe-checkout`**, **`chat-bridge`**, **`stripe-webhook`**. Tooling: **`npm run guardrails`**, **`policies:drift`**, **`budget:bundle`**, **`replay:stripe-checklist`**; **`.github/workflows/ci.yml`**. Ops docs: tenant/privileged/fan-out templates, index/EXPLAIN/hotspot migration notes, realtime soak, Section L/M checklists, CSP + Wave3, game-day drill log, monthly cost/perf review, Stripe webhook backlog runbook (T-034). Staged load: **`k6 run k6/staged-dashboard-reads.js`**. See **`CHANGELOG.md` § 2026-03-30**.
- **AI 4 T / LLM (2026-03-28, rebranded 2026-06-14):** `club_llm_settings` (`20260328200000`) stores per-club provider/model/API key; edge `resolveLlmCredentials` prefers club row, else `OPENAI_API_KEY` / `OPENAI_MODEL` secrets. `co-trainer` supports `mode: "health"` for admins (`pingLlm`, `assertClubAdmin`). `CoTrainer.tsx` surfaces real errors; scope guardrails via **`ai4team_scope.ts`**. Settings **AI provider** card shows connection status + Test connection. Apply migrations `20260328100000`–`20260328200000` + **`20260614140000_club_feature_trials.sql`**; deploy **`co-trainer`**, **`co-aimin`**, **`ai-match-analysis`** after scope/trial changes.
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
49. `20260614120000_club_expenses.sql` — club cost entries for admin financial P&L (`CHANGELOG.md` § 2026-06-14)
50. `20260614140000_club_feature_trials.sql` — time-boxed **`ai`** / **`shop`** trials; seeds Allach pilot (`CHANGELOG.md` § 2026-06-14 AI 4 T)
51. `20260615120000_ai_agent_runs.sql` — AI 4 T Agent audit + proposal lifecycle (`CHANGELOG.md` § 2026-06-15)
52. `20260624120000_club_public_feature_flags_rpc.sql` — public club feature RPCs (`CHANGELOG.md` § 2026-06-24)
53. `20260624180000_club_page_multilingual_feature.sql` — multilingual public club pages (`CHANGELOG.md` § 2026-06-24)
54. `20260624190000_ai_message_feedback.sql` — AI message thumbs feedback (`CHANGELOG.md` § 2026-06-24)
55. `20260625120000_ai_agent_team_training_scope.sql` — team-scoped agent training RBAC (`CHANGELOG.md` § 2026-06-24)
56. `20260626120000_ai4t_duplicate_week_club_ai_stats.sql` — duplicate week RPC + AI usage stats (`CHANGELOG.md` § 2026-06-24)
57. `20260627120000_club_events_camp_fields.sql` — football camp metadata + `import_key` on `events` (`CHANGELOG.md` § 2026-06-27)
58. `20260628120000_club_invite_application_payload.sql` — structured membership `application_payload` + extended join RPCs (`CHANGELOG.md` § 2026-06-27)
59. `20260615130000_ai_agent_tool_rpcs.sql` — `agent_create_training`, `agent_cancel_training`
60. `20260615140000_ai_agent_runs_conversation_id.sql` — link runs to `ai_conversations`
61. `20260615150000_ai_agent_tool_rpcs_extended.sql` — `agent_create_member_draft`, `agent_send_club_announcement`
62. `20260725140000_repair_list_club_membership_emails.sql` — repair RPC for member email listing (`CHANGELOG.md` § 2026-06-28)
63. `20260725150000_repair_images_avatars_bucket.sql` — repair `images-avatars` storage bucket + RLS (`CHANGELOG.md` § 2026-06-28)
64. `20260728120000_repair_membership_fee_types_and_payments.sql` through `20260728140000_membership_fee_types_package_fields.sql` — payments packages (`CHANGELOG.md` § 2026-06-30)
65. `20260730120000_shop_products_import_key.sql` — shop product import keys (`CHANGELOG.md` § 2026-07-01)
66. `20260730130000_tsv_allach_jako_shop_images.sql` — TSV Allach JAKO shop images (`CHANGELOG.md` § 2026-07-01)
67. `20260730140000_tsv_allach_club_contact_address.sql` — TSV Allach club contact address (`CHANGELOG.md` § 2026-07-01)
68. `20260731120000_partner_task_engagements.sql` through `20260731220000_repair_marketplace_provider_images_bucket.sql` — partner portal, marketplace provider profiles, supplier scope, image bucket (`CHANGELOG.md` § 2026-07-01 Partner portal)
69. `20260731230000_preview_club_invite.sql` — invite token preview for public accept modal (`CHANGELOG.md` § 2026-07-03)
70. `20260731240000_get_auth_user_id_by_email.sql` — invite signup helper (`CHANGELOG.md` § 2026-07-03)

Also ensure previously listed communication migrations remain applied in the same project:
- `20260301152000_add_chat_bridge_connectors_and_events.sql`
- `20260301164000_ensure_messages_table_exists.sql`
- `20260301173500_add_message_attachments_and_storage.sql`
- `20260301181500_ensure_announcements_table_exists.sql`

## Known Operational Risk
- Most regressions seen recently come from migration/environment drift rather than frontend code defects.
- If behavior mismatches local code expectations, verify app env vars point to the same Supabase project where all required migrations are applied.

## Suggested Next Implementation Steps
- **Member invite smoke:** Apply **`20260731230000`**, **`20260731240000`**; deploy **`complete-club-invite-signup`**; smoke **`/club/tsv-allach-09?invite=…`** end-to-end; verify Resend welcome email (**`DEPLOY-EMAIL-001-PROD`**).
- **Social previews:** After Vercel deploy, set **`VITE_PUBLIC_SITE_URL`**; refresh WhatsApp/Facebook cache via Sharing Debugger; confirm club admin **`og_image_url`** + PNG favicon in Club Page Admin.
- **Sommerfest banner:** Smoke animation on TSV Allach club page; verify **`prefers-reduced-motion`** disables motion.
- **AI 4 T pilot (manual):** Golden questions on TSV Allach trainer account; negative-feedback SQL weekly; agent smoke (plan week / cancel / notify); one coach interview for weekly AI habit — see **`docs/AI4T_RELEASE_REVIEW.md`** and **`docs/AI4T_GOLDEN_QUESTIONS.md`**.
- **Persona RBAC smoke:** Complete **`RBAC-PERSONA-SMOKE`** — dual-role account switches Player vs Member; verify messages, tasks, dashboard upcoming (`TASKS.md`).
- **Sprint exit:** Complete **\*-SMOKE** rows in **`TASKS.md` → SPRINT 2026-07-01**; **`DEPLOY-EMAIL-001-PROD`** (Resend domain).
- **Members club card:** Optional sequential club ID server validation; i18n for hardcoded Club Card field labels (EN/DE).
- **Members team assignment:** Sync **`team_players`** when draft converts to active member on invite accept (if not already on redeem path).
- **TSV Allach Sommerfest:** Apply **`20260627120000`**, **`20260628120000`**; admin publish 22 matches; smoke public tournament board during event window (11–12 Jul 2026); verify live score updates propagate within poll interval.
- **Membership application:** Smoke **`/club/tsv-allach-09/join`** end-to-end; confirm **`application_payload`** visible in admin join review; optional admin UI to render structured fields from JSON.
- **AI 4 T Agent:** Apply migrations **`20260615120000`**–**`20260615150000`**; deploy **`ai4team-agent`**; smoke Agent tab (create training propose → confirm), header Sparkles on Teams/Members, Chat **`/agent`** commands; optional E2E for idempotency and permission denial paths.
- **AI 4 T:** Apply **`20260614140000_club_feature_trials.sql`**; deploy **`co-trainer`**, **`co-aimin`**, **`ai-match-analysis`**; smoke **`/co-trainer`** for Pro/trial clubs; narrow Allach seed to single slug if only **`tsv-allach-09`** should receive pilot (migration uses **`%allach%`** pattern).
- **Financial:** Apply **`20260614120000_club_expenses.sql`** in each Supabase env; smoke **`/dashboard/admin`**, **`/reports?section=financial`**, add expense, export CSV; optional overdue-member drill-down on Financial tab.
- **Members import:** Second batch save if >500 drafts in one CSV pass; consider raising draft list fetch cap for display vs count query.
- **Deploy bundle (2026-03-30):** Apply migrations 24–42 above in filename order in each Supabase env; deploy Edge functions touched by Stripe/LLM/chat changes (**`stripe-checkout`**, **`stripe-webhook`**, **`co-trainer`**, **`chat-bridge`** as applicable); complete **`ops/PRODUCTION_READINESS_ARTIFACTS.md`** rows; optional policy name drift check: generate **`ops/pg_policies.snapshot.txt`** from staging then **`PG_POLICIES_SNAPSHOT_FILE=ops/pg_policies.snapshot.txt npm run policies:drift`** (see script header); **`npm run k6:smoke`** and **`k6 run k6/staged-dashboard-reads.js`** on staging if k6 installed. Include **47** when applying April–May RBAC fix.
- **Public club:** Optional E2E for `/club/:slug` hash navigation + mobile menu; confirm **`?draft=1`** admin preview path still matches RLS expectations; SSR/meta for public routes remains a follow-up if SEO hardening is required.
- **Members:** On member join from draft, merge `club_member_drafts.master_data` into `club_member_master_records` (server trigger or app flow); optional photo upload to storage instead of URL-only.
- **Club card:** Persist `club_pass_generated_at` / internal ID server-side validation if clubs require sequential IDs. *(PNG export + header layout shipped 2026-06-28 — see `CHANGELOG.md` § 2026-06-28.)*
- **RLS audit:** Revisit policies that still key only on `club_memberships.role` where assignment-based admins need parity.
- Add production workers/dispatch for:
  - abuse notification event delivery,
  - automation run execution lifecycle.
- Harden Stripe integration:
  - webhook event ingestion and idempotency handling,
  - entitlement transitions tied to billing state.
- Expand authenticated E2E coverage for new v2 flows (shop/partners/billing/automation) and **Members** registry + drafts.
