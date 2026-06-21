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

### AI4Team (Edge Functions — Supabase project secrets)

AI4Team chat runs through the **`co-trainer`** Edge Function. API keys must **never** go in Vite `.env` (they would ship to the browser).

#### Quick setup checklist

1. **App env (local `.env`)** — point at your Supabase project:
   - `VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key`
   - Restart `npm run dev` after changes.

2. **Database** — apply LLM migrations on the same Supabase project (if not already):
   - `supabase/migrations/20260328200000_club_llm_settings.sql` (per-club keys)
   - Related `20260328180000_ai_conversations.sql` for saved chats (optional but recommended)

3. **Choose credential mode** (pick one or both):
   - **Platform default (simplest):** Supabase Dashboard → **Project Settings → Edge Functions → Secrets** (or CLI):
     ```bash
     supabase secrets set OPENAI_API_KEY="sk-..."
     supabase secrets set OPENAI_MODEL="gpt-4o-mini"
     ```
     All clubs without their own key use this fallback.
   - **Per-club key (recommended for production):** As club admin → **Settings → Club → AI provider** — save provider, model, and API key. Stored in `club_llm_settings` (admin-only RLS).

4. **Deploy Edge Function** (required after code or secret changes):
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   supabase functions deploy co-trainer
   ```
   Optional CORS allowlist for production:
   ```bash
   supabase secrets set EDGE_ALLOWED_ORIGINS="https://your-app.vercel.app,http://localhost:8080"
   ```

5. **Verify in the app** — sign in as club admin → **Settings → Club → AI provider** → **Test connection**.  
   Success shows **Connected** (club key or platform `OPENAI_API_KEY`). Then open **`/co-trainer`** (AI4Team) and send a chat message.

#### Supported providers (club settings)

OpenAI, Anthropic (Claude), Google Gemini, Azure OpenAI, GitHub Models — configured per club in Settings. Platform fallback is **OpenAI only** via `OPENAI_API_KEY` / `OPENAI_MODEL`.

#### Troubleshooting

| Symptom | Likely cause | Fix |
|--------|----------------|-----|
| **Not configured** | No club key and no `OPENAI_API_KEY` secret | Set platform secret or save club key in Settings |
| **Failed to fetch** | Wrong `VITE_*` URL/key, ad blocker, or function not deployed | Fix `.env`, redeploy `co-trainer`, disable blockers for localhost |
| **Club admin required** | Non-admin ran Test connection | Use an admin account for the active club |
| **Plan does not include AI** | Subscription tier | Upgrade plan, grant a **club feature trial** (see below), or enable `VITE_DEV_UNLOCK_ALL_FEATURES=true` locally only |
| **401 / invalid JWT** | Session expired | Sign out/in; Settings refresh uses `refreshSession` automatically |
| Provider error in detail | Bad key, wrong model, or Azure endpoint missing | Re-check key, model name, Azure resource URL in Settings |

The Settings **Test connection** and AI4Team chat require the app’s `VITE_*` URLs to reach this project and a successful deploy of `co-trainer` (including `mode: "health"` support).

### Club feature trials (AI4Team / Shop without full plan upgrade)

Apply migration `supabase/migrations/20260614140000_club_feature_trials.sql` (seeds **TSV Allach 09** with a 90-day **AI** trial when the club name/slug matches `%allach%`).

**Grant AI4Team trial to a club** (Supabase SQL Editor — adjust name/slug and duration):

```sql
-- Find the club id first
select id, name, slug from public.clubs where name ilike '%Your Club%' or slug ilike '%your-slug%';

insert into public.club_feature_trials (club_id, feature, expires_at, note)
values (
  '<club-uuid>',
  'ai',
  now() + interval '90 days',
  'Pilot AI4Team access'
)
on conflict (club_id, feature) do update
  set expires_at = excluded.expires_at,
      note = excluded.note,
      updated_at = now();
```

Supported `feature` values: `ai`, `shop`. After changing trials or `plan_entitlements.ts`, redeploy Edge functions that call `clubHasPlanFeature` (`co-trainer`, `co-aimin`, `ai-match-analysis`, **`ai4team-agent`**).

### AI4Team Agent (workflows — propose → confirm → execute)

Club workflows use the **`ai4team-agent`** Edge Function and Postgres RPCs. Six intents: create/cancel training, plan training week, notify trainers, add member draft (admin), send club announcement (trainer).

1. Apply migrations (in order):
   - `supabase/migrations/20260615120000_ai_agent_runs.sql`
   - `supabase/migrations/20260615130000_ai_agent_tool_rpcs.sql`
   - `supabase/migrations/20260615140000_ai_agent_runs_conversation_id.sql`
   - `supabase/migrations/20260615150000_ai_agent_tool_rpcs_extended.sql`
2. Deploy:
   ```bash
   supabase functions deploy ai4team-agent
   ```
3. In the app:
   - **`/co-trainer` → Agent tab** — pick workflow → **Review & propose** → **Confirm & run**
   - **Dashboard header Sparkles** — contextual Agent sheet on Teams, Members, Activities
   - **Chat tab** — `/agent` slash commands (e.g. `/agent plan-week`) or natural-language workflow detection
4. Requires the same AI plan gate as chat (`clubHasPlanFeature('ai')`) and trainer/admin role per intent.

**Alternative (full Pro trial):** upgrade `billing_subscriptions` instead — gives all Pro limits, not AI-only:

```sql
update public.billing_subscriptions
set plan_id = 'pro', status = 'trialing', current_period_end = now() + interval '90 days'
where club_id = '<club-uuid>';
```

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
