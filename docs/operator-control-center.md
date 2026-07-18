# ONE4Team Control Center

Internal platform administration surface at `/operator` for ONE4Team staff. It is **separate from the club dashboard** and must never be exposed to club admins, trainers, players, parents, or partners through club RBAC.

---

## Purpose

The Control Center lets authorized **platform users** inspect and manage cross-club operations:

- Platform health and onboarding signals
- Club lifecycle and entitlements
- Global module and plan catalog
- Usage analytics and performance/issues overviews
- Platform-wide user lookup
- Audit trail and support workflows

Club users continue to use `/dashboard` and club-scoped routes. Control Center access is granted only via the `platform_users` table.

---

## Platform roles vs club roles

| | Platform roles | Club roles |
|---|---|---|
| **Stored in** | `platform_users` | `club_memberships`, dashboard personas |
| **Examples** | `OWNER`, `OPERATOR`, `SUPPORT`, `VIEWER` | `admin`, `trainer`, `player`, `parent`, partner |
| **Grants `/operator`** | Yes (when `status = ACTIVE`) | **Never** |
| **Grants club dashboard** | Only if they also have memberships | Yes |

A user can hold both a platform role and club memberships, but **club admin does not imply operator access**.

Legacy `/platform-admin` redirects to `/operator`. New work should use `platform_users`, not `platform_admins`.

---

## Route structure

All routes mount under `OperatorLayout` with nested `RequireOperator` guards in `App.tsx`.

| Route | Page | Required permission |
|---|---|---|
| `/operator` | Overview | `operator.overview.read` |
| `/operator/clubs` | Club directory | `operator.clubs.read` |
| `/operator/clubs/:clubId` | Club detail (tabs) | `operator.clubs.read` |
| `/operator/users` | Platform-wide users | `operator.users.read` |
| `/operator/modules` | Module & plan catalog (+ **Offers** tab for Founding Club / `commercial_offers`) | `operator.modules.read` |
| `/operator/analytics` | Usage analytics | `operator.analytics.read` |
| `/operator/financials` | Platform economics & investment model | `operator.analytics.read` |
| `/operator/marketplace` | Marketplace & partner ecosystem | `operator.analytics.read` |
| `/operator/performance` | Runtime health | `operator.logs.read` |
| `/operator/issues` | Issues & logs | `operator.logs.read` |
| `/operator/audit` | Audit trail | `operator.audit.read` |
| `/operator/support` | Support tools | `operator.support.use` |
| `/operator/legal` | Legal document templates (edit + PDF) | `operator.settings.read` |
| `/operator/settings` | Settings (platform users, placeholders) | `operator.settings.read` |

Shell layout: `OperatorLayout` → `OperatorSidebar` + `OperatorTopBar` + page content. Shared page primitives live in `OperatorPageShell.tsx`.

---

## Permission model

Permissions are defined in `platform_role_permissions` and resolved by `get_current_platform_user()`.

| Role | Summary |
|---|---|
| **OWNER** | All permissions including `operator.access.manage` |
| **OPERATOR** | Manage clubs, modules, plans (matrix), users; no platform access admin |
| **SUPPORT** | Read clubs/users, support tools, audit; no analytics, no module/plan mutations |
| **VIEWER** | Read-mostly including analytics; no support tools, no mutations |

Frontend checks use `hasOperatorPermission()` and `RequireOperator`. **Server-side enforcement** uses `require_platform_permission()` in security-definer RPCs. UI hiding is not sufficient protection.

Key permissions:

- `operator.modules.manage` — club module entitlements (OPERATOR+)
- `operator.plans.manage` — plan-module matrix (OPERATOR+); catalog metadata edits are **OWNER-only** in SQL
- `operator.clubs.manage` — club status/plan controls on club Overview (OPERATOR+)
- `operator.access.manage` — platform user admin (OWNER only; mutations require OWNER even with permission)

---

## Data model

### Core tables

| Table | Purpose |
|---|---|
| `platform_users` | Internal operators linked to `auth.users` |
| `platform_role_permissions` | Role → permission mapping |
| `modules` | Global module registry |
| `plans` | Commercial plan catalog |
| `plan_modules` | Which modules each plan includes |
| `club_module_entitlements` | Per-club overrides and sources |
| `billing_subscriptions` | Active plan key per club (`plan_id` → `plans.key`) |
| `clubs` | Club record including `status` |
| `platform_admin_audit_events` | Audit stream (exposed as `audit_logs` view) |
| `usage_events` | Product usage telemetry |
| `support_notes` | Internal support notes per club |

Direct client access to sensitive tables is denied by RLS; reads and writes go through RPCs.

### Club detail payload

`get_operator_club_detail()` returns club info, plan, metrics, modules (with entitlement metadata), users, usage, recent activity, and audit entries.

---

## Module entitlement logic

Effective module access for a club combines:

1. **Plan inclusion** — modules in `plan_modules` for the club’s active plan (`billing_subscriptions.plan_id`)
2. **Manual overrides** — rows in `club_module_entitlements` with sources such as `MANUAL_OVERRIDE`, `SUPPORT`, `TRIAL`, `PROMOTION`, `SYSTEM`
3. **Module defaults** — `modules.default_enabled` when no override exists

The club detail **Modules** tab shows, per module: enabled state, source, plan inclusion, validity, and last change metadata.

Mutations use `set_operator_club_module_entitlement()`:

- Requires `operator.modules.manage`
- Requires non-empty **reason**
- Confirmation dialog in UI
- **Does not delete** other source rows; upserts on `(club_id, module_id, source)`
- Only **OWNER** can disable **core** modules

---

## Manual override behavior

- Overrides are stored separately by `source` (unique on `club_id`, `module_id`, `source`).
- Changing a club’s **plan** (when implemented) should **not** remove manual override rows.
- After a plan change, effective access may differ from plan inclusion; operators should review the Modules tab.
- Plan catalog changes (`set_platform_plan_module`) affect **future** plan inclusion only; existing override rows remain until explicitly changed.

---

## Audit log behavior

Audit events are written to `platform_admin_audit_events` via `append_audit_log()` and database triggers.

| Action | Trigger / RPC |
|---|---|
| `MODULE_ENABLED` / `MODULE_DISABLED` | `club_module_entitlements` trigger |
| `MODULE_OVERRIDE_UPDATED` | Entitlement metadata changes |
| `PLAN_MODULE_CHANGED` / `PLAN_CHANGED` | Plan catalog / matrix changes |
| `CLUB_STATUS_CHANGED` | `clubs.status` update trigger |
| `PLATFORM_USER_CREATED` / `PLATFORM_USER_DISABLED` | `platform_users` trigger |
| `PLATFORM_USER_ROLE_CHANGED` / `PLATFORM_USER_ENABLED` | Platform user RPCs (`20260801170000`) |
| `SUPPORT_NOTE_*` | Support note RPCs |

Sensitive RPCs should pass a **reason** (module/plan matrix RPCs enforce this). View entries at `/operator/audit` or a club’s Audit tab.

---

## UI conventions

- Page wrapper: `OperatorPageShell` (`max-w-[92rem]`, consistent padding)
- Cards: `OPERATOR_CARD_CLASS` (`min-w-0 border-border/70 bg-card/70`) — grid children shrink on mobile so chart legends and tables do not force horizontal overflow
- Empty states: `OperatorSectionEmptyState` (dashed border)
- Errors: `OperatorPageError` (full-page) or inline destructive banners
- Internal disclaimer: `OperatorInternalBanner` (amber) on sensitive views
- Formatters: `src/lib/operator-formatters.ts` (timestamps, usage event labels, badge variants)

Unauthorized access: `RequireOperator` shows a dedicated blocked state; unauthenticated users redirect to `/auth`.

**No operator links** appear in the club dashboard navigation. Platform users reach `/operator` directly.

On route change, **`OperatorLayout`** resets its inner scroll container to the top (operator pages do not use `window` scroll).

---

## Financials & investment model

Route: **`/operator/financials`** (permission: `operator.analytics.read`).

| Section | Purpose |
|---|---|
| Revenue | MRR, ARR, paying clubs, ARPU from live plan catalog + club billing status |
| Profitability | Monthly cost, net, margin, break-even clubs (from editable cost model) |
| Development investment | Build cost (LOC or man-days), cumulative operating + development spend, net position, break-even month |
| Charts | Cumulative investment vs revenue timeline; monthly fixed-cost pie; revenue-by-plan stacked bar |
| Cost model | Itemized subscriptions (editable names/amounts, add/remove tools), usage drivers, **development effort** fields, comment + save/history (`localStorage`) |

**Development build cost** defaults are anchored on documented codebase size (~84,000 LOC in `src/` per comprehensive audit). Two estimation methods:

1. **Lines of code** — `linesOfCode × costPerLine` (default 84,000 × €3)
2. **Effort** — `personDays × dailyRate` (default 400 man-days × €600; UI labels use **man-days**)

The active method drives the **purple cumulative development line** on the investment timeline. Net position = cumulative revenue − (visible operating spend + visible development). Use **series visibility toggles** above the chart to hide development (net then reflects operating spend only) or operating; legend click still highlights/dims visible series.

Key files: `src/lib/operator-financials.ts`, `src/pages/operator/OperatorFinancials.tsx`, `src/components/operator/OperatorCostModelCard.tsx`, `src/components/operator/charts/*`.

Cost assumptions are **local to the browser** (not synced to Supabase) — suitable for internal planning only.

---

## Legal templates

Route: **`/operator/legal`** (permission: `operator.settings.read`).

- Template picker with category badges (layout handles long titles)
- **Edit** tab for manual body overrides; **Preview** tab with pinned light-surface ink colors (readable in app dark theme)
- PDF export with two-column signature blocks (ONE4Team left, club right)
- Reset to template restores default body

Key files: `src/pages/operator/OperatorLegal.tsx`, `src/components/operator/OperatorLegalDocumentPanel.tsx`, `src/lib/operator-legal-pdf.ts`.

---

## Charts (operator)

Shared chart shell: `OperatorChartCard`. Recharts-based components under `src/components/operator/charts/`:

| Chart | Page | Type |
|---|---|---|
| Club growth | Overview | Area (continuous monthly timeline) |
| Club status | Overview | Pie |
| Active users / module usage | Analytics | Bar |
| Investment vs revenue | Financials | Composed (areas + net line) |
| Monthly cost breakdown | Financials | Pie |
| Revenue by plan | Financials | Stacked bar |

Legend labels use **`--foreground`** text (not slice/series color). Tooltips use popover theme tokens. Legends are clickable to highlight/dim series. **Investment timeline** also exposes **Show lines** toggles (eye icons) to show/hide each series; the **net** line recomputes from currently visible cost lines (hiding development makes net = revenue − operating only).

**Mobile:** Metric grids stack to one column; filter forms stack; wide tables scroll inside the table wrapper; bottom nav scrolls horizontally (13 items). Verify at ~390px width — no card should exceed viewport width.

---

## Recommended QA checklist

See **[operator-control-center-qa.md](./operator-control-center-qa.md)** for manual staging checks:

- Access control by role
- Module toggle and audit verification
- Plan matrix changes
- Read-only role behavior
- Navigation and mobile layout
- Club dashboard regression

Automated tests:

```bash
npm run test -- src/lib/operator-control-center-security.test.ts src/lib/operator-permissions.test.ts src/lib/operator-formatters.test.ts
npm run lint
npm run build
```

---

## Known limitations / future improvements

| Area | Status |
|---|---|
| `/operator/support` | Placeholder — no live support tools |
| `/operator/settings` | Platform Users tab (OWNER manage); Control Center + Data & Security placeholder cards |
| Club status/plan edit on Overview | `set_operator_club_status`, `set_operator_club_plan`, `OperatorClubOverviewControls` |
| Platform user invite | `invite-platform-user` Edge Function + grant-existing-user RPC; deploy function + apply migration |
| Vercel / Sentry monitoring | Performance/Issues pages use placeholders + internal signals |
| Per-club plan change audit | `set_operator_club_plan` writes `PLAN_CHANGED` with reason |
| `RequireOperator` component tests | Covered indirectly via permission/migration tests |
| JWT integration tests for operator RPCs | Env-gated `src/test/operator-access.integration.test.ts` (skipped without env) |

---

## Key source files

| Area | Path |
|---|---|
| Routes & guards | `src/App.tsx`, `src/components/operator/RequireOperator.tsx` |
| Layout | `src/components/operator/OperatorLayout.tsx` |
| Page shell | `src/components/operator/OperatorPageShell.tsx` |
| Permissions | `src/lib/operator-permissions.ts` |
| Navigation | `src/lib/operator-nav.ts` |
| Foundation migration | `supabase/migrations/20260801090000_operator_control_center_foundation.sql` |
| Catalog & audit | `supabase/migrations/20260801093000_platform_catalog_entitlements_audit.sql` |
| Settings & club controls | `supabase/migrations/20260801170000_operator_settings_and_club_controls.sql` |
| Platform user invite | `supabase/functions/invite-platform-user/index.ts` |
| Settings UI | `src/pages/operator/OperatorSettings.tsx`, `src/components/operator/OperatorPlatformUsersTab.tsx` |
| Club overview controls | `src/components/operator/OperatorClubOverviewControls.tsx` |
| Financials | `src/pages/operator/OperatorFinancials.tsx`, `src/lib/operator-financials.ts` |
| Charts | `src/components/operator/charts/` |
| Legal | `src/pages/operator/OperatorLegal.tsx`, `src/lib/operator-legal-templates.ts` |
