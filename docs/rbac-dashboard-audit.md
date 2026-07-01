# RBAC & dashboard — architecture audit

**Date:** 2026-07-01  
**Status:** Audit snapshot — no functional changes in this pass  
**Principle:** One intelligent dashboard shell; menu, routes, data scope, and widgets adapt via RBAC — not separate apps per role.

**Related docs**

- [`rbac-dashboard-plan.md`](./rbac-dashboard-plan.md) — phased implementation plan (partially superseded by findings below)
- [`marketplace-product-structure.md`](./marketplace-product-structure.md) — Marketplace vs Partners IA
- [`marketplace-implementation-plan.md`](./marketplace-implementation-plan.md) — Marketplace delivery status
- [`PHASE0_RBAC_CHECKLIST.md`](../PHASE0_RBAC_CHECKLIST.md) · [`ops/TENANT_ACCESS_MATRIX.md`](../ops/TENANT_ACCESS_MATRIX.md)

---

## 1. Executive summary

ONE4Team already follows a **single dashboard shell** pattern:

| Layer | Route prefix | Maturity |
|-------|----------------|----------|
| **Public club site** | `/club/:slug/*` | Mature; publish flags; separate from dashboard RBAC |
| **Private dashboard** | `/dashboard/:role`, `/members`, `/marketplace`, … | **Partial** — central RBAC matrix exists; sidebar respects it; **most routes still only require sign-in** |
| **Marketplace** | `/marketplace` | **Mature (Phase 1–2)** — role-aware hub/portal, fine-grained permissions, RLS + unit tests |
| **Partners** | `/partners` | **Mature CRM shell** — club-admin gated; engagements bridge from accepted marketplace offers |

**Marketplace and Partners remain separate sidebar items** — do not merge them.

---

## 2. Current architecture

### 2.1 Dashboard shell (one app, adaptive chrome)

```
App.tsx
└── RequireAuth
    └── DashboardLayout
        ├── DashboardSidebar      ← useDashboardNav() → RBAC-filtered modules
        ├── DashboardTopBar       ← legacy partial gates + role switcher
        ├── <Outlet />            ← page content
        └── MobileBottomNav       ← useDashboardNav() subset
```

| File | Role |
|------|------|
| `src/components/dashboard/DashboardLayout.tsx` | Shell: sidebar, top bar, mobile nav, AI agent sheet |
| `src/components/dashboard/DashboardSidebar.tsx` | Desktop nav; violet styling for Marketplace |
| `src/components/dashboard/MobileBottomNav.tsx` | Up to 5 modules from `getMobileNavModules()` |
| `src/hooks/use-dashboard-nav.ts` | Resolves persona + builds nav from `getSidebarMenuItems()` |
| `src/lib/dashboard-nav.ts` | Module → icon, label, route mapping |
| `src/lib/dashboard-page-shell.ts` | Shared page layout classes |

**Home dashboard:** `/dashboard/:role` → `DashboardContent.tsx` (widgets/KPIs vary by URL role slug, not always by DB authorization).

### 2.2 Single source of truth — RBAC matrix

| File | Responsibility |
|------|----------------|
| `src/lib/rbac-config.ts` | `DashboardRole`, `DashboardModule`, `RBAC_MATRIX`, `SIDEBAR_MENU_PROFILES`, `getSidebarMenuItems()`, `getDataScopeForModule()`, `resolveDashboardRole()`, persona helpers |
| `src/lib/permissions.ts` | Bridges matrix → legacy `Permission[]` for `usePermissions().has()` |
| `src/lib/marketplace-permissions.ts` | Fine-grained marketplace actions (`marketplace:view`, `marketplace:moderate`, …) |
| `src/lib/marketplace-access.ts` | Club vs provider portal experience, tab lists |
| `src/lib/marketplace-security.ts` | Pure rules mirroring RLS (offer privacy, listing visibility) — **for tests/guards** |

**Rule (documented in code):** Do not define independent role matrices in pages or components.

### 2.3 Session & authorization context

| File | Responsibility |
|------|----------------|
| `src/contexts/AuthContext.tsx` | Supabase session |
| `src/hooks/use-active-club.ts` | Active club membership; legacy `role` from `club_memberships` |
| `src/hooks/use-club-id.ts` | `clubId` wrapper |
| `src/hooks/use-permissions.ts` | `permissions`, `isAdmin`, `isTrainer`, `assignments`, `is_club_admin` RPC |
| `localStorage one4team.activeRole` | **UI persona** for `/dashboard/:role` — decoupled from DB role |

**Dual-context risk:** Sidebar persona (`activeRole` / URL) can differ from DB authorization. `resolveSidebarMenuRole()` limits persona to `getDashboardPersonaOptions()` for internal roles, but **direct URLs are not persona-validated**.

### 2.4 Route protection (today)

| Mechanism | File | Used on |
|-----------|------|---------|
| `RequireAuth` | `App.tsx` | All dashboard-layout routes |
| `RequireAdmin` | `require-role.tsx` | `/payments`, `/dues`, `/club-page-admin`, `/asset-layers`, admin tools |
| `RequireTrainer` | `require-role.tsx` | `/members`, `/teams`, member history |
| `RequireModule` | `require-module.tsx` | **`/marketplace`** (`deniedMode="lock"`), **`/partners`** |
| `PlanGate` | billing | payments, shop, AI, marketplace, partners |
| Page-level checks | various | `Marketplace.tsx`, `Partners.tsx`, `Members.tsx`, … |

**Gap:** `/matches`, `/events`, `/communication`, `/tasks`, `/reports`, `/co-trainer`, `/shop`, `/settings`, `/support` — **`RequireAuth` only**. Sidebar may hide them, but direct URL access works for any signed-in club member.

`RequireModule` uses `canAccessModule(resolveDashboardRole(...), module)` — correct pattern to extend.

### 2.5 Data scope

| API | Location | Usage today |
|-----|----------|-------------|
| `getDataScopeForModule(role, module)` | `rbac-config.ts` | Returns `club` \| `team` \| `own` \| `family` \| `partner` \| `limited` \| `none` |
| `teamAdminTeamIds(assignments)` | `permissions.ts` | Trainer team scope |
| `match-management-access.ts` | lib | Match write scope from assignments |
| Supabase RLS | migrations | Authoritative for marketplace tables, members, payments, … |

**Gap:** Most page hooks query by `club_id` only; **few pages call `getDataScopeForModule()`** to narrow queries. Team-scoped trainer views rely on page logic ad hoc.

---

## 3. Roles

### 3.1 Product roles → code

| Product label | `DashboardRole` | Legacy DB / notes |
|---------------|-----------------|-------------------|
| Admin | `admin` | Platform; full matrix |
| Club Admin | `club_admin` | `club_memberships.role = 'admin'` and/or `club_role_assignments.club_admin` |
| Trainer | `trainer` | `trainer`, `team_admin` assignment |
| Team Staff | `team_staff` | `staff` |
| Player | `player` | `player`, teen/adult variants |
| Parent / Supporter | `parent_supporter` | `parent` |
| Member | `member` | Generic member |
| Sponsor | `sponsor` | External |
| Supplier | `supplier` | External |
| Service Provider | `service_provider` | External; alias `service` normalized |
| Consultant | `consultant` | External |

Normalization: `normalizeDashboardRole()` in `rbac-config.ts`. Unknown → lowest privilege (`UNKNOWN_ROLE_ACCESS`).

### 3.2 Role assignments (Option 2 RBAC)

| Location | Purpose |
|----------|---------|
| `club_role_assignments` table | `role_kind` + `scope` (`club` \| `team` \| `self`) + optional `scope_team_id` |
| `src/lib/club-role-assignments.ts` | TS types |
| `src/components/members/role-manager.tsx` | Admin UI to manage rows |
| `resolveDashboardRole(legacy, assignments)` | Merges legacy + assignments (highest precedence wins) |

### 3.3 Invite / onboarding flow

| File | Responsibility |
|------|----------------|
| `src/pages/Onboarding.tsx` | Club vs partner world; redeem invite |
| `src/pages/Members.tsx` | Invite members, saved drafts, role pickers, `RoleManager` |
| `src/lib/send-club-invite-email.ts` | Invite email dispatch |
| `src/lib/redeem-invite-errors.ts` | Invite redemption errors |

Invites set `club_memberships.role` (legacy). Scoped assignments are **additive** via Role Manager after join.

---

## 4. Sidebar & navigation

### 4.1 How the menu is built

1. `resolveSidebarMenuRole(persona, legacyRole, assignments)` — authorized role + allowed persona
2. `getSidebarMenuItems(menuRole)` — `SIDEBAR_MENU_PROFILES[role]` filtered by `canAccessModule()`
3. `buildDashboardNavItems(modules, labels, personaSlug)` — icons, labels, routes

**Marketplace** appears **above Partners** in `FULL_SIDEBAR_MENU` for admin/club_admin.

### 4.2 Sidebar by role (after RBAC filter)

| Role | Notable modules |
|------|-----------------|
| `admin`, `club_admin` | Full menu incl. Marketplace + Partners |
| `trainer`, `team_staff` | Sports ops; **no** Marketplace, Partners, Payments (trainer) |
| `player` | Trainings, matches, events, messages, tasks, shop |
| `parent_supporter` | + payments (family scope) |
| `member` | Events, payments, messages, tasks — minimal sports |
| `sponsor` | Marketplace, reports (limited), club page read |
| `supplier`, `service_provider`, `consultant` | Marketplace + own-scope modules |

### 4.3 Legacy nav duplication

`DashboardTopBar.tsx` and `AppHeader.tsx` still maintain a **separate** `navItems` list with `gate: (p) => p.has(...)` / `isAdmin` / `isTrainer`. This can **diverge** from sidebar RBAC.

**Recommendation:** Replace with `useDashboardNav()` everywhere.

---

## 5. Dashboard home (`/dashboard/:role`)

| File | Responsibility |
|------|----------------|
| `src/components/dashboard/DashboardContent.tsx` | Role-specific KPIs, widgets, registration summary |
| `src/lib/dashboard-section-visibility.ts` | Section flags per role (`admin`, `trainer`, `player`, `sponsor`; others → `DEFAULT`) |
| `src/lib/club-dashboard-snapshot.ts` | Admin snapshot fetch |
| `src/components/dashboard/TasksSummaryCard.tsx` | Open tasks CTA |
| `src/components/dashboard/MarketplaceDashboardCards.tsx` | Marketplace KPI strip (club admin + provider roles) |

### 5.1 Existing role-specific views (enhance, do not recreate)

| URL role slug | Custom KPI config | Section flags |
|---------------|-------------------|---------------|
| `admin` | Yes | `ADMIN_SECTIONS` — financial, AI digest, notifications |
| `trainer` | Yes | `TRAINER_SECTIONS` — analytics, season, chemistry |
| `player` | Yes | `PLAYER_SECTIONS` |
| `sponsor` | Yes | `SPONSOR_SECTIONS` — minimal sports widgets |
| Others | `defaultConfig` | `DEFAULT_SECTIONS` |

**Gap:** `club_admin`, `team_staff`, `parent_supporter`, `member`, supplier roles use **default** dashboard layout despite distinct RBAC profiles.

---

## 6. Module pages (inventory)

| Module | Route | Page | Guard | Notes |
|--------|-------|------|-------|-------|
| Dashboard | `/dashboard/:role` | `DashboardContent` | Auth | Persona-driven widgets |
| Assets | `/asset-layers` | `Teams.tsx` | Admin | Pitch/asset map |
| Trainings | `/teams` | `Teams.tsx` | Trainer | Same component, different entry |
| Members | `/members` | `Members.tsx` | Trainer | Admin vs trainer split inside page |
| Matches | `/matches` | `Matches.tsx` | **Auth only** | Match management access helpers exist |
| Events | `/events` | `Events.tsx` | **Auth only** | |
| Reports | `/reports` | `PlayerStats.tsx` | **Auth only** | |
| Payments | `/payments` | `Payments.tsx` | Admin + PlanGate | |
| Dues | `/dues` | `Dues.tsx` | Admin | |
| Messages | `/communication` | `Communication.tsx` | **Auth only** | |
| Tasks | `/tasks` | `Tasks.tsx` | **Auth only** | |
| **Marketplace** | `/marketplace` | `Marketplace.tsx` | **RequireModule** + PlanGate | See §7 |
| **Partners** | `/partners` | `Partners.tsx` → `club-partners-workflow.tsx` | **RequireModule** + PlanGate | See §8 |
| AI 4 T | `/co-trainer` | `CoTrainer.tsx` | Auth + PlanGate | |
| Club Page | `/club-page-admin` | `ClubPageAdmin.tsx` | Admin | |
| Club Shop | `/shop` | `Shop.tsx` | Auth + PlanGate | |
| Settings | `/settings` | `Settings.tsx` | Auth | |
| Support | `/support` | `SupportFaq.tsx` | Auth | |
| Schedule | `/activities` | `Activities.tsx` | Auth | |
| Live scores | `/live-scores` | `LiveScores.tsx` | Auth | |

Public counterparts live under `/club/:slug/*` — intentionally outside dashboard RBAC.

---

## 7. Marketplace structure (existing — do not merge into Partners)

### 7.1 Entry & experience routing

```
/marketplace
├── RequireModule(marketplace) + PlanGate
└── Marketplace.tsx
    ├── marketplacePageExperience() === "club_marketplace" → ClubMarketplaceHub
    ├── marketplacePageExperience() === "provider_portal" → ProviderMarketplacePortal
    └── else → ModuleAccessDenied
```

### 7.2 Club admin hub (`ClubMarketplaceHub`)

| Tab | Component | Purpose |
|-----|-----------|---------|
| overview | hero + featured providers + open requests | Onboarding |
| discover | `MarketplaceDiscoverPanel` | Browse/filter providers |
| requests | `ClubMarketplaceRequestsPanel` | Create/manage club requests |
| offers | `ClubMarketplaceOffersPanel` | Review/compare/accept offers |
| providers | saved provider cards | Bookmarks |
| reviews | empty state | Future |
| moderation | empty state | Listing approvals (admin) |

### 7.3 Provider portal (`ProviderMarketplacePortal`)

| Tab | Component | Purpose |
|-----|-----------|---------|
| overview | hero + profile summary | Onboarding |
| listing / services | `ProviderListingEditor` | Own listing CRUD |
| requests | `ProviderMarketplaceRequestsPanel` | Matching club requests |
| offers | `ProviderMarketplaceOffersPanel` | Sent offers |
| reviews / settings | placeholders | Future / visibility |

### 7.4 Key libraries & hooks

| Path | Role |
|------|------|
| `src/hooks/use-marketplace.ts` | CRUD, club/provider data |
| `src/lib/marketplace-models.ts` | Types, categories, provider types |
| `src/lib/marketplace-offer-partners.ts` | Accept offer → Partners engagement |
| `src/lib/marketplace-club-relationship.ts` | Saved / offer sent / active partner badges |
| `src/components/dashboard/MarketplaceDashboardCards.tsx` | Home dashboard widgets |

### 7.5 Tests (92 passing under `src/lib/marketplace*`)

Coverage includes RBAC matrix, permissions, offer privacy, listing visibility, partners bridge metadata.

---

## 8. Partners structure (existing — post-marketplace CRM)

### 8.1 Entry

```
/partners
├── RequireModule(partners) + PlanGate
└── Partners.tsx
    ├── canAccessPartnersModule() → club_admin / admin only
    └── ClubPartnersWorkflow
```

### 8.2 Tabs (`PartnersTab`)

| Tab | Purpose |
|-----|---------|
| overview | KPIs, quick actions |
| directory | Partner directory (`partners` table) |
| engagements | Active jobs (`partner_tasks`) — **marketplace provenance** |
| contracts | Sponsorship/supplier agreements |
| invoices | Partner invoicing |

### 8.3 Marketplace bridge

Accepted marketplace offers call `graduateAcceptedOfferToPartners()` — sets `marketplace_source`, `marketplace_offer_id`, `marketplace_request_id` on `partners` and `partner_tasks`. UI links back to `/marketplace?view=offers`.

**Separation preserved:** discovery/negotiation in Marketplace; delivery/CRM in Partners.

---

## 9. Reusable components & patterns

| Pattern | Examples |
|---------|----------|
| Page shell | `DASHBOARD_PAGE_ROOT`, `DashboardHeaderSlot` |
| Module denied | `ModuleAccessDenied` |
| Tab bars | `MarketplaceTabBar`, partners tab bar in workflow page |
| KPI strips | `MarketplaceKpiStrip` |
| Empty states | `MarketplaceEmptyState` (gold-accent onboarding) |
| Glass panels | `PARTNER_PANEL_CLASS` from `partner-workflow-ui.ts` |
| Permission hook | `usePermissions()` + `has("permission:string")` |
| Module hook (recommended) | `canAccessModule` / `RequireModule` |

---

## 10. Missing or incomplete pieces

| Area | Status | Notes |
|------|--------|-------|
| Route guards for all modules | **Missing** | Only marketplace/partners use `RequireModule` |
| Unified top-bar nav | **Partial** | Legacy gates in `DashboardTopBar` / `AppHeader` |
| Persona URL validation | **Missing** | `/dashboard/admin` reachable without admin DB role |
| Data scope in hooks | **Partial** | `getDataScopeForModule` rarely used in fetches |
| Dashboard widgets per role | **Partial** | 4 explicit roles; 7 use defaults |
| Marketplace reviews | **Stub** | Tab + empty state only |
| Partners route `deniedMode` | **Inconsistent** | Marketplace uses `lock`; Partners redirects |
| E2E RBAC smoke | **Limited** | Strong unit tests; few Playwright persona tests |
| Consultant/member dashboard copy | **Generic** | No tailored KPIs yet |

---

## 11. Risk areas

1. **Direct URL bypass** — Any member can open `/matches`, `/payments` (if they guess URL won't work for payments due to RequireAdmin — good), but `/matches` is open.
2. **Persona vs authorization** — `one4team.activeRole` drives dashboard skin; not cryptographically bound to membership.
3. **Dual permission systems** — `canAccessModule` (matrix) vs `has("members:read")` (legacy strings) vs `isAdmin`/`isTrainer` flags — must keep bridge in `permissions.ts` synchronized.
4. **Trainer = admin for RequireTrainer** — `isTrainer` includes club admins by design; ensure pages don't expose admin-only actions behind trainer guard only.
5. **Dev bypass** — `VITE_DEV_UNLOCK_ALL_FEATURES=true` skips guards locally.
6. **RLS vs client filters** — Marketplace client-side filters are UX-only; tests in `marketplace-security.ts` document expected RLS behavior.
7. **PlanGate** — Marketplace/Partners tied to `partners` billing feature flag.

---

## 12. Recommended implementation order

Aligns with one-shell RBAC — **enhance existing views**, no per-role apps.

### Phase 1 — Close the route guard gap (high priority)

1. Wrap each dashboard module route in `RequireModule` matching `rbac-config` (use `deniedMode="lock"` for discoverability).
2. Remove duplicate nav gates from `DashboardTopBar` / `AppHeader`; use `useDashboardNav()` only.
3. Validate `/dashboard/:role` persona against `getDashboardPersonaOptions(authorizedRole)`.

### Phase 2 — Data scope (medium priority)

1. Add `useModuleDataScope(module)` hook wrapping `getDataScopeForModule` + `teamAdminTeamIds`.
2. Apply scope to Members, Matches, Trainings, Payments queries incrementally.
3. Document per-module scope in page headers (trainer sees “Team X only”).

### Phase 3 — Dashboard widgets (medium priority)

1. Extend `dashboard-section-visibility.ts` for `club_admin`, `team_staff`, `parent_supporter`, `member`, provider roles.
2. Reuse `MarketplaceDashboardCards` pattern for Partners summary on admin home (accepted engagements count).
3. Keep one `DashboardContent`; branch on `resolveDashboardRole`, not URL slug alone.

### Phase 4 — Marketplace & Partners polish (lower priority)

1. Marketplace reviews tab (when schema exists).
2. Partners moderation queue (if marketplace listings need club-level approval beyond platform admin).
3. Playwright smoke: trainer denied `/marketplace`, sponsor allowed, club admin accept offer → partners engagement.

### Phase 5 — Admin tooling

1. RBAC matrix viewer using `getRbacMatrix()` for support.
2. Assignment-aware route tests in CI (extend `marketplace-rbac-matrix.test.ts` pattern to all modules).

---

## 13. Definition of done (this audit)

- [x] Dashboard shell, sidebar, and RBAC matrix documented
- [x] Marketplace and Partners structures documented with separation rule
- [x] Existing role-specific dashboard views identified
- [x] Route vs sidebar vs data-scope gaps called out
- [x] No major functional code changes in this pass
- [x] Clear implementation order for next work

---

## 14. Quick reference — file map

```
src/lib/rbac-config.ts              ← roles × modules matrix
src/lib/permissions.ts              ← legacy Permission bridge
src/lib/dashboard-nav.ts            ← nav metadata
src/lib/dashboard-section-visibility.ts
src/lib/marketplace-access.ts       ← marketplace experience + tabs
src/lib/marketplace-permissions.ts
src/lib/marketplace-security.ts     ← RLS mirror for tests
src/hooks/use-permissions.ts
src/hooks/use-dashboard-nav.ts
src/components/dashboard/DashboardLayout.tsx
src/components/dashboard/DashboardContent.tsx
src/components/auth/require-module.tsx
src/components/auth/require-role.tsx
src/pages/Marketplace.tsx
src/pages/Partners.tsx
src/pages/club-partners-workflow.tsx
src/components/marketplace/*        ← 26 components
src/App.tsx                         ← route table
```

**Tests:** `src/lib/rbac-config.test.ts`, `src/lib/marketplace-rbac-matrix.test.ts`, `src/lib/marketplace-security.test.ts`, + 7 other `marketplace-*.test.ts` files.
