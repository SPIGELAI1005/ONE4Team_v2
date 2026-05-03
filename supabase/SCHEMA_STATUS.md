# ONE4Team — Schema status (local)

## Source of truth
- Primary schema source: `supabase/migrations/*.sql`
- Baseline bootstrap for fresh projects: `supabase/APPLY_BUNDLE_*.sql` (see `supabase/APPLY_ORDER_GUIDE.md`)
- `supabase/MVP_SCHEMA_RLS.sql` remains a planning/reference artifact and must not be treated as deployed state.

## Current communication-critical schema dependencies
The Communication module now expects all of the following to exist in the active Supabase project:
- `public.messages` (plus RLS + realtime publication)
- `public.announcements` (plus RLS + trigger/policies)
- `public.chat_bridge_connectors`
- `public.chat_bridge_events`
- `public.messages.attachments` column
- Storage bucket `chat-attachments` with member-scoped policies

## Current onboarding/member-ops schema dependencies (Session 5)
The onboarding/member operations module now additionally expects:
- `public.club_member_drafts` table (+ RLS policies for admin management)
- `public.clubs.join_approval_mode` (`manual` / `auto`)
- `public.clubs.join_reviewer_policy` (`admin_only` / `admin_trainer`)
- `public.clubs.join_default_role` + `public.clubs.join_default_team`
- `public.club_invite_requests.request_user_id`
- Function `public.can_review_club_join_requests(uuid, uuid)`
- RPC `public.register_club_join_request(uuid, text, text)`
- RPC `public.approve_club_join_request(uuid)`
- `public.request_rate_limits` table (abuse-control ledger)
- Function `public.enforce_request_rate_limit(text, uuid, text, int, interval)`
- RPC `public.get_club_request_abuse_audit(uuid, int)`
- `public.abuse_alerts` table (sustained abuse alerts)
- Function `public.raise_abuse_alert(uuid, text, text, text, int, jsonb)`
- RPC `public.get_club_abuse_alerts(uuid, text, int)`
- RPC `public.resolve_club_abuse_alert(uuid, text)`
- Reviewer policies on `public.club_invites` and `public.club_invite_requests` based on `can_review_club_join_requests(...)`

## Required incremental migrations (post-baseline)
Apply these in order when the environment is missing newer communication/member onboarding features:
1) `20260301152000_add_chat_bridge_connectors_and_events.sql`
2) `20260301164000_ensure_messages_table_exists.sql`
3) `20260301173500_add_message_attachments_and_storage.sql`
4) `20260301181500_ensure_announcements_table_exists.sql`
5) `20260305193000_member_drafts.sql`
6) `20260305204500_club_public_join_flow.sql`
7) `20260305220000_invite_join_rate_limits.sql`
8) `20260305224500_abuse_slice2_device_escalation_audit.sql`
9) `20260305231500_abuse_slice3_gateway_alert_hooks.sql`

## Members registry + guardians (2026-03-25)
When using master registry, drafts with extended fields, or guardian linking, the active project should also include (in order after prior member bundles):
- `20260324120000_club_member_master_records.sql` — `club_member_master_records`, `club_member_guardian_links`, email RPCs
- `20260324140000_club_role_assignments.sql` — optional but recommended for assignment-aware admin/trainer
- `20260324201000_club_member_master_records_select_broaden.sql` — SELECT policies for staff
- `20260324210000_club_member_drafts_master_data.sql` — `club_member_drafts.master_data`
- `20260325220000_redeem_invite_guardian_links.sql` — `redeem_club_invite` reads optional `invite_payload.guardian_membership_ids` and inserts guardian link rows after membership upsert

## Public club microsite (2026-05-02 — 2026-05-03)
For draft/publish JSON, extended public pages, team privacy, schedule/match/event publish flags, public join/contact/documents, and join-request v2, apply (in filename order after prior `public_page_*` / club profile migrations):
- `20260502120000_club_public_page_draft_publish.sql` through `20260503143000_public_join_request_flow_v2.sql` (see `CHANGELOG.md` § 2026-05-03 and `HOLD.md`).

**Client-only (same release window, no schema delta):** Public microsite **theme contrast** and **accent CTA hovers** live in `src/` only — see `CHANGELOG.md` § **2026-05-03 (Public club microsite — UI polish)**.

## Verification artifact
- Run `supabase/PHASE12_VERIFY.sql` after applying the migrations above.
- Treat any `ok = false` row as a rollout blocker.

## Environment consistency note
Most runtime issues reported recently were caused by migration drift (app connected to a Supabase project missing one or more tables/columns/policies/functions).  
When troubleshooting, verify that the frontend environment variables point to the same Supabase project where these migrations were applied.
