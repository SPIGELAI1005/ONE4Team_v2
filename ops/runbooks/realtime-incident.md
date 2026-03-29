# Runbook: Realtime / chat instability

**Owner:** Client + Realtime DRI  
**Severity triggers:** Mass `CHANNEL_ERROR` / `TIMED_OUT` in browser consoles; message lag; Supabase Realtime saturation.

## Immediate

1. Confirm scope: single club vs global (check multiple tenants).
2. Supabase → Realtime metrics / logs; verify database WAL and replication health (Realtime depends on DB).
3. Client policy (see `Communication.tsx`): one `postgres_changes` channel per `clubId`, club-scoped filter, burst batching (80ms).

## Mitigation

- Ask users to refresh (re-subscribe); reduce simultaneous open tabs if abuse suspected.
- Temporarily disable non-essential realtime features (typing indicators, etc.) if present.
- Scale database / Realtime limits per Supabase plan.

## Load validation

- Run `npm run audit:realtime` (tenant filter regression guard).
- k6 profile: staged reads + manual soak with ~500 concurrent *sessions* (lab); watch connection count.

### 500-session soak checklist (ST-008 / T-026)

Log results in [`../REALTIME_SOAK_LOG.md`](../REALTIME_SOAK_LOG.md).

1. Lab: N browser profiles or scripted clients subscribed to `club-messages:<club_id>` for one tenant.
2. Ramp over 10–15 minutes; hold peak ~15 minutes; watch Supabase Realtime connections and DB CPU.
3. Record peak concurrent channels, error rate (`CHANNEL_ERROR`, `TIMED_OUT`), and whether messages still deliver under 5s p95.
4. **Alerts (T-026):** In Supabase dashboard (or provider), set a connection or error-rate alert if your plan exposes it; otherwise use log-based alerts from client breadcrumbs (Sentry) for disconnect bursts.

## Follow-up

- Consider moving high-volume chat to dedicated provider if in-app volume exceeds Supabase Realtime comfort zone.
