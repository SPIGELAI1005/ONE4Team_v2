# ONE4Team — Production release checklist

Use this checklist before and after publishing on **Vercel**. It covers Vercel configuration, Supabase (migrations, Edge Functions, secrets), **Resend** (member invite emails), smoke tests, and rollback.

**Related docs:** [DEPLOYMENT.md](../DEPLOYMENT.md) · [ops/PHASE_B_SECRETS_CHECKLIST.md](../ops/PHASE_B_SECRETS_CHECKLIST.md) · [ops/SECTION_M_GO_LIVE_CHECKLIST.md](../ops/SECTION_M_GO_LIVE_CHECKLIST.md) · [.env.example](../.env.example)

Work through sections **A → K** in order. Check each box and note date/evidence in section **K** if you want an audit trail.

### Deferred until production deploy (OK to skip locally)

These can wait until you publish on Vercel; track them in **`TASKS.md` → DEPLOY-EMAIL-001** and **`HOLD.md` → Resend domain verification**.

- [ ] **Resend: verify sending domain** (`one4team.com`) — required for automatic member/partner invite emails (sections **F** + **G** below)
- Until verified: invites **still work**; use **Copy invite link** in Members. Toast may show *“Invite created, email not sent”* with *“domain is not verified”* from Resend — that is expected in dev.

---

## A. Code & CI (before deploy)

- [ ] `npm run build` succeeds locally (no TypeScript/build errors)
- [ ] `npm run lint` / tests pass (or CI green on `main`)
- [ ] Latest migrations are committed in `supabase/migrations/`
- [ ] `VITE_DEV_UNLOCK_ALL_FEATURES` is **`false`** (or unset) in **Vercel Production**
- [ ] No secrets in git (`.env` not committed; only `.env.example` in repo)

---

## B. Supabase — database & auth

### Migrations

- [ ] All pending SQL migrations applied on the **production** Supabase project
- [ ] Repair migrations applied if needed (e.g. `list_club_membership_emails`, `images-avatars` bucket)
- [ ] Schema matches repo (`supabase/SCHEMA_STATUS.md` / latest `CHANGELOG.md`)

### Auth (signup/login — separate from member invites)

- [ ] **Authentication → URL configuration**: Site URL = canonical production URL (recommended: `https://www.one4team.com`)
- [ ] **Redirect URLs** include:
  - `https://www.one4team.com/**`
  - `https://one4team.com/**` (if apex is used)
  - Vercel preview URLs (if preview deploys call Edge Functions)
- [ ] **Origin-based email links (by design):** magic links, signup confirmation, and **Copy invite link** use `window.location.origin` — operators must open the app on **`https://www.one4team.com`** before sending invites or magic links so recipients get production URLs (not `*.vercel.app`)
- [ ] **Password reset:** Settings → reset email uses `redirectTo: {origin}/auth` (same as magic links); whitelist that URL in Redirect URLs above
- [ ] **Email Templates** (Supabase Auth): confirm signup, magic link, reset password pasted from `supabase/email-templates/` (optional but recommended for branded auth emails)

### Storage

- [ ] Required buckets exist (`images-avatars`, club logos, etc.)
- [ ] RLS policies allow expected uploads for admins/members

---

## C. Vercel — project setup

### Project settings

- [ ] Repo connected: `SPIGELAI1005/ONE4Team_v2`
- [ ] Framework: **Vite**
- [ ] Build command: `npm run build`
- [ ] Output directory: `dist`
- [ ] Production branch: `main` (or your chosen branch)

### Custom domain

- [ ] Production domain added (e.g. `one4team.com` / `www.one4team.com`)
- [ ] DNS points to Vercel; SSL certificate active (HTTPS)
- [ ] Decide **apex vs www** and redirect consistently (recommended: apex → `www`, both in Supabase redirect URLs)

### Post-investigation smoke (2026-07-05)

- [ ] Open embedded club chat (public club → Messages) — pagination label matches visible message count (not “0 messages” when chat has rows)
- [ ] From **`https://www.one4team.com`**, Settings → password reset — email link lands on `www` `/auth`, not demo Vercel URL
- [ ] Send member invite from **`https://www.one4team.com`** — link uses `www` origin (or use Copy invite link after opening production URL)

---

## D. Vercel — environment variables (Production)

Set in **Vercel → Project → Settings → Environment Variables → Production**.

### Required

- [ ] `VITE_SUPABASE_URL` = `https://YOUR_PROJECT_REF.supabase.co`
- [ ] `VITE_SUPABASE_PUBLISHABLE_KEY` = Supabase **anon** key (not service role)
- [ ] `VITE_SUPABASE_PROJECT_ID` = your Supabase project ref

### Recommended

- [ ] `VITE_PUBLIC_SITE_URL` = `https://www.one4team.com` (canonical URL for SEO / public club pages)
- [ ] `VITE_APP_ENV` = `prod`
- [ ] `VITE_PLATFORM_ADMIN_EMAILS` = comma-separated admin emails (or empty = no platform admin)
- [ ] `VITE_DEV_UNLOCK_ALL_FEATURES` = **`false`**

### Optional

- [ ] `VITE_STRIPE_PUBLISHABLE_KEY` (if billing is live)
- [ ] `VITE_SENTRY_DSN` (error tracking)
- [ ] `VITE_SUPPORT_EMAIL`

### Must NOT be in Vercel

- [ ] No `OPENAI_API_KEY`, `RESEND_API_KEY`, `STRIPE_SECRET_KEY`, or **service role** key in Vite env (they would ship to the browser)

After changing env vars: **redeploy** production on Vercel.

---

## E. Supabase — Edge Functions (deploy)

Link CLI to production, then deploy:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy send-club-invite-email
supabase functions deploy co-trainer
supabase functions deploy ai4team-agent
supabase functions deploy co-aimin
supabase functions deploy ai-match-analysis
supabase functions deploy chat-bridge
# If billing is enabled:
supabase functions deploy stripe-checkout
supabase functions deploy stripe-webhook
# Optional monitoring:
supabase functions deploy health
```

### Functions checklist (all **ACTIVE** in dashboard)

- [ ] `send-club-invite-email` — **member invite emails**
- [ ] `co-trainer` — AI 4 T chat
- [ ] `ai4team-agent` — AI agent workflows
- [ ] `co-aimin` — AI match assistant
- [ ] `ai-match-analysis`
- [ ] `chat-bridge` — external chat connectors
- [ ] `stripe-checkout` — if billing enabled
- [ ] `stripe-webhook` — if billing enabled
- [ ] `health` — optional monitoring

- [ ] Dashboard shows each deployed function as **ACTIVE** with a recent deploy timestamp

---

## F. Supabase — Edge Functions → Secrets

**Dashboard → Edge Functions → Secrets**

### Core

- [ ] `SUPABASE_URL`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` (usually auto-managed by Supabase)

### CORS (critical for browser → Edge Function calls)

- [ ] `EDGE_ALLOWED_ORIGINS` = exact origins, comma-separated, **no trailing slashes**

  Example:

  ```text
  https://one4team.com,https://www.one4team.com,http://localhost:8080
  ```

- [ ] Each origin matches what users see in the browser (`http` vs `https`, `www` vs apex)
- [ ] Local dev uses port **8080** (`vite.config.ts`); include `http://localhost:8080` if you test locally against production Supabase

### Member invite emails — Resend

- [ ] `RESEND_API_KEY` = `re_...` from [resend.com](https://resend.com)
- [ ] `RESEND_FROM_EMAIL` = `ONE4Team <invites@one4team.com>` (must use a **verified** domain)
- [ ] `PUBLIC_SITE_URL` = `https://one4team.com` (onboarding link inside invite email)

### AI 4 T (platform fallback key)

- [ ] `OPENAI_API_KEY`
- [ ] `OPENAI_MODEL` (e.g. `gpt-4o-mini`)

### Stripe (if billing is live)

- [ ] `STRIPE_SECRET_KEY`
- [ ] `STRIPE_WEBHOOK_SECRET`
- [ ] `STRIPE_PRICE_*` IDs per plan/cycle (see `.env.example`)
- [ ] Stripe webhook endpoint: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/stripe-webhook`
- [ ] **`STRIPE_ALLOW_PLACEHOLDER_PRICE_IDS` is NOT set** in production

Secret changes take effect immediately; redeploy is **not** required, but retry the feature in the app after updating.

---

## G. Resend — domain & deliverability

Configured at [resend.com/domains](https://resend.com/domains) — **separate from Supabase**.

- [ ] Domain **`one4team.com`** (or your sending domain) added in Resend
- [ ] DNS records (SPF, DKIM; optional DMARC) added at your DNS host
- [ ] Resend shows domain status **Verified**
- [ ] `RESEND_FROM_EMAIL` in Supabase secrets uses that verified domain
- [ ] Test invite sent to an **external** inbox (Gmail, GMX, etc.) — not only the Resend account owner email
- [ ] Check spam on first send; consider DMARC for long-term deliverability

**Note:** Resend’s test sender `onboarding@resend.dev` only delivers to the email on your Resend account. Real member invites require a verified custom domain.

---

## H. Post-deploy smoke tests (production URL)

### Auth & onboarding

- [ ] Sign up / log in works
- [ ] Password reset email arrives (Supabase Auth, not Resend)
- [ ] Create club or join existing club

### Members & invites

- [ ] Add member draft with valid email
- [ ] **Send invite** → toast **“Invite email sent”** (no CORS / domain verification error)
- [ ] Email arrives with **Accept invitation** button
- [ ] Link opens **`/club/{slug}?invite=…`** (public club page, not `/onboarding`)
- [ ] Invite modal pre-fills admin data; member sets password and joins the club
- [ ] Welcome email arrives after join (Resend)
- [ ] **Resend invite** creates a new link; previous unused link no longer works

### Core product

- [ ] Members list, search, team assignment
- [ ] Teams page
- [ ] Activities + RSVP
- [ ] Communication / messages (if used)
- [ ] **Founding Club:** Kick-off CTA on `/pricing` → onboarding with `offer=ONE4Team-Founding-Club-12M` (no Stripe); Offer terms + Offer details modals; promotional clubs see announcements only; after season → 30-day read-only grace
- [ ] **Bespoke:** Contact Us opens mailto to `contact@one4team.com` with consultation brief
- [ ] **Billing:** Stripe checkout uses base + member Price IDs; failure does not grant trial access; apply migrations `20260804120000`–`20260804140000` + deploy `process-commercial-offers`
- [ ] Club card download (PNG)
- [ ] Public club page loads (if enabled for a club)
- [ ] Share club URL in WhatsApp — preview shows club branding (after Facebook Debugger cache refresh)
- [ ] Dashboard **Club page** link visible when user browsed public club then opened dashboard

### TSV Allach Sommerfest (Jul 2026 pilot)

- [ ] **Matches** → **Turnier für Fans veröffentlichen** syncs 22 fixtures
- [ ] Kick off / full time updates scores on **`/club/tsv-allach-09/tournament/sommerfest-2026`**
- [ ] Live KPI, hero left-edge glow, mobile bottom live bar when match **`in_progress`**
- [ ] Share tournament button; team logos on match cards
- [ ] Public match detail page loads (no console error)

### AI 4 T (if enabled)

- [ ] Settings → AI provider → **Test connection** succeeds
- [ ] `/co-trainer` chat responds
- [ ] Redeploy **`co-trainer`** after 2026-07-05 role-specific prompt changes (`supabase functions deploy co-trainer`)
- [ ] Public club **AI 4 T** modal: player sees Guide only (Agent tab hidden); signed-in guide prompts match role
- [ ] Agent workflows propose/confirm (if plan allows)

### Billing (if enabled)

- [ ] Pricing → checkout opens Stripe
- [ ] Webhook updates subscription in Supabase

### Security spot-check

- [ ] Two clubs: user A cannot see club B data
- [ ] Non-admin cannot access admin-only member actions

---

## I. Monitoring & rollback

- [ ] Supabase **Edge Functions → Logs** checked after smoke (no repeated 401/502)
- [ ] Resend **Logs** shows `delivered` for test invite
- [ ] Optional: Sentry (`VITE_SENTRY_DSN`) receiving errors
- [ ] Rollback plan known: **Vercel → Deployments → Promote previous production** deployment

---

## J. Quick reference — where to change what

| Topic | Where |
|--------|--------|
| App URL, Supabase anon key | **Vercel → Environment Variables** |
| Invite email sending | **Supabase → Edge Functions → Secrets** (`RESEND_*`, `PUBLIC_SITE_URL`) |
| Browser can call Edge Functions | **Supabase → Secrets → `EDGE_ALLOWED_ORIGINS`** |
| Domain verified for `@yourdomain.com` | **Resend → Domains** + DNS at domain host |
| Deploy invite email function | CLI: `supabase functions deploy send-club-invite-email` |
| Auth signup/reset/magic link redirect | **Supabase → Authentication → URL configuration** + open app on production domain before sending |
| RLS integration tests (optional) | **`docs/RLS_INTEGRATION_TEST.md`** — GitHub Actions `workflow_dispatch` job **`rls-integration`** |
| Database schema | **Supabase → SQL migrations** |

---

## K. Sign-off

| Item | Done | Date | Notes |
|------|------|------|-------|
| Vercel production deploy | ☐ | | |
| Supabase migrations | ☐ | | |
| Edge Functions deployed | ☐ | | |
| Resend domain verified | ☐ | | |
| Invite email smoke test | ☐ | | |
| Full smoke pass | ☐ | | |

**Signed off by:** ___________________ **Date:** ___________________
