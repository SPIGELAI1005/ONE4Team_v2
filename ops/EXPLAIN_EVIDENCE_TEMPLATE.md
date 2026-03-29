# ST-007 EXPLAIN evidence (staging / prod)

Paste output below or attach as a file linked from your release ticket. Replace `<club>` with a UUID that has real volume.

**Environment:** (staging / prod)  
**Date (UTC):**  
**Postgres / Supabase version notes:**

## Query 1 — matches by club, status, sort

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT id FROM matches
WHERE club_id = '<club>' AND status = 'completed'
ORDER BY match_date DESC NULLS LAST LIMIT 50;
```

### Output

```
(paste here)
```

## Query 2 — messages by club, recent first

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, created_at FROM messages
WHERE club_id = '<club>' ORDER BY created_at DESC LIMIT 50;
```

### Output

```
(paste here)
```

## Pass notes

- Expect index-friendly plans aligned with `20260329132000_hotspot_composite_indexes.sql` (e.g. club-scoped composites).
- Record planning time and buffer hits if comparing before/after a migration.
