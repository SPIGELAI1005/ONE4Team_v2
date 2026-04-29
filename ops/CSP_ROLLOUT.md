# Content-Security-Policy rollout (Wave 3)

## Goal

Reduce XSS impact with a strict CSP on the SPA host. Ship in phases so third-party scripts (e.g. Stripe.js, analytics) keep working.

## Phases

1. **Report-only:** `Content-Security-Policy-Report-Only` is set in [`vercel.json`](../vercel.json) (tune `connect-src` for your exact Supabase host if reports show blocks). Optionally add `report-uri` / `report-to` to your collector.
2. **Tighten `script-src`:** allow `'self'`; enumerate Stripe, Sentry, and any other required origins; avoid `'unsafe-inline'` where possible (use nonces if you inject scripts).
3. **Enforce:** flip to `Content-Security-Policy` after noise in reports is acceptable.

## Where to set headers

- **Static host (Netlify / Cloudflare / nginx):** configure headers at the edge.
- **Vite dev:** CSP is optional locally; do not block team velocity.

## Enforcement decision (production readiness)

**Status:** Deferred — `Content-Security-Policy-Report-Only` remains active in [`vercel.json`](../vercel.json).

| Field | Value |
|-------|--------|
| Owner | (assign) |
| Review by | (YYYY-MM-DD after Report-Only noise is acceptable) |
| Risk accepted | Full CSP enforcement delayed; XSS reliance on existing app hygiene + Stripe/Sentry allowlists until flip |

**Next step:** When violation reports are near zero, rename the header key from `Content-Security-Policy-Report-Only` to `Content-Security-Policy` with the same value (or tightened), then re-verify checkout, auth, Sentry, and Realtime.

## References

- [MDN: CSP](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- Product tracking: [`ops/WAVE3_ROADMAP.md`](WAVE3_ROADMAP.md)
