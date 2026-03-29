# Realtime soak log (ST-008 / T-026)

Lab validation per [`ops/runbooks/realtime-incident.md`](runbooks/realtime-incident.md). Use one row per run.

| Date (UTC) | Peak concurrent sessions | Duration at peak | CHANNEL_ERROR or TIMEOUT rate | Message p95 latency (s) | Alerts configured (Y/N) | Notes / links |
|------------|-------------------------:|------------------|-------------------------------|-------------------------|---------------------------|---------------|
|            |                          |                  |                               |                         |                           |               |

**Procedure summary**

1. Ramp concurrent subscribers to `club-messages:<club_id>` over 10–15 minutes.
2. Hold peak ~15 minutes; capture Supabase Realtime connection metrics and DB CPU.
3. Note client error rate and delivery latency.
4. Record whether T-026-style alerts exist (dashboard, log, or Sentry).
