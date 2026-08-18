# ONE4Team — Team Operations Expansion Status & Forward Plan

**Source prompt set:** Desktop `# ONE4Team — Team Operations Expans.txt` (Cursor implementation prompts 0–27)
**Audit date:** 2026-08-10
**Related:** [`team-operations-gap-analysis.md`](team-operations-gap-analysis.md) · [`TEAM_OPS_PHASE_18_26_CLOSEOUT.md`](TEAM_OPS_PHASE_18_26_CLOSEOUT.md) · [`PROMPT_17_PLAN_ENTITLEMENTS.md`](PROMPT_17_PLAN_ENTITLEMENTS.md) · [`attendance-metric-definitions.md`](attendance-metric-definitions.md) · [`TEAM_OPS_E2E_FIXTURES.md`](TEAM_OPS_E2E_FIXTURES.md)

---

## Executive verdict

The Team Operations expansion is **substantially complete in code**. Waves **1–7** (Prompts 2–16 / controller Wave 1–7) and close-out Phases **18–26** (Prompts 18–26) are shipped. Post-expansion **guardian family Members/Settings** (2026-08-09), **dual-role player/trainer + parent** (2026-08-13), and production-review hardening (2026-08-16) are also done.

What remains is **not** a second greenfield build — it is:

1. **Partial polish** on checklists/templates, transport UX, guest conversion, i18n
2. **Test & verification** (role-correct staging fixtures, active-club determinism, Playwright selector cleanup, broader prod smoke)
3. **Explicitly deferred product scope** (push delivery, full offline policy, advanced polls)
4. **Operator apply/deploy** (migrations, Edge functions, cron) on each environment

---

## Prompt / phase matrix

| # | Prompt topic | Wave / phase | Status | Primary evidence |
|---|--------------|--------------|--------|------------------|
| 0 | Gap audit | Phase 0 | **DONE** | `docs/team-operations-gap-analysis.md` |
| 1 | (same as 0) | — | **DONE** | Same |
| 2 | Route / RBAC / RLS alignment | Wave 1 | **DONE** | `rbac-config.ts`, `require-module.tsx`, `team-ops-wave1-proofs.test.ts`, `rls.integration.test.ts` |
| 3 | Activities architecture map | Wave 1 | **DONE** | `docs/activity-domain-model.md` |
| 4 | Expand `activity_attendance` | Wave 1 | **DONE** | `20260811120000_strengthen_activity_attendance_wave1.sql` |
| 5 | Planned availability | Wave 2 | **DONE** | `20260811140000_member_availability_and_attendance_reminders.sql` |
| 6 | Deadlines & reminder engine | Wave 2 + 22 | **DONE** | `process-attendance-reminders` Edge; `20260812220000` |
| 7 | ICS calendar feeds | Wave 4 + 7 | **DONE** | `calendar-ics` Edge; `20260812200000` |
| 8 | Polls in Communication | Wave 3 | **DONE** | `20260812120000`; `club-polls-panel.tsx` |
| 9 | Tasks → duties | Wave 3 | **DONE** | `claim_club_task`, `claimable`, `slots_total` |
| 10 | Event checklists | Wave 3 | **DONE** | Activity spawn + readiness badge (`activity-readiness-badge.tsx`) |
| 11 | Activity transport | Wave 4 | **DONE** | Pending requests + driver accept RPC + summary cards |
| 12 | Guest / trial players | Wave 4 + 22 | **DONE** | `convert_activity_guest_to_draft_invite` RPC |
| 13 | Team finance (ledger) | Wave 5 | **DONE** | `20260812160000`; `/team-ledger`; approvals `20260812220000` |
| 14 | Attendance analytics | Wave 5 | **DONE** | `attendance-metric-definitions.md`, Reports panel |
| 15 | AI 4 T team ops | Wave 6 | **DONE** | `20260812180000`; agent intents/tools |
| 16 | PWA / mobile ops UX | Wave 7 | **PARTIAL** | Dashboard manifest + network-only SW; **push DEFERRED** |
| 17 | Plan entitlements | Prompt 17 | **DONE** | `PROMPT_17_PLAN_ENTITLEMENTS.md`, `plan-entitlements.ts` |
| 18 | Surface leak audit | Phase 18 | **DONE** | `TEAM_OPS_PHASE_18_SURFACE_AUDIT.md` |
| 19 | Realtime | Phase 19 | **DONE** | `20260812280000`; checklist/guests live |
| 20 | Schema / RLS review | Phase 20 | **DONE** | `20260812240000` |
| 21 | EN/DE i18n | Phase 21 | **DONE** | Polls/duties/transport/ledger/availability + tier strings |
| 22 | Playwright E2E | Phase 22 | **DONE** | Scenarios 1–6 + family/persona + ledger approval; `npm run e2e:team-ops` credential preflight |
| 23 | Performance | Phase 23 | **DONE** | `TEAM_OPS_PHASE_23_PERF_NOTES.md`, lazy ops tabs |
| 24 | Activity tab IA | Phase 24 | **DONE** | `ActivityOpsTabs` |
| 25 | Security review | Phase 25 | **DONE** | `20260812260000` |
| 26 | Production verification | Phase 26 | **PARTIAL** | Local gates green; 14 Playwright tests ran with 0 skips (3 pass / 11 fixture failures); cron proof pending |
| 27 | Controlled execution | Controller | **DONE** | Waves 1–7 executed per `TASKS.md` |

### Post-expansion (2026-08-09 / 2026-08-13 / 2026-08-16, not in original prompt numbering)

- 2026-08-16 production-review hardening: family RLS/search, assignment-gated Parent persona, ICS boundaries, atomic capacity/waitlist, reminder opt-outs, direct-route PWA registration, deterministic duty/family/ledger E2E. Migration `20260816120000` and `calendar-ics` deployed.
- 2026-08-18 verification: dashboard runtime crash fixed; local gates green; authenticated E2E blockers isolated to staging role/club setup and transition selectors. Invite email 401 isolated to stale browser JWT handling.

| Topic | Status | Evidence |
|-------|--------|----------|
| Guardian family Members / Settings | **DONE** | `guardian-family-panel.tsx`, family-scoped `Members.tsx`, `20260812290000` |
| Dual-role player/trainer + parent | **DONE** | `guardian-family-scope.ts`, persona switch, `20260812320000` |
| Duplicate review dismiss | **DONE** | `20260812310000`, `SharedContactAccountsPanel` |

---

## Explicitly deferred (documented, not bugs)

| Item | Why deferred | Revisit when |
|------|--------------|--------------|
| Full dashboard offline policy | Sensitive data / offline policy | Product defines safe cached scope; manifest + network-only service worker are shipped |
| Push notifications | No delivery infra in scope | FCM/APNs + consent model |
| Activity waitlist / capacity | **DONE (20260812300000)** | `waitlisted` status + promotion RPC |
| Match lineup ↔ RSVP bridge | **DONE (minimal)** | Lineup picker shows activity RSVP labels |
| Advanced poll types (date selection, transform-to-duty) | MVP polls shipped | Coordination workflow demand |
| Recurring activity series editor | **SCaffold** (`activities.series_id`) | Full edit-one/edit-future editor |
| Events RSVP convergence (`event_participants`) | **DEFERRED** | Map or repair in dedicated sprint |

---

## Forward development plan (prioritized)

### Tier 1 — Hardening & trust ✅ (2026-08-10)

| ID | Work | Status |
|----|------|--------|
| **TO-NEXT-01** | Playwright scenarios **2–6** | **DONE** — `e2e/team-ops-*.spec.ts` |
| **TO-NEXT-02** | Guest **draft+invite** RPC | **DONE** — `convert_activity_guest_to_draft_invite` |
| **TO-NEXT-03** | Phase **21** i18n | **DONE** |
| **TO-NEXT-04** | JWT RLS probes | **DONE** — extended `rls.integration.test.ts` |

### Tier 2 — UX polish ✅ (2026-08-10)

| ID | Work | Status |
|----|------|--------|
| **TO-NEXT-05** | Checklist activity spawn + readiness | **DONE** |
| **TO-NEXT-06** | Transport driver accept + summary | **DONE** |
| **TO-NEXT-07** | Trainer **attended** override + filters | **DONE** |
| **TO-NEXT-08** | DB **notification preferences** | **DONE** — `member_notification_preferences` |

### Tier 3 — Architectural extensions (partial)

| ID | Work | Status |
|----|------|--------|
| **TO-NEXT-09** | Capacity + waitlist | **DONE** |
| **TO-NEXT-10** | Lineup ↔ RSVP bridge | **DONE (minimal)** |
| **TO-NEXT-11** | Events RSVP convergence | **DEFERRED** |
| **TO-NEXT-12** | Recurring series | **SCaffold only** (`series_id`) |

### Tier 4 — Mobile / engagement (partial)

| ID | Work | Status |
|----|------|--------|
| **TO-NEXT-13** | Parent few-tap RSVP | **DONE** — `ParentNextTrainingRsvpCard` |
| **TO-NEXT-14** | Dashboard PWA manifest + SW | **DONE** — network-only |
| **TO-NEXT-15** | Push for reminders | **DEFERRED** — operator provider setup |

---

## Operator checklist (every environment)

```powershell
npm run db:push   # through 20260812300000 (tier forward migration)
npx supabase functions deploy calendar-ics --no-verify-jwt
npx supabase functions deploy process-attendance-reminders --no-verify-jwt
# Hourly cron → process-attendance-reminders (see DEPLOYMENT.md)
```

Verify: PlanGate keys (`polls`, `calendarIcs`, `teamCashbox`, `carpoolGuests`) match club plan on staging.

---

## Documentation map

| Document | Role |
|----------|------|
| **This file** | Master status vs expansion prompt set + forward plan |
| `team-operations-gap-analysis.md` | Phase 0 capability matrix (keep in sync) |
| `TEAM_OPS_PHASE_18_26_CLOSEOUT.md` | Hardening phase tracker |
| `TEAM_OPS_E2E_FIXTURES.md` | Playwright staging requirements |
| `PROMPT_17_PLAN_ENTITLEMENTS.md` | Commercial gating decisions |
| `attendance-metric-definitions.md` | Reports metric SSOT |
| `activity-domain-model.md` | Activity/training/match/event map |

---

*Last updated: 2026-08-16 — review hardening deployed; authenticated staging E2E, reminder cron logs and staging cleanup remain credential-dependent.*
