# Marketplace — product structure

**Date:** 2026-07-01  
**Status:** Information architecture defined; UI tabs aligned  
**Route:** `/marketplace` (single sidebar item — role-aware tabs inside the page)  
**Related:** [`marketplace-implementation-plan.md`](./marketplace-implementation-plan.md) · [`rbac-dashboard-plan.md`](./rbac-dashboard-plan.md) · [`src/lib/marketplace-product-structure.ts`](../src/lib/marketplace-product-structure.ts)

---

## 1. Product separation

| | **Marketplace** | **Partners** |
|---|---|---|
| **Route** | `/marketplace` | `/partners` |
| **Purpose** | Discovery & procurement between clubs and external providers | Active relationship CRM |
| **Audience** | Club admins + external providers | Club admins only |

### Marketplace owns

- Provider discovery and search
- Public / semi-public listings
- Club needs & requests
- Provider offers (pre-contract)
- Marketplace profile management
- Listing moderation & verification
- Reviews & references (marketplace context)

### Partners owns

- Active sponsors, suppliers, service providers, consultants
- Contracts & agreements
- Engagements / jobs in progress
- Invoices & ongoing operations
- Orders tied to accepted relationships

**Rule:** Winning marketplace offers graduate into **Partners** — not the other way around.

---

## 2. Provider types

| Type | Dashboard role | Listing focus |
|------|----------------|---------------|
| Sponsor | `sponsor` | Sponsorship packages, public placement |
| Supplier | `supplier` | Products, delivery areas |
| Service provider | `service_provider` | Services, availability |
| Consultant | `consultant` | Expertise areas, consulting packages |

Defined in `MARKETPLACE_PROVIDER_TYPES` (`src/lib/marketplace-models.ts`).

---

## 3. Marketplace categories (20)

| Key | Label (EN) |
|-----|----------------|
| `teamwear_jerseys` | Teamwear & jerseys |
| `sports_equipment` | Sports equipment |
| `balls_training_material` | Balls & training material |
| `goalkeeper_equipment` | Goalkeeper equipment |
| `printing_merchandise` | Printing & merchandise |
| `photography_video` | Photography & video |
| `social_media_marketing` | Social media & marketing |
| `website_it` | Website & IT services |
| `club_management_consulting` | Club management consulting |
| `sponsorship_consulting` | Sponsorship consulting |
| `facility_maintenance` | Facility maintenance |
| `catering_events` | Catering & events |
| `transport` | Transport services |
| `medical_physio` | Medical / physio |
| `fitness_performance` | Fitness & performance |
| `tournament_organization` | Tournament organization |
| `insurance_legal_tax` | Insurance / legal / tax |
| `fundraising` | Fundraising services |
| `fan_shop` | Fan shop products |
| `other_club_services` | Other club services |

---

## 4. Navigation UX rule

- **One sidebar item:** Marketplace (violet label, above Partners).
- **No extra sidebar entries** for Discover, Requests, etc.
- All marketplace areas use **in-page tabs** (`?view=` query param).
- **Partners** remains a separate sidebar item for club CRM.

---

## 5. Club admin tabs (`ClubMarketplaceHub`)

**Canonical order** (`CLUB_MARKETPLACE_TAB_ORDER`):

| Tab | `?view=` | Responsibility | Status |
|-----|----------|----------------|--------|
| Overview | `overview` | Hero, KPIs, featured providers, recent requests, link to Partners | Implemented |
| Discover | `discover` | Search, filters, provider cards; **Saved only** toggle | Implemented |
| Requests | `requests` | Club procurement requests; create dialog | Implemented |
| Offers | `offers` | Incoming provider proposals | Read-only list |
| Providers | `providers` | Saved providers bookmark list | Implemented |
| Reviews | `reviews` | Club-side reviews & references | Placeholder |
| Moderation | `moderation` | Provider listing approvals (`submitted_for_review`) | Placeholder |

**Removed from club marketplace** (belong in Partners): Documents, Payments — use `/partners` for invoices and contracts.

### Feature mapping (detailed spec → tabs)

| Spec item | Tab |
|-----------|-----|
| Discover providers | Discover |
| Saved providers | Discover (filter) + Providers |
| Club requests | Requests |
| Offers received | Offers |
| Provider approvals | Moderation |
| Reviews | Reviews |
| Marketplace settings | Moderation (future) + provider profile visibility |

---

## 6. External provider tabs (`ProviderMarketplacePortal`)

**Unified structure for all provider types** (`PROVIDER_PORTAL_TAB_ORDER`):

| Tab | `?view=` | Responsibility | Role-specific label |
|-----|----------|----------------|---------------------|
| Overview | `overview` | KPIs, quick links | Same |
| My listing | `listing` | Name, descriptions, contact, website | Sponsor / Supplier / Service / Consultant |
| Services | `services` | Categories, packages, availability | Packages / Products / Services / Expertise |
| Club requests | `requests` | Open club needs matching categories | Same |
| Offers sent | `offers` | Provider proposals | Same |
| Reviews | `reviews` | References from clubs | Same |
| Settings | `settings` | Listing preview, public placement | Same |

Labels come from i18n `listingTabByType` and `servicesTabByType` per provider type.

### Per-type content focus (within shared tabs)

| Provider | Listing tab | Services tab | Settings tab |
|----------|-------------|--------------|--------------|
| **Sponsor** | Sponsor listing | Sponsorship packages | Public placement preview |
| **Supplier** | Supplier listing | Products & delivery areas | Listing preview |
| **Service provider** | Service listing | Services & availability | Listing preview |
| **Consultant** | Consultant listing | Expertise & packages | Listing preview |

**Removed from provider portal** (out of marketplace scope): Jobs, Deliverables, Documents, Payments → active work lives in **Partners** or `/payments` after acceptance.

### Legacy URL aliases

Old `?view=` values redirect conceptually via `PROVIDER_PORTAL_VIEW_ALIASES`:

- `profile` → `listing`
- `packages` → `services`
- `placement` → `settings`

---

## 7. RBAC summary

| Role | `/marketplace` | `/partners` |
|------|----------------|-------------|
| Admin / Club admin | Club tabs (full) | Partners CRM |
| Sponsor, supplier, service_provider, consultant | Provider tabs | Denied |
| Trainer, player, parent, member | Denied | Denied |

Source: `src/lib/rbac-config.ts` + `src/lib/marketplace-access.ts`.

---

## 8. Code map

| Concern | File |
|---------|------|
| Tab order & types | `src/lib/marketplace-product-structure.ts` |
| RBAC & experience routing | `src/lib/marketplace-access.ts` |
| Tab labels hook | `src/hooks/use-marketplace-tab-labels.ts` |
| Club UI | `src/components/marketplace/club-marketplace-hub.tsx` |
| Provider UI | `src/components/marketplace/provider-marketplace-portal.tsx` |
| Page router | `src/pages/Marketplace.tsx` |
| Categories & DB types | `src/lib/marketplace-models.ts` |
| Tests | `src/lib/marketplace-access.test.ts` |

---

## 9. Definition of done (this document)

- [x] Clear product structure for Marketplace vs Partners
- [x] Club admin tab set defined (7 tabs)
- [x] Unified provider tab set with role-aware labels
- [x] Categories and provider types documented
- [x] Single sidebar item; tabs inside page
- [x] Code constants aligned with structure
- [ ] Full feature implementation per tab (see implementation plan Phase 2+)
