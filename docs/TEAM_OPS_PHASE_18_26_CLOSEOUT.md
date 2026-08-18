# Team Ops close-out — Phases 18–26

**Status:** Waves 1–7 + Prompt 17 + Phases 18–26 **shipped in repo**. Recommended close-out track **complete**.
**Master expansion audit (2026-08-10):** [`TEAM_OPS_EXPANSION_STATUS.md`](TEAM_OPS_EXPANSION_STATUS.md) — maps Desktop prompt set Prompts 0–27 to DONE/PARTIAL/DEFERRED and lists Tier 1–4 forward plan.

| Order | Phase | Focus | Status |
|------:|-------|--------|--------|
| 1 | **20** | Schema/RLS review of Team Ops tables/RPCs | High done (`20260812240000`) |
| 2 | **25** | Security review (Medium transport/plan/scopes) | Done (`20260812260000`) |
| 3 | **26** | Prod verification (lint/tests/build smoke) | Local gates done; staging E2E 3/14 passing, fixture corrections open |
| 4 | **18** | Public club / partner / operator surface leak check | Done (`TEAM_OPS_PHASE_18_SURFACE_AUDIT.md`) |
| 5 | **22** | Playwright scenarios (RSVP, duties, polls, carpool, guest) | All 14 specs executed with zero skips on 2026-08-18; 11 fixture/club/selector failures remain — see **`TEAM_OPS_E2E_FIXTURES.md`** |
| 6 | **21** | EN/DE i18n hard-string sweep | Activities create dialog done; broader sweep later |
| 7 | **19** | Realtime polish (checklist/guest live) | Done (`20260812280000` + client) |
| 8 | **23** | Query/perf review | Notes + tab mount win (`TEAM_OPS_PHASE_23_PERF_NOTES.md`) |
| 9 | **24** | Activity detail tab IA polish | Done (`ActivityOpsTabs` on Activities) |

## Operator remaining (not code)

- [x] Schedule **hourly** cron → `process-attendance-reminders` (`x-cron-secret`). See `DEPLOYMENT.md`.
- [x] Confirm `ATTENDANCE_REMINDER_CRON_SECRET` or reuse `WEEKLY_DIGEST_CRON_SECRET` in Edge secrets.
- [ ] Capture current hourly execution logs and retain acceptance evidence.
- [ ] Rebuild seven distinct role-correct E2E identities and make the fixture assert the intended active club.

## Known follow-ups from Wave review

- Guest **draft+invite**: client `club_invites` insert may fail under trainer RLS → prefer security-definer invite helper.
- Transport offers: club-wide SELECT (by design for seat discovery); no private home addresses in schema yet — keep it that way.
- `canManageAttendance`: must stay trainer/ops-only (not parent `"team"` module scope).

### Phase 20 High fixes (2026-08-08)

| ID | Fix | Status |
|----|-----|--------|
| H1 | Public club RSVP: no peer `notes`/`response_reason` fetch; overview hides decline text on `variant=club` | Done (client). Full column RLS still optional. |
| H2 | Drop authenticated INSERT/UPDATE/DELETE on `team_ledger_entries` — RPCs only | Migration `20260812240000` |
| H3 | Trainer `remind_missing_activity_attendance` no longer returns recipient emails | Migration `20260812240000` |

**Operator:** `npm run db:push` for `20260812240000` / `20260812260000` / `20260812280000` (Phase 19 publication applied).

## Recommended track complete

Phases **20 → 25 → 18 → 21/22 → 19 → 23 → 24** are done for code + linked DB (Phase 19). Remaining production evidence is a zero-failure authenticated Playwright run with deterministic fixtures and current reminder cron logs.

## Explicitly deferred (not Phase 18–26)

See also **`TEAM_OPS_EXPANSION_STATUS.md` § Explicitly deferred**.

- Push delivery and a product-approved dashboard offline cache policy
- Advanced poll types
- Events RSVP convergence onto `activity_attendance`
- Full recurring activity series editor
