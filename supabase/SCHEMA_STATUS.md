# ONE4Team — Schema status (local)

This repo currently contains **two schema tracks**:

1) **Actual app schema (source of truth):** `supabase/migrations/*.sql`
   - This is what the app is built against right now.

2) **MVP schema draft:** `supabase/MVP_SCHEMA_RLS.sql`
   - This is a conceptual MVP-first schema.
   - It overlaps with migrations but also introduces new tables not yet migrated.

## MVP-only tables (present in MVP schema draft, missing from migrations)
These appear in `supabase/MVP_SCHEMA_RLS.sql` but **do not exist** in the current migrations set:
- `activities`
- `activity_attendance`
- `ai_requests`
- `club_invites`
- `club_invite_requests`
- `membership_dues`
- `partners`

## Recommendation
- Treat `supabase/migrations/*.sql` as the source-of-truth for what exists.
- Keep `MVP_SCHEMA_RLS.sql` as a **draft/reference** unless/until we port missing objects into migrations or dedicated apply bundles.

## Apply bundles
For a fresh Supabase project, apply in this order:
1) `supabase/APPLY_BUNDLE_BASELINE.sql`
2) `supabase/APPLY_BUNDLE_PHASE1.sql`
3) `supabase/APPLY_BUNDLE_PHASE0_RLS.sql`

(See `PHASE0_INDEX.md` and `supabase/APPLY_ORDER_GUIDE.md`.)
