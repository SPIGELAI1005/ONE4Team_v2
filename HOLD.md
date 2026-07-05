# HOLD — items requiring Supabase / external setup

Last updated: 2026-07-05 — cross-reference: full ordered migration and deploy guidance is in `CHANGELOG.md` (§ 2026-03-30, § 2026-05-03, § **2026-06-14** admin + **AI 4 T**, § **2026-06-15** AI 4 T Agent, § **2026-06-24** attendance + pilot Phases 1–4, § **2026-06-25** communication/tasks/attendance, § **2026-06-27** TSV Allach Sommerfest + membership application, § **2026-06-30** member payments + invite email, § **2026-07-01** marketing + public club polish, § **2026-07-01** partner portal + Partner Page + AI 4 T partner, § **2026-07-01** persona data scoping + Live Scores UI, § **2026-07-01** AI 4 T pilot UX P4-002 + Sommerfest banner fix, § **2026-07-03** member invite UX + social previews + Sommerfest banner animation + dashboard club return, § **2026-07-05** Sommerfest tournament UX + public AI 4 T RBAC, § **2026-07-05** public messaging forward/share + microsite polish + Sommerfest mobile refinements), `MEMORY_BANK.md`, `DEPLOYMENT.md`, `docs/AI4T_RELEASE_REVIEW.md`, and `ops/PRODUCTION_READINESS_ARTIFACTS.md` (sections below are partial snapshots, not the canonical list).

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

## Financial reporting — club expenses (2026-06-14)
Apply after payments/dues (and optional shop) tables exist:
11. `supabase/migrations/20260614120000_club_expenses.sql`

Smoke: **`/dashboard/admin`** financial summary card, **`/reports?section=financial`**, add/delete expense, CSV export. See **`CHANGELOG.md` § 2026-06-14** and **`TASKS.md` FIN-OPS-001**.

## AI 4 T — feature trials + Edge deploy (2026-06-14)
Apply in the same Supabase project as the app:
1. `supabase/migrations/20260614140000_club_feature_trials.sql` (trigger uses **`update_updated_at()`**)
2. Deploy Edge: **`co-trainer`**, **`co-aimin`**, **`ai-match-analysis`**
3. Set Edge secrets **`OPENAI_API_KEY`** (and optional **`OPENAI_MODEL`**)
4. Optional operator SQL: **`supabase/scripts/fix_tsv_allach_ai_access.sql`** for Allach pilot clubs

See **`DEPLOYMENT.md` § AI 4 T** and **`TASKS.md` AI-OPS-001**.

## AI 4 T Agent — workflow migrations + Edge deploy (2026-06-15)
Apply in the same Supabase project as the app (after **`20260614140000`** if using feature trials):
1. `supabase/migrations/20260615120000_ai_agent_runs.sql`
2. `supabase/migrations/20260615130000_ai_agent_tool_rpcs.sql`
3. `supabase/migrations/20260615140000_ai_agent_runs_conversation_id.sql`
4. `supabase/migrations/20260615150000_ai_agent_tool_rpcs_extended.sql`
5. Deploy Edge: **`ai4team-agent`** (`supabase functions deploy ai4team-agent`)

Smoke: **`/co-trainer` → Agent tab** (propose → confirm create training); dashboard **Sparkles** on Teams/Members; Chat **`/agent`** command. See **`DEPLOYMENT.md` § AI 4 T Agent** and **`TASKS.md` AI-AGENT-OPS-001**.

## TSV Allach public club — Sommerfest + membership application (2026-06-27)
Apply in the same Supabase project as the app (after **`20260626120000`**):
1. `supabase/migrations/20260627120000_club_events_camp_fields.sql`
2. `supabase/migrations/20260628120000_club_invite_application_payload.sql`

Optional seed: `supabase/scripts/seed_tsv_allach_football_camps.sql`.

Smoke: **`/matches`** → publish Sommerfest 2026 → **`/club/tsv-allach-09/tournament/sommerfest-2026`**; **`/club/tsv-allach-09/join`** → submit 5-step application → verify **`application_payload`** in admin join inbox. See **`CHANGELOG.md` § 2026-06-27**, **`docs/TSV_ALLACH_CLUB_PAGE_CHECKLIST.md`**, **`TASKS.md` ALLACH-OPS-001**.

## Communication hub, tasks, attendance (2026-06-25)
Apply in the same Supabase project (after **`20260628120000`**):
1. `supabase/migrations/20260629120000_club_messages_team_scope_and_notify.sql`
2. `supabase/migrations/20260630120000_repair_notifications_table.sql`
3. `supabase/migrations/20260630130000_repair_events_training_and_feature_rpc.sql`
4. `supabase/migrations/20260630140000_messages_trainers_channel.sql`
5. `supabase/migrations/20260630150000_fix_can_access_team_message_ambiguity.sql`
6. `supabase/migrations/20260724130000_reload_can_access_team_message_schema.sql`
7. `supabase/migrations/20260724140000_announcement_updates_fanout_include_author.sql`
8. `supabase/migrations/20260724150000_message_and_announcement_moderation.sql`
9. `supabase/migrations/20260724160000_cleanup_announcement_notifications_on_delete.sql`
10. `supabase/migrations/20260724160100_backfill_orphan_announcement_notifications.sql`
11. `supabase/migrations/20260724170000_fix_publish_club_page_join_default_role_cast.sql`
12. `supabase/migrations/20260724180000_club_tasks.sql`
13. `supabase/migrations/20260725130000_activity_attendance_member_self_rsvp.sql`
14. `supabase/migrations/20260725140000_repair_list_club_membership_emails.sql`
15. `supabase/migrations/20260725150000_repair_images_avatars_bucket.sql`

Deploy Edge: **`chat-bridge`** (for WhatsApp/Telegram External Bridge).

Smoke: public club **Messages** hub; **`/communication`** announcements + moderation; **`/tasks`**; training RSVP overview + self-RSVP; **`/members`** team assignment + club card PNG; avatar upload. See **`CHANGELOG.md` § 2026-06-25** and **§ 2026-06-28**, **`TASKS.md` COMM-OPS-001 / ATTEND-OPS-001 / MEM-OPS-006.

## Member payments + invite email (2026-06-30)
Apply in the same Supabase project (after **`20260725150000`**):
1. `supabase/migrations/20260728120000_repair_membership_fee_types_and_payments.sql`
2. `supabase/migrations/20260728130000_repair_club_memberships_profile_fk.sql`
3. `supabase/migrations/20260728140000_membership_fee_types_package_fields.sql`

Deploy Edge: **`send-club-invite-email`**.

Secrets (Supabase Edge): **`RESEND_API_KEY`**, **`RESEND_FROM_EMAIL`**, **`PUBLIC_SITE_URL`**, **`EDGE_ALLOWED_ORIGINS`** (comma-separated origins, no trailing slashes).

Smoke: **`/payments`** Fee Types + Record payment (multi-package); **`/members`** send invite → email in inbox. Resend **domain must be verified** for production From address. See **`CHANGELOG.md` § 2026-06-30**, **`docs/PRODUCTION_RELEASE_CHECKLIST.md`**, **`TASKS.md` PAY-OPS-001**.

## Resend domain verification — follow up before production deploy

**Status:** Deferred (local dev OK). Invites are created in the database; only automatic email delivery is blocked.

**What you may see now:** toast *“Invite created, email not sent”* with Resend error *“The one4team.com domain is not verified…”*. Use **Copy invite link** in the invite dialog and share manually (works for member and partner roles, e.g. Supplier).

**Status (2026-07-01):** Edge secrets set; **`send-club-invite-email`** redeployed. **Still required:** verify sending domain at Resend (**`DEPLOY-EMAIL-001-PROD`** in **`TASKS.md`**).

**Before go-live, complete:**

- [ ] Add and verify **`one4team.com`** (or your sending domain) at [resend.com/domains](https://resend.com/domains) (SPF, DKIM; optional DMARC at DNS host)
- [ ] Supabase Edge secrets: **`RESEND_API_KEY`**, **`RESEND_FROM_EMAIL`** = `ONE4Team <invites@one4team.com>` (must match verified domain), **`PUBLIC_SITE_URL`**, **`EDGE_ALLOWED_ORIGINS`**
- [ ] Deploy Edge: **`send-club-invite-email`**
- [ ] Smoke: Members → create invite → toast **“Invite email sent”**; email arrives at an external inbox (Gmail, GMX, etc.)

**Note:** Resend test sender `onboarding@resend.dev` only delivers to the email on your Resend account — not suitable for real club/partner invites.

See **`docs/PRODUCTION_RELEASE_CHECKLIST.md`** sections **F**, **G**, **H** (Members & invites) and **`TASKS.md` DEPLOY-EMAIL-001**.

## Production auth URLs — follow up before custom domain go-live

Track **`OPS-AUTH-URL-001`** in **`TASKS.md`**.

- Magic links, signup, and **Copy invite link** use **`window.location.origin`** — open **`https://www.one4team.com`** before sending so links are not `*.vercel.app`.
- Password reset (Settings) uses **`redirectTo: {origin}/auth`** after code fix — whitelist **`https://www.one4team.com/auth`** in Supabase Redirect URLs.
- Supabase Site URL should match canonical production (`https://www.one4team.com` recommended).
- Vercel: apex **`one4team.com`** → redirect to **`www.one4team.com`**.

Post-deploy smoke: embedded club chat pagination count; password reset from `www`.

## Invite redemption — pgcrypto repair (2026-07-31)
If redeem shows **`function digest(text, unknown) does not exist`**, apply:

`supabase/migrations/20260731130000_repair_redeem_invite_pgcrypto.sql`

Enables **`pgcrypto`** in the **`extensions`** schema and updates **`redeem_club_invite`** to use **`extensions.digest`**. Smoke: open invite link → **Verein beitreten** succeeds (same signed-in email as invite).

If redeem shows **`column reference "club_id" is ambiguous`**, also apply:

`supabase/migrations/20260731140000_repair_redeem_invite_ambiguous_club_id.sql`

If redeem shows **`no unique or exclusion constraint matching the ON CONFLICT specification`**, apply:

`supabase/migrations/20260731150000_repair_redeem_invite_membership_upsert.sql`

## Partner portal + Partner Page + marketplace provider (2026-07-01)
Apply in **strict filename order** after **`20260730140000`** (and redeem repairs above if needed):
1. `supabase/migrations/20260731120000_partner_task_engagements.sql`
2. `supabase/migrations/20260731150000_marketplace_provider_portal.sql` (superseded by apply file — skip if **`20260731170000`** applied)
3. `supabase/migrations/20260731160000_repair_redeem_invite_membership_upsert.sql` (if not already applied)
4. `supabase/migrations/20260731170000_marketplace_provider_portal_apply.sql`
5. `supabase/migrations/20260731180000_marketplace_requests_enhance.sql`
6. `supabase/migrations/20260731190000_marketplace_offers_enhance.sql`
7. `supabase/migrations/20260731200000_marketplace_partners_bridge.sql`
8. `supabase/migrations/20260731210000_marketplace_provider_images_bucket.sql`
9. `supabase/migrations/20260731215000_supplier_portal_scope.sql`
10. `supabase/migrations/20260731220000_repair_marketplace_provider_images_bucket.sql`

Optional QA: **`supabase/scripts/grant_all_roles_spigelai.sql`** (operator test account — all personas).

Regenerate **`src/integrations/supabase/types.ts`** after apply.

**Status (2026-07-01):** Migrations **`20260731120000`** → **`20260731220000`** applied on linked project (`supabase db push --linked` clean). Storage buckets **`images-marketplace-providers`**, **`images-avatars`** present. Manual UI smoke still required — **`TASKS.md` → SPRINT 2026-07-01 → PARTNER-OPS-001-SMOKE**.

Smoke: dual-role user — Settings **Club Admin** → club dashboard (no **Partner Page** in sidebar); **Supplier** → **`/partner-marketplace`**, **`/supplier-page`** (Partner Page), **`/partner-ai`** Agent (partner actions, not club training workflows). Logo/cover upload on Partner Page after bucket migration. See **`CHANGELOG.md` § 2026-07-01 (Partner portal…)**, **`TASKS.md` PARTNER-OPS-001**, **`docs/rbac-dashboard-plan.md`** §10.

## Marketing + public club polish (2026-07-01)
Apply in the same Supabase project (after **`20260728140000`**):
1. `supabase/migrations/20260730120000_shop_products_import_key.sql`
2. `supabase/migrations/20260730130000_tsv_allach_jako_shop_images.sql`
3. `supabase/migrations/20260730140000_tsv_allach_club_contact_address.sql`

Optional seed: **`supabase/scripts/seed_tsv_allach_jako_shop.sql`** (TSV Allach JAKO pilot products).

No new Edge deploy required for this wave (client + SQL only).

Smoke: **`/features`** AI hero video + light/dark theme; **`/pricing`** Early Bird countdown to **13 Dec 2026**; **`/club/tsv-allach-09`** club favicon, **`/matches`** opponent logos, **`/shop`**, **`/reports`**, **`/live-scores`** when sections enabled in Club Page Admin. See **`CHANGELOG.md` § 2026-07-01**, **`TASKS.md` PUB-OPS-001 / MKT-DOC-001.

## Persona data scoping — player / member (2026-07-01, client-only)
No new migrations. Deploy is a **frontend release** only.

Smoke (dual-role QA account — switch persona in **Settings**):
1. **Player** → **`/communication`**: team channels only; **`/tasks`**: **Mine** only.
2. **Member** → **`/communication`**: Announcements + Club General; dashboard upcoming = club **events**; no **Payments** in sidebar.
3. Public club **Messages** hub uses same gate-role filters when signed in.

See **`CHANGELOG.md` § 2026-07-01 (Persona data scoping…)**, **`docs/rbac-dashboard-plan.md`** §12, **`TASKS.md` RBAC-PERSONA-*.

## WhatsApp External Bridge — operator (follow-up)
**Not** personal WhatsApp / QR login. Use **WhatsApp Business API** only.

Step-by-step: **`docs/backlog/WHATSAPP_EXTERNAL_BRIDGE_SETUP.md`**

Blockers:
- **`chat-bridge`** must be deployed to the target Supabase project
- Meta webhook URL must be **public** (not `localhost`)
- **BRIDGE-WA-001:** Meta GET webhook verification (`hub.challenge`) may need a code change before Meta accepts the callback URL

## Member invite accept — preview RPC + signup Edge (2026-07-03)
Apply in the same Supabase project as the app (after partner/marketplace migrations):
1. `supabase/migrations/20260731230000_preview_club_invite.sql`
2. `supabase/migrations/20260731240000_get_auth_user_id_by_email.sql`
3. Deploy Edge: **`complete-club-invite-signup`**
4. Redeploy **`send-club-invite-email`** if invite URL template was updated
5. Regenerate **`src/integrations/supabase/types.ts`** if RPC signatures changed

Smoke: create invite in **Members** → email/link opens **`/club/{slug}?invite=TOKEN`** → modal pre-fills admin data → set password → welcome email → congratulations → **View club page** / **Open dashboard**. See **`CHANGELOG.md`** § **2026-07-03** and **`TASKS.md` INVITE-UX-OPS-001**.

## Club-branded social previews + iOS shortcuts (2026-07-03)
Vercel deployment (no new Supabase migrations):
1. Ensure **`VITE_SUPABASE_URL`**, **`VITE_SUPABASE_PUBLISHABLE_KEY`**, **`VITE_PUBLIC_SITE_URL`** (or equivalent site origin) are set on Vercel Production + Preview
2. Redeploy after **`middleware.ts`** + **`api/club-social-preview.ts`** merge
3. Club admin: set **`meta_description`**, **`og_image_url`**, PNG favicon in **Club Page Admin**
4. Refresh WhatsApp/Facebook cache: [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) for each club URL
5. iPhone: remove and re-add home screen shortcut after deploy for updated **`apple-touch-icon`**

See **`CHANGELOG.md`** § **2026-07-03** and **`docs/PRODUCTION_RELEASE_CHECKLIST.md`**.

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
