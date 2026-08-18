# ONE4Team — Team Operations Gap Analysis

**Audit date:** 2026-08-08 (Phase 0) · **Status update:** 2026-08-10
**Scope:** Read-only repository audit (Prompt 1 / Phase 0) for TeamCaptain-style team operations expansion
**Overall:** Waves 1–7 + Phases 18–26 **shipped in repo**. Remaining work = polish, E2E, i18n, deferred scope. **Master tracker:** [`docs/TEAM_OPS_EXPANSION_STATUS.md`](TEAM_OPS_EXPANSION_STATUS.md)
**Related:** [`MEMORY_BANK.md`](../MEMORY_BANK.md) · [`docs/activity-domain-model.md`](activity-domain-model.md) · [`docs/attendance-metric-definitions.md`](attendance-metric-definitions.md) · [`docs/rbac-dashboard-plan.md`](rbac-dashboard-plan.md) · [`docs/PRICING_AND_ENTITLEMENTS.md`](PRICING_AND_ENTITLEMENTS.md) · [`src/lib/rbac-config.ts`](../src/lib/rbac-config.ts)

---

## 1. Executive summary

ONE4Team already has a **strong club-ops core**: members registry, trainings/matches/events surfaces, binary RSVP on `activity_attendance`, tasks with notifications, club payments/expenses, guardian links for master data, AI 4 T agent workflows, and a public club microsite with RSVP.

It does **not** yet have a full TeamCaptain-style daily team coordination stack. Gaps concentrate in:

| Cluster | Verdict |
|---------|---------|
| RSVP / attendance (binary training+match) | **Strong** — extend, do not replace |
| Maybe / waitlist / selection bridge / deadlines / guardian RSVP | **Strong** (Wave 1–2) — waitlist/capacity still **Missing** |
| Planned availability (independent of activities) | **Strong** (Wave 2) |
| Reminder engine / ICS calendars | **Strong** (Wave 2 remind + Wave 4 tokens + Wave 7 Edge ICS) |
| Polls / carpooling / duty templates / checklists | **Strong** (Waves 3–4; template UI still light) |
| Guest / trial players as a domain | **Partial** (Wave 4 guests table; conversion UX open) |
| Team budget / contributions | **Strong** (Wave 5 team cashbox — not club payments) |
| Attendance analytics in Reports | **Strong** (Wave 5 definitions + Reports panel) |
| Route ↔ RBAC alignment | **Improved** via `RequireModule` — still needs Wave 1 hardening vs RLS |
| PWA | **Partial** — public club install; dashboard safe-area polish (Wave 7); no dashboard SW/push |

**Primary rule for all later waves:** extend existing tables, hooks, and RLS. Never create a parallel RSVP, task, or club-membership ledger.

---

## 2. Capability matrix

| Capability | Current State | Existing Implementation | Missing Pieces | Reuse Recommendation | Priority |
| ---------- | ------------- | ----------------------- | -------------- | -------------------- | -------- |
| Activities calendar (training/match/event types) | **Strong** | `activities` + `/activities`; Teams creates trainings into `activities` | Unified lifecycle (`draft`/`published`/…), timezone, meeting point, capacity, deadlines | Extend `activities`; do not invent a second Event root | P0 |
| Matches (fixtures, scores, lineups) | **Strong** | `matches`, `match_lineups`, `/matches` | Hard FK from match → activity for RSVP; selection↔attendance UX | Keep `matches` canonical for fixtures; soft-map or FK to `activities` for RSVP | P0 |
| Club Events (festival/camps) | **Partial** | `events`, `/events`, camps metadata, feed admin | Fragile `event_participants` vs generated types; RSVP not unified with `activity_attendance` | Prefer converging event RSVP onto `activity_attendance` or repair `event_participants` deliberately | P1 |
| Training sessions / Asset Map recurrence | **Partial** | `training_sessions.recurring`; pitch weekly materialization; agent duplicate week | True series model (`series_id`), edit-one vs edit-future, preserve attendance on regen | Materialize occurrences into `activities`; never delete attendance when regenerating | P1 |
| RSVP / attendance (yes/no/maybe) | **Strong** | `activity_attendance` + RPC upsert; public + dashboard UI | Soft invite undercounting; trainer mark `attended` UI | **Extend this table only** — no parallel RSVP | P0 |
| Maybe / unanswered semantics | **Strong** (Wave 1) | Status `maybe`; unanswered = invited / missing roster row | Soft invite undercounting edge cases | Keep improving eligible-participant math in Wave 2 reminders | P1 |
| Waitlist / capacity | **Missing** | `events.max_participants` only (events path) | Activity capacity, waitlist status, promotion RPC | Separate from response status if needed; RPC for claim/promote | P2 |
| Squad selection vs RSVP | **Needs architectural improvement** | `match_lineups` separate from attendance (good isolation) | Bridge UX: available → selected | Keep concepts separate; link in Match detail tabs | P1 |
| Decline reasons | **Partial** | UI presets → `notes` | Typed `response_reason`, permission-aware visibility, `responded_by` | Add columns; keep free-text note | P1 |
| Guardian RSVP for wards | **Strong** (Wave 2) | RPC + Activities person picker (self/guardian) | Parent dashboard shortcuts | Keep using `list_editable` / guardian links | P0 done |
| Trainer attendance overview | **Strong** | `training-attendance-trainer-panel`, overview, summary bar, today card | Override write UI, filters/search | Extend panel; scheduled email still later | P1 |
| Response deadline | **Strong** (Wave 2) | Column + create UX + RSVP open check | Match-specific defaults, server-only enforcement polish | Keep column on `activities` | P1 |
| Missing-response reminders | **Partial** (Wave 2) | Manual RPC + idempotent log + trainer Remind; clipboard nudge remains | Scheduled jobs, preference persistence | Reuse `notifications` + digest/automation_runs pattern | P1 |
| Planned availability / absences | **Strong** (Wave 2) | `member_availability` + My Data panel; overlap hints on Activities | Bulk edit, calendar view | Overlap hints only — never overwrite RSVP | P1 |
| Calendar ICS subscriptions | **Strong** (Wave 7) | Token hash + Edge `calendar-ics` + My Data URL/revoke | Team/self scope UI polish, rate limits | Opaque token only | P2 |
| Polls | **Strong** (Wave 3) | `club_polls` + Communication Polls channel; not Tasks | Transform-to-duty, activity attach | Keep in Communication | P2 |
| Tasks (assignee, status, due) | **Strong** | `club_tasks`, `use-club-tasks`, `club-task-access`, Realtime | Multi-assignee, recurrence, due reminders | Extend `club_tasks` (+ junction if needed) | P1 |
| Event checklists | **Strong** (Wave 3) | `club_task_checklist_items` on tasks; template seed/spawn UI | Activity-scoped spawn polish, multi-claimer junction | Prefer task rows / checklist items | P2 |
| Team duties / open claimable slots | **Strong** (Wave 3) | `claimable` + `claim_club_task`; slots_total create UI + starter templates | Multi-claimer junction | Stay on `club_tasks` | P2 |
| Carpooling / transport | **Strong** (Wave 4) | Activity offers/requests + seat RPC | Driver accept UI polish, privacy copy | Stay activity-scoped | P2 |
| Guest / trial players | **Partial** (Wave 4) | `activity_guest_participants` (no Auth) | Conversion to membership preserving history | Extend drafts + guests — never auto-create Auth | P2 |
| Club formal payments / dues | **Strong** | `payments`, `membership_dues`, fee packages, household discount, Stripe | — | **Do not destabilize** | P0 protect |
| Club expenses / financial reports | **Strong** | `club_expenses`, `club-financial-snapshot`, Reports financial tab | Optional `team_id` attribution | Soft tag only for club P&L | P2 |
| Team budget / contributions / cashbox | **Strong** (Wave 5) | `team_ledger_*` + `/team-ledger`; balance derived | Approvals workflow | **Never** overload `payments`/`membership_dues` | P2 |
| Attendance analytics | **Strong** (Wave 5) | Definitions doc + Reports AttendanceReportPanel | Heatmap embed, AI summaries | Extend Reports; definitions canonical | P2 |
| Notifications (in-app) | **Strong** | `notifications`, Realtime bell, task/message fan-out | Persistent prefs (Settings mostly localStorage), more types | Extend table + membership prefs | P1 |
| Email / digests | **Strong** | Resend invites; `process-weekly-digests`; guardian wards in digest | Attendance/duty reminder emails | Reuse Edge + automation claim pattern | P1 |
| Push / PWA (ops) | **Partial** | Public club manifest + SW; dashboard mobile shell + Sheet/Dialog safe-area | Dashboard PWA, push delivery, offline policy | Extend public PWA carefully; do not cache sensitive data | P3 |
| Realtime collaborative ops | **Strong** (Wave 7) | Attendance/polls/transport/tasks published + client reloads | Checklist/guest live updates | Selective subscriptions; RLS-bound | P3 |
| AI 4 T team ops actions | **Strong** (Wave 6) | Attendance/duty/checklist/poll/metrics intents on propose→confirm→execute; reminder draft never auto-sends | Scheduled reminder jobs from agent still forbidden | Extend existing agent only | P3 |
| RBAC route guards | **Strong** (improved) | `RequireModule` / `RequireAnyModule` on payments, tasks, activities, matches, etc. | Fine-grained attendance/poll/duty perms; RLS proof tests; persona ≠ auth education | Extend `rbac-config.ts` + matrix; Wave 1 tests | P0 |
| Plan entitlements | **Partial** | `attendance`, `tasks`, `trainings`, `matches`, `events` on Kick-off+; `financialReports` Pro+ | No keys for polls/ICS/team cashbox/advanced analytics | Recommend before changing `plan-catalog.ts` | P1 decide |
| i18n EN/DE for new ops | **Partial** | Existing attendance/tasks/training strings | Polls, duties, transport, availability, calendar | Keep `src/i18n/en.ts` + `de.ts` in sync | Continuous |

**Status legend:** Complete · Strong · Partial · Prototype · Missing · Needs architectural improvement

---

## 3. Domain model: activities / training / match / event

```text
                    ┌─────────────────┐
                    │   activities    │  ← RSVP parent (type: training|match|event)
                    │ activity_attendance
                    └────────┬────────┘
         soft-map / future FK│
     ┌───────────────┬───────┴────────┬────────────────┐
     ▼               ▼                ▼                ▼
 training_sessions  matches        events         pitch_bookings
 (legacy/fallback)  + lineups      (+ participants?)  (asset map)
     │               │                │
     └───────────────┴── public club pages / Teams schedule ──┘
```

| Concept | Table(s) | Routes | Attendance |
|---------|----------|--------|------------|
| Activity | `activities` | `/activities` | **Yes** — `activity_attendance` (training/match UI) |
| Training | Prefer `activities.type='training'`; fallback `training_sessions` | `/teams`, `/activities`, public schedule | Via mapped `activities.id` |
| Match ops | `matches` + `match_lineups` | `/matches` | RSVP via soft-mapped activity; selection separate |
| Club event | `events` | `/events` | Intended `event_participants` — **fragile** vs types/heatmap migrations |

**Activity properties today:** `club_id`, `team_id`, `title`, `description`, `starts_at`, `ends_at`, `location`, `type`, `created_by`, `pitch_booking_id`, `import_key`, `publish_to_public_schedule`.

**Missing vs desired:** timezone, meeting_time/point, capacity, `response_deadline`, selection_deadline, explicit lifecycle status beyond implied publish flags.

---

## 4. `activity_attendance` deep dive

**Schema (authoritative):** `supabase/migrations/20260725130000_activity_attendance_member_self_rsvp.sql`

| Column | Purpose |
|--------|---------|
| `club_id` | Tenant |
| `activity_id` | Parent activity |
| `membership_id` | Participant |
| `status` | `invited` \| `confirmed` \| `declined` \| `attended` \| **`maybe`** (Wave 1) |
| `response_reason`, `responded_by`, `responded_at` | Wave 1 RPC columns |
| `notes` | Decline reason text (UI) |
| `created_at` / `updated_at` | Timestamps |

**Who can respond:**
- Self via **`upsert_activity_attendance_response`** RPC (security definer).
- Guardians for linked wards (same RPC — Wave 2).
- Trainers/admins: manage + remind RPCs.

**Desired mapping (current):**

| Desired | Map to |
|---------|--------|
| yes | `confirmed` (+ `attended` for post-event) |
| no | `declined` |
| maybe | **`maybe`** ✅ |
| unanswered | no row or `invited` |
| waitlisted / selected / not_selected | **Still missing** — use lineups + future waitlist table/RPC |

---

## 5. Existing assets to reuse

### 5.1 Database models

| Model | Reuse for |
|-------|-----------|
| `activities` | Schedule backbone |
| `activity_attendance` | All RSVP |
| `matches` / `match_lineups` | Fixtures + selection |
| `events` | Club/festival content |
| `club_tasks` | Duties / checklists (extend) |
| `notifications` | Reminders |
| `club_member_guardian_links` | Guardian RSVP actor rules |
| `payments` / `membership_dues` / `club_expenses` | Club finance only |
| `automation_rules` / `automation_runs` | Scheduled reminders pattern |
| `club_member_drafts` | Guest/trial before Auth |

### 5.2 Hooks

| Hook | Path |
|------|------|
| `use-club-tasks` | `src/hooks/use-club-tasks.ts` |
| `use-club-notifications` | `src/hooks/use-club-notifications.ts` |
| `use-public-club-attendance` | `src/hooks/use-public-club-attendance.ts` |
| `use-permissions` / `useModuleDataScope` | RBAC + team scope |
| `use-active-club` | Tenant context |

### 5.3 Components

| Component | Path |
|-----------|------|
| RSVP card / overview / trainer panel / summary | `src/components/activities/training-attendance-*.tsx` |
| Public RSVP | `src/components/public-club/public-club-attendance-rsvp.tsx` |
| Activities / Matches / Events / Tasks / Payments pages | `src/pages/*` |
| Reports / financial panel | `src/components/dashboard/FinancialReportPanel.tsx` |
| Attendance heatmap | `src/components/analytics/AttendanceHeatmap.tsx` |
| Notification bell | `src/components/dashboard/NotificationBell.tsx` |

### 5.4 Lib helpers

| Lib | Path |
|-----|------|
| Attendance domain | `src/lib/training-attendance.ts` |
| Public activity mapping | `src/lib/public-club-attendance.ts` |
| Task access | `src/lib/club-task-access.ts` |
| Message access | `src/lib/club-message-access.ts` |
| RBAC SSOT | `src/lib/rbac-config.ts` |
| Plan entitlements | `src/lib/plan-entitlements.ts`, `plan-catalog.ts` |
| Financial snapshot | `src/lib/club-financial-snapshot.ts` |
| Guardian / master field policy | `src/lib/member-master-*.ts` |

### 5.5 RPCs (extend / pattern)

| RPC / pattern | Use |
|---------------|-----|
| Heatmap / radar / team challenge | Attendance analytics foundation |
| `is_guardian_for_member`, `shares_login_email_with_membership` | Guardian authorization |
| `save_member_master_record` | Pattern for actor-aware privileged writes |
| Weekly digest claim / automation runs | Reminder idempotency pattern |
| `agent_duplicate_training_week_sessions` | Recurrence-adjacent clone (careful with attendance) |

### 5.6 RLS to extend

| Table | Notes |
|-------|-------|
| `activity_attendance` | Add guardian write via RPC preferred over open UPDATE |
| `club_tasks` | Team scope already; duties claim needs race-safe RPC |
| `notifications` | Prefer membership-scoped inserts via triggers/RPC |
| New tables | Always `club_id` + explicit SELECT/INSERT/UPDATE/DELETE |

### 5.7 Edge functions to reuse patterns from

| Function | Pattern |
|----------|---------|
| `process-weekly-digests` | Scheduled fan-out + Resend |
| `send-club-invite-email` | Transactional email |
| `ai4team-agent` | Propose → confirm → execute + audit |
| `co-trainer` | Scoped AI context |

---

## 6. Permissions & plan entitlement impact

### 6.1 Current RBAC (relevant)

- SSOT: `src/lib/rbac-config.ts` — modules include `trainings`, `matches`, `events`, `tasks`, `messages`, `payments`, …
- `team_management`: ops **without** finance (`OPS_NO_FINANCE_SIDEBAR`).
- `parent_supporter`: payments → **family** scope.
- Routes: many already wrapped in `RequireModule` / `RequireAnyModule` / `PlanGate` / portal gates (`src/App.tsx`).

### 6.2 Suggested capability additions (into existing matrix — not a second system)

Map into `DashboardModule` access levels and/or fine-grained helpers derived from `rbac-config`:

```text
attendance.respond_self
attendance.respond_guardian
attendance.manage
availability.manage_self / manage_guardian
polls.manage / polls.vote
duties.manage / duties.claim
transport.manage / transport.participate
team_finance.view / manage / approve   ← separate from club payments
attendance.analytics
```

**Critical:** UI persona (`one4team.activeRole`) must **never** authorize these. Use `usePermissions()` + RLS/RPC.

### 6.3 Plan entitlements

Already present feature flags: `trainings`, `matches`, `events`, `attendance`, `tasks`, `duesTracking`, `onlinePayments`, `financialReports` (Pro+), AI flags.

**Decided (Prompt 17 — see `docs/PROMPT_17_PLAN_ENTITLEMENTS.md`):**

| Feature key | Kick-off+ | Pro+ |
|-------------|-----------|------|
| `polls`, `calendarIcs` | ✅ | ✅ |
| `teamCashbox`, `carpoolGuests` | ❌ | ✅ |

Catalog updated in `src/lib/plan-entitlements.ts`; PlanGate wired on cashbox route, polls channel, transport/guests, ICS card.

---

## 7. Family / guardian architecture

| Question | Finding |
|----------|---------|
| How are parent–child links stored? | `club_member_guardian_links` |
| Multiple guardians? | Supported by link table |
| Must child have Auth? | Membership can exist; shared-login household also covers same-email wards |
| Can parent edit child master data? | **Yes** via `/my-data`, **Settings → Profile**, or family-filtered **`/members`** + RPC actor `guardian` / household email (2026-08-09) |
| Can parent RSVP for child? | **Yes** (Wave 2) — Activities person picker + `upsert_activity_attendance_response` via guardian link |
| Can parent see child on Members roster? | **Yes** (2026-08-09) — family-scoped **`/members`** when `club_member_guardian_links` exist; draft-only links do not count |
| Family dues? | **Yes** — `family-dues-role`, My Dues card |

---

## 8. Payments vs team finance (accounting principle)

```text
Club ledger (KEEP)
  payments + membership_dues + fee packages + Stripe
  club_expenses + shop → FinancialReportPanel

Team sub-ledger (NEW IF PRODUCT REQUIRES)
  team_id + transaction rows → derived balance
  NEVER mutate a single “balance” column as source of truth
  NEVER write team cash into membership payments

Partner ledger (KEEP SEPARATE)
  partner_invoices / marketplace
```

Money: Postgres `numeric`; no authoritative float math in JS.

---

## 9. Migration risks

| Risk | Mitigation |
|------|------------|
| Regenerating recurring activities deletes attendance | Never delete occurrences with RSVP; copy-forward or soft-cancel |
| Adding statuses to `activity_attendance` check constraint | Additive migration; backfill; update all clients |
| Converging Events onto activities | Audit remote for `event_participants`; regenerate types |
| Soft match↔activity mapping duplicates | Prefer explicit FK or unique import keys |
| Team finance confused with club Payments | New tables + RBAC; keep `team_management` off club payments |
| Guardian RSVP open RLS | Prefer security-definer RPC with link check + `responded_by` |
| Calendar tokens | Opaque random token hash; revoke; no id-as-secret |
| Public club over-exposure | Keep reasons/transport/finance private |
| Migration filename dating | Follow repo batch convention (`supabase/migrations/README.md`) |

---

## 10. UX gaps (product)

| Journey | Today | Gap |
|---------|-------|-----|
| Parent: next training → child → YES | Possible if shared login / own account; multi-ward unclear | Guardian picker + few-tap RSVP |
| Trainer: unanswered → Remind | Counts + clipboard nudge | Bulk remind + delivery |
| Player: today training → RSVP + location + task | RSVP strong; tasks separate | Activity detail hub tabs |
| Planned holiday spanning many sessions | — | Availability + suggested NO |
| Match readiness | Lineups + separate tasks | Checklist readiness score |
| Transport to away match | — | Activity Transport tab |
| Trial guest at training | Draft/invite paths only | Guest participation without full Auth |

Design constraint: keep glass / shadcn / `dashboard-page-shell` — do not invent a TeamCaptain skin.

---

## 11. Recommended implementation waves (aligned to prompt set)

| Wave | Focus | Depends on |
|------|-------|------------|
| **1 — Foundation** | Route/RLS/permission alignment; activity model map; strengthen `activity_attendance` (actor, reasons, maybe) | Audit (this doc) |
| **2 — Daily ops** | Availability; deadlines; missing-response reminders; guardian RSVP; trainer overview | **Done** (Wave 2) — scheduled reminder jobs still open |
| **3 — Coordination** | Polls (in Communication); duties/templates; checklists on tasks | **Done** (Wave 3) — template spawn UI still light |
| **4 — Logistics** | Transport; guests/trials; ICS feeds | **Done** (Wave 4 tokens + Wave 7 Edge ICS) |
| **5 — Finance + analytics** | Team ledger; Reports attendance metrics + definitions doc | **Done** (Wave 5) — club finance still protected |
| **6 — Intelligence** | AI 4 T attendance/duty/checklist intents | **Done** (Wave 6) — never auto-send reminders |
| **7 — Polish** | Realtime, PWA/mobile, performance, security, production | **Done** (Wave 7 MVP) — dashboard PWA/push deferred |

---

## 12. Permissions requiring changes (Wave 1 checklist)

- [x] Confirm every finance route uses module gate **and** RLS (Payments already `RequireModule` + PlanGate) — unit proof in `team-ops-wave1-proofs.test.ts`; JWT payments isolation in `rls.integration.test.ts`.
- [x] Prove trainer team A cannot write team B attendance/lineups — **unit:** manage vs player gates; **staging:** optional `RLS_TEST_JWT_TRAINER_TEAM_A` + team B activity/membership.
- [x] Prove parent cannot RSVP for unrelated membership — RPC enforces guardian links; **staging:** optional `RLS_TEST_JWT_PARENT` probe.
- [x] Prove `team_management` cannot access club finance via URL or RPC — unit (`canAccessClubFinance` / financial reports); **staging:** optional `RLS_TEST_JWT_TEAM_MGMT`.
- [x] Prove operator platform auth ≠ club membership — operator routes use `RequireOperator`; club RBAC ignores platform role strings (unit proof).
- [x] Document: dashboard persona ≠ authorization — `activity-attendance-access.ts` header + financial reports authorizedRole proof.

---

## 13. Next steps (2026-08-10)

Core expansion **implemented**. See **[`TEAM_OPS_EXPANSION_STATUS.md`](TEAM_OPS_EXPANSION_STATUS.md)** for prompt-by-prompt status and prioritized backlog.

**Tier 1 (recommended next):**
1. Playwright E2E scenarios 2–6 + staging guardian fixtures
2. Guest draft+invite security-definer helper (trainer RLS)
3. Phase 21 EN/DE i18n sweep (polls, duties, transport, ledger)
4. Optional JWT RLS probes in CI

**Tier 3 (product-led):** waitlist/capacity, lineup↔RSVP bridge, events RSVP convergence, recurring series model.

**Deferred:** dashboard PWA/push, advanced poll transforms.

---

## 14. File index (quick)

```text
Attendance:  supabase/migrations/20260725130000_activity_attendance_member_self_rsvp.sql
             src/lib/training-attendance.ts
             src/components/activities/training-attendance-*.tsx
             src/pages/Activities.tsx
Tasks:       supabase/migrations/20260724180000_club_tasks.sql
             src/hooks/use-club-tasks.ts
             src/lib/club-task-access.ts
Guardians:   club_member_guardian_links + 20260808120000_* / 20260810120000_*
Finance:     src/pages/Payments.tsx, src/lib/club-financial-snapshot.ts
RBAC:        src/lib/rbac-config.ts, src/App.tsx (RequireModule)
PWA:         src/lib/public-club-pwa-manifest.ts, public/club-pwa-sw.js
ICS:         supabase/functions/calendar-ics, src/lib/calendar-ics-url.ts
AI:          supabase/functions/ai4team-agent, co-trainer
```

---

*End of Phase 0 audit. Waves 1–7 + Phases 18–26 complete in repo. Forward plan: [`TEAM_OPS_EXPANSION_STATUS.md`](TEAM_OPS_EXPANSION_STATUS.md).*
