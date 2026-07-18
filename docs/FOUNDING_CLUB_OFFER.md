# Founding Club offer

**Offer code:** `ONE4Team-Founding-Club-12M`  
**Plan:** `kickoff` (no separate free plan ID)  
**EN name:** Founding Club – First Season Free  
**DE name:** Gründungsverein – Erste Saison kostenlos  

## Rules

- EUR 0 for 12 months; no credit card; no automatic paid renewal  
- Eligible new clubs; one redemption per club; default max 100 (configurable on `commercial_offers`)  
- After expiry: 30-day read-only grace (`write-access-guard`)  
- Paid continuation requires explicit Stripe checkout on Squad/Pro/Champions (or paid Kick-off)  
- Promotional Kick-off: announcements included; full club chat unlocks on paid Kick-off or higher packages  
- Founding Club **status** persists after the free season (VIP support, early feature access, privileged bespoke path)  
- Operator may grant full modules via `club_module_entitlements` / `metadata.operator_full_access` for pilot testing  

## Pricing page marketing (2026-07-18)

- Fixed gold **Founding promo banner** under navbar (black **12 MONTHS FREE** pill)  
- **Offer terms** modal — package limits, after-season rules, copyable offer code  
- **View offer details** modal — benefits, prerequisites, how to apply (3 steps), conditions, CTA  
- Kick-off card: catalogue price with red strikethrough + **0 €**; same black pill badge  
- FAQ on `/pricing` covers Founding Club, grace, AI 4 T, and Bespoke consultation  

## Redeem

- CTA: `/onboarding?plan=kickoff&offer=ONE4Team-Founding-Club-12M`  
- After `create_club_with_admin`, client calls RPC `redeem_commercial_offer` (`src/lib/founding-club-offer.ts`)  
- Sets `billing_subscriptions.status = promotional`, `access_source = commercial_offer`  

## Expiry job

Edge Function `process-commercial-offers` → RPC `process_commercial_offer_expiry` (grace → expired).

## Tables

- `commercial_offers`  
- `club_offer_redemptions`  
- optional `sponsor_campaigns`  

## Migrations

- `20260804120000_pricing_founding_club_offers.sql`  
- `20260804130000_runtime_module_overrides.sql`  
- `20260804140000_rename_founding_club_offer_code.sql`  
