# Staging index verification (ST-007)

After applying `20260329132000_hotspot_composite_indexes.sql`, capture evidence on staging.

**Applying indexes:** use the full migration file (guards missing tables). See [`HOTSPOT_INDEX_MIGRATION.md`](HOTSPOT_INDEX_MIGRATION.md).

**Evidence template:** [`EXPLAIN_EVIDENCE_TEMPLATE.md`](EXPLAIN_EVIDENCE_TEMPLATE.md).

Replace `<club>` with a real club UUID that has data.

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT id FROM matches
WHERE club_id = '<club>' AND status = 'completed'
ORDER BY match_date DESC NULLS LAST LIMIT 50;

EXPLAIN (ANALYZE, BUFFERS)
SELECT id, created_at FROM messages
WHERE club_id = '<club>' ORDER BY created_at DESC LIMIT 50;
```

Pass criteria: plans prefer index scans aligned with the migration. Store before or after timings in the ticket.
