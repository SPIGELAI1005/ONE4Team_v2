# Prompt 17 — Plan entitlement decisions (2026-08-08)

Commercial decisions for Team Operations features. Source of truth after this doc: `src/lib/plan-entitlements.ts` + `PlanGate` / `usePlanGuard`.

| Feature key | Kick-off | Squad | Pro | Champions |
|-------------|----------|-------|-----|-----------|
| `polls` | ✅ | ✅ | ✅ | ✅ |
| `calendarIcs` | ✅ | ✅ | ✅ | ✅ |
| `teamCashbox` | ❌ | ❌ | ✅ | ✅ |
| `carpoolGuests` | ❌ | ❌ | ✅ | ✅ |

## Product notes

- Polls + ICS: available on **all paid plans** (Kick-off+).
- Team cashbox (`/team-ledger`) and carpool + guest players: **Pro+**.
- Catalog **was changed** (not frozen): Kick-off keeps polls/ICS without a separate add-on; cashbox/carpool require Pro.
- RBAC still applies independently of plan (persona ≠ authorization).

## Related ops decisions (same session)

| Topic | Decision |
|-------|----------|
| Guest → membership | Paths **A+B** (link existing **or** draft+invite); **trainer + club admin**; never auto-create Auth |
| Team ledger approvals | Required for **all** entries; approvers: trainer / team_management / club_admin (not self); reject → **edit & resubmit** |
| RSVP reminders | **In-app + email**; fire **24h before**, **morning of**, **custom**; only if `automatic_reminders`; Edge + cron deploy |
