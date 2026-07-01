# RBAC & dashboard access — audit and implementation plan

**Date:** 2026-07-01 (persona data scoping for messages/tasks)  
**Status:** Phase B partial — sidebar RBAC + marketplace portal + partner portal routes; Partner Page admin; persona switching — route guards largely done via `RequireModule`  
**Related:** [`PHASE0_RBAC_CHECKLIST.md`](../PHASE0_RBAC_CHECKLIST.md) · [`ops/TENANT_ACCESS_MATRIX.md`](../ops/TENANT_ACCESS_MATRIX.md) · [`src/lib/rbac-config.ts`](../src/lib/rbac-config.ts) · [`src/lib/marketplace-models.ts`](../src/lib/marketplace-models.ts) · [`src/lib/marketplace-access.ts`](../src/lib/marketplace-access.ts)

---

## 1. Executive summary

ONE4Team has **two parallel access models** that are only partially connected:

| Layer | What it controls | Maturity |
|-------|------------------|----------|
| **Public club site** (`/club/:slug/*`) | Anonymous/authenticated visitors; publish flags on schedule/matches/events | Mature, intentionally separate |
| **Private dashboard** (`/dashboard/*`, `/members`, `/matches`, …) | Signed-in club members; sidebar + some route guards | Partial — menu is cosmetic for many roles; several routes are open to any club member |

**Update (Phase A):** `src/lib/rbac-config.ts` is now the **single source of truth** for dashboard module access (roles × modules × access levels). `src/lib/permissions.ts` bridges this matrix to legacy `Permission` strings for `usePermissions()`. Routes and navigation **still do not enforce** the matrix — that is Phase B.

Previously, the ad-hoc matrix in `permissions.ts` granted sponsors `matches:read`; the new baseline correctly denies dashboard `matches` for sponsors while allowing `events:read` only for explicitly assigned events.

**Club Admin** in product language maps to legacy `club_memberships.role = 'admin'` and/or a `club_role_assignments.role_kind = 'club_admin'` row. There is no separate `club_admin` value in the `app_role` enum.

---

## 2. Current state

### 2.1 Where roles are defined

| Location | Purpose |
|----------|---------|
| `supabase/migrations/20260210184608_*.sql` | Postgres enum `app_role`: `admin`, `trainer`, `player`, `staff`, `member`, `parent`, `sponsor`, `supplier`, `service_provider`, `consultant` |
| `club_memberships.role` | Legacy **primary** role label per user×club (still drives most UI) |
| `club_role_assignments` (`20260324140000_club_role_assignments.sql`) | **Option 2** scoped RBAC: `role_kind` + `scope` (`club` \| `team` \| `self`) + optional `scope_team_id` |
| `src/lib/club-role-assignments.ts` | TS types for assignment rows (`ClubRoleKind`, `ClubRoleScope`) |
| `src/lib/rbac-config.ts` | **Central RBAC** — `DashboardRole`, `DashboardModule`, `ModuleAccessLevel`, full matrix, helpers |
| `src/lib/permissions.ts` | Legacy `Permission` bridge + `effectivePermissions()` for `usePermissions()` |
| `src/lib/rbac-config.test.ts` | Unit tests for normalization, matrix baseline, legacy bridge |
| `src/integrations/supabase/types.ts` | Generated `app_role` enum mirror |
| `src/components/members/role-manager.tsx` | Admin UI to manage assignment rows |
| `src/i18n/en.ts` / `de.ts` | Human-readable role labels |

**Product role → code mapping**

| Product label | Normalized `DashboardRole` | Legacy DB / alias |
|---------------|---------------------------|-------------------|
| Admin | `admin` | platform context (full matrix; same modules as club_admin) |
| Club Admin | `club_admin` | `admin`, `club_admin` assignment |
| Trainer | `trainer` | `trainer`, `team_admin` assignment |
| Team Staff | `team_staff` | `staff` |
| Player | `player` | `player`, `player_teen`, `player_adult` |
| Parent / Supporter | `parent_supporter` | `parent`, `"Parent / Supporter"` |
| Member | `member` | `member` |
| Sponsor | `sponsor` | `sponsor` |
| Supplier | `supplier` | `supplier` |
| Service Provider | `service_provider` | `service_provider`, `service` (sidebar bug alias) |
| Consultant | `consultant` | `consultant` |

Use `normalizeDashboardRole()` for any raw string. Unknown roles → `UNKNOWN_ROLE_ACCESS` (lowest privilege, **never** admin).

### 2.2 User, session, and club context

| File | Responsibility |
|------|----------------|
| `src/contexts/AuthContext.tsx` | Supabase session/user; dev auto-login seeds `one4team.activeRole` + active club id |
| `src/hooks/use-active-club.ts` | Loads active `club_memberships` (+ joined `clubs`); persists `one4team.activeClubId:{userId}` in `localStorage`; exposes `activeClub`, `membershipId`, legacy `role` |
| `src/hooks/use-club-id.ts` | Thin wrapper: `{ clubId: activeClubId }` |
| `src/hooks/use-permissions.ts` | Merges legacy role + `club_role_assignments` + `is_club_admin` RPC → `permissions`, `isAdmin`, `isTrainer`, `has(permission)` |
| `localStorage one4team.activeRole` | **UI dashboard persona** (URL `/dashboard/:role`); can differ from DB role (e.g. admin viewing “player” dashboard) |

**Important:** `usePermissions()` reflects **authorization** from the database. `one4team.activeRole` reflects **which dashboard skin / menu** to show. These are intentionally decoupled for admin/trainer “perspective switching” but are **not validated** — any authenticated user can set `activeRole` to `admin` in localStorage or navigate to `/dashboard/admin`.

### 2.3 Sidebar and navigation

| Component | Behavior |
|-----------|----------|
| `src/components/dashboard/DashboardSidebar.tsx` | Desktop nav; **now uses** `useDashboardNav()` + RBAC profiles |
| `src/components/dashboard/MobileBottomNav.tsx` | Mobile nav; **now uses** `useDashboardNav()` + `getMobileNavModules()` |
| `src/components/layout/DashboardTopBar.tsx` | Top bar + mobile drawer; nav items use `gate: (p) => p.has(...)` / `isAdmin` / `isTrainer` for **some** links; role switcher offers `admin`/`trainer`/`player` only |
| `src/components/layout/AppHeader.tsx` | Same gated nav pattern (used on non-layout pages) |

**Admin full menu** (when `activeRole === 'admin'`): Dashboard, Asset Layers, Members, Trainings (`/teams`), Matches, Events, Reports, Payments, Messages, Tasks, Partners, AI 4 T, Club Page, Shop, Settings, Support.

**Gaps resolved (sidebar pass)**

- ~~`staff`, `parent`, `member` → default menu~~ — each role has a `SIDEBAR_MENU_PROFILES` entry.
- ~~`service_provider` key mismatch (`service`)~~ — normalized via `normalizeDashboardRole()`.
- ~~Hardcoded `roleMenus` / unsafe `admin` default~~ — removed; `resolveSidebarMenuRole()` + unknown fallback.

**Remaining gaps**

- Route guards still allow direct URL access to modules hidden in the sidebar (Phase B).
- `DashboardTopBar` / `AppHeader` mobile drawer nav still uses partial legacy gates — unify with `useDashboardNav` in Phase B.

### 2.4 Dashboard routes and pages

**Route definition:** `src/App.tsx`

| Path | Guard | Notes |
|------|-------|-------|
| `/club/:clubSlug/*` | None (public layout) | Public matches/events/schedule — **not** dashboard |
| `/dashboard/:role` | `RequireAuth` | `DashboardContent` — role-specific home widgets |
| `/members`, `/members/history/*` | `RequireTrainer` | Page further splits admin vs trainer capabilities |
| `/payments`, `/dues`, `/club-page-admin`, `/asset-layers`, `/training-plan-import`, `/coach-placeholders` | `RequireAdmin` | Some wrapped in `PlanGate` |
| `/teams`, `/partners` | `RequireTrainer` | `PlanGate` on partners |
| `/communication`, `/tasks`, `/events`, `/activities`, `/matches`, `/reports`, `/co-trainer`, `/live-scores`, `/shop`, `/settings`, `/support` | `RequireAuth` only | **Any club member** can open |
| `/platform-admin` | `RequireAuth` | Platform-level; separate from club RBAC |

**Role-specific dashboard content:** `src/components/dashboard/DashboardContent.tsx` + `src/lib/dashboard-section-visibility.ts`

- Distinct KPI/layout configs for `admin`, `trainer`, `player`, `sponsor`.
- Section flags (financial summary, analytics, live ticker, etc.) per role.
- Other roles use `DEFAULT_SECTIONS`.

### 2.5 Route protection (today)

| Mechanism | File | Coverage |
|-----------|------|----------|
| `RequireAuth` | `App.tsx` | All dashboard-layout routes |
| `RequireAdmin` / `RequireTrainer` | `src/components/auth/require-role.tsx` | Binary flags from `usePermissions()`; dev bypass via `VITE_DEV_UNLOCK_ALL_FEATURES` |
| `PlanGate` | `src/components/plan-gate.tsx` | Subscription features (payments, partners, shop, AI) — **not** RBAC |
| **No `RequirePermission`** | — | `permissions.ts` defines granular permissions but routes do not use them |

**E2E:** `e2e/protected.spec.ts` only asserts unauthenticated users redirect to `/auth` — no role-based route tests.

### 2.6 Page-level permissions (today)

Documented in [`PHASE0_RBAC_CHECKLIST.md`](../PHASE0_RBAC_CHECKLIST.md): mutation handlers on Members, Payments, Teams, Events, Matches, Communication generally check `perms.isAdmin` or `perms.isTrainer` before writes.

**Read access** on “open” routes is not gated in the UI layer — pages load data scoped by `clubId` and rely on RLS.

Examples:

- `Members.tsx`: `canAccessMembersPage = isAdmin || isTrainer`; writes require `isAdmin`.
- `Events.tsx` / `Matches.tsx`: create/edit guarded by `isTrainer`; list view loads for everyone who reaches the route.
- `Partners.tsx`: `canManagePartners = isTrainer`; sponsors have `partners:read` in the matrix but `/partners` route requires trainer.

### 2.7 Data scoping (today)

**Client**

- Virtually all dashboard queries filter by `activeClubId` / `clubId` from `useActiveClub()`.
- Realtime channels generally include `club_id=eq.{clubId}` (see PHASE0 checklist).

**Server (RLS)**

- Tenant isolation: `is_member_of_club(auth.uid(), club_id)` on most member-visible tables.
- Privileged writes: `is_club_admin(auth.uid(), club_id)` on many admin tables.
- **Role-aware read restrictions are weak:** e.g. `events` policy “Members can view events” allows **any** club member (including sponsor) to `SELECT` all club events — same for activities/matches member policies.
- `club_tasks` RLS is tighter: assignees, creators, admin/trainer, or team members see relevant rows.
- Public read policies are separate (`publish_to_public_schedule`, `is_public` club flag).

**Net effect:** Hiding a menu item does **not** prevent data access if the user navigates directly or calls the API; RLS still returns data for any club member on several sensitive tables.

### 2.8 Public vs private (critical distinction)

| Concern | Public (`/club/:slug/...`) | Private dashboard (`/matches`, etc.) |
|---------|------------------------------|--------------------------------------|
| Auth | Optional | Required |
| Audience | World / supporters | Club members only (today: **all** roles equally for many routes) |
| Data source | Published subset + public RPCs | Full club operational data |
| Intended for sponsors/parents | Yes — marketing, fixtures, events | **No** for ops areas (members, internal trainings, etc.) |

A sponsor viewing public match results on the club website must **not** imply access to the internal Matches management view, team rosters, or member-linked data.

---

## 3. Missing pieces

1. ~~**Single source of truth**~~ — **Done:** `src/lib/rbac-config.ts` + tests.
2. **`RequirePermission` / `RequireModule` route guard** — map each dashboard route to `canAccessModule(role, module)`.
3. **Validate `/dashboard/:role`** — URL role should be subset of roles the user may impersonate (see `Settings.tsx` `getImpliedRoles`), not a free string defaulting to `admin`.
4. **Complete sidebar/nav for all roles** — `staff`, `parent`, `member`, fix `service_provider` key; drive items from permission map, not hardcoded `roleMenus`.
5. **Align external-role defaults** — sponsor/supplier/service_provider/consultant should not reach trainings, matches, events, members, reports at route **or** RLS level.
6. **Club Admin vs team-scoped admin** — `team_admin` assignments exist in DB/permissions but are not reflected in navigation or route guards.
7. **Partners route vs `partners:read`** — external roles need a read-only partners/tasks portal; today `/partners` requires trainer.
8. **Server-side read policies** — extend RLS beyond `is_member_of_club` for role-sensitive tables (or security-definer RPCs with explicit permission checks).
9. **Tests** — role-matrix E2E/integration tests (sponsor blocked from `/members`, etc.).
10. **Remove unsafe defaults** — `DashboardSidebar` defaults missing role to `"admin"`; should default from `usePermissions()` / membership role.

---

## 4. Proposed RBAC structure

### 4.1 Principles

- **Three enforcement layers** (all required): menu visibility → route guard → data scope (RLS/RPC).
- **Permissions, not menu strings** — navigation and routes consult `effectivePermissions()`.
- **Separate concerns:** `activeRole` remains a *dashboard layout preference* only where explicitly allowed (admin/trainer perspective switch), not an authorization primitive.
- **Public site stays public** — no coupling of public URLs to dashboard permissions.

### 4.2 Permission → route map (target)

| Permission | Dashboard routes |
|------------|------------------|
| *(authenticated + club member)* | `/dashboard/:role`, `/settings`, `/support`, `/communication` (base) |
| `members:read` | `/members` (read); `members:write` for admin actions (already partial) |
| `schedule:read` | `/activities`, `/teams` (read) |
| `schedule:write` | `/teams` (manage), training imports |
| `matches:read` | `/matches`, `/live-scores`, `/reports` (read) |
| `matches:write` | match management actions |
| `payments:read` | `/payments`, `/dues` (read) |
| `payments:write` | payment admin actions |
| `partners:read` | `/partners` (read-only portal for external roles) |
| `partners:write` | partner/workflow management |
| `tasks:read` | `/tasks` |
| `tasks:write` | task create/assign (admin/trainer) |
| `settings:write` | `/club-page-admin`, club LLM/settings admin sections |

**Admin / Club Admin:** union of all club permissions (current `ROLE_PERMISSIONS.admin`).

**External roles (default):** `partners:read`, `tasks:read`, communication, dashboard home, settings (self), support — **deny** `members:read`, `schedule:read`, `matches:read`, `payments:read` unless explicitly granted via assignment.

### 4.3 Role → default dashboard menu (target)

| Role | Default private menu |
|------|----------------------|
| Admin / Club Admin | Full menu (current admin list) |
| Trainer | Training, matches, events, messages, tasks, AI, reports (no payments/club page admin) |
| Player / Member | Schedule, matches, events, messages, tasks, shop, AI, reports (self) |
| Staff | Similar to player + any extra assignments |
| Parent | Schedule (child teams), matches, events (RSVP), messages, tasks |
| Sponsor / Supplier / Service Provider / Consultant | Dashboard, partners (contracts/orders), tasks, messages, support |

### 4.4 Central RBAC config (implemented)

```
src/lib/rbac-config.ts            # role × module matrix, access levels, helpers
src/lib/rbac-config.test.ts       # unit tests
src/lib/permissions.ts            # legacy Permission bridge + re-exports
```

**Key helpers (use these in pages — do not duplicate role logic):**

| Helper | Purpose |
|--------|---------|
| `normalizeDashboardRole(raw)` | DB/UI string → `DashboardRole` |
| `resolveDashboardRole(legacy, assignments)` | Effective role from membership + assignments |
| `getModuleAccess(role, module)` | Access level for a module |
| `canAccessModule(role, module)` | Menu + route gate |
| `getVisibleMenuItems(role)` | Ordered sidebar modules |
| `getDataScopeForModule(role, module)` | Query/RLS scope hint |
| `isExternalRole` / `isInternalClubRole` / `isSportsRole` | Role classification |
| `getModuleRoute(role, module)` | Route path or `null` |
| `legacyPermissionsFromRbac(role)` | Bridge to `usePermissions().has()` |

**Access levels:** `none` | `read` | `limited` | `own` | `team` | `assigned` | `full`

**Modules:** `dashboard`, `assets`, `members`, `invites`, `roles`, `trainings`, `matches`, `events`, `reports`, `payments`, `messages`, `tasks`, `partners`, `ai4t`, `club_page`, `club_shop`, `settings`, `support`

### 4.5 Components still planned

```
src/components/auth/require-module.tsx   # route guard via canAccessModule
src/hooks/use-dashboard-nav.ts           # filtered nav from resolveDashboardRole + matrix
```

---

## 5. Files and components to update

| Priority | File | Change |
|----------|------|--------|
| ~~P0~~ | ~~`src/lib/rbac-config.ts`~~ | **Done** — central matrix + helpers |
| P0 | `src/components/auth/require-module.tsx` (new) | Route guard using `canAccessModule` |
| P0 | `src/App.tsx` | Wrap open routes with `RequirePermission` |
| P0 | ~~`src/components/dashboard/DashboardSidebar.tsx`~~ | **Done** — `useDashboardNav()` |
| P0 | ~~`src/components/dashboard/MobileBottomNav.tsx`~~ | **Done** — `useDashboardNav()` |
| P1 | `src/components/layout/DashboardTopBar.tsx` | Unify nav with shared hook; extend role switcher rules |
| P1 | `src/components/layout/AppHeader.tsx` | Unify nav |
| P1 | `src/components/dashboard/DashboardContent.tsx` | Validate `:role` param against allowed personas |
| P1 | `src/pages/Settings.tsx` | `getImpliedRoles` → shared module; source for switcher |
| ~~P1~~ | ~~`src/lib/permissions.ts`~~ | **Done** — bridges matrix; added `events:read`, `events:write`, `reports:read` |
| P2 | `src/pages/Partners.tsx` | Read-only mode for `partners:read` without `partners:write` |
| P2 | Individual pages | Replace ad-hoc `isTrainer` route assumptions with `has()` where read vs write differs |
| P2 | `supabase/migrations/*` | Role-aware SELECT policies or filtered RPCs for matches/events/activities/members |
| P2 | `e2e/protected.spec.ts` | Role fixtures + forbidden-route tests |
| P3 | `PHASE0_RBAC_CHECKLIST.md` | Extend with read-path and external-role rows |

**Do not rewrite:** existing page views (`Members.tsx`, `Matches.tsx`, etc.) — add guards and nav filtering around them.

---

## 6. Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| RLS changes break legitimate access | High | Ship DB policies behind feature flag; staging JWT matrix tests (`src/test/rls.integration.test.ts`) |
| Admin “view as player” break | Medium | Keep perspective switch as **UI-only** overlay; never downgrade real permissions |
| `club_role_assignments` not populated | Medium | Continue merging legacy `club_memberships.role` + `is_club_admin` RPC (already in `usePermissions`) |
| Multi-role users (admin + sponsor) | Medium | Union permissions; menu shows superset; document precedence |
| `RequireTrainer` on `/members` today allows trainers | Low | Align with product: if members page should be admin-only, tighten route + keep trainer read via separate permission |
| Dev bypass `VITE_DEV_UNLOCK_ALL_FEATURES` | High in prod | Already blocked by `npm run guardrails` in production mode — verify CI |
| Sidebar placeholder items without routes | Low | External-role contracts/orders pages may need new routes or deep-links into Partners |

---

## 7. Suggested implementation order

### Phase A — Document & centralize (low risk, no RLS) ✅

1. ✅ `src/lib/rbac-config.ts` — role × module matrix, access levels, helpers.
2. ✅ `src/lib/rbac-config.test.ts` — normalization, baseline, legacy bridge.
3. ✅ `src/lib/permissions.ts` — derives legacy `Permission[]` from matrix.
4. ✅ `src/lib/dashboard-nav.ts` + `src/hooks/use-dashboard-nav.ts` — module → icon/label/route.
5. ✅ `DashboardSidebar.tsx` + `MobileBottomNav.tsx` — dynamic menus from `getSidebarMenuItems()` / `getMobileNavModules()`; hardcoded `roleMenus` removed.
6. ⏳ Route guards via `canAccessModule` in `App.tsx` (Phase B).

### Phase B — Route enforcement (client)

4. Apply `RequirePermission` in `App.tsx` for currently open routes (`/matches`, `/events`, `/activities`, `/reports`, …).
5. Validate `/dashboard/:role` against `getImpliedRoles(membershipRole)` (+ assignments).
6. Fix `service_provider` sidebar key; add `staff` / `parent` / `member` menus.
7. Partners read-only path for external roles.

### Phase C — Page handler audit

8. Walk PHASE0 checklist for **read** handlers (export, roster visibilities).
9. Extend `usePermissions().has()` usage on pages where `isTrainer` is too coarse.

### Phase D — Server enforcement

10. Add role-aware SELECT policies (or RPCs) for members, matches, events, activities.
11. Expand RLS integration tests per role JWT.

### Phase E — QA

12. Manual matrix: sponsor, parent, player, trainer, admin × each route.
13. Playwright role-based route specs.

---

## 8. Quick reference — key file paths

```
src/lib/rbac-config.ts              # Central RBAC matrix + SIDEBAR_MENU_PROFILES
src/lib/dashboard-nav.ts            # Module → icon, label, route
src/hooks/use-dashboard-nav.ts      # Sidebar/mobile nav hook
src/lib/rbac-config.test.ts         # RBAC unit tests
src/lib/permissions.ts              # Legacy Permission bridge
src/lib/club-role-assignments.ts    # Scoped role kinds
src/hooks/use-permissions.ts        # Effective permissions hook
src/hooks/use-active-club.ts        # Club context
src/contexts/AuthContext.tsx        # Auth session
src/App.tsx                         # Route table
src/components/auth/require-role.tsx
src/components/dashboard/DashboardSidebar.tsx
src/components/dashboard/DashboardContent.tsx
src/lib/dashboard-section-visibility.ts
supabase/migrations/..._club_role_assignments.sql
PHASE0_RBAC_CHECKLIST.md
ops/TENANT_ACCESS_MATRIX.md
```

---

---

## 10. Marketplace & external provider portal (2026-07-01)

> **Detailed plan:** [`marketplace-implementation-plan.md`](./marketplace-implementation-plan.md) · **Product IA:** [`marketplace-product-structure.md`](./marketplace-product-structure.md)

### Separation (2026-07-01 update)

| Module | Route | Audience |
|--------|-------|----------|
| **Marketplace** | `/marketplace` (club) · `/partner-marketplace` (partner) | Club admins (procurement) + external providers (portal) |
| **Partners** | `/partners` | Club admins only (active partnership CRM) |
| **Partner Page** | `/supplier-page` | External provider personas only (`supplier_page` module; sidebar label **Partner Page**) |
| **AI 4 T** | `/co-trainer` (club) · `/partner-ai` (partner) | Role-aware copilot; partner Agent has no club training workflows |

Sidebar: **Marketplace** appears **above** **Partners** for club admins. External roles see Marketplace + **Partner Page**; club admin does **not** see Partner Page. Trainers/players/parents see neither marketplace nor partners.

### What existed before

| Asset | Location | Role |
|-------|----------|------|
| Club partner directory | `partners` table + `Partners.tsx` | Admin-managed sponsors/suppliers per club |
| Partner workflows | `partner_contracts`, `partner_invoices`, `partner_tasks` | Club admin operational CRM |
| Public partner strip | `partners.show_on_public_club_page` | Public club page only — not dashboard |
| Tasks / messages / payments | `club_tasks`, `communication`, `payments` | Reusable; linked via `partner_id` where applicable |
| Route guard | `RequireTrainer` on `/partners` | **Blocked external roles** from their own portal |

### What was added

| Layer | Files |
|-------|-------|
| Types & categories | `src/lib/marketplace-models.ts` |
| RBAC / tab profiles | `src/lib/marketplace-access.ts` |
| DB schema + RLS | `supabase/migrations/20260731150000_marketplace_provider_portal.sql` |
| Data hooks | `src/hooks/use-marketplace.ts` |
| Club UI | `src/components/marketplace/club-marketplace-hub.tsx` |
| Provider UI | `src/components/marketplace/provider-marketplace-portal.tsx` |
| Router | `src/pages/Marketplace.tsx` (club hub **or** provider portal) · `src/pages/Partners.tsx` → CRM only |
| Legacy workflows | `src/pages/club-partners-workflow.tsx` |
| Route guards | `RequireModule module="marketplace"` + `RequireModule module="partners"` |
| i18n | `marketplacePage` in `en.ts` / `de.ts` |

### Experience matrix

| Role | `/marketplace` | `/partners` |
|------|----------------|---------------|
| Admin / Club Admin | Club marketplace hub (discover, requests, offers, …) | Partner CRM (directory, engagements, contracts, invoices) |
| Sponsor / Supplier / Service Provider / Consultant | Provider portal | Not permitted |
| Trainer / Player / others | Not permitted | Not permitted |

### Data model (new tables)

- `marketplace_provider_profiles` — global listing owned by `owner_user_id`; optional `partner_id` link to club `partners` row
- `marketplace_requests` — club procurement needs (`club_id`, category, visibility, status)
- `marketplace_offers` — provider proposals on requests
- `marketplace_saved_providers` — club bookmarks

**RLS highlights:** providers CRUD own profile; clubs admin manage requests/saved; active public listings readable by authenticated users; offers visible to provider owner or requesting club admin.

### Public vs dashboard (reinforced)

Public club pages may show partner logos or shop items. Dashboard marketplace uses separate tables and RBAC — **no internal member/training/match data** in provider portal.

### Next marketplace steps

See [`marketplace-implementation-plan.md`](./marketplace-implementation-plan.md) §10. Summary:

1. Provider offer create + club accept/reject flow
2. Save provider + provider card actions wired
3. Accept offer → `partners` / `partner_contracts` bridge
4. Listing moderation UI
5. Messages/documents/reviews integration
6. RLS integration tests + E2E role smoke

---

## 11. Definition of done

### Audit (2026-07-01)

- [x] Existing structure analyzed
- [x] RBAC implementation documented
- [x] Next steps captured in this file

### Central RBAC config (2026-07-01)

- [x] `src/lib/rbac-config.ts` — typed roles, modules, access levels, full matrix
- [x] Helper functions: `canAccessModule`, `getModuleAccess`, `getVisibleMenuItems`, `getDataScopeForModule`, `isExternalRole`, `isInternalClubRole`, `isSportsRole`
- [x] Role normalization with safe unknown-role fallback
- [x] `permissions.ts` bridges matrix → legacy `Permission[]` (no duplicate matrices in pages)
- [x] Unit tests in `src/lib/rbac-config.test.ts`
- [x] Sidebar + mobile nav wired to RBAC (`useDashboardNav`, `SIDEBAR_MENU_PROFILES`)
- [x] `/marketplace` + `/partners` split with separate RBAC modules
- [x] Marketplace provider portal + club discover hub (UI + schema + hooks)
- [x] Club create/publish marketplace requests
- [x] Partner portal routes (`/partner-*`, `/supplier-page`) + `PersonaPortalGate`
- [x] Partner Page admin (`/supplier-page`) — external roles only in sidebar; label **Partner Page**
- [x] Settings persona switch (`switch-dashboard-persona.ts`) + reactive persona hook
- [x] `/partner-ai` partner Agent workspace (no club workflows on partner route)
- [ ] Marketplace offer create/accept end-to-end *(code shipped 2026-07-01 — manual smoke **PARTNER-OPS-002-SMOKE** open)*
- [ ] `DashboardTopBar` / `AppHeader` nav unified with `useDashboardNav`

---

## 12. Persona data scoping — messages & tasks (2026-07-01)

Active **dashboard persona** (`one4team.activeRole` via **`useModuleGateRole`**) now gates **client-side** message and task visibility. Underlying membership admin flag no longer bypasses persona scope in Communication/Tasks.

| Persona | Messages | Tasks | Dashboard upcoming |
|---------|----------|-------|-------------------|
| **Player** | Assigned **team channels** only; no Club General | **Own** assignments only (`scope: "own"`) | Team-scoped sports widgets (unchanged) |
| **Member** | **Announcements** + **Club General**; no team channels/trainers; no team announcements | Same as player if tasks module enabled for member | **Club events** only via **`fetchClubWideDashboardUpcoming`** |
| **Trainer / Admin** | Full staff access per matrix | **All** + manage | Role-aware dashboard (unchanged) |

**Key files:** `club-message-access.ts`, `club-task-access.ts`, `use-club-tasks.ts`, `Communication.tsx`, `Tasks.tsx`, `public-club-messages-hub.tsx`, `rbac-config.ts` (member matrix: `messages: read`, payments hidden).

**Dual-role users:** Must switch persona in **Settings** (`switch-dashboard-persona.ts`) to see player vs member scope.

**Tests:** `club-message-access.test.ts`, `club-task-access.test.ts`, `rbac-config.test.ts`.

**Operator smoke:** **`TASKS.md` → RBAC-PERSONA-SMOKE**.
