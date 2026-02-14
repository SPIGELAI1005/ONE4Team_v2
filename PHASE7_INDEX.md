# ONE4Team — PHASE 7 INDEX (Production hardening + launch)

Goal: make it real SaaS.

This phase includes some items that require Supabase Dashboard / additional infra. Those are marked **HOLD**.

---

## P7-010 Minimal E2E tests (golden path)
**Implemented (local readiness):** Playwright scaffold + smoke test that can run without Supabase.

- `playwright.config.ts`
- `e2e/smoke.spec.ts`
- CI runs e2e in a best-effort mode (skips when it cannot boot the app)

**HOLD (needs Supabase):** end-to-end flows that require real auth + data.

---

## P7-020 Rate limits / abuse controls (invite request spam)
**HOLD (needs Supabase / RPC changes):** add throttling + spam protection for invite requests.

---

## P7-030 Error monitoring + logging
**Implemented (local readiness):**
- `src/components/ErrorBoundary.tsx`
- `src/lib/logger.ts`

---

## P7-040 Deploy plan
**Implemented (local readiness):**
- `DEPLOYMENT.md` (Vercel + env var checklist)
- `vercel.json` with SPA rewrite rules (added 2026-02-14)
- Production build verified (`vite build` succeeds)
- Fixed env var name in `DEPLOYMENT.md` (`VITE_SUPABASE_PUBLISHABLE_KEY`)

**HOLD (needs Supabase):** staging/prod projects + secrets.

---

## Phase 7 exit criteria: PASS (local readiness)
- E2E framework present + smoke test runs locally ✅
- Error boundary + logger in app ✅
- Deployment doc present ✅
- `vercel.json` SPA rewrites configured ✅
- Production build passes ✅
- `npm run lint` / `npm test` / `npm run build` / `npm run audit:phase0` ✅
