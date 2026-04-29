# Phase B — Secrets and client configuration

**Evidence index:** [PRODUCTION_READINESS_EVIDENCE_LOG.md](PRODUCTION_READINESS_EVIDENCE_LOG.md) (Phase 2 table).

Complete per environment (staging, then production). Map to Section M rows 1–3 in [PRODUCTION_READINESS_ARTIFACTS.md](PRODUCTION_READINESS_ARTIFACTS.md).

## B1 — Client bundle (M1)

- [ ] Vercel/host env exposes only **`VITE_SUPABASE_URL`** and **`VITE_SUPABASE_PUBLISHABLE_KEY`** (plus non-secret app vars like `VITE_APP_ENV` if used).
- [ ] No service role, no OpenAI keys, no Stripe **secret** keys in Vite env.
- **Evidence:** Vercel env export redacted screenshot or checklist sign-off.

## B2 — Edge Functions secrets (M2)

In Supabase **Project → Edge Functions → Secrets**:

- [ ] `SUPABASE_SERVICE_ROLE_KEY` (provided by platform when using service client)
- [ ] `SUPABASE_URL`
- [ ] Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, price IDs as per [.env.example](../.env.example)
- [ ] `OPENAI_API_KEY` / `OPENAI_MODEL` if using platform LLM fallback
- [ ] Redeploy functions after secret changes.

**Evidence:** Secrets present (names only) + last deploy timestamp.

## B3 — `EDGE_ALLOWED_ORIGINS` (M3)

- [ ] Comma-separated **explicit** HTTPS origins for the SPA (staging + prod). No `*` wildcard in production.
- [ ] Matches the browser origin users use (www vs apex).

**Evidence:** Supabase secret value redacted (show structure only) + note of production URL.
