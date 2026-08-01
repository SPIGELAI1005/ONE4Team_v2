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

Several migrations are prefixed `20260801…` / `20260802…` / `20260803…` / `20260804…` even though they were applied to the linked remote on **2026-07-16**, **2026-07-18**, and **2026-07-28**. That skew is intentional for ordering within the Wave B–E / Asset Map / gamification / roles / lint-repair release trains.

Do **not** rename those files to “fix” the calendar date — doing so would break migration history on remotes that already applied them.

## New migrations

Prefer a real UTC timestamp when creating new files (`supabase migration new …`). If you must hand-name a file, keep it **after** the latest applied prefix so `db push` stays linear.

Example (2026-08-01): **`20260806130000_ai_internet_research.sql`** was initially dated earlier in the batch; renamed to **`20260806130000`** so it sorts after **`20260806120000_message_channels_and_invites.sql`** on remotes that had already applied later migrations.

Example (2026-08-01): **`20260807120000_member_household_discount_fields.sql`** — household discount verification fields on member master records for **`/payments`** (apply after **`20260806140000`**).
