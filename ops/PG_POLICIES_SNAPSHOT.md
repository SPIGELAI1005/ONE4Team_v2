# pg_policies snapshot (optional drift gate)

Used by `scripts/assert-pg-policies-drift.cjs` when `PG_POLICIES_SNAPSHOT_FILE` is set.

1. From a SQL session with read access to `pg_catalog`:

   ```bash
   psql "$DATABASE_URL" -Atc "select policyname from pg_policies where schemaname='public' order by 1" > ops/pg_policies.snapshot.txt
   ```

2. Commit or store the file in secure CI (not required for default CI).

3. Compare:

   ```bash
   PG_POLICIES_SNAPSHOT_FILE=ops/pg_policies.snapshot.txt node scripts/assert-pg-policies-drift.cjs
   ```

The script also extracts **quoted** `CREATE POLICY "name"` entries from `supabase/migrations/*.sql`. Unquoted policy names in SQL may not appear in the migration side of the diff—prefer quoted names in new migrations.
