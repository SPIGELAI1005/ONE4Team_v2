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
- `VITE_SUPABASE_ANON_KEY`

Recommended additional env:
- `VITE_APP_ENV=staging|prod`
- `VITE_LOG_LEVEL=debug|info|warn|error`

## Environments (HOLD — needs Supabase)
Recommended:
- Supabase project (staging)
- Supabase project (prod)

Then configure Vercel:
- Preview deployments → staging Supabase
- Production deployments → prod Supabase

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
