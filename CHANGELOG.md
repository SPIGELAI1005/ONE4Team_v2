# ONE4Team (clubhub-connect) — CHANGELOG

This log is maintained by the agent during local-first execution.
It records notable changes, features, and hardening steps.

## 2026-08-18 — German master-data labels and club UI i18n

- **Member registry fields:** identity labels such as First name / Last name / Sex were humanized English column names even when the UI language was German. Field labels, enum values (sex, membership kind, strong foot/hand), and select options now use `membersPage.masterFieldLabels` / `masterValues`.
- **Club surfaces wired to existing DE copy:** Members roster pagination, Dues, Schedule filters, Matches create/lineup/events, Events invite, Shop club-empty state, Player Profile, Teams pitch filter and schedule-delete dialog, and the crash ErrorBoundary.
- **Coverage test:** `src/lib/member-master-i18n.test.ts` asserts every registry column has a German label distinct from English.

## 2026-08-18 — Team Ops verification · dashboard stability · release handoff

- **Dashboard crash fixed:** restored the missing `MyDuesCard` import in `DashboardContent.tsx`; the `MyDuesCard is not defined` error no longer blocks dashboard rendering.
- **Light-mode contrast:** replaced dark-theme-only pale amber/sky/violet/emerald status colors on white and tinted cards across Members, Tasks, Teams, Payments, Auth, reports, audit history, onboarding, AI notices, and test-mode UI. Light primary text now measures **4.92:1** on white; member status/role badges measure **6.46:1–7.38:1**. Dark-mode variants are preserved.
- **Members list stability:** roster scope dependencies are normalized to stable keys, stale overlapping fetches are ignored with a generation guard, hydrated rows remain visible during background refresh, and per-row opacity entrance animation was removed. This prevents RBAC/team/family hydration from appearing as repeated full-list flicker; Vite HMR still reloads the page while source files are actively edited.
- **Authenticated Playwright diagnostics:** 14 Team Ops tests ran with zero skips; 3 unauthenticated route-guard tests passed and 11 fixture-dependent scenarios failed. Primary causes are missing active-club selection, overlapping ordinary-player/dual-parent accounts, absent role assignments, and duplicate transition-time selectors—not confirmed P1 regressions.
- **Fixture evidence:** the supplied admin account can authenticate and has a guardian link to the Alexander membership in TSV Allach 09. The second account is currently a base `member` without player/trainer/parent assignments and cannot represent both negative and dual-role fixtures.
- **Staging cleanup:** four activities created in unrelated clubs during the diagnostic run were deleted; no records from that run remain.
- **Invite email diagnosis:** invite creation succeeds, but a stale browser JWT can produce `Unauthorized` before Resend is called. A fresh JWT reaches `send-club-invite-email` successfully. Operator action: revoke exposed links, sign in again, and recreate; client refresh/retry hardening remains follow-up work.
- **Verification:** ESLint passes, **754 unit tests pass** (**14 credential-gated integration tests skipped**), phase-0 audit passes, production build succeeds, and bundle budget passes. Vite reports non-blocking chunk/code-splitting warnings.
- **Operator LOC:** refreshed `src/generated/app-loc.json` to **179,101 lines / 884 files** total; operator scope remains **17,985 / 87**.
- **Release status:** Team Ops is on `main`; production acceptance evidence remains incomplete until distinct staging personas, deterministic active-club selection, Playwright selector cleanup, and cron logs are complete.

## 2026-08-16 — Team Ops production-review hardening

- **P1 authorization:** family Members RLS now permits linked wards; `search_club_members_page` limits non-staff users to self + wards; the guardian parent-role mutator is trigger-internal.
- **Persona eligibility:** Parent is available only from a real parent role/assignment, while true player+parent and trainer+parent accounts retain both personas.
- **ICS boundaries:** new subscriptions default to `self`; club feeds require club staff; team feeds require team/player/coach/guardian authorization; parent self feeds include linked wards. Updated `calendar-ics` deployed.
- **Attendance/reminders:** activity-row locking makes capacity/waitlist atomic; reminder recipients honor training/match opt-outs and email preference.
- **Quality:** scoped attendance-report query fixes phase-0 audit; direct dashboard routes register the service worker; lint warning fixed.
- **E2E:** deterministic duty claim, family/persona and two-trainer ledger approval coverage; `npm run e2e:team-ops` rejects incomplete credentials.
- **Database:** `20260816120000_review_hardening_family_calendar_reminders.sql` and DB-lint follow-up `20260816130000_team_ops_db_lint_fixes.sql` applied to linked Supabase.
- **Verification:** lint, focused tests, phase-0 audit, production build and bundle budget pass. Authenticated staging E2E/cron-log verification remains role-correct-fixture dependent.
- **Operator guide:** `docs/TEAM_OPS_OPERATOR_ACCEPTANCE_2026-08-16.md`.

## 2026-08-13 — Guardian dual-role (player/trainer + parent) · family roster · duplicate review · operator LOC

### Dual-role guardians (player or trainer who is also a parent)
- **`src/lib/guardian-family-scope.ts`** — persona-aware **`isFamilyMembersView`**: **Parent** persona → family roster (self + linked children); **Trainer** persona → team roster even when guardian links exist; **Player** + guardian links → family roster for parent duties.
- **`canAccessMembersModule`** — Members route/nav for guardian links **or** **`parent`** role assignment (not only `parent_supporter` RBAC).
- **Persona options** — Parent appears only when a real `parent` assignment exists; dual-role assignments still expose both authorized personas.
- **`use-dashboard-nav.ts`** — mobile + sidebar inject **Members** when guardian wards **or** parent assignment exist.

### Family roster scope
- **`use-guardian-family-scope.ts`** — **`familyMembershipIds`** = own membership + ward IDs (parents always see themselves on **`/members`**, not only on **`/my-data`**).
- **`Members.tsx`** — server query **`.in("id", familyIds)`** for family view.

### Database
- **`20260812310000_member_duplicate_review_clearances.sql`** — admin/trainer can dismiss “possible duplicate” after manual review.
- **`20260812320000_guardian_parent_role_sync.sql`** — on guardian link insert: add **`parent`** **`club_role_assignments`** row; promote **`member`/`fan`/`supporter`** membership label to **`parent`**; backfill existing links. Fix: **`null::uuid`** for **`scope_team_id`**.

### Duplicate review UX
- **`SharedContactAccountsPanel`** — **Not a duplicate — dismiss review** button; **`member-duplicate-review-clearance-api.ts`**.

### Operator LOC
- **`npm run loc:count`** → **`src/generated/app-loc.json`**: **178,986** lines / **883** files (operator module **17,985** / **87**). Operator **Financials** development cost auto-reads total LOC × €/line.

### Tests
- **`guardian-family-scope.test.ts`**, **`member-duplicate-review.test.ts`**, **`rbac-config.test.ts`** (persona options).

### Operator
```powershell
npm run db:push   # 20260812310000, 20260812320000 if not yet applied
```

## 2026-08-10 — Team Ops Tier 1–4 forward (implementation)

### Database (`20260812300000_team_ops_tier_forward.sql`)
- **`convert_activity_guest_to_draft_invite`** — security-definer draft + `club_invites` + draft link (fixes trainer RLS gap)
- **`member_notification_preferences`** + **`upsert_member_notification_preferences`**
- Activity **`capacity`**, **`waitlisted`** attendance status, **`promote_activity_waitlist`**
- Transport **pending** seat requests + **`accept_activity_transport_request`** / **`decline_activity_transport_request`**
- **`activities.series_id`** scaffold for recurring series

### Client
- Guest panel uses new RPC; transport summary + driver accept UI; trainer **Mark attended**; activity readiness badge + spawn checklist
- Settings notification prefs sync to DB; parent **Next training RSVP** dashboard card; lineup picker RSVP labels on `/matches`
- Dashboard PWA: `manifest.webmanifest` + network-only `sw-dashboard.js`
- Playwright **E2E scenarios 2–6**; extended JWT RLS probes; EN/DE i18n for new strings

### Deferred (operator / product)
- Push notifications (FCM/APNs)
- Events `event_participants` ↔ `activity_attendance` convergence
- Full recurring series editor

## 2026-08-10 — Team Operations expansion audit (prompt set review)

### Verdict
Desktop **Team Operations Expansion** prompt set (Prompts 0–27) reviewed against repo. **Core implementation complete** (Waves 1–7, Phases 18–26, Prompt 17, guardian family 2026-08-09). Not a greenfield build remaining.

### New documentation
- **`docs/TEAM_OPS_EXPANSION_STATUS.md`** — prompt-by-prompt DONE/PARTIAL/DEFERRED matrix + Tier 1–4 forward plan
- Updated **`docs/team-operations-gap-analysis.md`** (§4 attendance RPC, §13 next steps)
- Updated **`docs/TEAM_OPS_PHASE_18_26_CLOSEOUT.md`**, **`TASKS.md`**, **`MEMORY_BANK.md`**

### Still open (prioritized)
1. Playwright E2E scenarios 2–6 + staging fixtures
2. Guest draft+invite security-definer RPC (trainer RLS)
3. Phase 21 EN/DE i18n sweep
4. Checklist/template + transport UX polish
5. **Deferred:** dashboard PWA/push, waitlist/capacity, lineup↔RSVP bridge

## 2026-08-09 — Guardian / parent Members view · Settings family panel · role assignment RLS

### Guardian & parent visibility
- **`parent_supporter`** RBAC: `members: "own"` (was `"none"`) with **`getDataScopeForModule` → `"family"`** — same pattern as payments/My Dues.
- **Members sidebar** for `parent_supporter`; also injected when **`useGuardianFamilyScope`** finds wards (e.g. `member` role with guardian links).
- **`/members` guardian view:** Roster filtered to **`club_member_guardian_links`** ward IDs only; admin UI hidden (imports, saved list, stats, invites, role filters). Inline registry edit when **`list_editable_member_master_memberships`** grants access.
- **`/members?focus=<membershipId>`** deep-link from Settings / family panel.
- **`/my-data`:** **Family members you manage** panel (prior session); **`GuardianFamilyPanel`** reused on **Settings → Profile**.
- **`RequireModule`:** Allows `/members` when user has guardian wards even if base role lacks `members` module access.
- Hook **`src/hooks/use-guardian-family-scope.ts`**; API **`src/lib/member-guardian-api.ts`** (`listGuardianWardSummaries`).

### Product rule (unchanged, now documented in UI copy)
- Draft **`__draft_guardian_membership_ids`** on saved member list rows do **not** power Activities RSVP picker or parent Members/My Data until the child has an **active roster membership** and a row in **`club_member_guardian_links`** for the signed-in guardian account.

### Role assignments (Roles tab)
- Migration **`20260812290000_club_role_assignments_member_manager_write.sql`**: Team Management (and club admin paths) can UPDATE **`club_role_assignments`** under RLS.
- **`role-manager.tsx`**: After update, `.select()` verifies a row was written — Supabase returns no error on 0-row RLS block.
- **`club-role-assignment-access.ts`**: Non-admins see filtered role-kind picker.

### Members draft / guardian UX
- **`Members.tsx`**: Pending guardian in dropdown flushed on Save without requiring separate Link click; draft save syncs invite payload + mirrors to **`club_member_guardian_links`** when draft email matches active membership.
- **Close** button on roster and draft edit footers (alongside Cancel/Save).
- **Send invite** visible when editing invited drafts; clearer save toast for invited-draft status.
- Duplicate guardian section removed from nested **`MasterDataTabs`** inside draft edit (top-level guardian block kept).

### i18n
- EN/DE: **`membersPage.guardianViewSubtitle`**, **`guardianViewEmpty`**; existing **`myMemberDataPage.guardianFamily*`** keys used on Settings.

### Tests
- **`src/lib/rbac-config.test.ts`**: `parent_supporter` members access + sidebar includes Members.

### Operator
```powershell
npm run db:push   # if 20260812290000 not yet applied
```

### E2E
- **`docs/TEAM_OPS_E2E_FIXTURES.md`**: Roster vs draft guardian links; troubleshooting for guardian picker / **`E2E_PARENT_EMAIL`** setup.

## 2026-08-08 — Phases 19 / 23 / 24

### Phase 19 Realtime
- Migration **`20260812280000`**: publish `club_task_checklist_items`, `activity_guest_participants`.
- Client debounced subscriptions on guests panel + task checklist panel.

### Phase 23 Perf
- Notes: **`docs/TEAM_OPS_PHASE_23_PERF_NOTES.md`**.
- Win: ops tabs avoid mounting transport/guests until selected.

### Phase 24 Activity IA
- **`ActivityOpsTabs`**: Attendance / Transport / Guests segments on Activities cards.

### Operator
```powershell
npm run db:push   # applied 20260812280000
# still: hourly cron for process-attendance-reminders
```

## 2026-08-08 — Phases 18–26 close-out progress

### Phase 25 (Medium)
- Migration **`20260812260000_team_ops_phase25_medium_hardening.sql`**: `club_has_plan_feature`, team-scoped transport/guests/ledger, availability SELECT lockdown, calendar UPDATE removed, plan gates on poll/ICS/cashbox/carpool RPCs.

### Phase 18
- Surface audit: **`docs/TEAM_OPS_PHASE_18_SURFACE_AUDIT.md`**.

### Phase 22
- Playwright smoke: **`e2e/team-ops-surfaces.spec.ts`** (unauth redirects).

### Phase 21
- Activities create dialog EN/DE i18n wired (hardcoded English removed).

### Phase 26
- Unit: plan-feature mirror + attendance/ledger proofs (run locally).

### Operator
```powershell
npm run db:push
# still: hourly cron for process-attendance-reminders
```

## 2026-08-08 — Phase 20 High RLS hardening

- **H1:** Public club attendance overview no longer fetches/shows peer decline reasons.
- **H2:** `team_ledger_entries` authenticated INSERT/UPDATE/DELETE removed — approve/reject/post/resubmit RPCs only (`20260812240000`).
- **H3:** Trainer remind RPC strips recipient emails (service path unchanged for Edge cron).
- **Also:** `canManageAttendance` no longer treats parent `"team"` module scope as manage.

### Operator
```powershell
npm run db:push
```

## 2026-08-08 — Prompt 17 decisions (entitlements + guest convert + ledger approvals + reminder cron)

### Plan catalog (`docs/PROMPT_17_PLAN_ENTITLEMENTS.md`)
- **polls** + **calendarIcs**: Kick-off+ (all paid).
- **teamCashbox** + **carpoolGuests**: Pro+.
- PlanGate: `/team-ledger` → `teamCashbox`; Communication polls channel; Activities transport/guests; My Data ICS card.

### Guest → membership
- Paths **A+B** (link existing member **or** draft + invite). Trainer + club admin. Never auto-creates Auth users.
- Migration **`20260812220000_team_ops_decisions_ledger_guest_reminders.sql`**: `convert_activity_guest`.

### Team ledger approvals
- All entries start **pending**; balance = approved only; approve/reject/resubmit (no self-approve).

### RSVP reminder cadence
- Edge **`process-attendance-reminders`**: in-app + email; types `starts_24h`, `morning_of`, `deadline_custom` (+ existing); only when `automatic_reminders`; optional `custom_reminder_at` on create.

### Operator apply
```powershell
npm run db:push
npx supabase functions deploy process-attendance-reminders --no-verify-jwt
# Schedule hourly cron (same pattern as weekly digests) with x-cron-secret
```

## 2026-08-08 — Team Ops follow-ups (RLS proofs + duty templates)

### Wave 1 hardening
- CI unit proofs: **`src/lib/team-ops-wave1-proofs.test.ts`** (finance gate, team_management ↛ payments, guardian/manage UX, persona ≠ auth).
- Staging JWT probes extended in **`src/test/rls.integration.test.ts`** (optional trainer/parent/team_mgmt env vars). Docs: **`docs/RLS_INTEGRATION_TEST.md`**.

### Wave 3 template spawn + slots
- Starter templates seed + spawn (task + checklist + `template_key`) on Tasks.
- Create/edit claimable duties accept optional **`slots_total`**.

## 2026-08-08 — Team Operations Wave 7 (ICS feed + Realtime + mobile polish)

### Calendar ICS (Wave 4 leftover)
- Edge **`calendar-ics`**: opaque token → SHA-256 hash → `resolve_calendar_subscription_for_ics` (service role); returns `text/calendar` (club / team / self scopes). Deploy with **`--no-verify-jwt`**.
- My Data card: copy HTTPS + webcal feed URL (shown once), list + revoke active subscriptions.
- Migration **`20260812200000_team_ops_wave7_realtime_ics.sql`**.

### Realtime ops
- Publication adds: `club_tasks`, `activity_attendance`, `club_polls`, `club_poll_votes`, `activity_transport_offers`.
- Client reloads (debounced): Activities attendance, Communication polls, transport offers. Tasks already subscribed.

### Mobile polish
- Sheet / Dialog safe-area insets. **No** dashboard PWA/SW (sensitive data stays network-only). Push deferred.

### Operator apply
```powershell
npm run db:push
npx supabase functions deploy calendar-ics --no-verify-jwt
```

## 2026-08-08 — Team Operations Wave 6 (AI 4 T ops intents)

### Agent intents (propose → confirm → execute)
- Migration **`20260812180000_team_ops_wave6_ai_agent_intents.sql`**: `agent_summarize_missing_attendance`, `agent_summarize_attendance_metrics`, `agent_create_claimable_duty`, `agent_create_activity_checklist`, `agent_create_club_poll`.
- New intents: **`summarize_missing_rsvps`**, **`draft_attendance_reminder`** (ack/draft only — **never** calls `remind_missing_activity_attendance`), **`propose_claimable_duty`**, **`propose_activity_checklist`**, **`summarize_attendance_metrics`**, **`draft_poll_question`**.
- Edge: `ai4team_agent_tools` / `ai4team_agent_interpret` / `ai4team-agent` propose enrichment.
- Client: CoTrainer forms, slash commands, Activities/Tasks header shortcuts, EN/DE i18n.

### Operator apply
```powershell
npm run db:push
```

## 2026-08-08 — Team Operations Wave 5 (team cashbox + attendance metrics)

### Definitions
- **`docs/attendance-metric-definitions.md`** — response/coming/missing rates and window aggregates.

### Team ledger (not club finance)
- Migration **`20260812160000_team_ops_wave5_team_ledger.sql`**: `team_ledger_accounts` / `team_ledger_entries`; RPCs **`post_team_ledger_entry`**, **`team_ledger_balance`**, **`can_manage_team_ledger`**.
- Page **`/team-ledger`** for trainers / team management / club admins. Does **not** use `payments` / `club_expenses`.

### Reports attendance
- Operations + trainer Reports show **AttendanceReportPanel** (28-day window). Still gated by `canViewAttendanceAnalytics`, never by `payments:full`.

### Operator apply
```powershell
npm run db:push
```

## 2026-08-08 — Team Operations Wave 4 (transport, guests, ICS tokens)

### Transport (activity-scoped)
- Migration **`20260812140000_team_ops_wave4_transport_guests_ics.sql`**: `activity_transport_offers` / `activity_transport_requests` + **`request_activity_transport_seat`**.
- Activities carpool panel (offer seats / request).

### Guests / trials
- `activity_guest_participants` (no Auth user); trainer panel on Activities.

### Calendar ICS foundation
- `calendar_subscriptions` stores **token hash only**; RPC returns raw token once. Edge ICS generator still pending.

### Operator apply
```powershell
npm run db:push
```

## 2026-08-08 — Team Operations Wave 3 (duties, checklists, polls)

### Duties + checklists (extend `club_tasks`)
- Migration **`20260812120000_team_ops_wave3_duties_checklists_polls.sql`**: `claimable` / slots / `activity_id`; **`club_task_checklist_items`**; **`club_task_templates`**; RPC **`claim_club_task`**.
- Tasks UI: claimable create option, **Claim duty**, checklist panel on task detail.

### Polls (Communication — not Tasks)
- Tables **`club_polls`** / **`club_poll_options`** / **`club_poll_votes`**; RPCs **`create_club_poll`**, **`vote_club_poll`**, **`close_club_poll`**.
- Communication channel **Polls** with create/vote/close UI.

### Operator apply
```powershell
npm run db:push
```
(Apply Waves 1–2 migrations if pending, then Wave 3.)

## 2026-08-08 — Team Operations Wave 2 (availability, deadlines, guardian RSVP, reminders)

### Planned availability
- Migration **`20260811140000_member_availability_and_attendance_reminders.sql`**: table **`member_availability`** + RPCs **`upsert_member_availability`** / **`delete_member_availability`**.
- My Data panel for self/guardian; Activities shows **overlap hints only** (never auto-applies RSVP).

### Deadlines + missing-response reminders
- Activities create form: optional **`response_deadline`**, **`response_required`** (+ automatic reminders flag).
- RPC **`remind_missing_activity_attendance`** + idempotent **`activity_attendance_reminder_log`**; trainer roster panel **Remind missing**.

### Guardian RSVP UX
- Activities person picker (self / guardian wards) posts via existing Wave 1 attendance RPC.

### Operator apply
```powershell
npm run db:push
```
(Apply Wave 1 **`20260811120000`** if not already applied, then Wave 2 **`20260811140000`**.)

## 2026-08-08 — Team Operations Wave 1 (RBAC + attendance foundation)

### Route / permission alignment
- Reports financial tab gated by **`canAccessClubFinance`** (`payments:full`) via **`resolveClubReportPersona`** / **`canAccessFinancialReports`** — Team Management no longer unlocks club finance through `/reports?section=financial`.
- Attendance capability helpers in **`src/lib/activity-attendance-access.ts`** (self / guardian UX / manage / analytics / club finance).

### Activity attendance strengthening
- Migration **`20260811120000_strengthen_activity_attendance_wave1.sql`**: status **`maybe`**; columns **`response_reason`**, **`responded_by`**, **`responded_at`**; **`activities.response_deadline`**; RPC **`upsert_activity_attendance_response`** + **`can_manage_activity_attendance`** (self, guardian, household email, trainers/ops).
- Client RSVP (dashboard + public) uses the RPC; UI adds **Maybe**; trainer panel lists maybe separately.
- Domain map: **`docs/activity-domain-model.md`**. Gap audit: **`docs/team-operations-gap-analysis.md`**.

### Operator apply
```powershell
npm run db:push
```

## 2026-08-07 — `/my-data` save hardening · Vercel Analytics · operator LOC tracking

### `/my-data` — name saves, load races, registry change detection (Fabia retest wave)
- **Root causes:** Stale **`getMemberMasterBundle`** could reset **`form`** + **`baseline`** together after edits; save gated on slow RPC (**`bundleMeta`** cleared each load); Members dialog sent full merged record; server **`no_changes_detected`** from snapshot taken before upsert.
- **`MyMemberData.tsx`** — **`loadGenerationRef`** ignores stale bundle loads; **`dirtyKeys`** tracks edited fields; interim **`bundleMeta`** from list row enables save before RPC; retry UI on load failure; save uses dirty-key fallback.
- **`member-master-field-policy.ts`** — optional **`dirtyKeys`** in **`buildMemberMasterSavePayload()`** when baseline/form align incorrectly.
- **`Members.tsx`** — **`handleSaveMasterRecord`** diffs via **`buildMemberMasterSavePayload`** (changed fields only).
- Migration **`20260810220000_fix_member_master_save_change_detection.sql`** — re-read DB row after upsert before change detection; trim text for comparison.
- Prior round (commits **`28dc47f`**, **`5628fde`**): session-persisted selection, changed-fields-only client saves, profile name sync migrations **`20260810200000`**, **`20260810210000`**.

### Mobile viewport
- **`index.html`** — **`viewport-fit=cover`** for iOS safe areas (pinch/zoom layout after login).

### Vercel Analytics + Speed Insights
- Packages **`@vercel/analytics`**, **`@vercel/speed-insights`** (React imports, not Next.js).
- **`src/components/VercelInsights.tsx`** — mounts in production only after analytics cookie consent.
- **`App.tsx`** — **`<VercelInsights />`** beside **`<CookieConsent />`**.
- **`cookie-consent.ts`** — dispatches **`one4team:cookie-consent-updated`** on save.

### Events/Matches admin (Team Management)
- **`87b0923`** — Team Management can edit Events/Matches hero with visible admin bar.
- **`13e14e5`**, **`0deb76a`**, **`99d5691`** — timeline feed saves persist between **`/events`** and **`/matches`** (no revert to Sommerfest defaults after deletions).

### Operator LOC
- Measured **170,246** lines across **828** files (`npm run loc:count` → **`src/generated/app-loc.json`**, 2026-08-07).
- **Operator Control Center module:** **17,985** lines / **87** files (components, pages, i18n, **`src/lib/operator*`**); tracked in snapshot **`operatorScope`**.

## 2026-08-03 (late) — `/my-data` save fix · Events/Matches admin · 24h match history · favicon

### `/my-data` — save appeared to revert after refresh
- **Root cause:** Team Management users saw the **whole club** on `/my-data`; refresh reset **`selectedId`** to unstable list order, so saves for self could show another member’s row after reload.
- **Migration **`20260810120000_fix_my_data_membership_list_scope.sql`**** — scope editable list to self / guardian / household / trainer team players (not whole club for managers); prefer self/guardian/household before trainer in **`get_member_master_edit_actor`**; stable sort (own profile first, then name).
- **`MyMemberData.tsx`** — persist **`selectedId`** in **`sessionStorage`**; default to own profile; toast names relationship + person; validate save RPC returns **`ok: true`** + record.
- **`member-master-api.ts`** — post-save validation of RPC response.

### `/events` — dates on timeline + editable admin content
- **`feed-date-labels.ts`** + tests — calendar date pills (today/tomorrow/weekday) on Sommerfest feed items.
- **`sommerfest-events-hub.tsx`** — date grouping + schedule lines with dates (fixes “heute” without calendar context).
- **Football camps:** **`club-football-camp-edit-dialog.tsx`** + **`saveClubCampEvent()`** in **`club-football-camp-api.ts`**; **Bearbeiten** on **`club-football-camp-admin.tsx`**.
- **Festival feed:** persisted in club public page config — **`club-events-feed.ts`**, **`club-events-feed-api.ts`**, **`events-feed-admin.tsx`**; wired on **`Events.tsx`**.
- **`club-public-page-config.ts`** — **`eventsFeed`** field; i18n **`eventsPage.feedAdmin`**, **`clubFootballCamps.edit*`**.

### `/matches` — 24h current view + history + admin feed
- **`match-list-window.ts`** + tests — matches older than **24 hours** excluded from current list.
- **`Matches.tsx`** — current query uses **`match_date >= now - 24h`**; collapsible **Match history** section with pagination; **`EventsFeedAdmin`** for TSV Allach trainers (shared config with **`/events`**).
- **`sommerfest-match-schedule.tsx`** — Sommerfest slots split into current vs history (same 24h rule).
- i18n **`matchesPage.historyTitle`**, **`currentEmpty`**, pagination labels.

### Site favicon (ONE4Team, not platform default)
- **`public/favicon.png`** added from **`src/assets/one4team-logo.png`** (was referenced in **`index.html`** but missing from repo; live **`/favicon.png`** returned errors).
- **`index.html`** — **`shortcut icon`** + **`apple-touch-icon`** links.

### Operator LOC
- Measured **169,689** lines across **823** files (`npm run loc:count` → **`src/generated/app-loc.json`**, 2026-08-03 late).

## 2026-08-03 (Role-aware dashboards · player-focused Trainings · `/my-data` UX)

### Dashboard responsive layout (AI 4 T cards)
- **AI 4 T usage/value stat grids** stay **2 columns until `lg`** (was 4 at `sm`) — fixes cramped German labels like “Chats aktualisiert”.
- **`AiUsageMeter`** — usage bar labels stack on narrow screens; long DE strings wrap with `break-words`.
- **KPI tiles** — smaller value type on mobile, `line-clamp-3`, change badges constrained.
- Shared tokens: **`DASHBOARD_STAT_MINI_GRID`** / label/value in **`dashboard-page-shell.ts`**.

### Role-aware dashboards (Team Management + all personas)
- **`DashboardContent.tsx`** refactored: **`isOpsAdminDashboardRole`** (`club_admin`, `admin`, `team_management`) shares **AI 4 T Control Center** (NaturalLanguageStats, contextual insights, weekly digest CTA, AdminNotificationSender, Ai4tAdminUsageCard, Ai4tValueMetricsCard).
- **Team Management KPIs:** Members, Teams, Trainings (7 days), Upcoming — live from **`fetchAdminDashboardSnapshot`**; no financial summary or dues KPI.
- **Week at a glance** for ops admins; **`AdminWeekAtAGlanceCard hideFinance`** for Team Management.
- **Trainer / team staff / player / parent:** Team-scoped KPIs + upcoming via **`fetchTeamScopedDashboardSnapshot`** / **`fetchTeamScopedDashboardUpcoming`** + **`useModuleDataScope("trainings")`**.
- **Player dashboard:** Removed analytics widgets from section flags; focus hint; next training/match KPIs.
- **Parent dashboard:** Dedicated title + family-focused hint; team-scoped schedule + club events.
- **`TrainerTodaySessionCard`:** Optional **`teamIds`** filter for coach-assigned teams.
- Lib: **`dashboard-persona.ts`** (`isOpsAdminDashboardRole`, `isClubFinanceDashboardRole`, `isTeamScopedSportsDashboardRole`); **`club-dashboard-snapshot.ts`** team-scoped fetchers; tests in **`dashboard-persona.test.ts`**.

### Player-focused Trainings & Assets
- **`/teams`:** **`isPlayerFocusedView`** from **`useModuleDataScope("trainings")`** — hide admin KPI grid, conflict badges, Teams/History tabs, non-training layer filters, AI shortcuts; highlight own team on day schedule; default training layer + booked pitch view.
- **`/activities`:** Team-scoped activities for players; club-wide events retained; **`TrainingAttendanceOverview`** trainers-only; simplified filters + player hint.

### `/my-data` + Settings
- **`member-my-data-errors.ts`** — friendly PostgREST/empty-state messages.
- **`MyMemberData.tsx`** — expanded empty state; inline error panel.
- **`master-data-tabs.tsx`** — login email on Address & Contact (from auth, not registry).
- Migration **`20260809180000_fix_list_editable_member_master_return_types.sql`** — RPC return type casts.
- **`Settings.tsx`** — hide Club tab for non-admin personas.

### Members polish
- **`Members.tsx`** — **`IdCard`** icon for full registry; saved-list preview count **12**.

### Operator LOC
- Measured **167,902** lines across **814** files (`npm run loc:count` → **`src/generated/app-loc.json`**, 2026-08-03 evening).

## 2026-08-03 (Team Management club content · member self-service · DE i18n)

### Club page + shop — Team Management access + audit
- **Team Management** can save/publish the public club page and manage the shop (was admin-only in RLS despite RBAC matrix granting access).
- **SQL:** `can_manage_club_public_page()`, `can_manage_club_shop()`; RLS + storage policies for drafts, published pages, shop products/images; audit tables **`club_public_page_audit_events`**, **`club_shop_audit_events`**; timeline RPCs **`get_club_public_page_audit_timeline`**, **`get_club_shop_audit_timeline`**; audit hooks in publish/unpublish/upsert RPCs.
- Migrations **`20260807140000_upsert_club_public_page_draft_rpc.sql`**, **`20260807150000_team_management_club_page_shop_access_and_audit.sql`** — apply with **`npx supabase db push`**.
- **Frontend:** **`use-can-manage-club-content.ts`**; **`club-content-audit-timeline.tsx`**; History tab on **`/club-page-admin`** and **`/shop`**.

### Member master data — self-service + trainer edits
- **`/my-data`:** Members edit their own master data; guardians with shared login email can edit linked wards.
- **Trainers:** Edit master data for players on teams where they are nominated trainers; save notifies affected members (players) and Team Management.
- **Members admin:** Saves via RPC **`save_member_master_record`** with field filtering by actor (**self** / **trainer** / **manager**); **`MasterDataTabs`** respects **`allowedFieldKeys`** / **`allowedGroups`**.
- Migration **`20260808120000_member_master_self_service_trainer_edit.sql`** — helpers (`is_trainer_for_member`, `is_guardian_for_member`, `shares_login_email_with_membership`), list/get/save RPCs, notifications, audit event types **`registry_updated_by_member`**, **`registry_updated_by_trainer`**.
- Lib: **`member-master-api.ts`**, **`member-master-field-policy.ts`**; Settings link to **`/my-data`**.

### German i18n — Club Page Admin umlauts
- Fixed ASCII digraphs in **`clubPageAdmin`** DE strings: e.g. **Übersetzung**, **Zusätzlich**, **veröffentlichen**, **können**, **öffentlichen**, **Fußball**, **Gerät**, **Prüfung**, **Längengrad**, **Empfänger**, **ausgewählt**.

### Operator LOC
- Measured **166,921** lines across **810** files (`npm run loc:count` → **`src/generated/app-loc.json`**, 2026-08-03 morning).

## 2026-08-01 (TSV Allach member registry reconciliation · shared contact · household discount)

### Members — registry import & reconciliation
- **Smart spreadsheet import:** Header/sheet/column auto-mapping for German registry exports (`member-registry-spreadsheet-import.ts`).
- **Match by club member number first** — no email-only fallback when number present; name mismatch rejection prevents wrong person merge (`member-registry-import-match.ts`).
- **Save import** adds **unmatched rows** to saved list (by club member number or name — **email optional**), then updates matched roster/drafts; clearer success toast (added / roster / drafts / skipped).
- **Optional email on saved list:** Migration **`20260807130000_club_member_drafts_optional_email.sql`** — `club_member_drafts.email` nullable; invites still require email; draft save allowed with name or member number only.
- **Identity keys:** `resolveNewDraftIdentityKey`, `canAddRegistryRowToSavedList`, `registryImportRowLinkKey` support no-email rows (`num:` / `name:` fallbacks).
- **Null-safety:** `normalizeImportEmail` and `normalizeContactEmail` accept null; registry file-input reset no longer crashes after async import.
- **Dedupe** by club member number on re-upload (`member-import-dedupe.ts`).
- **Comparison workbook** path via **Mitglieder hinzufügen → Import** for bulk missing members (`club-comparison-workbook-import.ts` + generator script).
- **Shared contact email** groups for families (`member-shared-contact-email.ts`); badges on roster/saved list rows.
- **Linked accounts panel** in member/draft detail — **Show all linked accounts** filters saved list + roster by email; click member name to filter + open; filter clears on **Cancel** / **Close**.
- **Draft search:** `master_data` fields, merged local + server results, paginated fetch up to **5000** drafts.
- **Identity key** `memberRegistryIdentityKey(email, memberNumber, personLabel?)` allows same email for different people (e.g. parent + child contact email).

### Payments — household discount
- **Family discount groups** when same contact email + surname + address (`member-household-discount.ts`).
- **`HouseholdDiscountReviewPanel`** on **`/payments`** to verify/reject before applying family pricing.
- Migration **`20260807120000_member_household_discount_fields.sql`** — apply with `supabase db push`.
- Migration **`20260807130000_club_member_drafts_optional_email.sql`** — optional email on saved-list drafts (apply with household discount migration).

### Member history
- **`MemberHistory.tsx`** — vertical timeline connector centered on event icons (grid + per-segment lines).

### Tests
- `member-registry-import-match.test.ts`, `member-import-dedupe.test.ts`, `member-household-discount.test.ts`, `member-registry-spreadsheet-import.test.ts`, `club-comparison-workbook-import.test.ts`, `member-shared-contact-email.test.ts`.

## 2026-08-01 (AI 4 T GPT Internet · Members export · Roles · CI)

### AI 4 T GPT Internet (Phases 1, 2, 4; Phase 3 RAG deferred)
- **Internet mode** on **`/co-trainer`**: Club vs Internet toggle, one-time user consent, admin enable/disable in **Settings → AI provider** (Pro+ only).
- **Backend:** `co-trainer` accepts `chat_mode: "internet"`; Tavily search via **`TAVILY_API_KEY`** Supabase secret; fair-use caps in **`ai_usage_caps.ts`** (Pro **40**/mo, Champions **150**; Kick-off/Squad **0**).
- **Privacy:** Limited club context to Edge (team names, schedule summaries; no member names); **`ai_internet_usage_log`** audit; consent in **`ai_internet_consents`**.
- **UI:** Scope hint swaps in the workspace card (stable layout, no separate banner jump); cited **Sources** links under assistant messages; EN/DE **`coTrainerPage.internetMode.*`** (no em dash in consent copy).
- **SQL:** **`20260806130000_ai_internet_research.sql`**, **`20260806140000_fix_ai_internet_consent_upsert.sql`** (`record_ai_internet_consent` RPC + UPDATE RLS for upsert).
- **Note:** Custom GPT at chatgpt.com cannot be invoked programmatically; behavior is replicated via prompt + Tavily + existing LLM pipeline (Phase 3 knowledge files not shipped).

### Members · Roles
- **Registry XLSX export** includes pending **`club_member_drafts`** (`draft` + `invited`), merged and deduped by email with joined roster.
- **Roles tab:** Inline edit of role kind, scope, and team per **`club_role_assignments`** row on **`/members`**.

### CI · E2E · build
- CI build embeds **`VITE_SUPABASE_*`** placeholders for Playwright; onboarding allows guest access for invite/pricing deep-links; cookie consent pre-set in E2E fixture.
- ESLint override for Playwright **`use`** callback in **`e2e/**/*.ts`**.
- Production build fix: mixed **`??`** / **`||`** in **`role-manager.tsx`** (esbuild).

### Co-Trainer workspace polish
- Fixed-width Club/Internet toggle; removed empty assistant-role pill; reserved hint height on mobile.

## 2026-08-01 (Operator LOC auto-measure + home-screen PWA + invites CTA)

- **Operator financials LOC:** Measured automatically from `src/` via **`npm run loc:count`** / **`prebuild`** → **`src/generated/app-loc.json`**. Operator UI reads this snapshot; known old baselines (84k / 157k) soft-migrate on load so phones are not stuck on stale `localStorage`. Manual overrides still supported; **Use measured LOC** resets. Docs/i18n no longer hardcode 84k.
- **Public club PWA:** Per-club web manifest (`start_url` = `/club/{slug}/`), iOS standalone meta, clearer Add-to-Home-Screen steps (Apple still blocks programmatic install).
- **Members Invites tab:** Page-level **Create invite** CTA (not only header).

## 2026-07-28 (Supabase function lint repair + warning cleanup)

- **`supabase db lint --linked`** surfaced real errors in join/register/approve/create-club RPCs and analytics/operator diagnostics — all repaired on linked remote.
- **High-impact auth/join:** **`20260804193000`** — `register_club_join_request` (invalid `club_invites.status`), `approve_club_join_request` ambiguity, `create_club_with_admin` (`author_id` not `created_by`).
- **Draft + invite redeem:** **`20260804160000`** — allow `club_member_drafts.status = 'joined'`; **`20260804170000`** — repair stuck invite redemptions + harden `redeem_club_invite`.
- **Join upsert:** **`20260804196000`** — replace invalid `ON CONFLICT (club_id, user_id)` with update-then-insert; unique key is **`(club_id, user_id, role)`**.
- **Analytics:** **`20260804197000`**–**`20260804199000`** — heatmap/radar use **`activity_attendance` + `activities`** (not missing `event_participants`); fix `GROUP BY` / `ORDER BY` on heatmap overload.
- **Warning cleanup:** **`20260804200000`** — remove unused PL/pgSQL variables in `create_club_with_admin`, `create_platform_user`, `set_operator_club_status`, `set_platform_setting`.
- **Verified:** `supabase db lint --linked` → **No schema errors found** (2026-07-28).

## 2026-07-28 (Communication · AI 4 T branding · Club Page Admin tabs)

- **`/communication`:** Channel list scrolls independently; **External Bridge** panel stays fixed at bottom of sidebar (`flex` column + `shrink-0`).
- **External Bridge:** Replaced Lucide bot with app **`Ai4TLogo`** (~`h-9 w-9`, no frame).
- **Dashboard nav:** Sidebar + **`MobileBottomNav`** use **`Ai4TLogo`** for AI 4 T entry (enlarged ~50%).
- **`/club-page-admin`:** Tab bar uses **`md:grid md:grid-cols-5`** (5+5 layout) — no horizontal scroll on desktop.

## 2026-07-28 (Member photo 2-year validity)

- Club registry photos (`club_member_master_records.photo_url`) stamp **`photo_uploaded_at`** on upload/change (trigger + backfill).
- Validity **2 years**; dashboard notifications type **`photo_renewal`** via RPC **`ensure_photo_renewal_notifications`** (called when the notification bell loads).
- **Under-18 players:** renewal notifications go to linked **parents/guardians**; adults get their own.
- Members UI shows valid-until / renewal-due hints. Migration **`20260804190000`** applied on linked remote.

## 2026-07-28 (Club roles optimization)

- **New `app_role` values:** `team_management`, `fan`, `supporter` (migration **`20260804180000_club_roles_team_management_fan_supporter.sql`**).
- **RBAC rewrite:** Staff = club-wide ops edit without finance; Team Management = broader ops (members/invites/roles/reports/club page) without finance; Fan/Supporter = public-club-first (no ops dashboard); Player trainings/matches = limited (own progress + team read/messaging); Member gets team schedule/messaging when assigned.
- **Trainer scope hard-fix:** Bare legacy trainer is no longer club-wide for matches; `is_trainer_for_team` + roster RLS; `useModuleDataScope` uses assignment + `team_players`/`team_coaches` ids.
- **Parent vs supporter split:** UI labels separate Parent / Fan / Supporter; dues + weekly digest accept DB role `parent` (not only `parent_supporter`).
- **Under-18 guardian UX:** Safety tab hint when birth date &lt; 18; child stays Player.
- **Checklist:** `docs/club-roles-verification-checklist.md`.

## 2026-07-18 (Member ID card skills · Club Card parity · My Progress copy)

### Member ID card (flip / skills / crest)
- **3D flip** on Member ID card (Safari-safe stage height + backface visibility).
- **Players:** back shows My Progress–derived FUT-style scores (TEC/FIT/TAC/MND/ATT/CMP + OVR), level/XP, and **AI 4 T** market estimate with info popover + refresh control (stacked under ⓘ).
- **No My Progress recording yet:** numeric scores, level/XP, and market value render as **—** (not synthetic floors); confidence copy points to My Progress.
- **Non-player roles** (trainer, admin, staff, …): back shows **club crest/logo** only (assigned club).
- **Surfaces:** public club profile Member ID modal; **`/members`** IdCard modal; Club Card tab in **`MasterDataTabs`** (roster + drafts with membership when resolvable). Club Card panel grows with content (no inner scrollbar clipping flip).
- **Lib/hook/tests:** `club-member-pass-skills.ts` (+ tests), `use-club-pass-skills.ts`; EN/DE `clubPass*` labels including refresh / club-crest flip hint.
- **SQL:** `20260804150000_fix_progress_rpc_app_role_enum.sql` — `get_member_progress_snapshot` / challenge RPCs use valid `app_role` enum literals (fixes HTTP 400 when `club_admin` was cast incorrectly). Apply on linked remote if progress snapshot fails.

### My Progress public copy
- Hero tagline and support line use intentional **two-line breaks** (EN + DE) via `\n` + `whitespace-pre-line` on `/club/:slug/my-progress`.

## 2026-07-18 (Pricing UX polish · Founding Club marketing)

- **Pricing cards:** Larger description/feature type; no description clamp; Kick-off catalogue price with red strikethrough above **0 €**; plan logos with gold corner icons; Kick-off / Pro / Enterprise badges uppercase with matching size; Kick-off badge uses black **12 MONTHS FREE** pill (same as promo banner).
- **Founding promo banner:** Animated gold strip + black pill; Offer terms + **View offer details** modals (benefits, prerequisites, how to apply, conditions, copyable offer code).
- **Bespoke:** Enterprise band layout; ONE4Team logo + Building2 badge; centered **Contact Us** aligned to feature column → mailto **`contact@one4team.com`** with EN/DE consultation brief.
- **AI 4 T add-on:** Red **4** in title/body; two-line description; wider video frame; **`Ai4TIntroLogoVideo` `playMode="visible"`** (Intersection Observer) so the clip plays when the card scrolls into view and fills with `object-cover`.
- **Plan marketing copy:** Squad/Pro/Champions AI lines (`2 X` / `5 X` fair-use + add-on possible); comparison labels (**API**, **AI 4 T**); FAQ rewritten for Founding Club, grace, AI, Bespoke.
- **Router:** `BrowserRouter` future flags `v7_startTransition` + `v7_relativeSplatPath`.
- **Hardening:** `BrandedText` tolerates nullish text (fixes Pricing crash when Bespoke description briefly missing).

## 2026-07-18 (Pricing architecture & Founding Club)

- **Catalogue SSOT:** [`plan-catalog.ts`](src/lib/plan-catalog.ts) / [`plan-limits.ts`](src/lib/plan-limits.ts) with locked caps, granular entitlements, deny-by-default `NO_PLAN`.
- **Effective plan resolver:** [`effective-plan.ts`](src/lib/effective-plan.ts) + runtime Operator overrides via `get_my_club_module_overrides` ([`20260804130000_runtime_module_overrides.sql`](supabase/migrations/20260804130000_runtime_module_overrides.sql)).
- **Founding Club offer:** `commercial_offers` / redemptions / `redeem_commercial_offer`; public code **`ONE4Team-Founding-Club-12M`** (legacy alias still redeemable); expiry Edge `process-commercial-offers`.
- **Pricing UX:** four cards + Bespoke, from-pricing, calculator bands, offer terms dialog, catalogue comparison table; Kick-off CTA → onboarding redeem (no Stripe); removed unsafe trial upsert.
- **Communication:** promotional Kick-off = announcements only; chat gated unless paid / Operator override.
- **Stripe:** base + member line items; promotional Kick-off blocked; paid Kick-off allowed after offer.
- **Operator:** Offers tab under Modules & Plans; MRR excludes promotional (`operator-financials`).
- **Docs:** [`PRICING_AND_ENTITLEMENTS.md`](docs/PRICING_AND_ENTITLEMENTS.md), [`FOUNDING_CLUB_OFFER.md`](docs/FOUNDING_CLUB_OFFER.md), [`STRIPE_MEMBER_BASED_BILLING.md`](docs/STRIPE_MEMBER_BASED_BILLING.md).

## 2026-07-18 (Production readiness re-audit)

- Re-scored ops readiness in [`ops/PRODUCTION_READINESS_ARTIFACTS.md`](ops/PRODUCTION_READINESS_ARTIFACTS.md) Section B and [`docs/PROJECT_COMPREHENSIVE_AUDIT.md`](docs/PROJECT_COMPREHENSIVE_AUDIT.md): **Overall 61 → 68**, Scalability **58 → 64**, Observability **48 → 58** (Deployment 70, Security 72, Tenant 78). Still conditionally ready; Section L/M external wiring remains the main gap to unmanaged production.

## 2026-07-18 (Support & FAQ refresh)

- Support page (`/support`) FAQ copy updated EN/DE for tournaments, Events/Matches highlight, billing recovery, My dues, Marketplace, Asset Map, Guided setup, weekly digests, Role Access, and AI usage/value meters.
- Category cards: slightly stronger border/contrast for readability (same accordion layout).

## 2026-07-18 (Multi-tournament competitions)

- Competitions support a first-class **Tournament** type (alongside league / cup / friendly), assignable club-wide or per team.
- Matches → Competitions: type filter chips + scope label on each card.
- Matches → Standings: competition selector loads all completed fixtures for that competition (not only the paginated matches page).

## 2026-07-18 (Product improvement waves A–H)

- **A Guided launch path:** [`GuidedSetup`](src/pages/GuidedSetup.tsx) steps `welcome → team → import → invite → publish → complete`; import via spreadsheet (cap 10), real invite emails (`send-club-invite-email`), publish via `publishClubPageConfig`. Lib [`guided-setup-launch.ts`](src/lib/guided-setup-launch.ts).
- **B Members modules:** Feature boundary under [`src/features/members/`](src/features/members/) (tab nav, roles, import panel, roster/invites shells, invite crypto).
- **C Operator system health:** Live probes card on `/operator/performance` ([`operator-system-health.ts`](src/lib/operator-system-health.ts)).
- **D WhatsApp BRIDGE-WA-001:** Meta `hub.challenge` GET verify in [`chat-bridge`](supabase/functions/chat-bridge/index.ts); setup doc updated. **Redeploy `chat-bridge`.**
- **E AI value metrics:** Admin card proposed/executed/failed/declined + top intents ([`Ai4tValueMetricsCard`](src/components/dashboard/Ai4tValueMetricsCard.tsx)).
- **F Billing recovery:** `invoice.paid` clears `past_due`; Edge [`stripe-billing-portal`](supabase/functions/stripe-billing-portal/index.ts); Settings past-due banner. **Deploy portal + redeploy webhook.**
- **G Migration dating:** [`supabase/migrations/README.md`](supabase/migrations/README.md) explains `202608*` batch prefixes vs July apply dates.
- **H Playwright:** [`e2e/marketplace-dual-role.spec.ts`](e2e/marketplace-dual-role.spec.ts) (skips without E2E_* credentials).

## 2026-07-18 (Asset Map pitch outline tracing)

- **Optional vector outlines** (freeform polygons in % of map canvas) on `/teams` Asset Map Combined/Booked; Separate cards show outline thumbnail when set. Legacy rect JSON migrates to 4-point polygons on read.
- Club display mode **`pitch_display`**: `cells` | `outlines` | `both` (default cells) in **`clubs.asset_map_overlay`**. Bookings stay cell-based.
- Admin draw → drag individual corners, add corners via edge midpoints, remove corner (double-/right-click), rotate ±5°, clear; persist to **`club_pitches.outline`**.
- **Migration `20260803150000_club_pitch_outlines.sql`** (applied on linked remote).
- Lib: **`pitch-outline.ts`** + tests; UI **`asset-map-pitch-outlines.tsx`**; EN/DE labels.

## 2026-07-18 (Asset Map satellite underlay)

- **Club-admin site photo** on `/teams` Asset Map (Combined/Booked): upload bird’s-eye / Google Maps screenshot to `images-clubs/{clubId}/asset-map/…`; opacity, scale, and pan (Align overlay); underlay also behind the element paint grid.
- **Migration `20260803140000_club_asset_map_overlay.sql`** (applied on linked remote): `clubs.asset_map_overlay` JSON (`url`, `opacity`, `scale`, `offset_x`, `offset_y`).
- Lib: **`asset-map-overlay.ts`** + tests; EN/DE upload instructions (no Google Maps API pull).

## 2026-07-18 (Public club gamification — My Progress, streaks, team challenges)

### Phases 1–4 on `/club/:slug`
- **Homepage module `my_progress`:** Member-private progress card (level/XP, streak KPIs, badges, next milestone) with sign-in / join gates; Club Page Admin order/visibility + privacy help.
- **Reports:** Player branch shows training streak + badge strip via progress snapshot.
- **Migration `20260803120000_club_gamification_awards.sql` (applied on linked remote):** Ensures `achievements` table; RLS (SELECT for members, no client INSERT); RPCs `award_member_achievements`, `get_member_progress_snapshot`, `get_team_attendance_challenge`, `set_public_badges_opt_in`, `list_public_opt_in_badges`; column `club_memberships.public_badges_opt_in`.
- **Dashboard:** `AchievementBadges` awards via snapshot RPC (fixes empty badges when players could not INSERT).
- **Team layer:** Anonymous team attendance ranking; trainers get AI 4 T prefill nudge + Messages CTA on low attendance.
- **Polish:** Levels Rookie→Legend; season award hint; adult opt-in public badge strip on team detail (gated by privacy + youth mode).
- **Lib/tests:** `club-member-progress.ts` + unit tests; EN/DE `clubProgress` strings.

### Operator follow-up
- None for SQL (migration applied). Smoke: sign in as member on `/club/:slug` → My Progress; trainer low-attendance nudge; opt-in strip with privacy flags on.

## 2026-07-16 (Product Waves A–E · configurable site banner · matches status UX)

### Product improvements PROD-005…021 (Waves A–E)
- **Wave A:** Admin **week-at-a-glance** card; **`redeem_club_invite`** merges draft **`master_data`** (**`20260802130000`**); trainer **today’s session** card.
- **Wave B:** Weekly digest Edge **`process-weekly-digests`** + member opt-in / admin toggle; AI monthly usage meters + Edge caps; **`MyDuesCard`** + **`dues_payment_claims`** (**`20260802120000`**).
- **Wave C:** Provider request filters/KPIs; engagement pipeline; public **`/providers/:slug`**.
- **Wave D:** Listing moderation; verified/featured; engagement reviews (**`20260802140000`**); distinct **`marketplace:read` / `marketplace:write`**.
- **Wave E:** Join funnel analytics; news draft + **`scheduled_publish_at` / `is_draft`** (**`20260802150000`**); public club PWA install + SW; bilingual Club Page Admin UX helpers.
- **Linked remote:** `supabase db push` applied **`20260802120000`** → **`20260802150000`** (resolves public-club toast **`column announcements.scheduled_publish_at does not exist`**).
- **Hardening:** Public club news query falls back when schedule columns missing; treats those errors as non-fatal.

### Configurable public club site banner
- **`src/lib/club-site-banner.ts`:** `siteBanner` in public page config — enable flag, kinds **promo** / **news** / **event** / **alert** / **sommerfest_live** (legacy **`custom` → promo**), title/subtitle/CTA/href; Allach default Sommerfest when unset.
- **`ClubPageAdmin`:** Homepage **Site banner** card — toggle, type select, apply type/Sommerfest defaults, publish reminder (draft alone does not update live site).
- **`PublicSommerfestTournamentBanner`:** Renders configured strip; per-kind visuals; live match stats only for **`sommerfest_live`**; hides on destination path; normalizes relative hrefs.
- Round-trip covered in **`club-public-page-config.test.ts`** + **`club-site-banner.test.ts`**.

### Matches — mobile-friendly status control
- **`Matches.tsx`:** Match details editor uses a **status button group** (Scheduled / In progress / Completed / Cancelled) instead of a dropdown — 2×2 on mobile, four across on wider screens; same gold selected style as Home/Away.

### Operator follow-up
- Deploy Edge **`process-weekly-digests`** and schedule cron; optional redeploy **`co-trainer`** / **`ai4team-agent`** for AI caps. See **`HOLD.md`**.

## 2026-07-16 (Commercial packaging, German i18n, public club UX, hero tenant isolation)

### Commercial packaging — single source of truth
- **`src/lib/plan-catalog.ts`:** Shared catalog for Kick-off / Squad / Pro / Champions — member/team/storage caps, base + per-member prices (monthly + yearly at 20% off), volume −15% thresholds, feature flags. Helpers: **`calculateCatalogPrice`**, **`suggestPlanForMemberCount`**. AI add-on floor **`AI4T_ADDON_PRICE_MONTHLY = 19`**.
- **`src/lib/plan-limits.ts`:** Derives gates from the catalog (no duplicated cap tables).
- **`src/pages/Pricing.tsx`:** Plans + calculator read catalog; **Pro** highlighted as most popular; calculator defaults **800 members / Pro**.
- **Revised list prices (EUR):** Kick-off €19 + €0.15/member; Squad €39 + €0.25; Pro €79 + €0.30; Champions €149 + €0.40. Caps: 100 / 400 / 1,200 / 5,000 members.
- **Migration `20260801220000_revise_plan_catalog_pricing_limits.sql`:** Applied on linked remote — updates **`public.plans`** base prices + `max_users` / `max_teams`.
- **Docs:** **`GTM_PRICING_PACKAGING.md`** rewritten to match catalog. Tests: **`plan-catalog.test.ts`**.
- **Follow-up:** Align Stripe Dashboard price IDs with new amounts if checkout is live.

### German i18n — comprehensive pass
- **`src/i18n/de.ts`** + **`src/i18n/operator/de.ts`:** Key parity with EN (~4,229 keys); fixed missing **`openFullRegistry`**, **`aboutPage.heroLine4`**, **`supplierPortal.saveChanges` / `saving`**; translated leftover English UI; bulk umlaut restoration (`öffentlich`, `Änderungen`, `München`, etc.); partner **Engagements** → **Aufträge**; External Bridge FAQ → **Externe Bridge**; Control Center → **Kontrollzentrum**.
- Upload error fallbacks use i18n strings (**`Settings`**, **`Members`**, **`ClubPageAdmin`**, account settings modal).

### Public club — profile menu + account settings
- **`public-club-profile-menu.tsx`:** Profile dropdown aligned with team-filter glass styling (**`clubPublicDropdownContentClass`**).
- **`public-club-account-settings-modal.tsx`:** In-page account settings (name, avatar, phone, password reset); portaled to **`document.body`**, centered, body scroll lock (fixes header-fixed clipping).
- Invite accept modal: dismiss persistence, strip **`?invite=`**, contrast fix on Close.

### Neutral hero defaults + tenant isolation
- **`club-hero-default-assets.ts`:** Platform defaults are **neutral** PNGs under **`public/assets/club-hero-defaults/`** (no TSV Allach camp photo bleed).
- Shipped five neutral assets; tests **`club-hero-default-assets.test.ts`**, **`club-tenant-isolation.test.ts`**.
- **`PLACEHOLDER_ASSETS_TODO.md`:** Assets present; keep pilot photography out of defaults.

### Teams, AI branding, Allach membership, marketing
- **`Teams.tsx`:** Edit-team member picker searches full club roster (name/email) via **`list_club_membership_emails`**.
- **AI 4 T branding:** **`Ai4TInlineLabel` / `Ai4TTitleIcon`** on dashboard shortcuts, usage card, Co-Trainer/AI headers, Tasks, mobile nav.
- **TSV Allach membership form:** Annual fee amounts by package + €30 registration; removed promotional bank-step intro.
- **`FeaturesSection.tsx`:** Larger feature card title/description for mobile readability.

## 2026-07-08 (Plan gate UX + guided setup team creation fix)

### Plan gate — upgrade screen UX (`PlanGate`)
- **`src/components/plan-gate.tsx`:** Replaced lock icon with **ONE4Team logo + gold star badge** (matches operator header branding pattern) on the upgrade-required screen shown when a club lacks a feature (e.g. AI 4 T on Kickoff).
- **Contact ONE4Team:** Secondary outline button under **View Plans** opens a prefilled **`mailto:support@one4team.com`** with localized subject/body referencing the locked feature and current plan name.
- **`src/lib/plan-limits.ts`:** Added **`getFeatureDisplayName()`** for human-readable feature labels in support email copy (e.g. `ai` → **AI 4 T**).
- **i18n:** **`planGate.contactSupport`**, **`contactEmailSubject`**, **`contactEmailBody`** in EN/DE.

### Fix: Guided setup “Create your first team” failed (`Failed to create team`)
- **`src/pages/GuidedSetup.tsx`:** Removed **`is_active: true`** from the client-side **`teams`** insert — the table has **no `is_active` column** (same class of bug as the **`create_club_with_admin`** RPC fix in migration **`20260801210000`**). PostgREST returned `undefined_column` → generic toast **Failed to create team**.
- **Client-only fix** — no new migration required; takes effect on next deploy.

## 2026-07-08 (Club creation hotfix — teams.is_active)

### Fix: `create_club_with_admin` 400 (`column "is_active" of relation "teams" does not exist`)
- **Migration `20260801210000_repair_create_club_with_admin_teams_is_active.sql`** (applied to remote `qbtunzuztvnkerbdazjs`).
- Root cause: the RPC seeded a default team via `INSERT INTO public.teams (club_id, name, age_group, is_active)`, but `teams` has **no `is_active` column** (columns: `id, club_id, name, sport, age_group, coach_name, league, public_*`, timestamps). Missing column → `undefined_column` (42703) → HTTP 400, aborting the whole RPC. The seed blocks only trapped `undefined_table`, not `undefined_column`.
- Yesterday's repair (`20260707190000`) fixed the earlier **409** duplicate `club_role_assignments` insert, which had been failing *before* the teams insert — so fixing it unmasked this pre-existing 400.
- **Fix:** removed `is_active` from the teams insert (uses `club_id, name, age_group` only) and broadened every optional-seed block to also swallow `undefined_column` / other seed errors so best-effort default data (team, announcement, billing, shop categories) can never block core club + admin membership creation.
- Verified live: teams insert is now `INTO public.teams (club_id, name, age_group)`.

## 2026-07-08 (Operator Control Center — financials, charts, UX polish)

### Operator Control Center — `/operator`
- **Financials (`/operator/financials`):** Revenue (MRR/ARR/ARPU), profitability, and **development investment** sections with editable **cost model** (itemized subscriptions, usage drivers, save + comment history in `localStorage`).
- **Development build cost model:** Estimate one-time app build investment by **lines of code × cost/line** (measured LOC from `src/generated/app-loc.json`, historically documented ~84k then ~157k) or **man-days × daily rate** (default 400 × €600); method toggle in cost model card; feeds **Total invested** and net position.
- **Charts (Recharts):** Cumulative **Investment vs revenue** timeline (operating spend, **purple development** line, revenue, sign-colored net); **Monthly cost breakdown** pie; **Revenue by plan** stacked bar (paying MRR + trial pipeline); **Club growth** area + **Club status** pie on Overview; **Active users** + **Module usage** bars on Analytics.
- **Chart UX:** Interactive legends (click to highlight/dim series); **series visibility toggles** on investment timeline (show/hide operating, development, revenue, net — net recalculates from visible cost lines only); high-contrast tooltips (`--popover` / `--popover-foreground`); legend label text forced to **`--foreground`** (not slice color) on all operator charts.
- **Metric cards:** Info bubbles (ⓘ) with calculation hints; **Euro** icons for currency metrics (DE/EU market).
- **Mobile layout (`/operator`):** Operator cards use **`min-w-0`** so chart legends and tables do not overflow narrow viewports; chart card content constrained; overview club date columns **`whitespace-nowrap`**; bottom nav horizontal scroll on phone.
- **Legal (`/operator/legal`):** Editable document body + PDF preview tabs; two-column signature layout in preview and PDF export; pinned ink colors on light preview surface (readable in dark theme).
- **i18n:** Full EN/DE for operator pages (performance, issues, audit, support, settings, financials, legal, charts, cost model).
- **Layout fixes:** German label wrapping on Performance **App-Status** cards; Compliance badge overflow on Legal template list.

### Operator shell UX
- **`OperatorLayout.tsx`:** Scroll container resets to **top on route change** (operator pages scroll inside layout, not `window`).
- **`tooltip.tsx`:** `TooltipContent` rendered via **Radix Portal** + `collisionPadding` so metric info bubbles are not clipped by card `backdrop-blur` stacking contexts.

### Lib + tests
- **`src/lib/operator-financials.ts`:** `DevelopmentModel`, `computeDevelopmentCost`, `buildInvestmentTimeline` (cumulative operating + development), cost model snapshot/history, legacy flat-cost migration.
- **`src/components/operator/charts/`:** `OperatorChartCard`, `InvestmentTimelineChart`, `CostBreakdownPie`, `RevenueByPlanBar`, `ClubGrowthArea`, `CategoryPie`, `SimpleBarChart`.
- **`src/lib/operator-financials.test.ts`:** Development cost + timeline tests (18 cases).

### Documentation
- **`MEMORY_BANK.md`**, **`PROJECT_STATUS.md`**, **`docs/operator-control-center.md`**, **`docs/operator-control-center-qa.md`**, **`README.md`** — investment timeline series toggles, mobile layout, man-days terminology.

### Operator smoke
- **Financials:** Development line visible on timeline; **Show lines** toggles hide/show series (net recalculates); pie/bar legends readable in dark mode; info tooltips fully visible; navigation starts at page top.
- **Mobile (~390px):** Operator cards fit viewport (no chart-card horizontal overflow); bottom nav scrolls; Performance DE labels wrap cleanly.
- **Legal:** Edit tab → preview/PDF; club signature column on the right.

## 2026-07-07 (Dashboard mobile polish, AI 4 T UX, Messages, Asset Map, chat-bridge CORS)

### Dashboard mobile shell (iOS-like)
- **`DashboardLayout.tsx`:** Fixed `inset-0` shell; inner **`.dashboard-scroll-area`** as single scroll region below top bar.
- **`MobileBottomNav.tsx`:** Always mounted (`md:hidden`); **`ResizeObserver`** sets **`--dashboard-bottom-clearance`**; sync **`useIsMobile`** init to reduce hydration flash.
- **`index.css`:** Mobile dashboard typography polish; **`.dashboard-header-actions`** 44px utility targets; **`data-dashboard-chat-shell`** / **`data-dashboard-messages-shell`** full-height flex shells (scroll inside message list, not page).
- **`dashboard-page-shell.ts`:** Shared tokens — **`DASHBOARD_TYPE_*`**, **`DASHBOARD_IOS_SEGMENT*`**, **`DASHBOARD_TOOLBAR_BUTTON`**, **`DASHBOARD_HEADER_*`**.
- **New:** **`DashboardIosSegmentTabs.tsx`**, **`DashboardToolbarActions.tsx`** — iOS segment tabs + overflow toolbar on **`Matches`**, **`Settings`**, **`Teams`**.
- **`DashboardTopBar.tsx`**, **`NotificationBell.tsx`**, **`AppHeader`**, theme/language toggles — aligned header icon sizing; notification panel portaled to **`document.body`** with mobile-safe inset.
- **`use-mobile.tsx`:** Sync initial viewport match on first paint.

### AI 4 T (`/co-trainer`) — mobile layout
- **`CoTrainer.tsx`:** Compact mobile empty state (welcome + horizontal suggestion chips); workspace metadata card **hidden on mobile**; subtitle hidden on compact header; **`DashboardIosSegmentTabs`** for Chat/Agent/History; full-height **`data-dashboard-chat-shell`**; fixed bottom **`Ai4tChatComposer`**.
- **`Ai4tChatComposer.tsx`:** Dashboard variant — **red-bordered** input row (AI 4 T only); shared composer for Chat + Agent tabs.
- **`ai4t-tab-classes.ts`:** Taller mobile tab strip; **`ai4t-dashboard-tab-icon`** sizing in CSS.
- Header **New chat** button uses **`DASHBOARD_HEADER_UTILITY_BUTTON`** (44px on phone).

### Messages (`/communication`) — dashboard mobile
- **`Communication.tsx`:** **`data-dashboard-messages-shell`**; channel sidebar **hidden below `lg`**; mobile channel **`<Select>`**; compact search/pagination; fixed bottom composer with **gold/primary** ONE4Team border (not red); subtitle hidden on mobile.

### Teams — Asset Map mobile
- **`Teams.tsx`:** iOS segment tabs for Separate/Combined/Booked; pitch cards stack/wrap on mobile; grid **`min-w-0`** + horizontal scroll guards; JSX structure fix for separate-view grid wrappers.

### Edge — chat-bridge CORS
- **`chat-bridge/index.ts`:** **`Access-Control-Allow-Headers`** includes **`x-correlation-id`** (fixes browser preflight from **`correlationHeaders()`** in Communication).
- **`_shared/cors.ts`:** Also allows **`x-bridge-secret`** in shared header list.
- **Deployed:** `supabase functions deploy chat-bridge` on linked project.

### DB repairs (migrations in repo)
- **`20260707190000_repair_create_club_with_admin_role_assignment.sql`** — fix duplicate role assignment 409 on club creation.
- **`20260707200000_repair_marketplace_requests_rls_recursion.sql`** — marketplace 500 RLS recursion fix.

### Tests + onboarding
- **`onboarding-club.ts`** + **`onboarding-club.test.ts`** — club creation helper + unit tests.
- **`use-marketplace.ts`**, **`Onboarding.tsx`** — related onboarding/marketplace fixes.

### Operator smoke
- **Phone:** AI 4 T — chat fills viewport; composer pinned; tabs readable; Messages — channel dropdown + fixed composer; bottom nav does not cover content.
- **Desktop:** AI 4 T / Messages / Teams layouts unchanged from prior desktop behavior.
- **Communication:** Admin External Bridge panel loads without CORS error (after **`chat-bridge`** redeploy).

### Documentation sync
- **`MEMORY_BANK.md`**, **`PROJECT_STATUS.md`**, **`TASKS.md`**, **`HOLD.md`**, **`README.md`**, **`ROADMAP.md`**, **`docs/PROJECT_COMPREHENSIVE_AUDIT.md`**, **`ops/PRODUCTION_READINESS_ARTIFACTS.md`**, **`ops/PRODUCTION_READINESS_EVIDENCE_LOG.md`**.

## 2026-07-07 (Legal audit, marketing polish, UX fixes)

### Legal pages — GDPR / EU AI Act audit
- **`privacyPage` / `termsPage` (EN + DE):** Last updated **July 1, 2026**; expanded data categories (AI interaction data, Stripe card handling); new **§5 Sub-processors & integrations** (Supabase, Vercel, Stripe, AI 4 T providers, transactional email, optional External Bridge); **§11 AI 4 T and automated processing** (Privacy); **§14 AI-assisted features (AI 4 T)** (Terms); renumbered sections (Privacy **13**, Terms **15** incl. severability).
- **`cookieConsent.yourPrivacyBody`:** Clarifies AI 4 T is not controlled via cookie categories; see Privacy Policy.
- **`TASKS.md`:** **P10-010f** complete; operator todos **LEGAL-OPS-001** (full postal address) and **LEGAL-OPS-002** (HRB number) added.

### Legal pages — UI flicker fix
- **`index.css`:** **`.legal-panel`** — stable card surface without `backdrop-filter` or inset highlight (avoids sub-pixel top-edge shimmer on long-form legal pages).
- **`Privacy.tsx`**, **`Terms.tsx`**, **`Impressum.tsx`:** Section cards use **`legal-panel`**; **`FadeInSection`** scroll-in uses **opacity only** (no `y` transform) to prevent compositing artifacts.

### Marketing — trial, pricing add-ons, copy
- **41-day free trial** across EN/DE pricing and FAQ copy (was 14/45 days in some strings).
- **`Pricing.tsx`:** Three add-on cards (Payments, Pro Comms, **AI 4 T**) — aligned layout, centered **Book/Buchen** CTAs; **AI 4 T** card with **`Ai4TIntroLogoVideo`**, EUR 4/mo, red highlight + gold hover; removed **Add-on** prefix from card titles.
- **`pricingPage.freeTrialCountSuffix`:** German counter uses **Tage** (not English **days**).
- **`aboutPage` (EN):** Hero reformulated to four lines; **`About.tsx`** renders optional **`heroLine4`**.
- **`Features.tsx`:** AI innovation hero extracted to **`Ai4TInnovationHeroCard.tsx`**.

### Support contact + auth UX
- **Support email** standardized to **`support@one4team.com`** (i18n, **`Footer`**, **`SupportFaq`**, **`test-mode-banner`**, **`.env.example`**). QA SQL scripts that lookup test user by legacy email unchanged.
- **`AppHeader`:** Optional **`logoHref`** — **`Auth.tsx`** logo/title navigates home (`/`).
- **`ScrollToTop.tsx` + `App.tsx`:** Scroll to top on route change.

### Matches — mobile layout
- **`Matches.tsx`:** **`MATCH_DETAIL_FIELD_CLASS`** — consistent alignment for match detail fields including **`datetime-local`** on mobile.

### Documentation sync
- **`MEMORY_BANK.md`**, **`PROJECT_STATUS.md`**, **`TASKS.md`**, **`HOLD.md`**, **`README.md`**, **`ROADMAP.md`**, **`docs/PROJECT_COMPREHENSIVE_AUDIT.md`**, **`ops/PRODUCTION_READINESS_ARTIFACTS.md`**, **`ops/PRODUCTION_READINESS_EVIDENCE_LOG.md`**.

## 2026-07-06 (Sommerfest kickoff sync, tournament info, mobile club messaging)

### Sommerfest — match kickoff time sync
- **`tsv-allach-sommerfest-match-sync.ts`:** Berlin timezone helpers — **`sommerfestDatetimeLocalToIso`**, **`sommerfestIsoToDatetimeLocal`**, **`sommerfestEffectiveKickoffTime`**, **`sommerfestBerlinTimeLabel`** — fixes datetime-local save/read drift (UTC vs Europe/Berlin).
- **`Matches.tsx`:** Sommerfest-linked matches normalize kickoff on save; **`editMatchDate`** syncs after persist; **`sommerfestDbMatches`** passed to schedule component.
- **`sommerfest-match-schedule.tsx`:** Groups fixtures by **effective kickoff** (DB **`match_date`** when saved, else template default).
- **`public-sommerfest-tournament-board.tsx`:** Live board time buckets use persisted kickoff, not static template time only.
- Tests: **`tsv-allach-sommerfest-match-sync.test.ts`** (round-trip + effective kickoff label).

### Sommerfest — tournament regulations info
- **`sommerfest-regulations-info-button.tsx`:** **Info** popover beside **Share tournament** — match durations (Kleinfeld 25 min, Kompaktfeld 2×25, Damen 2×25, Herren 2×30).
- **`sommerfest-hero.tsx`:** Share + Info button row when **`shareUrl`** set.
- i18n **`sommerfest2026.regulations*`** (EN/DE).

### Public club — mobile Communication modal
- **`Communication.tsx` (embedded):** On mobile, channel sidebar hidden; channel **`<Select>`** in header; compact search/pagination (pagination row hidden when single page); message thread **`min-h-0 flex-1`** so chat history is readable.
- **`public-club-communication-modal.tsx`:** **`100dvh`** on phone; slimmer header/footer (footer hint desktop-only).

### Operator smoke
- **Matches → Sommerfest fixture:** Change kickoff to 11:00 → save → reopen **Spieldetails** — time stays 11:00; schedule overview matches.
- **Tournament page:** **Info** next to **Share tournament** shows duration rules.
- **Public club → Open Messages (phone):** Channel dropdown visible; message bubbles scroll between search and composer.

### Documentation sync
- **`MEMORY_BANK.md`**, **`PROJECT_STATUS.md`**, **`TASKS.md`**, **`HOLD.md`**, **`README.md`**, **`ROADMAP.md`**, **`docs/TSV_ALLACH_CLUB_PAGE_CHECKLIST.md`**, **`docs/PROJECT_COMPREHENSIVE_AUDIT.md`**.

## 2026-07-06 (Bug investigation remediation — CI, messaging, auth, quality)

### Communication — pagination count fix
- **`communication-pagination.ts` + tests:** **`resolveMessagePaginationCount`** and **`messagePaginationRange`** — fallback when Supabase `{ count: "exact" }` is 0/null but rows load; display never contradicts visible messages on page 1.
- **`Communication.tsx`:** Head-only count query when primary count is zero; localized pagination footer (EN/DE).

### Navigation, AI 4 T, tests, marketplace
- **`dashboard-nav.ts`:** Removed duplicate **`/reports`** / **`/player-stats`** keys in **`pathnameToNavId`** (Vite duplicate-key warning).
- **`public-club-ai4t-modal.tsx`:** Renamed **`usePromptInChat`** → **`applyPromptInChat`** (ESLint rules-of-hooks).
- **`resolve-cancel-activity.test.ts`:** **`vi.setSystemTime(2026-06-24)`** — stabilizes **`date_hint: "today"`** (no longer date-flaky in CI).
- **`marketplace-access.ts`:** **`CLUB_TAB_PERMISSION`** map replaces grouped switch (ESLint **`no-fallthrough`**).

### Auth, i18n, Supabase client guard
- **`Settings.tsx`:** Password reset uses **`redirectTo: ${window.location.origin}/auth`** (aligned with magic links; origin-based by design).
- **`communicationPage` i18n:** **`messagesPaginationEmpty`**, **`messagesPaginationRange`**, **`paginationPrevious`**, **`paginationNext`** (EN/DE).
- **`SupabaseConfigBanner.tsx` + `App.tsx`:** Dev banner when **`VITE_SUPABASE_*`** missing; prod blocking config screen instead of silent **`placeholder.supabase.co`**.
- **`client.ts`:** **`isSupabaseConfigured()`** export.

### Ops docs + test infrastructure
- **`docs/PRODUCTION_RELEASE_CHECKLIST.md`:** Auth URL checklist (Site URL, redirect URLs, origin-based invites/magic links); post-investigation smoke items.
- **`docs/RLS_INTEGRATION_TEST.md`:** Env vars + local run instructions.
- **`.github/workflows/rls-integration.yml`:** Optional **`workflow_dispatch`** RLS job (secrets-gated).
- **`TASKS.md` / `HOLD.md`:** **`OPS-AUTH-URL-001`** operator track.

### E2E, lint, bundles, hero assets
- **`e2e/fixtures/auth.ts`:** Shared **`loginAsE2eUser`** for **`E2E_AI4T_EMAIL`** / **`E2E_AI4T_PASSWORD`**; **`ai4t-smoke.spec.ts`** enabled when creds set.
- **ESLint:** All errors/warnings cleared (**`npm run lint`** green with **`--max-warnings 0`**); hook-deps fixes across dashboard/public-club/matches; **`eslint.config.js`** context/ai react-refresh override.
- **`DashboardContent.tsx`:** Lazy-load **`AnalyticsWidgets`** (charts chunk deferred).
- **`club-hero-default-assets.ts`:** Interim fallback image path until final neutral PNGs ship under **`public/assets/club-hero-defaults/`**.

### Verification
- **`npm run lint`**, **`npm test`** (309 passed), **`npm run build`**, **`npm run budget:bundle`** — green.

### Operator smoke (post-deploy)
- Embedded club chat — pagination label matches visible messages (not “0 messages” when rows shown).
- **`/reports`** / **`/player-stats`** — correct sidebar highlight.
- Settings → password reset from production domain — link uses same origin **`/auth`** (whitelist in Supabase Redirect URLs).
- Open app on **`https://www.one4team.com`** before sending invites/magic links (origin-based URLs unchanged).

### Documentation sync
- **`MEMORY_BANK.md`**, **`PROJECT_STATUS.md`**, **`TASKS.md`**, **`HOLD.md`**, **`README.md`**, **`ROADMAP.md`**, **`docs/PROJECT_COMPREHENSIVE_AUDIT.md`**, **`docs/TSV_ALLACH_CLUB_PAGE_CHECKLIST.md`**, **`ops/PRODUCTION_READINESS_ARTIFACTS.md`**, **`ops/PRODUCTION_READINESS_EVIDENCE_LOG.md`**.

## 2026-07-05 (Public messaging forward/share, microsite polish, Sommerfest mobile refinements)

### Public club — embedded Communication UX
- **`Communication.tsx` + `public-club-glass-classes.ts`:** Embedded chat composer and message search use **`clubEmbeddedLightInputShellClass`** / **`clubEmbeddedLightInputFieldClass`** — fixes white-on-white typed text in the public club Communication modal.
- **`message-forward-button.tsx` + `share-utils.ts`:** **Forward** action on each chat message — native share (when available), **WhatsApp**, **Copy message**. Forwarded text header: **`Message forwarded from ONE4Team - {club}`** with **From:** and **Team:** attribution lines. Club name from DB fetch or **`clubNameOverride`** in embedded modal.
- **`clubModalPopoverContentClass` (`z-[80]`):** Forward dropdown renders above Communication modal (`z-[60]`) and nested dialogs; right-aligned bubbles use **`menuAlign="end"`** + **`side="top"`**.
- **`sommerfest-share-button.tsx`:** WhatsApp / resolve URL helpers moved to shared **`share-utils.ts`**.

### Public club — microsite polish
- **`public-club-team-detail-page.tsx`:** Mobile duplicate **Join team** / **Contact club** CTAs removed (hero buttons hidden on small screens; mobile block below card kept).
- **`announcement-detail-view.tsx`:** Delete announcement hover uses **`hover:bg-destructive hover:text-destructive-foreground`** (readable on embedded light modal).
- **`public-club-section.tsx`:** Shared section container **`max-w-6xl`**, symmetric padding, **`text-left`** — fixes off-center news/content on mobile; navbar/footer use same **`publicClubSectionContainer`**.
- **`de.ts`:** Public home **AI 4 T** section title localized (**`ai4teamPublicTitle`**).
- **`en.ts` / `de.ts`:** Messages CTA **`messagesCtaSignedIn`** → **Open Messages** / **Nachrichten öffnen**.

### Sommerfest 2026 — mobile hero + board
- **`sommerfest-hero.tsx` + `index.css`:** Mobile uses **club logo** (circular, live red pulse behind logo) instead of cropped poster; desktop keeps poster + **`lg:grid`** layout; removed redundant calendar date pill (date in top badge); **`useOptionalPublicClub()`** for logo fallback.
- **`public-sommerfest-tournament-board.tsx`:** Pitch category filters — **`grid grid-cols-5`** on all breakpoints; compact mobile labels; count badges removed.
- **`en.ts`:** Shorter pitch filter labels (**Small**, **Compact**).

### i18n — message forward
- **`communicationPage`:** **`forwardMessage`**, **`forwardMessageHeader`**, **`forwardMessageFrom`**, **`forwardMessageTeam`**, **`shareViaNative`**, **`shareViaWhatsApp`**, **`shareCopyMessage`**, **`messageCopied`**.

### Documentation sync
- **`MEMORY_BANK.md`**, **`PROJECT_STATUS.md`**, **`TASKS.md`**, **`HOLD.md`**, **`README.md`**, **`docs/TSV_ALLACH_CLUB_PAGE_CHECKLIST.md`**, **`docs/PROJECT_COMPREHENSIVE_AUDIT.md`**, **`ops/PRODUCTION_READINESS_ARTIFACTS.md`**.

### Operator smoke
- **Public club → Open Messages → team channel:** Type in composer — text visible (dark on white); tap **Forward** on a message — menu above modal; WhatsApp prefill shows ONE4Team header + sender + team.
- **Mobile team detail:** Single CTA row for join/contact.
- **Sommerfest tournament (phone):** Hero shows club logo + pulse; pitch filters fit one row.
- **News section (mobile):** Content aligned with page padding.

## 2026-07-05 (Sommerfest tournament UX polish, public AI 4 T RBAC, match detail fix)

### Sommerfest 2026 — public tournament page UX
- **`sommerfest-hero.tsx`:** Poster flush to hero right edge (full-height **`object-cover`**); **Share tournament** button (**`sommerfest-share-button.tsx`**, native share / WhatsApp / copy link); mobile side-by-side text + poster; left-aligned title/description on small screens.
- **Live hero backlight:** Pulsating red glow when matches are **`in_progress`** or tournament day in progress (**`hasSommerfestLiveMatches`**, **`isSommerfestTournamentInProgress`**); glow uses poster **left-edge contour** (outward box-shadow only — never tints the image).
- **`public-sommerfest-tournament-board.tsx`:** Five KPI stats (Live / Finished / Upcoming / Total / **Goals**); high-contrast **live red** styling (Live stat, score pills, **Jetzt live** block, match rows) via **`index.css`** **`.sommerfest-tournament-*-live-*`** utilities; **team logos** on match cards (**`sommerfestSlotSideLogos`**, opponent logo lookup); away team **right-aligned** with icon; compact mobile time-group cards; sticky category filters (single row); mobile **fixed bottom live bar** with horizontal swipe.
- **`public-club-messages-hub.tsx` + CSS:** When live bar visible, Messages FAB **icon-only**, lifted above bar (no overlap with live score cards).
- **`tsv-allach-sommerfest-competition.ts`:** **`sommerfestSlotSideLogos`**, **`buildSommerfestOpponentLogoLookup`**; tournament fetch includes **`opponent_logo_url`**.

### Public club — AI 4 T role-based access
- **`public-club-ai-role.ts`:** Maps membership role → guide prompts, agent tab visibility, context scope; unit tests **`public-club-ai-role.test.ts`**.
- **`public-club-ai4t-modal.tsx`:** Signed-in users see **Guide** prompts for their role only; Agent tab hidden for non-trainer/admin.
- **`Ai4tEmbedChat.tsx`:** Club embed passes role-scoped context; **`variant="club"`** composer styling.
- **`Ai4tChatComposer.tsx`**, **`AiAgentWorkspace.tsx`:** Light club styling on public modal / compact composer (no dark/black input bar).
- **`supabase/functions/co-trainer/index.ts`**, **`ai4team_scope.ts`:** Server resolves club role (admin/trainer RPCs + membership); role-specific system prompts for co-trainer. **Operator:** redeploy **`co-trainer`** Edge function for production RBAC prompts.

### Bug fixes
- **`public-club-match-detail-page.tsx`:** Fixed **`enabled` before initialization** ReferenceError (SEO effect used `enabled` before declaration).

### Sommerfest live pulse
- **`sommerfest-live-pulse.ts`:** **`hasSommerfestLiveMatches()`** for hero glow and live-first UX; tests extended in **`sommerfest-live-pulse.test.ts`**.

### i18n
- **`en.ts` / `de.ts`:** Tournament share strings, goals stat, mobile live swipe hint, guide role copy; removed trailing hero description suffix.

### Documentation sync
- **`MEMORY_BANK.md`**, **`PROJECT_STATUS.md`**, **`TASKS.md`**, **`HOLD.md`**, **`README.md`**, **`ROADMAP.md`**, **`docs/TSV_ALLACH_CLUB_PAGE_CHECKLIST.md`**, **`docs/PROJECT_COMPREHENSIVE_AUDIT.md`**, **`docs/PRODUCTION_RELEASE_CHECKLIST.md`**.

### Operator smoke
- **`/club/tsv-allach-09/tournament/sommerfest-2026`:** Kick off a match in **Matches** → Live stat + hero glow + bottom live bar; share button; team icons on cards.
- **Mobile:** Scroll schedule with live matches — Messages bubble compact above live bar.
- **Public match detail:** Open a published Sommerfest fixture URL — page loads without console error.
- **AI 4 T modal (signed-in player):** Agent tab hidden; Guide shows player prompts only.
- **Deploy:** **`co-trainer`** Edge after pull if public AI role prompts not yet live in Supabase.

## 2026-07-03 (Member invite UX, social previews, Sommerfest banner, dashboard club return)

### Dashboard navigation fix
- **`use-permissions.ts`**, **`require-module.tsx`**, **`dashboard-nav.ts`**, **`App.tsx`:** Club admin sidebar links no longer redirect every item to `/dashboard/club_admin`; persona routes resolve correctly.

### Member invite — public club page flow
- **Invite links:** Email and copy-link targets **`/club/{slug}?invite=TOKEN`** (not `/onboarding`). **`club-invite-links.ts`**, **`send-club-invite-email`** Edge, Resend template.
- **Request invite modal:** Improved contrast on club hero (white-glass pattern). **`public-club-request-invite-modal.tsx`**.
- **Pre-filled accept modal:** **`PublicClubMemberInviteAcceptModal`** auto-opens on `?invite=`; **`preview_club_invite`** RPC (migration **`20260731230000`**); lib **`club-invite-preview.ts`**.
- **Signup without Supabase confirmation email:** Edge **`complete-club-invite-signup`** creates/confirms user, redeems invite, sends branded **welcome email** via Resend (**`_shared/club_welcome_email.ts`**). Migration **`20260731240000_get_auth_user_id_by_email.sql`**.
- **Password fields:** Eye toggle on invite modal password inputs.
- **Post-join UX:** Congratulations step with **View club page** + **Open dashboard** (no auto-redirect). **`public-club-member-invite-accept-modal.tsx`**.

### Dashboard — return to public club page
- **`DashboardTopBar`:** **Club page** link for members with active club (existing).
- **Session return context:** **`public-club-return.ts`** stores browsed public club in `sessionStorage`; **`use-dashboard-club-page-link.ts`** shows **Club page** in dashboard header/mobile menu when user opened dashboard from a club page without membership. **`public-club-context.tsx`** persists context on public club load.

### Club-branded social sharing + iOS shortcuts
- **`middleware.ts`:** Social crawlers on **`/club/*`** receive server-rendered HTML.
- **`api/club-social-preview.ts`**, **`api/_lib/club-social-html.ts`:** Club **`og:title`**, description, image from DB.
- **`public-club-document-head.tsx`:** Client **`apple-touch-icon`** + **`apple-mobile-web-app-title`** from club logo/name.
- **Tests:** **`club-social-preview-html.test.ts`**.

### Sommerfest tournament banner — attention animation
- **`public-sommerfest-tournament-banner.tsx`:** Professional draw-attention motion (gradient shift, light sweep, gold accent line, icon ring pulse, CTA nudge).
- **`index.css`:** **`.sommerfest-public-banner`** utilities; live/festival variants; **`prefers-reduced-motion`** respected.

### Supabase (operator)
- **`20260731230000_preview_club_invite.sql`** — token preview for invite accept modal.
- **`20260731240000_get_auth_user_id_by_email.sql`** — invite signup helper.
- Deploy Edge: **`complete-club-invite-signup`**, redeploy **`send-club-invite-email`** if invite URL template changed.

### Documentation sync
- **`MEMORY_BANK.md`**, **`PROJECT_STATUS.md`**, **`TASKS.md`**, **`HOLD.md`**, **`README.md`**, **`ROADMAP.md`**, **`docs/TSV_ALLACH_CLUB_PAGE_CHECKLIST.md`**, **`docs/PROJECT_COMPREHENSIVE_AUDIT.md`**, **`docs/PRODUCTION_RELEASE_CHECKLIST.md`**.

### Operator smoke
- **`/club/tsv-allach-09?invite=…`:** Modal opens with admin pre-filled data; set password → join → congratulations → club page / dashboard.
- **Logged-in non-member:** Browse club page → **Open Dashboard** → **Club page** link visible in dashboard menu.
- **WhatsApp share:** Facebook Sharing Debugger refresh after deploy; club logo in preview (not generic ONE4Team).
- **iPhone shortcut:** Re-add home screen icon after deploy for club **`apple-touch-icon`**.
- **Sommerfest banner:** Visible animation on **`/club/tsv-allach-09`**; reduced motion disables animation.

## 2026-07-01 (AI 4 T pilot UX P4-002, dark-mode composer, Sommerfest fix, copy polish)

### AI 4 T — pilot UX batch (**AI4T-P4-002**)
- **Persona safety:** Agent tab hidden for player/member personas; **`canUseClubAgentWorkflows`** + gate role in **`ai-agent-context.tsx`** / **`CoTrainer.tsx`**.
- **Scoped context — `ai-context.ts`:** `staff` / `player` / `member` / `public` scopes; team ID filter; member = events + announcements only; public embed respects `?team=`.
- **Chat UX:** `prepareChatMessagesForApi` thread trim; **`Ai4tFollowUpChips`** after replies; **`mapCoTrainerEdgeError`** (rate limit, plan gate, API key) with DE/EN + Settings link in **`CoTrainer.tsx`** and **`ai-4-t-chat-stream.ts`**.
- **Persona hint:** **`Ai4tPersonaHint`** when user has multiple dashboard personas.
- **Public modal:** Guide tab role can/cannot lists; **`homeTeamFilterId`** passed to **`Ai4tEmbedChat`**.
- **History:** Agent run filters by intent and status in Co-Trainer History tab.
- **Admin dashboard:** **`Ai4tAdminUsageCard`** surfaces **`get_club_ai_usage_stats`** (7-day window).
- **Partner portal:** **`buildPartnerAiContext()`** injects listing, open requests, offers into partner chat context.
- **Ops / release:** `supabase/scripts/ai4t_review_negative_feedback.sql`, `ai4t_agent_smoke_checklist.sql`; **`docs/AI4T_RELEASE_REVIEW.md`** (shipped vs deferred); **`e2e/ai4t-smoke.spec.ts`** (skipped pending auth fixtures); tests **`ai4t-pilot-ux.test.ts`**.

### AI 4 T — Agent composer dark mode
- **`Ai4tChatComposer`:** `variant="dashboard"` uses theme tokens (`bg-card`, `border-border`, `text-muted-foreground`); `frameless` when nested in Agent card.
- **`AiAgentWorkspace`:** Full and compact Agent footers use dashboard variant; no white input/mic/speaker buttons on dark dashboard.

### Sommerfest live banner
- **`sommerfest-live-pulse.ts`:** `sommerfestBannerMatchStats()` counts completed/in-progress only after match kickoff time (fixes premature “2 of 22” before tournament day).
- **`public-sommerfest-tournament-banner.tsx`:** Generic subtitle before event day; uses stats helper.
- **`tsv-allach-sommerfest-competition.ts`:** Republish preserves existing row **`status`**.
- **Tests:** **`sommerfest-live-pulse.test.ts`**.

### Copy polish (em dash removal)
- Bulk EN/DE i18n reformulation; marketplace/supplier/AI prompt strings; UI placeholders `"—"` → `"-"` across components; **`index.css`** comment cleanup.

### Documentation sync
- **`MEMORY_BANK.md`**, **`PROJECT_STATUS.md`**, **`TASKS.md`** (**AI4T-P4-002**), **`HOLD.md`**, **`README.md`**.

### Operator smoke
- Dark mode **AI 4 T → Agent:** composer matches Chat tab styling (no white bar).
- **Player persona:** Agent tab absent; chat context team-scoped.
- **Sommerfest banner** before 11 Jul 2026: no false “matches completed” count.
- Club admin dashboard: **AI 4 T this week** usage card visible.

## 2026-07-01 (Persona data scoping — player/member + public Live Scores UI)

### Persona-gated messages and tasks (client)
- **`useModuleGateRole`:** **`Communication.tsx`**, **`Tasks.tsx`**, and **`public-club-messages-hub.tsx`** use active dashboard persona (Settings role switch), not raw membership admin flag — dual-role users must pick **Player** or **Member** persona for scoped views.
- **Messages — `club-message-access.ts`:** **`buildMessageAccessFromGateRole()`** + **`canViewChatMessageRow()`**. **Player:** team channels only (`teamScopedOnly`); no Club General. **Member:** club-wide only (`clubWideOnly`) — Announcements + Club General; no team channels, trainers channel, or team-scoped announcements.
- **Tasks — `club-task-access.ts`:** **`buildTaskAccessFromGateRole()`** + **`filterClubTasksForUser()`**. **Player:** own assigned tasks only (`scope: "own"`). **`use-club-tasks.ts`** applies filter; **`Tasks.tsx`** hides **All** tab for non-staff, defaults to **Mine**.
- **Member RBAC matrix — `rbac-config.ts`:** Member aligned with player for sports modules; **`messages: "read"`**; removed **`members: "own"`** and **`payments: "own"`**; payments hidden from member sidebar.
- **Member dashboard — `DashboardContent.tsx`:** Club-wide upcoming via **`fetchClubWideDashboardUpcoming()`** in **`club-dashboard-snapshot.ts`** (events only — no team trainings).
- **Team IDs — `use-user-team-ids.ts`:** Merges **`team_players`** + **`team_coaches`** for scoping.
- **Tests:** **`club-message-access.test.ts`**, **`club-task-access.test.ts`**, **`rbac-config.test.ts`**.

### Public club — Live Scores section UI
- **`public-club-live-scores-section.tsx`:** Card text hierarchy matches **Reports** — bold **`h3`** title + muted description; **Open Live Scores** button right-aligned on desktop (`sm:flex-row sm:items-center`).
- **i18n:** **`clubPage.liveScoresTitle`** (EN: “Live match updates”; DE: “Live-Spielstände”).

### Sprint / operator (no new migrations)
- **SPRINT 2026-07-01** Track A/B/C progress unchanged — DB parity verified; marketplace Phase 2 code + smoke seed in repo; invite email Edge deployed (domain verify still **`DEPLOY-EMAIL-001-PROD`**).
- **QA note:** Users with multiple roles (e.g. admin + player) must switch persona in **Settings** for player/member scoping to apply.

### Documentation sync
- **`MEMORY_BANK.md`**, **`PROJECT_STATUS.md`**, **`TASKS.md`**, **`HOLD.md`**, **`README.md`**, **`docs/rbac-dashboard-plan.md`**, **`docs/rbac-dashboard-audit.md`**, **`docs/TSV_ALLACH_CLUB_PAGE_CHECKLIST.md`**, **`docs/PROJECT_COMPREHENSIVE_AUDIT.md`**, **`docs/AI_INVESTIGATION_BRIEF_ROLES_AND_PLATFORM.md`**, **`ops/PRODUCTION_READINESS_*.md`**.

### Operator smoke
- Settings → **Player** → **`/communication`**: only assigned team channels; **`/tasks`**: only own tasks.
- Settings → **Member** → **`/communication`**: Announcements + Club General only; dashboard upcoming = club events (no team trainings).
- **`/club/tsv-allach-09`**: Live Scores home section shows title + description like Reports; **Open Live Scores** CTA on the right.

## 2026-07-01 (Partner portal, Partner Page, AI 4 T partner, persona RBAC)

### Partner / supplier portal (dual-world routing)
- **Dedicated partner routes:** `/partner-marketplace`, `/partner-messages`, `/partner-tasks`, `/partner-reports`, `/partner-ai`, `/supplier-page` — separate from club-internal URLs (`/marketplace`, `/communication`, `/tasks`, `/reports`, `/co-trainer`, `/club-page-admin`).
- **`PersonaPortalGate`:** `ClubOnlyRoute` / `PartnerOnlyRoute` / `PersonaAwareAiRedirect` block cross-portal navigation for dual-role users.
- **`useModuleGateRole`:** Active dashboard persona (`one4team.activeRole`) drives sidebar, `RequireModule`, and data scope when allowed.
- **`switch-dashboard-persona.ts`:** Settings role switch sets persona, aligns active club for internal roles, navigates to correct portal home; reactive hook **`use-active-dashboard-persona-slug.ts`**.

### Partner Page admin (`/supplier-page`)
- **`SupplierPageAdmin.tsx`:** Club-page-admin parity — Basics, Branding, Services, Contact, Publish tabs; live preview viewports; **`ProviderListingEditor`** with section visibility.
- **Branding uploads:** `upload-provider-image.ts` + **`images-marketplace-providers`** storage bucket migrations **`20260731210000`**, **`20260731220000`**.
- **UI label:** Sidebar and page chrome renamed **Supplier Page → Partner Page** (EN/DE); module remains `supplier_page`; route unchanged `/supplier-page`.
- **RBAC:** `supplier_page` removed from club admin sidebar profile; access **`none`** for `club_admin` / `admin`; visible only for external partner roles (`supplier`, `sponsor`, `service_provider`, `consultant`).

### Marketplace provider portal
- **Schema + RLS:** `marketplace_provider_profiles`, requests, offers, saved providers — migrations **`20260731150000`** through **`20260731200000`** (see **`supabase/SCHEMA_STATUS.md`**).
- **Club hub vs provider portal:** `Marketplace.tsx` routes by role; **`club-marketplace-hub`** / **`provider-marketplace-portal`**; RBAC in **`marketplace-access.ts`**, **`rbac-config.ts`**.
- **Partner collaboration:** `/partner-messages`, `/partner-tasks`, `/partner-reports` pages + hooks; **`20260731120000_partner_task_engagements.sql`**, **`20260731215000_supplier_portal_scope.sql`**.

### AI 4 T — partner persona (`/partner-ai`)
- **`PartnerAiAgentWorkspace`:** Partner quick actions (copilot, Partner Page) and portal shortcuts (marketplace, messages, tasks, reports) — no club training/agent workflows on partner route.
- **`CoTrainer.tsx`:** Shared with `/co-trainer`; partner portal skips club context, welcome/prompts from **`ai-4-t-role-prompts.ts`** (`isPartnerAiRole`); Agent tab switches workspace by `isPartnerPortalPath`.
- **i18n:** `coTrainerPage.partnerAgent.*`, partner scope hints, EN + DE.

### RBAC & navigation
- **`rbac-config.ts`:** Central matrix, `SIDEBAR_MENU_PROFILES`, `RequireModule` route guards, **`useDashboardNav`** for sidebar + mobile nav.
- **Tests:** `rbac-config.test.ts`, `marketplace-rbac-matrix.test.ts`, `partner-portal-routes.test.ts`, `dashboard-persona.test.ts`, `use-module-gate-role.test.ts`, `e2e/marketplace-rbac.spec.ts`.

### Supabase (operator)
- Apply **`20260731120000`** → **`20260731220000`** in filename order after **`20260730140000`**.
- **QA script:** `supabase/scripts/grant_all_roles_spigelai.sql` — all dashboard personas for operator test account (idempotent).
- **Repair migrations:** redeem invite (`20260731130000`, `20260731140000`, `20260731160000`).

### Documentation sync
- **`MEMORY_BANK.md`**, **`PROJECT_STATUS.md`**, **`TASKS.md`**, **`HOLD.md`**, **`README.md`**, **`supabase/SCHEMA_STATUS.md`**, **`docs/rbac-dashboard-plan.md`**, **`docs/marketplace-implementation-plan.md`**, **`docs/PROJECT_COMPREHENSIVE_AUDIT.md`**.

### Operator smoke
- Dual-role user: Settings → **Club Admin** → club dashboard + club sidebar (no Partner Page); → **Supplier** → partner marketplace + **Partner Page** in nav.
- **`/partner-ai` → Agent:** Partner actions, not club training workflows.
- **`/supplier-page`:** Edit listing, logo/cover upload after bucket migration apply.

## 2026-07-01 (Marketing refresh, AI Features hero video, public club polish)

### Marketing site (EN/DE)
- **Home (`/`):** Hero subtitle, stats (500+ members, 20+ teams, 14+ modules), and feature cards refreshed — public microsites, Sommerfest, tasks, integrated AI, TSV Allach pilot. Copy polish: no em dashes in marketing strings; **AI 4 T** used sparingly (general AI language elsewhere).
- **`/features`:** Expanded to 8 club modules, 3 AI cards, 5 use cases; **AI-Powered Innovation** hero with portrait intro video (`ai-4-t-intro-logo.mp4`), glass logo assets, viewport-triggered play (holds last frame), side-by-side layout at all breakpoints, light/dark **`glass-card`** styling aligned with feature cards below (`max-w-6xl`).
- **`/about`**, **`/clubs-and-partners`:** Updated mission, platform, AI, and TSV Allach / Sportecke partner copy.
- **`/pricing`:** Early Bird deadline **13 December 2026** (`2026-12-13T23:59:59`); EN/DE countdown copy aligned.
- **Components:** `HeroSection.tsx`, `Features.tsx`, `About.tsx`, `Pricing.tsx`; i18n `hero`, `features`, `dualWorld`, `aboutPage`, `featuresPage`, `clubsAndPartnersPage`, `pricingPage`.

### AI 4 T branding (marketing + shared)
- **`Ai4TIntroLogoVideo.tsx`:** Scroll-center play once; `object-cover` fill; poster `ai-4-t-glass-logo.png`; respects `prefers-reduced-motion`.
- **`Ai4TWordmark`:** `variant="glass"` for full 3D wordmark asset.
- **`Ai4TBrand`:** `BrandedText` **`ai4tOnly`** — plain **ONE4Team** in body copy; red **4** only in **AI 4 T**; **`one-4-team-wordmark-digit`** (gold) for branded ONE 4 Team elsewhere.

### Public club microsite
- **Favicon:** `PublicClubDocumentHead` upserts club favicon in place (fixes default ONE4Team icon winning in `<head>`).
- **Match logos:** Berlin-day fixture linking, opponent logo lookup map, club-logo guard on opponent side, improved dedupe — `tsv-allach-public-matches.ts`, `public-club-match-display.ts`, matches + match-detail pages; tests updated.
- **New public routes:** Shop (`/shop`), Reports (`/reports`), Live scores (`/live-scores`) — pages, sections, context wiring, flex config.
- **TSV Allach JAKO shop:** Catalog import, product grid, admin **`/shop`** opponent-logo-style product images; migrations **`20260730120000`**–**`20260730130000`**; seed **`seed_tsv_allach_jako_shop.sql`**.
- **Club contact:** TSV Allach address helper + migration **`20260730140000_tsv_allach_club_contact_address.sql`**.
- **Matches admin:** Opponent logo upload field (`OpponentLogoField.tsx`); Sommerfest sync test updates.

### Supabase (operator)
- **`20260730120000_shop_products_import_key.sql`**
- **`20260730130000_tsv_allach_jako_shop_images.sql`**
- **`20260730140000_tsv_allach_club_contact_address.sql`**

### Documentation sync
- **`MEMORY_BANK.md`**, **`PROJECT_STATUS.md`**, **`TASKS.md`**, **`README.md`**, **`HOLD.md`**, **`docs/PROJECT_COMPREHENSIVE_AUDIT.md`**, **`docs/TSV_ALLACH_CLUB_PAGE_CHECKLIST.md`**.

### Operator smoke
- **`/features`:** AI hero video plays centered in viewport; light + dark theme; width aligns with 3 AI cards.
- **`/club/tsv-allach-09`:** favicon, **`/matches`** opponent logos, **`/shop`**, **`/reports`**, **`/live-scores`** when sections enabled.
- Apply migrations **`20260730120000`** → **`20260730140000`** after **`20260728140000`**; run JAKO shop seed if pilot retail desired.

## 2026-06-30 (Member payments, fee packages, invite email)

### Payments & fee packages (`/payments`)
- **Admin route **`/payments`** (PlanGate `payments`):** membership **packages** (`membership_fee_types`) + per-member **payment lines** (`payments`). One member can have multiple packages (e.g. annual fee + registration fee + Sonderumlage).
- **Fee Types tab:** overview table (package, amount, billing type, notes); **annual total by member type** (youth / adult / senior) with **membership** vs **shared levy** columns; levy detected from standalone packages (`fee_kind=levy`, `member_category=shared`) or **price components** labelled Sonderumlage/Umlage/levy.
- **Add / edit package dialog:** currency, billing interval, fee category (membership / levy / joining / other), member type, notes, optional **price components** with live total. Lib: **`membership-fee-packages.ts`**, components **`membership-fee-package-form.tsx`**, **`membership-fee-packages-overview.tsx`**.
- **Record payment:** multi-select packages per member (checkboxes); **bulk assign** one package to many members; filters (member, multi-select packages, status); in-tab **Record payment** / **Bulk assign** actions (not header-only).
- **Member profile:** payment count + link to **`/payments`**. Lib: **`member-payments.ts`** + tests.

### Supabase schema repairs
- **`20260728120000_repair_membership_fee_types_and_payments.sql`** — create `membership_fee_types` + `payments` if missing (PostgREST schema cache).
- **`20260728130000_repair_club_memberships_profile_fk.sql`** — FK `club_memberships_profile_fk` for profile embeds.
- **`20260728140000_membership_fee_types_package_fields.sql`** — `price_components` (jsonb), `member_category`, `fee_kind`, `sort_order`.

### Club invite email delivery
- Edge **`send-club-invite-email`** (Resend) + shared **`club_invite_email.ts`**; client **`send-club-invite-email.ts`**; **`Members.tsx`** delivers email on send/resend/create invite (link modal as backup).
- **`cors.ts`:** localhost allowed when prod `EDGE_ALLOWED_ORIGINS` is set. Secrets: **`RESEND_API_KEY`**, **`RESEND_FROM_EMAIL`**, **`PUBLIC_SITE_URL`**, **`EDGE_ALLOWED_ORIGINS`**.

### Tooling & docs
- **`vite.config.ts`:** `optimizeDeps.include` for `@radix-ui/react-popover` (fixes dev **504 Outdated Optimize Dep** on `/payments`).
- **`docs/PRODUCTION_RELEASE_CHECKLIST.md`**, **`docs/PROJECT_COMPREHENSIVE_AUDIT.md`**; links in **`README.md`**, **`PROJECT_STATUS.md`**, **`DEPLOYMENT.md`**.

### Documentation sync
- **`MEMORY_BANK.md`**, **`PROJECT_STATUS.md`**, **`TASKS.md`**, **`README.md`**, **`HOLD.md`**, **`supabase/SCHEMA_STATUS.md`**, **`ops/PRODUCTION_READINESS_*.md`**.

### Operator
- Apply migrations **`20260728120000`** → **`20260728140000`** after **`20260725150000`**; regenerate **`src/integrations/supabase/types.ts`** if needed.
- Deploy **`send-club-invite-email`**; set Resend + Edge secrets; verify Resend domain for production From address.
- Smoke: **`/payments`** → Fee Types (TSV Allach-style packages) → Record payment (multi-package) → mark paid; **`/members`** send invite → email received.

## 2026-06-28 (Members ops, team assignment, club member card)

### Members page (`/members`)
- **Search UX:** Debounced roster search keeps input mounted during refetch (`hasMembersHydrated`); search icon alignment fix.
- **Search results panel:** When search is active, saved member list shows roster + draft matches with field badges; server-side draft search beyond first 500 rows.
- **Draft save:** `resolveDraftById` + DB fallback when editing drafts found via search; success toasts and inline “Saved just now”.
- **Club branding on card:** Loads club `name` + `logo_url` via `loadClubMeta` (not ONE4Team asset).
- **Team assignment:** Assign members to teams from member edit (multi-team for roster, single for drafts); syncs `team_players` / `team_coaches` via **`src/lib/member-team-assignments.ts`** and **`src/components/members/member-team-assignment-field.tsx`**.
- **Club Card tab:** Shows **Role**, **Team**, **Date of birth**; club logo; removed email strip; PNG download via **`src/lib/club-pass-capture.ts`** (cross-origin image inlining, hides decorative blurs for html2canvas).
- **Club Card layout:** Fixed header text clipping (solid header strip, no root `overflow-hidden` on text); fixed card stretch empty footer (`items-start` + `h-fit`); gold footer integrated with rounded bottom.
- **Generate club ID:** **AI 4 T** bubble logo on button (`Ai4TLogo`).

### Teams page (`/teams`)
- **Team search:** Filter teams by name, sport, age group, league, coach, player count (`searchTeams` i18n).

### AI 4 T Agent chrome
- Dashboard header button label **AI 4 T Agent** with **`Ai4TLogo`** (`AiAgentHeaderButton.tsx`).

### Supabase repairs
- **`20260725140000_repair_list_club_membership_emails.sql`** — `list_club_membership_emails` RPC repair.
- **`20260725150000_repair_images_avatars_bucket.sql`** — `images-avatars` bucket + owner RLS policies.

### Documentation sync
- **`MEMORY_BANK.md`**, **`PROJECT_STATUS.md`**, **`TASKS.md`**, **`README.md`**, **`HOLD.md`**, **`supabase/SCHEMA_STATUS.md`**.

### Operator
- Apply migrations **`20260725140000`**, **`20260725150000`** after **`20260725130000`**.
- Smoke: `/members` search + draft save; assign player to team; Club Card preview + PNG download; profile photo upload.

## 2026-06-25 (Communication hub, tasks, attendance overview, public club polish)

### Public club Messages hub
- **`PublicClubMessagesHub`:** Floating Messages FAB (AI 4 T bubble styling); Updates + Channels tabs; announcement detail; deep links to Communication modal; FAB lifts above toast notifications when alerts show.
- **`PublicClubMessagesSection`** on club home; **`PublicClubCommunicationModal`** embedded **`CommunicationWorkspace`**.
- **`use-club-updates-feed`**, **`club-updates-feed.ts`**, **`club-message-access.ts`**, team-scoped message RLS migrations.

### Communication & announcements
- Team-scoped channels; trainers channel; announcement poster upload; edit/delete moderation (admin announcements; message edit 15 min).
- Updates feed excludes orphan announcement notifications; click routing to detail vs modal.
- Fixed-height Messages modal; inline hub banners; club-scoped admin checks (`use-club-admin.ts`).

### Tasks module (Phase 0 + 1)
- **`/tasks`** route, sidebar + mobile nav; **`club_tasks`** table + RLS + notification fan-out (**`20260724180000_club_tasks.sql`**).
- **`Tasks.tsx`**, **`use-club-tasks.ts`**, **`TasksSummaryCard`** on dashboard; task notification type in **`NotificationBell`**.

### Training attendance — overview & RSVP hardening
- **Team response overview** on RSVP cards (counts + name lists): public club Next up / schedule / matches + dashboard **`/activities`**.
- **Training cutoff:** trainings accept RSVP until **1 hour before start** (`isTrainingRsvpOpen`).
- **Roster gate:** RSVP only for team roster members (or existing attendance row); clear “not on roster” copy.
- **Migration **`20260725130000_activity_attendance_member_self_rsvp.sql`:** member self-RSVP RLS policies.
- **White glass decline dialog** on public club (matches AI 4 T / Messages modal); **`DialogContent`** optional **`overlayClassName`**.

### Club page & publish fixes
- **`20260724170000_fix_publish_club_page_join_default_role_cast.sql`** — publish RPC enum cast.
- Announcement notification cleanup migrations (**`20260724160000`**, **`20260724160100`**).

### Documentation & backlog
- **`docs/backlog/WHATSAPP_EXTERNAL_BRIDGE_SETUP.md`** — operator walkthrough for External Bridge → WhatsApp (Business API; not QR/personal WhatsApp); notes Meta GET verify gap (**BRIDGE-WA-001**).

### Documentation sync
- **`MEMORY_BANK.md`**, **`PROJECT_STATUS.md`**, **`TASKS.md`**, **`README.md`**, **`ROADMAP.md`**, **`MVP_PLAN.md`**, **`HOLD.md`**, **`supabase/SCHEMA_STATUS.md`**.

### Operator
- Apply migrations **`20260629120000`** through **`20260725130000`** in filename order (see **`HOLD.md`**).
- Deploy **`chat-bridge`** before WhatsApp bridge testing; follow **`docs/backlog/WHATSAPP_EXTERNAL_BRIDGE_SETUP.md`**.

## 2026-06-27 (TSV Allach public club wave — Sommerfest tournament, membership application, UX polish)

### Sommerfest 2026 tournament (admin + public live board)
- **Cup competition:** **`Sommerfest 2026`** (`competition_type: cup`) with 22 PDF-derived fixtures in **`tsv-allach-sommerfest-2026.ts`**; stable import keys **`tsv-sommerfest-2026:m01`** … **`m22`** on **`matches.notes`**.
- **Admin `/matches`:** Publish/sync tournament button, Sommerfest schedule editing, kick-off / full-time score updates, link to public tournament page. Lib: **`tsv-allach-sommerfest-competition.ts`**, **`tsv-allach-sommerfest-match-sync.ts`**, **`match-management-access.ts`**.
- **Public route:** **`/club/:slug/tournament/sommerfest-2026`** → **`public-club-tournament-page.tsx`**; live board (**`public-sommerfest-tournament-board.tsx`**) polls every 20s; category filters; **`in_progress`** = live.
- **Site chrome:** Fixed header banner (**`public-sommerfest-tournament-banner.tsx`**) under navbar; pulsating **Live tournament board** CTA from **11 Jul 2026** (**`sommerfest-live-pulse.ts`**, **`sommerfest-live-tournament-cta.tsx`**, CSS in **`index.css`**). Event detail page links to live board.
- **Tests:** **`tsv-allach-sommerfest-competition.test.ts`**, **`tsv-allach-sommerfest-match-sync.test.ts`**, **`sommerfest-live-pulse.test.ts`**.

### TSV Allach online membership application (join flow)
- **Multi-step form** aligned with [tsvallach09.de/onlineanmeldung](https://www.tsvallach09.de/onlineanmeldung): personal data, address, player history, membership type, SEPA + consents. **`tsv-allach-membership-application-form.tsx`**, **`tsv-allach-membership-application.ts`**.
- **`/club/:slug/join`:** TSV Allach clubs use full application; other clubs keep simple invite form. Role pills (Player / Parent / Coach / …) at top with red selected state; black labels/inputs; red consent copy.
- **Migration **`20260628120000_club_invite_application_payload.sql`:** **`club_invite_requests.application_payload`** (`jsonb`); extends **`request_club_invite`** and **`register_club_join_request`** with **`_application_payload`**.

### Football camp events (admin + public)
- **Migration **`20260627120000_club_events_camp_fields.sql`:** **`events`** columns **`team_id`**, **`target_audience`**, **`partner_name`**, **`contact_email`**, **`import_key`** (unique per club).
- **`club-football-camp-api.ts`**, **`club-football-camp-templates.ts`**, **`Events.tsx`** camp templates; seed script **`supabase/scripts/seed_tsv_allach_football_camps.sql`**.

### TSV Allach public content helpers
- Curated public news, events, and matches for Allach slug detection (**`is-tsv-allach-club.ts`**): **`tsv-allach-public-news.ts`**, **`tsv-allach-public-events.ts`**, **`tsv-allach-public-matches.ts`**, **`youth-team-label.ts`**, **`public-club-friendly-teams.ts`**.
- **News UX:** **`public-club-news-card.tsx`**, **`public-club-news-carousel.tsx`**; news list/article pages refreshed.

### Public club UX polish
- **Home hero (mobile):** Button order — team filter → next training → **AI 4 T** → dashboard; uniform full-width CTAs (**`public-club-home-page.tsx`**, **`public-club-cta-classes.ts`**).
- **Navbar:** **Contact** removed from header nav (remains in footer). **`public-club-navbar.tsx`**.
- **Matches admin modal:** Section title **AI 4 T analysis** via **`BrandedText`** + i18n **`sectionAi4TAnalysis`** / **`aiAnalysisBadge`** (**`AIMatchAnalysis.tsx`**).

### Bug fixes
- **`App.tsx`:** Restored lazy import for **`PublicClubContactPage`** (fixed runtime `PublicClubContactPage is not defined`).
- **`public-club-schedule-page.tsx`:** Added missing **`cn`** import from **`@/lib/utils`**.

### Documentation sync
- **`MEMORY_BANK.md`**, **`PROJECT_STATUS.md`**, **`TASKS.md`**, **`README.md`**, **`ROADMAP.md`**, **`MVP_PLAN.md`**, **`docs/TSV_ALLACH_CLUB_PAGE_CHECKLIST.md`**, **`supabase/SCHEMA_STATUS.md`**, **`HOLD.md`**, **`ops/PRODUCTION_READINESS_*.md`**.

### Operator
- Apply migrations **`20260627120000`**, **`20260628120000`** after **`20260626120000`** (note: **`20260628120000`** must not share timestamp with **`20260624120000_club_public_feature_flags_rpc.sql`**).
- Smoke: **`/matches`** → publish Sommerfest → **`/club/tsv-allach-09/tournament/sommerfest-2026`**; **`/club/tsv-allach-09/join`** multi-step submit → pending request with **`application_payload`** in admin inbox.

## 2026-06-24 (Training attendance on club page, AI 4 T pilot Phases 1–4, public club UX)

### Training attendance (dashboard + public club)
- **`/activities`:** Professional RSVP UX — **I'm coming** / **Can't make it** with required decline reason (presets + notes via `activity_attendance.notes`). Trainer **roster panel** (coming / declined / no response, jersey numbers, copy list, nudge). Team-scoped roster via **`team_players`**. Components: `training-attendance-rsvp.tsx`, `training-attendance-trainer-panel.tsx`, `training-attendance-summary-bar.tsx`; lib **`training-attendance.ts`**.
- **Public club (`/club/:slug`):** Same attendance data for signed-in members on **Next up**, **schedule** (training/match rows), **matches** (upcoming/live), and **home matches preview**. **`PublicClubAttendanceRsvp`**, **`PublicClubAttendanceProvider`**, **`use-public-club-attendance`**, **`public-club-attendance.ts`** (maps public schedule rows → `activities.id`). Sign-in CTA for anonymous visitors.

### Public club home & navigation
- **Hero team filter:** **View teams** dropdown filters home content by team (`?team=` URL param): Next up, stats, featured teams, matches preview; schedule/matches links preserve filter.
- **`PublicClubHeroTeamFilter`**, **`public-club-home-team-filter.ts`**, **`homeTeamFilterId`** in **`public-club-context`**.

### AI 4 T — pilot Phases 1–4 (code complete; pilot metrics open)
- **Phase 1:** Golden context tests (`ai-context-golden.ts`, `ai-context.test.ts`); **Sources:** citations in chat; **`ai_message_feedback`** migration + thumbs UI; richer **`buildClubContext()`**; DE-first replies.
- **Phase 2:** Teams agent shortcuts; outcome links after execute; **`duplicate_training_week`** intent + RPC; team-scoped training RBAC; **`cancel_training_with_parent_notice`**; chat NL → agent workflow (`run-agent-workflow-utterance.ts`, public embed).
- **Phase 3:** Role-based welcome prompts; team access denied UX; **public club AI 4 T modal** with Chat | Agent | Guide tabs (`public-club-ai4t-modal.tsx`, scoped **`AiAgentProvider`**).
- **Phase 4:** Club AI instructions in Settings; **`get_club_ai_usage_stats`** RPC.
- **Docs:** `docs/AI4T_ROADMAP.md`, `docs/AI4T_GOLDEN_QUESTIONS.md`, `docs/AI4T_PILOT_SUCCESS_METRICS.md`, `docs/TSV_ALLACH_CLUB_PAGE_CHECKLIST.md`; GitHub issue templates (Phase 0 smoke, monthly pilot review).

### Database (operator apply in filename order)
- **`20260624120000_club_public_feature_flags_rpc.sql`** — public feature access RPCs for club page gating.
- **`20260624180000_club_page_multilingual_feature.sql`** — multilingual public club pages (Pro feature gate).
- **`20260624190000_ai_message_feedback.sql`** — thumbs up/down on AI messages.
- **`20260625120000_ai_agent_team_training_scope.sql`** — team-scoped training RBAC for agent RPCs.
- **`20260626120000_ai4t_duplicate_week_club_ai_stats.sql`** — duplicate week RPC + club AI usage stats.

### Co-Trainer & AI 4 T UX polish
- Agent tab icon → **Bot** (`Ai4TeamAgentIcon`); cancel-training proposal card shows session details + grey Dismiss.
- **Tab pills:** theme-aware grey inactive / red active (`ai4t-tab-classes.ts`).
- **Intro modal:** logo removed on dashboard; club wordmark unchanged on public modal.
- **Chat watermark:** visible in **light** mode only on `/co-trainer`; always on public club embed.
- Voice + chat unified agent workflow path; proposal card pinned in compact Agent/chat surfaces.

### Public club platform (broader wave in branch)
- Flexible homepage modules, glass styling, multilingual copy (`club-public-page-i18n`), AI 4 T branding assets, notification bell, club page admin live preview enhancements.

### Documentation sync
- **`MEMORY_BANK.md`**, **`PROJECT_STATUS.md`**, **`TASKS.md`**, **`README.md`**, **`ROADMAP.md`**, **`MVP_PLAN.md`**, **`PHASE2_INDEX.md`**, **`supabase/SCHEMA_STATUS.md`**, **`ops/PRODUCTION_READINESS_*.md`**, **`DEPLOYMENT.md`**, **`HOLD.md`**.

### Operator
- Apply migrations **`20260624120000`** through **`20260626120000`** after prior AI agent migrations.
- Deploy **`ai4team-agent`**, **`co-trainer`** (if Edge changes not yet deployed).
- Smoke: club home **Next up** RSVP as member; `/activities` trainer roster; **`?team=`** filter on public home.

## 2026-06-15 (AI 4 T Agent Phases 0–4: workflows, contextual sheet, voice, NL interpret)

### Database
- **`20260615120000_ai_agent_runs.sql`:** `ai_agent_runs` audit table (`proposed` → `confirmed` → `executed` lifecycle, idempotency key, expiry).
- **`20260615130000_ai_agent_tool_rpcs.sql`:** `agent_create_training`, `agent_cancel_training` RPCs (trainer gate inside RPC).
- **`20260615140000_ai_agent_runs_conversation_id.sql`:** `conversation_id` FK → `ai_conversations` (link workflow runs to saved Co-Trainer chats).
- **`20260615150000_ai_agent_tool_rpcs_extended.sql`:** `agent_create_member_draft` (admin), `agent_send_club_announcement` (trainer).

### Edge
- **`supabase/functions/ai4team-agent`:** `mode: propose | execute`, idempotency, plan gate (`clubHasPlanFeature('ai')`), trainer/admin checks per intent.
- **`supabase/functions/_shared/ai4team_agent_tools.ts`:** proposal builder + RPC executors for six intents.
- **`supabase/functions/_shared/ai4team_agent_interpret.ts`:** natural-language → workflow intent (EN/DE, club timezone, team/training context from DB).
- **`supabase/functions/_shared/llm.ts`:** shared `completeChat` for interpret path.

### Workflows (propose → confirm → execute)
| Intent | Permission | Action |
|--------|------------|--------|
| `create_training` | trainer | Insert activity/training session |
| `cancel_training` | trainer | Cancel upcoming training |
| `plan_training_week` | trainer | Multi-session week plan |
| `notify_trainers` | trainer | Post club announcement |
| `add_member_draft` | admin | Create `club_member_drafts` row (no silent invite) |
| `send_club_announcement` | trainer | Post to `announcements` |

### Client — Co-Trainer
- **`/co-trainer`:** **3 tabs** — Chat | **Agent** | History (Quick actions merged into Agent).
- **`src/components/ai-agent/`:** `AiAgentWorkspace`, `AiAgentProposalCard`, `Ai4TeamVoiceControls`.
- **`src/lib/ai-agent/`:** types, API, intents, `page-context`, `chat-intent-detect` (`/agent` slash commands), `apply-voice-to-forms`, `voice-text`.
- Chat tab: **`/agent`** commands route to Agent tab or inline propose; voice input/output via Web Speech API (STT/TTS, persisted toggle).
- History tab: workflow runs list with status.

### Client — contextual entry (Phase 3–4)
- **`src/contexts/ai-agent-context.tsx`:** global propose/confirm state, page context registration.
- **`src/hooks/use-register-ai-agent-context.ts`:** pages register entity context (team, member, activity).
- **`AiAgentSheet`** + **`AiAgentHeaderButton`** + **`Ai4TeamNavIcon`:** Sparkles shortcut in dashboard header/sidebar; sheet opens compact Agent workspace.
- **`DashboardLayout`:** wraps dashboard routes with `AiAgentProvider` + `AiAgentSheet`.
- **Page hooks:** **`Teams.tsx`**, **`Members.tsx`**, **`Activities.tsx`** register page context and expose deep-link intents.

### i18n
- **`src/i18n/en.ts`**, **`src/i18n/de.ts`:** `coTrainerPage.agent.*`, voice controls, intent labels, sheet copy.

### Documentation
- **`docs/AI4TEAM_AGENT_IMPLEMENTATION_PLAN.md`:** implementation plan (Phases 0–4 marked complete).
- Doc sync: **`MEMORY_BANK.md`**, **`PROJECT_STATUS.md`**, **`ROADMAP.md`**, **`TASKS.md`**, **`README.md`**, **`HOLD.md`**, **`MVP_PLAN.md`**, **`supabase/SCHEMA_STATUS.md`**, **`ops/PRODUCTION_READINESS_EVIDENCE_LOG.md`**, **`DEPLOYMENT.md`**.

### Operator
- Apply migrations **`20260615120000`** → **`20260615150000`** in order; `supabase functions deploy ai4team-agent`.
- Smoke: **`/co-trainer` → Agent tab** (create training propose → confirm); header Sparkles on Teams/Members; **`/agent plan-week`** in Chat tab.
- See **`DEPLOYMENT.md` § AI 4 T Agent**.

## 2026-06-14 (AI 4 T rebrand, feature trials, fair-use scope, Support & FAQ)

### Product rebrand: ONE4AI → AI 4 T
- **`src/i18n/en.ts`**, **`src/i18n/de.ts`:** Display strings and keys (`ai4Team`, `askAi4Team`, `sectionAi4Team`, weekly digest labels, Co-Trainer workspace copy).
- **`src/lib/club-public-page-sections.ts`:** Section id **`ai4team`** with legacy read of **`one4ai`** in stored JSON.
- **`src/lib/dashboard-section-visibility.ts`:** **`ai4teamWeeklyDigest`** flag for admin dashboard widget.
- **UI wiring:** **`DashboardContent`**, **`DashboardSidebar`**, **`AppHeader`**, **`DashboardTopBar`**, **`Members`**, **`ClubPageAdmin`**, **`CoTrainer`**, **`AIMatchAnalysis`**, **`AI.tsx`**, **`public-club-context.tsx`** (`ai4teamCta`).
- **`src/pages/SupportFaq.tsx`:** Report topic **`ai4team`**.

### Club feature trials (pilot access without full plan upgrade)
- **`supabase/migrations/20260614140000_club_feature_trials.sql`:** **`club_feature_trials`** table (`feature` **`ai`** | **`shop`**, **`expires_at`**, member SELECT + platform-admin manage RLS); seeds 90-day AI trial for clubs matching **`%allach%`** / **`%TSV Allach%`** (idempotent).
- **`supabase/functions/_shared/plan_entitlements.ts`:** **`clubHasPlanFeature`** checks active trials before **`billing_subscriptions`** plan map.
- **`src/lib/club-feature-trials.ts`**, **`src/hooks/use-subscription.ts`**, **`src/hooks/use-plan-guard.ts`:** Client-side trial awareness for plan gates and AI routes.
- **`supabase/scripts/fix_tsv_allach_ai_access.sql`:** Operator helper — trial row + Pro **`trialing`** subscription for Allach clubs (run manually in SQL Editor when needed).

### AI 4 T fair-use / scope guardrails
- **`supabase/functions/_shared/ai4team_scope.ts`:** System prompt scope policy; heuristics for obvious off-topic abuse (shopping, general news, homework, jailbreaks); EN/DE refusal messages; SSE refusal stream helper.
- **Edge:** **`co-trainer/index.ts`**, **`co-aimin/index.ts`**, **`ai-match-analysis/index.ts`** — scope check before LLM call; policy appended to system prompt.
- **`src/pages/CoTrainer.tsx`:** Passes user **`language`** to edge; scope hint under workspace title.
- **i18n:** **`scopeHint`** strings (EN/DE).

### Support & FAQ (user-facing copy)
- **`supportPage`** categories in **`en.ts`** / **`de.ts`:** Expanded **AI 4 T & Co-Trainer** (what it is, setup, plan/trial, allowed topics, rate limits); billing **feature trial** FAQ; reports/financial and German import notes; troubleshooting without backend jargon (no Supabase/migrations/localhost in end-user answers).

### Documentation & deploy notes
- **`DEPLOYMENT.md`:** AI 4 T setup section (Edge secrets, **`co-trainer`** deploy, club AI provider settings).
- **`README.md`**, **`.env.example`:** AI 4 T naming and setup pointers.

### Documentation sync
- **`MEMORY_BANK.md`**, **`PROJECT_STATUS.md`**, **`ROADMAP.md`**, **`TASKS.md`**, **`README.md`**, **`HOLD.md`**, **`MVP_PLAN.md`**, **`supabase/SCHEMA_STATUS.md`**, **`ops/PRODUCTION_READINESS_EVIDENCE_LOG.md`**, **`CHANGELOG.md`** (this entry).

### Operator follow-up
- Apply **`20260614140000_club_feature_trials.sql`** per Supabase env (uses **`update_updated_at()`** trigger — not **`update_updated_at_column`**).
- Deploy **`co-trainer`**, **`co-aimin`**, **`ai-match-analysis`** after scope + trial entitlement changes.
- Set **`OPENAI_API_KEY`** / optional **`OPENAI_MODEL`** in Edge secrets; club admins can override via **Settings → Club → AI provider**.

## 2026-06-14 (Admin dashboard operations, financial reporting P&L, German member import, UI polish, documentation sync)

### Admin dashboard — live data and role-aware layout
- **`src/lib/dashboard-page-shell.ts`:** Shared layout tokens (`DASHBOARD_PAGE_ROOT`, inner/max widths, tab rows) for consistent responsive behavior under **`DashboardLayout`**.
- **`src/lib/club-dashboard-snapshot.ts`:** `fetchAdminDashboardSnapshot`, `fetchDashboardUpcoming`, `fetchClubSetupProfile` — real KPIs and club profile for admin dashboard (members, teams, schedule, unpaid dues, public page status).
- **`src/components/dashboard/DashboardContent.tsx`:** Admin KPIs from database (not placeholders); **Your club setup** section reads live **`clubs`** row + registration fallback; AI insights driven by snapshot; **Head-to-Head Comparison** removed from dashboard.
- **`src/lib/dashboard-section-visibility.ts`:** Role-based dashboard section flags — **admin** sees finances + club setup + ONE4AI digest; **trainer/player** see sports analytics widgets; **sponsor** gets minimal upcoming/insights only.
- **`src/components/dashboard/LiveMatchTicker.tsx`:** Demo matches removed; hidden when no live matches.

### Financial reporting (Phases 1–3)
- **`supabase/migrations/20260614120000_club_expenses.sql`:** `club_expenses` table (category, amount_cents, expense_date, description) with admin-only RLS.
- **`src/lib/club-financial-snapshot.ts`:** Unified snapshot from **`payments`**, **`membership_dues`**, **`shop_orders`**, **`club_expenses`**; monthly series, revenue/cost breakdowns, CSV export, create/delete expense helpers.
- **`src/lib/club-expense-categories.ts`:** Expense category constants (facility, equipment, staff, travel, referees, other).
- **`src/components/dashboard/FinancialSummary.tsx`:** Admin dashboard card — collected, outstanding, overdue, costs, net, 12-month chart; links to Payments, Dues, **`/reports?section=financial`**.
- **`src/components/reports/FinancialReportPanel.tsx`:** Full admin financial report on **`/reports`** — KPIs, monthly cash-flow charts, revenue/cost pies, fee-type breakdown, expense CRUD, CSV export.
- **`src/pages/PlayerStats.tsx`:** Admin report sections — **Operations** | **Financial** | **Performance** (`?section=financial`); performance tables hidden when not on Performance tab.

### Members — German Mitgliederliste import
- **`src/lib/german-mitgliederliste-import.ts`:** Detection and parse for semicolon German club exports; row enrichment (role, status, team, master fields).
- **`src/lib/german-mitgliederliste-import.test.ts`:** Unit tests (7 passing).
- **`src/lib/member-master-schema.ts`:** German field aliases, `normalizeImportEmail`, flexible date/sex parsing fixes.
- **`src/lib/member-master-xlsx.ts`:** Auto-detect German format in registry spreadsheet parser.
- **`src/pages/Members.tsx`:** Unified bulk import; Option B registry import matches **saved drafts** by email; **Pending import** KPI; duplicate/`already_in_saved_list` validation.

### Icons and UI consistency (Lucide)
- **`src/lib/notification-type-meta.ts`:** Shared notification type icons (used by **`AdminNotificationSender`** and **`NotificationBell`**).
- **`src/lib/achievement-badge-icons.ts`:** Lucide icons for achievement badges (replaces emojis).
- **`src/components/dashboard/AdminNotificationSender.tsx`**, **`AchievementBadges.tsx`**, **`SeasonAwards.tsx`**, **`Events.tsx`:** Emoji icons replaced with Lucide; i18n event badges use icon + text.

### i18n
- **`src/i18n/en.ts`**, **`src/i18n/de.ts`:** `financial.*` namespace; dashboard club-setup strings; reports admin tabs (Operations / Financial / Performance); German import and pending-draft strings.

### Documentation sync
- **`MEMORY_BANK.md`**, **`PROJECT_STATUS.md`**, **`ROADMAP.md`**, **`TASKS.md`**, **`README.md`**, **`HOLD.md`**, **`supabase/SCHEMA_STATUS.md`**, **`CHANGELOG.md`** (this entry).

## 2026-05-03 (Public club microsite: migrations wave, admin polish, hero overlay, nav parity, documentation sync)

### Database (apply per environment in filename order)
- **`20260502120000_club_public_page_draft_publish.sql`** — club public page draft/publish columns and RPCs.
- **`20260502140000_partners_public_club_visibility.sql`** — partners visible on public club site.
- **`20260502150000_announcements_public_website_news.sql`** — announcements / public website news flags.
- **`20260502170000_public_team_privacy.sql`** — team-level public privacy fields.
- **`20260502180000_public_club_schedule_publish_flags.sql`** — schedule/training publish flags for public microsite.
- **`20260502190000_public_matches_events_microsite.sql`** — matches/events microsite surfacing.
- **`20260502210000_public_club_documents_faq_join_contact.sql`** — public documents, FAQ, join, contact plumbing.
- **`20260502220000_club_page_extended_publish_unpublish.sql`** — extended publish/unpublish behavior.
- **`20260503120000_public_club_privacy_team_rpc.sql`** — privacy and team-related RPC updates for public reads.
- **`20260503143000_public_join_request_flow_v2.sql`** — public join request flow v2 (source, pending, notifications path as defined in migration).

After apply: regenerate **`src/integrations/supabase/types.ts`** if PostgREST schema changes require client types.

### Club Page Admin and public layout (client)
- **`src/pages/ClubPageAdmin.tsx`:** Publication status **badges** (site live vs hidden, published snapshot vs never, draft in sync vs unpublished changes); **hero** controls — **Apply club color overlay** switch and **overlay strength** slider (`0–100%` mapped to `hero_tint_strength`).
- **`src/components/club-page-admin/club-page-admin-live-public-preview.tsx`:** **Desktop / Tablet / Mobile** preview width toggles; hero respects **`hero_club_color_overlay`** and **`hero_tint_strength`**.
- **`src/lib/public-page-flex-config.ts`:** **`showInNav`** on **`PublicNavPageSetting`**; **`buildPagesFromMicro`** / **`getEnabledPublicPages`** hide nav entries when “Show in navigation” is off (while route may remain addressable).
- **`src/lib/club-page-settings-helpers.ts`:** Default homepage module **order** values adjusted (matches → join → partners/sponsors → gallery last).
- **`src/lib/club-public-page-config.ts`**, **`src/lib/public-club-models.ts`:** Persist and map **`hero_club_color_overlay`**, **`hero_tint_strength`** in config and **`PublicClubRecord`**.
- **`src/components/public-club/public-club-hero.tsx`**, **`HeroImageTint.tsx`:** **`clubTintEnabled`** — when overlay is off, skip club-color duotone layers; lighter neutral gradient for text readability.

### i18n
- **`src/i18n/en.ts`**, **`src/i18n/de.ts`:** Strings for publication badges, preview viewport labels, hero overlay labels.

### Documentation sync
- **`MEMORY_BANK.md`**, **`PROJECT_STATUS.md`**, **`ROADMAP.md`**, **`TASKS.md`**, **`README.md`**, **`HOLD.md`**, **`CHANGELOG.md`** (this entry).

## 2026-05-03 (Public club microsite — UI polish: theme contrast + accent hovers; documentation sync)

**Scope:** Client-only; **no new Supabase migrations** in this batch (extends the May microsite wave below).

### Theme and readable fills
- **`src/lib/hex-to-rgb.ts`:** **`relativeLuminance`**, **`readableTextOnSolid`** — pick light vs dark label color on club primary/support solids.
- **`src/components/public-club/club-theme-provider.tsx`:** When brand secondary/tertiary read as **light**, flip **`--club-*`** tokens so body/muted/card/border stay legible on pale gradients (fixes “white on white” outline CTAs and ghost pills).
- **`src/components/public-club/public-club-draft-empty-hint.tsx`:** Light-surface empty-state panel for draft hints on bright club backgrounds.

### Accent (crimson) hovers — align with app `Button` / `--accent`
- **`src/lib/public-club-cta-classes.ts`:** **`clubCtaFillHoverClass`** (`hover:!bg-accent` + `hover:!text-accent-foreground`, wins over inline fill) and **`clubCtaOutlineHoverClass`** (`hover:border-accent/40`, `hover:bg-accent/10`, `hover:text-accent-foreground`).
- **Applied across:** **`public-club-navbar`**, **`public-club-home-page`**, **`public-club-join-page`**, **`public-club-documents-page`**, **`public-club-news-page`**, **`public-club-contact-page`**, **`public-club-event-detail-page`**, **`public-club-team-detail-page`**, **`club-page-admin-live-public-preview`** (preview chrome; navbar row remains `pointer-events-none` unless changed later).

### Documentation sync
- **`MEMORY_BANK.md`**, **`PROJECT_STATUS.md`**, **`ROADMAP.md`**, **`TASKS.md`**, **`README.md`**, **`MVP_PLAN.md`**, **`HOLD.md`**, **`supabase/SCHEMA_STATUS.md`**, **`ops/PRODUCTION_READINESS_EVIDENCE_LOG.md`**, **`CHANGELOG.md`** (this entry).

## 2026-05-01 (Reports KPI charts, RBAC admin guard, marketing footer, documentation sync)

### Reports (`/reports` → `PlayerStats.tsx`)
- **Admin dashboard charts (Recharts):** Last **12 weeks** of club activity (trainings / matches / events) with **Monday-based** week buckets (`date-fns` `startOfWeek`); **coach coverage** pie (teams with vs without `team_coaches`); **new active members** per week; **trainings by weekday** and **trainings by month** (last 6 months).
- **Data robustness:** Client-side **`activities.type`** normalization (training/match/event aliases); KPI training counts use **`.ilike("type","training")`** instead of strict `eq` only.
- **Follow-up (not done):** If schedule is stored primarily in **`training_sessions`**, union or prefer that source so charts are non-empty in those deployments.

### RBAC / admin routes
- **`src/hooks/use-permissions.ts`:** When `club_role_assignments` select fails, call **`is_club_admin`** RPC and treat success as admin for **`RequireAdmin`** guards.
- **`supabase/migrations/20260430173000_fix_club_role_assignments_select_policy.sql`:** Recreate **`club_role_assignments_select_members`** using named `is_member_of_club` parameters.

### Cookie consent and marketing shell
- **`src/lib/cookie-consent.ts`:** Shared **`readCookiePreferences`**, **`writeCookieConsent`**, **`requestOpenCookieSettings`**, event name helper (react-refresh lint compliance).
- **`src/components/ui/cookie-consent.tsx`:** Preference dialog **fixed height** `h-[min(90vh,720px)]` so switching tabs does not resize the modal.
- **`src/App.tsx`:** Removed duplicate signed-out **fixed** footer (marketing pages already include **`landing/Footer`**).
- **`src/components/landing/Footer.tsx`:** Copyright **left-aligned**; cookie settings still opens preference centre.

### i18n
- **`reportsPage`:** New strings for chart titles/subtitles/legends (EN/DE).
- **`cookieConsent`:** Copy tweaks (no em dash in cookie strings where requested).

### Documentation sync
- **`MEMORY_BANK.md`**, **`PROJECT_STATUS.md`**, **`ROADMAP.md`**, **`TASKS.md`**, **`README.md`**, **`MVP_PLAN.md`**, **`ops/PRODUCTION_READINESS_EVIDENCE_LOG.md`**, **`CHANGELOG.md`** (this entry).

## 2026-04-29 (Cookie preference centre, public club team page, training/coach admin surfaces, documentation sync)

### Cookie consent and privacy preference centre
- **`src/components/ui/cookie-consent.tsx`:** Bottom banner (delay when no stored consent) with ONE4Team-specific EN/DE copy; **Accept all**, **Reject non-essential**, **Cookie settings** opens modal. **Dialog** with left nav: overview (“Your privacy” / “Ihre Privatsphäre”), strictly necessary, functional, analytics, marketing; toggles on optional categories; **Save my choices** / **Reject non-essential** / **Allow all** in footer. **`readCookiePreferences()`**, **`requestOpenCookieSettings()`** + custom event for global open.
- **Persistence:** `localStorage` key **`one4team.cookieConsent`**, version **2** (`preferences.functional|analytics|marketing`, `necessary` always true); migration from legacy **`level: "all" | "essential"`**.
- **`src/i18n/en.ts`**, **`src/i18n/de.ts`:** Expanded **`cookieConsent`** keys for banner, preference centre, category descriptions, toggles, actions.
- **`src/App.tsx`:** Signed-out fixed footer link calls **`requestOpenCookieSettings()`** using **`t.cookieConsent.openPreferences`**.
- **`src/components/landing/Footer.tsx`:** Same cookie-settings entry next to legal links.
- **`src/components/ui/dialog.tsx`:** Overlay **`z-[120]`**, content **`z-[130]`** so dialogs render above the signed-out footer and cookie banner.

### Public club team page and database
- **`supabase/migrations/20260429130000_public_club_schedule_and_team_page.sql`:** Public **`activities`** SELECT for **`anon`** when parent club **`is_public`**; optional guarded **`training_sessions`** policy; **`get_public_club_team_page(_club_slug, _team_id)`** security-definer RPC returning schedule/roster-shaped JSON for the public team page without over-exposing profile columns.
- **`src/pages/ClubTeamPage.tsx`:** Public team route UI (lazy-loaded from **`App.tsx`** at **`/club/:clubSlug/team/:teamId`**).
- **`src/pages/ClubPage.tsx`**, **`src/lib/club-public-page-sections.ts`:** Integration for schedule/team navigation as implemented in branch.

### Coach placeholders, pitch linkage, training import
- **`supabase/migrations/20260426121000_coach_placeholders_and_team_coaches_polymorphic.sql`**, **`20260426122000_activity_pitch_booking_link_and_import_keys.sql`:** Schema for polymorphic coaches, activity–pitch booking, import-related keys (apply in order per environment).
- **`src/pages/CoachPlaceholderResolution.tsx`**, route **`/coach-placeholders`** (admin): UI to resolve coach placeholders.
- **`src/pages/TrainingPlanImport.tsx`**, route **`/training-plan-import`** (admin): Training plan import flow; **`src/lib/training-plan-import/`** model/helpers.

### Other client / ops / tooling (same release window)
- **`src/integrations/supabase/types.ts`:** Regenerated or patched for new RPCs/tables.
- **`src/pages/*`**, **`src/components/dashboard/*`:** Ongoing fixes and features (e.g. **Matches**, **Teams**, **Shop**, **Settings**, **PlayerStats**, **ClubPageAdmin**, sidebar/mobile nav) as committed in this batch.
- **`ops/`:** Production readiness completion plan, consolidated **evidence log**, checklist and rollout doc touch-ups (**`PRODUCTION_READINESS_*`**, **`CSP_ROLLOUT.md`**, **`SECTION_M_GO_LIVE_CHECKLIST.md`**, etc.).
- **`scripts/audit-realtime.cjs`**, **`scripts/audit-supabase-selects.cjs`**, **`package.json`**: tooling adjustments as in diff.

### Documentation sync
- **`MEMORY_BANK.md`**, **`PROJECT_STATUS.md`**, **`TASKS.md`**, **`README.md`**, **`ops/PRODUCTION_READINESS_EVIDENCE_LOG.md`**, **`CHANGELOG.md`** (this entry).

### Database (apply per environment in filename order)
- `20260330160000_public_page_sections_matches_messages_one4ai.sql` — coordinate order with existing `20260330*` migrations in the same project.
- `20260426121000_coach_placeholders_and_team_coaches_polymorphic.sql`
- `20260426122000_activity_pitch_booking_link_and_import_keys.sql`
- `20260429130000_public_club_schedule_and_team_page.sql`

## 2026-03-30 (Production readiness track: analytics RPCs, pagination, RLS harness, ops templates, phased runbooks)

### Database (apply per environment in filename order)
- **`20260329103000_platform_admin_rbac.sql`** — server-side `is_platform_admin()` / `platform_admins`.
- **`20260329112000`** … **`20260329133000`** — analytics RPCs (head-to-head, batch chemistry/heatmap, player stats aggregate, season awards + player radar), `is_member_of_club` arg-order fix, **hotspot composite indexes** (wrapped in `DO $$` + `to_regclass` so missing `events` / `event_participants` do not error — do not paste unguarded `CREATE INDEX` excerpts), billing reconciliation RPC.
- **`20260329140000_club_member_stats_rpc.sql`** — `get_club_member_stats` for roster stats when list is server-paged.
- **`20260329141000_platform_admin_audit.sql`** — `platform_admin_audit_events` + `log_platform_admin_action`.
- **`20260330120000_search_club_members_page.sql`** — full-club member search (profiles + master fields + internal number), `is_member_of_club` guard.

### Client app
- **`Members.tsx`:** server-paged roster + debounced search (≥2 chars) via RPC; shared sidecar hydration; club-switch reset uses `setMembersServerPage` / `setDebouncedSearch` / `membersPivotRef` (fixes removed `setMemberListPage` crash).
- **`Matches.tsx` / `Communication.tsx`:** keyset-style pagination (`match_date`/`created_at` + `id` tuples).
- **`PlatformAdmin.tsx`:** calls `log_platform_admin_action` after successful data load.
- **`Health.tsx`:** probes `/auth/v1/health`, `/rest/v1/`, and optional **`/functions/v1/health`** Edge DB probe when publishable key is set.
- **`src/lib/supabase-error-message.ts`** — consistent Supabase error copy for degraded UX.
- **`src/test/rls.integration.test.ts`** — env-gated JWT isolation tests + mutation probe on `clubs` (staging-safe data only).

### Supabase Edge
- **`request_context.ts`:** correlation id + structured logs on **`co-trainer`**, **`stripe-checkout`**, **`chat-bridge`** (in addition to **`stripe-webhook`**).

### Tooling / CI
- **`scripts/assert-production-guardrails.cjs`**, **`scripts/assert-bundle-budget.cjs`**, **`scripts/assert-pg-policies-drift.cjs`**, **`scripts/stripe-replay-checklist.cjs`** — `npm run guardrails`, `budget:bundle`, `policies:drift` (no-op unless `PG_POLICIES_SNAPSHOT_FILE` is set), `replay:stripe-checklist`.
- **`.github/workflows/ci.yml`** — lint, test, optional policy drift step, guardrails, build, bundle budget, audits, Playwright.
- **`vitest.config` / `telemetry.test.ts`** — removed flaky compile-time `DEV` console assertion.

### Ops / documentation (repo)
- **`ops/PRODUCTION_READINESS_ARTIFACTS.md`** — execution progress, Open vs closed, Section E/B/C/L/M links, index + EXPLAIN guidance.
- **`ops/TENANT_ACCESS_MATRIX.md`**, **`PRIVILEGED_FLOWS.md`**, **`FAN_OUT_AUDIT.md`**, **`STAGING_INDEX_VERIFICATION.md`**, **`HOTSPOT_INDEX_MIGRATION.md`**, **`EXPLAIN_EVIDENCE_TEMPLATE.md`**, **`REALTIME_SOAK_LOG.md`**, **`SECTION_L_MONITORING_SETUP.md`**, **`SECTION_M_GO_LIVE_CHECKLIST.md`**, **`CSP_ROLLOUT.md`**, **`WAVE3_ROADMAP.md`**, **`GAME_DAY_DRILL_LOG.md`**, **`MONTHLY_COST_PERF_REVIEW.md`** — templates and checklists for staging/prod verification (Section L/M remain operator-owned in vendor UIs).
- **`ops/runbooks/stripe-webhook-backlog.md`** — T-034 alerting detail.

### Documentation sync
- **`MEMORY_BANK.md`**, **`PROJECT_STATUS.md`**, **`TASKS.md`**, **`README.md`**, **`DEPLOYMENT.md`**, **`CHANGELOG.md`** (this entry).

### Phased operator execution + Wave 3 follow-up (same date)
- **`ops/PHASE_A_STAGING_RUNBOOK.md`**, **`PHASE_B_SECRETS_CHECKLIST.md`**, **`PHASE_C_SECTION_L_EVIDENCE.md`**; **`ops/SECTION_M_GO_LIVE_CHECKLIST.md`** execution order + evidence column; **`ops/PRODUCTION_READINESS_ARTIFACTS.md`** links to runbooks.
- **`vercel.json`:** `Content-Security-Policy-Report-Only`; **`supabase/functions/health`** Edge DB probe; **`Communication.tsx`** load-error banner + refresh; **`supabase-error-message.ts`:** `isTransientSupabaseMessage`; **`Matches.tsx` / `Activities.tsx`** named roster caps; CI guardrails env hardening; **`npm run k6:staged-reads`**.

## 2026-03-29 (Public club PWA-style UX, sections, Stripe/shop hardening, load-test harness)

### Public club page (`/club/:slug`) — product UX
- **`AppHeader` `variant="clubPublic"`** (`src/components/layout/AppHeader.tsx`): On viewports below `md`, the sticky header shows only the **menu control + club title (+ crest via `titleLeading`)**. Language, theme, sign-out, desktop-only CTAs, and the mobile role pill move into **one** slide-down menu. Logged-in users still get active club, profile/role switcher, dashboard links, then language/theme and sign-out. Guests get section shortcuts + language/theme only.
- **Subtitle on mobile:** For `clubPublic`, the header subtitle (club description or invite-only fallback) is **`max-md:hidden`** so small screens show the club name only (full subtitle from `md` up).
- **`ClubPage.tsx` → `AppHeader` props:** `variant="clubPublic"`, `titleLeading` (logo), `clubPublicMenuTop(close)` renders **visible section links** (scroll to `#id`) plus **Open dashboard / Request invite**; **`rightSlot`** is **`hidden md:flex`** for the primary CTA on desktop. Removed the separate mobile “sections” modal/hamburger duplicate.
- **Hero shortcuts + CTAs:** Shared **`max-w-md mx-auto px-1`** wrapper so shortcut pills align with the two main buttons; **`max-md` CSS grid** (`grid-cols-1|2|3`) with **`gap-1`**; **`md+`** reverts to centered flex pills. Primary and outline hero **`Button`s** use **`rounded-full`** to match pill shortcuts.
- **Hero layout:** Flexible column with **`min-h-[min(56dvh,26rem)]` on mobile** so **“Powered by ONE4Team”** sits lower; attribution is a **`Link` to `/`** (marketing home) with **small ONE4Team logo** below, **`gap-[0.5625rem]`** between text and logo; small type via arbitrary `rem` sizes.
- **i18n:** EN `clubPage.trainingSchedule` label set to **“Trainings”** (hero + schedule wording); DE already used **Trainings**.

### Public page sections (admin + rendering)
- **Migration `20260329000000_club_public_page_sections.sql`:** `clubs.public_page_sections` **jsonb** for toggling which blocks appear on the public page.
- **`src/lib/club-public-page-sections.ts`:** Parse/defaults for section visibility.
- **`ClubPageAdmin`:** Load/save section toggles with EN/DE copy.
- **`ClubPage`:** Nav and body sections respect **`sectionVisibility`** (hero always shown).

### Database (apply in order per environment)
- `20260328203000_stripe_webhook_idempotency.sql` — Stripe webhook idempotency / processed events.
- `20260328203100_billing_subscription_status_expand.sql` — broader subscription status storage if present.
- `20260328204000_fix_rls_helper_argument_order.sql` — RLS helper signature/order fixes (large bundle; review before prod).
- `20260328205000_edge_llm_rate_limit.sql` — rate limiting for Edge LLM usage.
- `20260328220000_shop_product_images.sql` — shop product image columns / storage alignment.
- `20260328231000_shop_orders_plan_entitlement.sql` — shop orders tied to plan entitlement / RLS.
- `20260328232000_ensure_clubs_contact_and_seo_columns.sql` — contact + SEO columns on `clubs` if missing.
- `20260329000000_club_public_page_sections.sql` — public page section flags.

### Supabase Edge / shared
- New **`_shared`:** `cors.ts`, `edge_guard.ts`, `plan_entitlements.ts`, `stripe_checkout_prices.ts`, `stripe_webhook_claim.ts` — CORS allowlists, auth/plan guards, Stripe price resolution, webhook claim-first handling.
- **Updated functions:** `stripe-checkout`, `stripe-webhook`, `co-trainer`, `co-aimin`, `ai-match-analysis`; `_shared/llm.ts` adjustments for limits/guards where applicable.

### Client app
- **Plan gate / billing UX:** `plan-gate.tsx`, `use-plan-guard.ts` — avoid flashing paid surfaces before subscription state resolves.
- **Shop (`Shop.tsx`):** Product images via **`shop-product-images`** helper; types/i18n updates.
- **Stripe client (`lib/stripe.ts`), `vite-env.d.ts`, `.env.example`:** Documented vars for publishable key and related flags.
- **`Health.tsx`:** Expanded health/diagnostic surface as needed for ops.
- **`SupportFaq.tsx`:** New support FAQ route (wired in `App.tsx` if present).
- **`main.tsx` / `ErrorBoundary` / `observability.ts`:** Client error/telemetry hooks.
- **`DashboardSidebar`, `PlatformAdmin`, `Matches`, `PlayerStats`, `Teams`:** Minor nav/copy/plan alignment.
- **`integrations/supabase/types.ts`:** Regenerated or patched for new columns.

### Tooling & ops
- **`k6/`:** `smoke.js`, `journeys-critical.js`, `edge-co-trainer-smoke.js` — staging load/smoke scripts; **`npm run k6:smoke`**, **`k6:edge-co-trainer`**, **`k6:journeys`** in `package.json`.
- **`ops/PRODUCTION_READINESS_ARTIFACTS.md`:** Go-live / rollback / monitoring / k6 phase table.
- **`playwright.config.ts`**, **`vercel.json`:** CI/deploy tweaks.

### Documentation sync
- `MEMORY_BANK.md`, `PROJECT_STATUS.md`, `TASKS.md`, `README.md`, `DEPLOYMENT.md` updated in the same release for handoff.

## 2026-03-28 (ONE4AI: reliability, Settings health, edge health check)

### Database
- `20260328200000_club_llm_settings.sql` — `club_llm_settings` (per-club LLM provider, model, API key, Azure fields), admin RLS.
- `20260328180000_ai_conversations.sql` — persisted ONE4AI chat threads (`ai_conversations`).
- `20260328100000_club_invites_ensure_invite_payload.sql`, `20260328133000_club_member_audit_events.sql`, `20260328150000_club_member_audit_draft_timeline.sql` — invites payload + member audit timeline (apply per environment).

### Supabase Edge (`co-trainer` + `_shared/llm.ts`)
- **`assertClubAdmin`** — RPC `is_club_admin` for admin-only operations.
- **`pingLlm`** — minimal non-streaming completion to verify provider credentials.
- **Health endpoint:** POST body `{ "mode": "health", "club_id": "<uuid>" }` returns JSON (200) with `ok`, `configured`, `source` (`club` | `platform`), optional `error`; does not stream.
- Normal chat flow unchanged for members; credentials still from `club_llm_settings` or platform `OPENAI_*` secrets.

### Client — ONE4AI (`CoTrainer.tsx`, `edge-function-auth.ts`)
- Errors from the edge function are shown (toast + assistant message) instead of silently using hardcoded demo replies when `VITE_SUPABASE_URL` is set.
- SSE handling: decoder flush, tail line, OpenAI stream `data: {"error":...}` detection; trimmed Supabase URL + validity check; `JSON.stringify` guarded.
- **`getEdgeFunctionAuthHeaders`:** `refreshSession` when session has no access token.

### Client — Settings (`Settings.tsx`)
- AI provider card: **connection status** (checking / connected / not configured / error), subtitles for club key vs platform default.
- **Test connection** + auto-check after LLM settings load/save/clear via **`supabase.functions.invoke("co-trainer")`**.
- User-facing hints for missing/placeholder `VITE_*` Supabase vars and browser “Failed to fetch” scenarios.
- Fix: invalid JSX in the “not configured” status branch (fragment closed with wrong tag) that broke dynamic import of `Settings.tsx`.

### i18n
- New `settingsPage` strings for LLM health status and network hints; `coTrainerPage` chat error strings (from earlier pass in same release window).

### Documentation
- `MEMORY_BANK.md`, `README.md`, `PROJECT_STATUS.md`, `TASKS.md`, `DEPLOYMENT.md` updated for LLM env, deploy steps, and operational notes.

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
