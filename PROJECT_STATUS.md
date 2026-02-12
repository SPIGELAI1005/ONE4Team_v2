# ONE4Team (clubhub-connect) — Project Status

Last updated: 2026-02-13 (Europe/Berlin)

## Summary
The project is **roadmap-complete through Phase 6** and **Phase 7 (local hardening) is implemented**.
All remaining work is primarily **Supabase/infra-dependent** (apply bundles, staging/prod separation, abuse controls) plus optional UX polish.

## What is DONE (local readiness)
### Phase 0 — Foundation
- Tenant isolation scaffolding and audits
- Baseline RLS helpers + hardened RLS bundle
- CI pipeline and automated audits

### Phase 1 — Invite-only onboarding
- Invite creation + acceptance flows
- Public invite requests + admin inbox

### Phase 2 — Scheduling
- `activities` + `activity_attendance` bundles
- Schedule page with RSVP

### Phase 3 — Matches + stats
- Competitions/matches + match events + voting + stats bundles
- Existing matches/stats UI

### Phase 4 — Manual dues
- `membership_dues` bundle + Dues UI + CSV export
- Bulk dues create + member names in UI/CSV

### Phase 5 — Partners (stub → useful contacts)
- `partners` bundle + Partners UI
- Contact fields + search

### Phase 6 — AI copilots v1
- `ai_requests` bundle + AI hub page
- Stub copilots (deterministic output) + logging

### Phase 7 — Production hardening (Supabase-independent)
- ErrorBoundary + minimal logger
- `/health` debug endpoint
- Playwright E2E scaffold + route smoke + protected-route redirect tests
- CI runs e2e (Playwright browsers install)
- Deployment docs + release checklist + rollback notes
- Bundle size report script
- Protected routes redirect unauth users to `/auth`

## Current UX focus
Trainer-first weekly workflow:
- Schedule as hub (filters + week template + attendance summary + attendance drawer)
- Nudge-unconfirmed placeholder (copy message)
- Dashboard getting-started checklist

## HOLD / Blocked (requires Supabase / infra)
See `HOLD.md`. Key items:
- Apply Supabase SQL bundles (Baseline → Phase6)
- Staging/prod Supabase projects + Vercel environment separation
- Invite-request rate limiting / abuse controls
- True end-to-end golden path e2e with real auth + data

## Recommended next actions
1) When ready, apply bundles using the order in `HOLD.md`.
2) After apply: run Phase smoke scripts in PHASE*_INDEX.md docs.
3) Set up staging/prod Supabase + Vercel envs.
4) Implement invite-request abuse controls.

## Repo
- GitHub: https://github.com/SPIGELAI1005/ONE4Team_v2
- Local path: `C:\Users\georg\ONE4Team\clubhub-connect`
