# ONE4Team — Deployment (Phase 7)

This doc describes how to deploy the app to Vercel and how to structure environments.

## What we can do now (no Supabase actions)
- Ensure build is green (`npm run build`).
- Add E2E smoke tests (Playwright) that run against a local server.
- Add basic client error boundary + logging.

## Vercel project
1) Import repo: `SPIGELAI1005/ONE4Team_v2`
2) Framework preset: Vite/React
3) Build command: `npm run build`
4) Output: `dist`

## Environment variables
The app uses Supabase. You will need:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Recommended additional env:
- `VITE_APP_ENV=staging|prod`
- `VITE_LOG_LEVEL=debug|info|warn|error`

### ONE4AI (Edge Functions — Supabase project secrets)
Do **not** put OpenAI keys in Vite env (they would ship to the browser). In the Supabase Dashboard (**Project → Edge Functions → Secrets**) or CLI:
- `OPENAI_API_KEY` — optional platform-wide fallback when clubs have not saved a key in **Settings → Club → AI provider**
- `OPENAI_MODEL` — e.g. `gpt-4o-mini`

Deploy or redeploy after changing shared edge code:
```bash
supabase functions deploy co-trainer
```

The Settings **Test connection** and ONE4AI chat require the app’s `VITE_*` URLs to reach this project and a successful deploy of `co-trainer` (including `mode: "health"` support).

## Environments (HOLD — needs Supabase)
Recommended:
- Supabase project (staging)
- Supabase project (prod)

Then configure Vercel:
- Preview deployments → staging Supabase
- Production deployments → prod Supabase

## Rollback plan (simple)
- **Vercel:** redeploy the previous production deployment.
- **Supabase:** apply rollback SQL bundles (when we start doing Supabase changes in phases).
- **Client safety:** if a release introduces a crash, ErrorBoundary should show a fallback instead of a blank screen.

## Supabase migrations (Stripe / shop / public club — 2026-03-29)
After pulling latest `main`, apply new SQL in **`supabase/migrations/`** in timestamp order from `20260328203000_stripe_webhook_idempotency.sql` through `20260329000000_club_public_page_sections.sql` (see `CHANGELOG.md` § 2026-03-29). Then deploy **`stripe-checkout`**, **`stripe-webhook`**, and any LLM functions affected by `20260328205000_edge_llm_rate_limit.sql`. Edge secrets: **`STRIPE_SECRET_KEY`**, **`STRIPE_WEBHOOK_SECRET`**, price IDs as documented in `.env.example` and **`ops/PRODUCTION_READINESS_ARTIFACTS.md`**.

## Supabase migrations (production readiness — 2026-03-30)
After the 2026-03-29 wave, apply in filename order from **`20260329103000_platform_admin_rbac.sql`** through **`20260330120000_search_club_members_page.sql`** (see `CHANGELOG.md` § 2026-03-30 and `MEMORY_BANK.md` items 32–42). For **`20260329132000_hotspot_composite_indexes.sql`**, run the **entire migration file** (indexes are created only when `to_regclass` finds `public.events` / `public.event_participants` — do not paste unguarded `CREATE INDEX` fragments). Redeploy Edge functions that import **`supabase/functions/_shared/request_context.ts`** (**`co-trainer`**, **`stripe-checkout`**, **`chat-bridge`**, **`stripe-webhook`**) so correlation logging is active. Validate Members search and analytics pages against the new RPCs after apply.

## Edge function `health` (optional DB depth probe)
Deploy **`supabase/functions/health`** alongside other functions (`supabase functions deploy health`). It performs a minimal `clubs` select with the service role. The in-app **Health** page (`/health`) calls **`/functions/v1/health`** when a publishable key is set; if the function is not deployed, the check shows `edgeDatabase: skipped`.

## Release checklist
- CI green: lint / test / build / audit:phase0 / e2e
- Manual smoke in deployed URL
  - Create club
  - Invite member (admin)
  - Member accepts invite
  - Create activity + RSVP
  - Create match + event
  - Create dues + export CSV
  - Partners create/list
  - AI generate plan/digest (and confirm ai_requests is written)
- Tenant isolation spot-check (two users in two clubs)
- Verify logs
  - Set `VITE_LOG_LEVEL=debug` for a repro run if needed
