# HOLD — items requiring Supabase / external setup

Last updated: 2026-05-03 — cross-reference: full ordered migration and deploy guidance is in `CHANGELOG.md` (§ 2026-03-30, § 2026-05-03 — **two** May 3 entries: migrations wave + **UI polish**), `MEMORY_BANK.md`, `DEPLOYMENT.md`, and `ops/PRODUCTION_READINESS_ARTIFACTS.md` (sections below are partial snapshots, not the canonical list). The **UI polish** entry is **client-only** (no extra migrations beyond `20260502120000`–`20260503143000`).

This repo is prepared locally-first. The following items are intentionally on hold until you do Supabase Dashboard actions.

## ONE4Team — Apply SQL bundles in Supabase (Dashboard)
Recommended apply order (fresh project):
1) `supabase/APPLY_BUNDLE_BASELINE.sql`
2) `supabase/APPLY_BUNDLE_PHASE1.sql`
3) `supabase/APPLY_BUNDLE_PHASE0_RLS.sql`
4) `supabase/APPLY_BUNDLE_PHASE2.sql`
5) `supabase/APPLY_BUNDLE_PHASE3.sql`
6) `supabase/APPLY_BUNDLE_PHASE4.sql`
7) `supabase/APPLY_BUNDLE_PHASE5.sql`
8) `supabase/APPLY_BUNDLE_PHASE6.sql`

Then run smoke scripts in:
- `PHASE0_INDEX.md`, `PHASE1_INDEX.md`, `PHASE2_INDEX.md`, …

## Incremental migrations to apply (current project)
Apply these in the same Supabase project used by your app environment:
1) `supabase/migrations/20260301152000_add_chat_bridge_connectors_and_events.sql`
2) `supabase/migrations/20260301164000_ensure_messages_table_exists.sql`
3) `supabase/migrations/20260301173500_add_message_attachments_and_storage.sql`
4) `supabase/migrations/20260301181500_ensure_announcements_table_exists.sql`
5) `supabase/migrations/20260319190000_abuse_slice4_notifications.sql`
6) `supabase/migrations/20260319191500_v21_v22_billing_shop.sql`
7) `supabase/migrations/20260319193000_v23_partner_workflows.sql`
8) `supabase/migrations/20260319194500_v24_v25_multisport_automation.sql`

Why this is critical now:
- `/communication` depends on `public.messages`, `public.announcements`, bridge connector/event tables, and attachment storage policies.
- Missing any of the above in the active environment causes schema-cache/runtime errors.

## Public club microsite — May 2026 migrations (operator)
Apply in **strict filename order** in the same Supabase project as the app (after prior club/public migrations are already applied):
1. `supabase/migrations/20260502120000_club_public_page_draft_publish.sql`
2. `supabase/migrations/20260502140000_partners_public_club_visibility.sql`
3. `supabase/migrations/20260502150000_announcements_public_website_news.sql`
4. `supabase/migrations/20260502170000_public_team_privacy.sql`
5. `supabase/migrations/20260502180000_public_club_schedule_publish_flags.sql`
6. `supabase/migrations/20260502190000_public_matches_events_microsite.sql`
7. `supabase/migrations/20260502210000_public_club_documents_faq_join_contact.sql`
8. `supabase/migrations/20260502220000_club_page_extended_publish_unpublish.sql`
9. `supabase/migrations/20260503120000_public_club_privacy_team_rpc.sql`
10. `supabase/migrations/20260503143000_public_join_request_flow_v2.sql`

Then regenerate **`src/integrations/supabase/types.ts`** if RPCs/columns changed. Smoke: **`/club-page-admin`**, **`/club/:slug`**, **`/club/:slug/join`**, draft preview **`?draft=1`**.

## Phase 7 items (need Supabase / infra)
- Staging + prod Supabase projects (completed for Phase 12 closure)
- Vercel Preview → staging env vars; Production → prod env vars (completed for Phase 12 closure)
- Tenant isolation verification on staging (completed for Phase 12 closure)
- Invite-request spam controls / rate limiting (RPC) (implemented and verified in target environment)

## CLAW-FE blockers (Dashboard)
- Run: `OPENCLAW_CAFE/claw-fe/supabase/MIGRATIONS_BUNDLE_001_006.sql`
- Paste Auth email templates:
  - Magic Link
  - Confirm signup
  - Reset password
