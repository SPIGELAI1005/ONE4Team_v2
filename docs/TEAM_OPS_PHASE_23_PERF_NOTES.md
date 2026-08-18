# Phase 23 — Team Ops query / performance notes

**Date:** 2026-08-08

## Findings

| Area | Current | Risk | Mitigation shipped / recommended |
|------|---------|------|----------------------------------|
| Activities list attendance | Club-scoped fetch + debounced Realtime reload (400ms) | Full refetch on any attendance change | Keep debounce; consider activity-id targeted patch later |
| Transport / guests panels | Were mounted on every visible card | N panels × queries | **Phase 24 tabs** mount only active panel |
| Guests Realtime | New per open guests panel | Extra channels when many cards open | Only while Guests tab mounted |
| Checklist Realtime | Per open task checklist | OK if few open sheets | Debounced 350ms reload |
| Public club team attendance | Cap + no reason columns | Roster join still heavy | Keep ROSTER_FETCH_CAP; avoid N+1 |
| Reports attendance window | 28-day aggregate | Acceptable | Prefer RPC aggregates if window grows |
| ICS Edge | Service-role activity query by scope | Club scope dumps many rows | Prefer `self`/`team` defaults in UI |

## Quick wins applied with Phase 19/24

1. Activity ops tabs — transport/guests not mounted until selected.
2. Debounced Realtime on guests + checklist.
3. Selective publication only (no calendar_subscriptions / ledger).

## Not done (backlog)

- Patch attendance cache in-place instead of `fetchData()` on Realtime.
- Virtualize long week lists on mobile.
- Consolidate public club roster + attendance into one RPC.
