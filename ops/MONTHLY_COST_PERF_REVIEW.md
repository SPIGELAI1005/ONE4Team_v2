# Monthly cost & performance review (ST-012)

**Cadence:** monthly (or after major feature wave)  
**Owner:** Engineering lead + whoever owns Supabase billing

## Inputs

- Supabase dashboard: DB size, egress, Edge invocations, Realtime minutes, storage.
- Query Performance / slow queries (top 10 by total time).
- CI bundle budget output (`npm run build && npm run budget:bundle`).
- k6 staged run summary (`k6/staged-dashboard-reads.js`).

## Actions

1. Tie cost spikes to module hotspots (Communication, Analytics RPCs, public club page).
2. Open tickets for any regression vs prior month > 20% without traffic explanation.
3. Confirm indexes from `20260329132000_hotspot_composite_indexes.sql` still match hottest filters.

## Sign-off

- [x] Review completed (2026-03-29 — baseline pass: inputs gathered from CI bundle budget + k6 artifact path; no prior-month regression compare)  
- [x] Follow-up tickets created (none required for baseline 2026-03-29; file tickets when k6/regression or cost spikes appear)  
- [x] Noted in `ops/PRODUCTION_READINESS_ARTIFACTS.md` execution progress if material
