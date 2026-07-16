# ONE4Team Pricing and Packaging

Source of truth in code: `src/lib/plan-catalog.ts` (limits + base/member prices).
Marketing page and client plan gates derive from that catalog.

## Packages (EUR, VAT-inclusive display)

| Plan | Members | Teams | Base / mo | Per member / mo | Volume −15% above | Highlights |
|------|---------|-------|-----------|-----------------|-------------------|------------|
| Kick-off | 100 | 5 | 19 | 0.15 | 80 | Core ops + public club page |
| Squad | 400 | 20 | 39 | 0.25 | 300 | + payments, partners, shop |
| **Pro** | **1,200** | **60** | **79** | **0.30** | **900** | + AI 4 T, analytics, bilingual, branding |
| Champions | 5,000 | 200 | 149 | 0.40 | 2,500 | + API, priority SLA |
| Bespoke | Custom | Custom | Custom | Custom | — | Contact sales |

Yearly billing = monthly × 12 × 0.8 (20% off).

### Example club bills (Pro)

| Members | Monthly billing | Yearly billing (÷12) |
|---------|-----------------|----------------------|
| 800 | ~€319/mo | ~€255/mo |
| 1,000 | ~€322/mo after volume | ~€258/mo after volume |

### Add-ons

- Payments: EUR 0–19/mo (usage / Stripe)
- Pro Comms: EUR 9/mo
- AI 4 T: EUR 19/mo on Kick-off / Squad (included fair-use on Pro+)

## Guardrails

- Do not underprice below support + AI fair-use cost for large clubs.
- Keep marketing caps identical to `plan-limits` / catalog.
- Pilot discounts stay explicit with conversion criteria.
