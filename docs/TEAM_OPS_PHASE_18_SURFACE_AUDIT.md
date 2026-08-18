# Phase 18 — Surface exposure check (Team Ops)

**Date:** 2026-08-08
**Scope:** Marketing / public club / private dashboard / partner / operator vs Team Ops features.

| Surface | Transport | Guests | Team cashbox | Polls | ICS | Attendance reasons |
|---------|-----------|--------|--------------|-------|-----|--------------------|
| Public club microsite | Not mounted | Not mounted | Not mounted | Not mounted | Not mounted | Status only (H1 fixed) |
| Private dashboard | Activities + `carpoolGuests` PlanGate | Same | `/team-ledger` + `teamCashbox` | Communication + `polls` | My Data + `calendarIcs` | Trainer overview OK |
| Partner portal | No Team Ops routes | — | — | — | — | — |
| Operator Control Center | No personal attendance/ledger UI | — | Billing entitlement inspect only | — | — | — |
| Marketing / pricing | Entitlement copy only | — | — | — | — | — |

## Verdict

- Private Team Ops stay behind dashboard auth + module/PlanGate (and Phase 25 server `club_has_plan_feature` on RPCs).
- Public club does **not** mount transport, guests, cashbox, or polls.
- Residual: public RSVP still shows **who** is coming/declined (by design); reasons stripped.

## Follow-ups

- Optional: operator health card for reminder cron / ICS edge latency (not personal data).
- Prefer default ICS scope `self` in UI when creating feeds (M7 secrecy).
