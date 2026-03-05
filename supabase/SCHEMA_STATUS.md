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
- Reviewer policies on `public.club_invites` and `public.club_invite_requests` based on `can_review_club_join_requests(...)`

## Required incremental migrations (post-baseline)
Apply these in order when the environment is missing newer communication/member onboarding features:
1) `20260301152000_add_chat_bridge_connectors_and_events.sql`
2) `20260301164000_ensure_messages_table_exists.sql`
3) `20260301173500_add_message_attachments_and_storage.sql`
4) `20260301181500_ensure_announcements_table_exists.sql`
5) `20260305193000_member_drafts.sql`
6) `20260305204500_club_public_join_flow.sql`

## Environment consistency note
Most runtime issues reported recently were caused by migration drift (app connected to a Supabase project missing one or more tables/columns/policies/functions).  
When troubleshooting, verify that the frontend environment variables point to the same Supabase project where these migrations were applied.
