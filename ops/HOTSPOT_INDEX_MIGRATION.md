# ST-007 hotspot indexes

Apply [`supabase/migrations/20260329132000_hotspot_composite_indexes.sql`](../supabase/migrations/20260329132000_hotspot_composite_indexes.sql) via migrations or paste the **entire** file in the SQL editor.

That migration uses `to_regclass` and dynamic `EXECUTE` so indexes are only created when each table exists. Pasting bare `CREATE INDEX` statements fails with `42P01` if `events` or `event_participants` (or others) are missing.

If you need those indexes, add the missing tables first, then re-apply.
