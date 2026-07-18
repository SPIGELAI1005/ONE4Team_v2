# Pricing and entitlements

**Source of truth (frontend):** [`src/lib/plan-catalog.ts`](../src/lib/plan-catalog.ts)  
**Gates:** [`src/lib/plan-limits.ts`](../src/lib/plan-limits.ts), [`src/lib/effective-plan.ts`](../src/lib/effective-plan.ts), [`src/hooks/use-plan-guard.ts`](../src/hooks/use-plan-guard.ts)  
**DB sync migration:** `supabase/migrations/20260804120000_pricing_founding_club_offers.sql`

## Plan ladder (IDs unchanged)

| Plan | Members | Teams | Admins | Trainers | Storage |
|------|--------:|------:|-------:|---------:|--------:|
| kickoff | 500 | 10 | 3 | 10 | 1 GB |
| squad | 1000 | 30 | 5 | 50 | 10 GB |
| pro | 2000 | 100 | 10 | 200 | 50 GB |
| champions | 5000 | 250 | 25 | fair use | 150 GB |
| bespoke | custom | | | | |

Prices: base + per active member (EUR). Yearly = monthly × 12 × 0.8. Volume −15% above 400 / 800 / 1600 / 4000 members.

## Kick-off entitlements

- Ops modules (tasks, dues, shop, partners, etc.) **included**.
- **Promotional / Founding Club:** announcements only (chat locked) unless Operator override.
- **Paid Kick-off / grandfather:** chat unlocked.

## AI 4 T

- **Included (fair-use)** on Squad, Pro, Champions (higher capacity on Pro / Champions; marketing: `2 X` / `5 X` vs Squad baseline).
- **Kick-off:** optional add-on (Pricing add-ons card; default marketing price EUR 19/mo).
- Extra capacity / add-on capacity available on request (Operator / sales).

## Deny-by-default

Missing plan → `NO_PLAN` (not Kick-off). Only auth, onboarding, pricing, support, minimal settings.

## Effective plan priority

1. Operator full access / module overrides  
2. Paid Stripe  
3. Commercial offer (Founding Club)  
4. Standard 41-day trial  
5. Grandfather metadata  
6. NO_PLAN  

## Pricing UX notes (2026-07-18)

- `/pricing`: Founding banner + Offer terms / Offer details dialogs; Kick-off strikethrough→0 €; Bespoke mailto `contact@one4team.com`.
- Comparison table labels in i18n `comparisonFeatureLabels` (e.g. **API**, **AI 4 T** with red digit via `BrandedText`).

## Drift test

`src/lib/plan-catalog-drift.test.ts` asserts `PLAN_CATALOG_SEED` and the founding-club migration stay aligned.
