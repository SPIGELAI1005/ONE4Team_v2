# Supabase migrations

## Filename convention

Migration files use a **logical release batch timestamp** prefix:

```text
YYYYMMDDHHMMSS_short_description.sql
```

- Ordering is **strictly by filename** (`supabase db push` / CI).
- The prefix is a **batch / release sequence**, not necessarily the calendar day the migration was applied to a remote.
- **Never renumber or rewrite** a migration that has already been applied on linked/production remotes.

## `202608*` batches (applied July 2026)

Several migrations are prefixed `20260801…` / `20260802…` / `20260803…` even though they were applied to the linked remote on **2026-07-16** and **2026-07-18**. That skew is intentional for ordering within the Wave B–E / Asset Map / gamification release trains.

Do **not** rename those files to “fix” the calendar date — doing so would break migration history on remotes that already applied them.

## New migrations

Prefer a real UTC timestamp when creating new files (`supabase migration new …`). If you must hand-name a file, keep it **after** the latest applied prefix so `db push` stays linear.
