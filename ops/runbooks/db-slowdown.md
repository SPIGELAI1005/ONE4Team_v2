# Runbook: Database / PostgREST slowdown

**Owner:** Backend / Supabase DRI  
**Severity triggers:** p95 API latency over 2s sustained; Supabase Database health degraded; elevated statement timeouts.

## Immediate (0 to 15 min)

1. Supabase Dashboard: Database CPU, connections, slow queries.
2. Check replication lag and connection count vs pool limit.
3. Identify top statements from Query Performance.
4. Post status in incident channel with UTC time window.

## Mitigation

- Reduce burst traffic: pause heavy jobs or marketing sends.
- If index migration caused locks: note for next time use CONCURRENTLY where possible.
- Scale compute if CPU pegged and traffic is legitimate.

## Evidence

- Slow query list, connection graph, error rate exports.
- EXPLAIN ANALYZE for top offenders (redact tenant ids).

## Recovery validation

- p95 REST latency back under SLO documented in PRODUCTION_READINESS_ARTIFACTS.md.

## Follow-up

- Add composite indexes (see supabase migrations for hotspot indexes).
- Prefer RPC aggregates for hot analytics paths.
