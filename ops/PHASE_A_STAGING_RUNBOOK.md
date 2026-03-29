# Phase A — Staging verification (evidence runbook)

Follow in order. Attach outputs (screenshots, log excerpts, ticket links) to [SECTION_M_GO_LIVE_CHECKLIST.md](SECTION_M_GO_LIVE_CHECKLIST.md) or your tracker.

## A1 — Migrations 32–42 on staging

1. Confirm baseline through `20260329000000` is already applied (see [MEMORY_BANK.md](../MEMORY_BANK.md)).
2. Apply in filename order:
   - `20260329103000_platform_admin_rbac.sql`
   - through `20260330120000_search_club_members_page.sql`
3. For `20260329132000_hotspot_composite_indexes.sql`, run the **entire file** only (guarded `to_regclass`).
4. **Evidence:** Supabase migration history screenshot or `select version from schema_migrations order by version desc limit 15` output.

## A2 — RLS integration tests (JWT on staging)

From repo root, with a disposable test user and two club UUIDs (user is member of A only):

```bash
set RLS_TEST_SUPABASE_URL=https://xxxx.supabase.co
set RLS_TEST_SUPABASE_ANON_KEY=eyJ...
set RLS_TEST_JWT_USER_A=eyJ...
set RLS_TEST_CLUB_A_ID=uuid-a
set RLS_TEST_CLUB_B_ID=uuid-b
npm test -- src/test/rls.integration.test.ts
```

See [src/test/rls.integration.test.ts](../src/test/rls.integration.test.ts) header for variable semantics.

**Evidence:** Vitest output (all tests passed).

## A3 — Optional policy name drift

1. On staging:  
   `psql "$DATABASE_URL" -Atc "select policyname from pg_policies where schemaname='public' order by 1" > ops/pg_policies.snapshot.txt`
2. Compare:  
   `set PG_POLICIES_SNAPSHOT_FILE=ops/pg_policies.snapshot.txt&& npm run policies:drift` (Windows: `set PG_POLICIES_SNAPSHOT_FILE=ops/pg_policies.snapshot.txt` then `npm run policies:drift`)

**Evidence:** Console `pg_policies drift: OK` or ticket with intentional exceptions.

## A4 — EXPLAIN snapshots (ST-007)

Run SQL from [PRODUCTION_READINESS_ARTIFACTS.md](PRODUCTION_READINESS_ARTIFACTS.md) (Index verification / EXPLAIN template) against a real `club_id`. Use [EXPLAIN_EVIDENCE_TEMPLATE.md](EXPLAIN_EVIDENCE_TEMPLATE.md).

**Evidence:** Before/after buffer hits or planning notes in ticket.

## A5 — k6 (smoke, journeys, staged)

Point scripts at **staging** URLs and credentials per each script’s env block (`k6/smoke.js`, `k6/journeys-critical.js`, `k6/staged-dashboard-reads.js`).

```bash
npm run k6:smoke
npm run k6:journeys
npm run k6:staged-reads
```

**Evidence:** k6 summary stdout or exported JSON + SLO notes.

## A6 — Realtime lab soak (~500 sessions)

Per [runbooks/realtime-incident.md](runbooks/realtime-incident.md) and [REALTIME_SOAK_LOG.md](REALTIME_SOAK_LOG.md): run lab soak, watch connection counts and disconnect rate vs **Observability thresholds** in PRODUCTION_READINESS_ARTIFACTS.

**Evidence:** REALTIME_SOAK_LOG row filled + metrics screenshot.
