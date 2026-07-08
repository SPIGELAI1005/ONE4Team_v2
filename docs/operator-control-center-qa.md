# ONE4Team Control Center — QA Checklist

Manual and staging validation for `/operator` (Control Center). Automated coverage lives in `src/lib/operator-*-security.test.ts`, `operator-permissions.test.ts`, and migration contract tests under `src/lib/`.

**Prerequisites**

- Migrations through `20260801160000_operator_performance_issues.sql` applied on staging.
- Test accounts prepared (see [Test accounts](#test-accounts)).
- Browser devtools Network tab open to confirm RPC rejections when UI is bypassed.

**Pass criteria**

- Unauthorized and club-only users never reach operator pages or mutation RPCs.
- Platform roles match the permission matrix below.
- Sensitive mutations always appear in Audit Trail / club audit tab with actor + reason where required.

---

## Test accounts

| Account | Expected access |
|---|---|
| Logged out | Redirect to `/auth?returnTo=...` |
| Club admin (no `platform_users` row) | Blocked at operator shell |
| Trainer / player / parent / partner | Blocked at operator shell |
| Platform VIEWER | Read-only operator pages; no module/plan mutations |
| Platform SUPPORT | Read + support tools; no module/plan mutations |
| Platform OPERATOR | Manage club modules + plan matrix; not catalog owner actions |
| Platform OWNER | Full platform actions |

Create platform users via SQL or future Settings invite flow. Club users must **not** receive a `platform_users` row unless testing that role.

---

## 1. Access control tests

### 1.1 Unauthenticated access

- [ ] Visit `/operator` while logged out → redirect to auth with `returnTo`.
- [ ] Visit `/operator/clubs`, `/operator/users`, `/operator/modules` directly → same redirect.
- [ ] After login as platform user, land on intended operator page.

### 1.2 Club dashboard roles (must fail)

For each account (club admin, trainer, player, parent, partner) **without** a platform row:

- [ ] Navigate to `/operator` → “Operator access required” (not club dashboard).
- [ ] No operator sidebar or overview content visible.
- [ ] RPC probe (devtools): `get_current_platform_user` returns `is_platform_user: false`.
- [ ] RPC probe: `get_operator_platform_overview` returns permission error (`42501`).

### 1.3 Platform role routing

| Route | Permission | VIEWER | SUPPORT | OPERATOR | OWNER |
|---|---|:---:|:---:|:---:|:---:|
| `/operator` | `operator.overview.read` | ✓ | ✓ | ✓ | ✓ |
| `/operator/clubs` | `operator.clubs.read` | ✓ | ✓ | ✓ | ✓ |
| `/operator/users` | `operator.users.read` | ✓ | ✓ | ✓ | ✓ |
| `/operator/modules` | `operator.modules.read` | ✓ | ✓ | ✓ | ✓ |
| `/operator/analytics` | `operator.analytics.read` | ✓ | ✗ | ✓ | ✓ |
| `/operator/financials` | `operator.analytics.read` | ✓ | ✗ | ✓ | ✓ |
| `/operator/marketplace` | `operator.analytics.read` | ✓ | ✗ | ✓ | ✓ |
| `/operator/performance` | `operator.logs.read` | ✓ | ✓ | ✓ | ✓ |
| `/operator/issues` | `operator.logs.read` | ✓ | ✓ | ✓ | ✓ |
| `/operator/audit` | `operator.audit.read` | ✓ | ✓ | ✓ | ✓ |
| `/operator/support` | `operator.support.use` | ✗ | ✓ | ✓ | ✓ |
| `/operator/settings` | `operator.settings.read` | ✓ | ✓ | ✓ | ✓ |

- [ ] Confirm blocked routes show “Operator access required” (not a blank page).
- [ ] Legacy `/platform-admin` redirects to `/operator`.

### 1.4 Disabled platform user

- [ ] Set `platform_users.status = 'DISABLED'` for a test user.
- [ ] User cannot access `/operator` even if they were previously active.

---

## 2. Read-only role tests

### 2.1 Platform VIEWER

- [ ] Can open Overview, Clubs, Users, Modules (read), Analytics, Performance, Issues, Audit, Settings.
- [ ] Cannot open Support Tools (`operator.support.use` missing).
- [ ] Club detail → Modules tab: toggles disabled; tooltip mentions read-only access.
- [ ] Modules & Plans → catalog edit controls hidden (not OWNER).
- [ ] Plan matrix toggles disabled if UI respects `operator.plans.manage` without OWNER catalog edit.
- [ ] Direct RPC (devtools) as VIEWER:
  - [ ] `set_operator_club_module_entitlement` → error `42501`
  - [ ] `set_platform_plan_module` → error `42501`
  - [ ] `upsert_platform_module` → error `42501`

### 2.2 Platform SUPPORT

- [ ] Can open Support Tools and read clubs/users.
- [ ] Cannot open Analytics (unless explicitly granted — default matrix: no).
- [ ] Club detail → Modules tab: read-only (same as VIEWER).
- [ ] Support Notes tab: can create/edit notes per support RPC rules; cannot change module entitlements.
- [ ] RPC probes: module and plan mutation RPCs reject with `42501`.

---

## 3. Club module toggle tests

Path: `/operator/clubs/:clubId` → **Modules** tab.

### 3.1 OPERATOR / OWNER (manage)

- [ ] Toggle non-core module off → confirmation dialog requires reason.
- [ ] Submit with empty reason → client validation error.
- [ ] Submit with reason → success toast; module state updates.
- [ ] Audit Trail shows `MODULE_DISABLED` with reason and club id.
- [ ] Toggle module on → `MODULE_ENABLED` audit entry.

### 3.2 OWNER-only core module rule

- [ ] As OPERATOR: cannot disable a **core** module (toggle disabled or RPC error).
- [ ] As OWNER: can disable core module with reason → audited.

### 3.3 Server-side enforcement (bypass UI)

As VIEWER, call from devtools:

```javascript
await supabase.rpc('set_operator_club_module_entitlement', {
  _club_id: '<club-uuid>',
  _module_id: '<module-uuid>',
  _enabled: false,
  _source: 'MANUAL_OVERRIDE',
  _reason: 'qa probe',
});
```

- [ ] Expect error; no entitlement row change; no audit entry.

---

## 4. Plan change tests

Distinguish **platform catalog plans** vs **per-club plan assignment**.

### 4.1 Platform catalog (Modules & Plans page)

**OWNER**

- [ ] Edit plan metadata → audited (`PLAN_CREATED` / plan update actions).
- [ ] Change plan-module matrix inclusion → confirmation + reason → `PLAN_MODULE_CHANGED` in audit.

**OPERATOR**

- [ ] Can change plan-module matrix (`set_platform_plan_module`) with reason.
- [ ] Cannot create/edit plan records (`upsert_platform_plan` → “Only OWNER…”).

**SUPPORT / VIEWER**

- [ ] Matrix and catalog controls read-only; RPC probes reject.

### 4.2 Per-club plan assignment (Overview tab)

- [ ] Only OWNER/OPERATOR with `operator.clubs.manage` can change club plan.
- [ ] Confirmation dialog shows module inclusion preview; manual overrides preserved.
- [ ] Audit action `PLAN_CHANGED` on club subscription with reason.
- [ ] VIEWER/SUPPORT cannot invoke RPC.

### 4.3 Club status (Overview tab)

- [ ] Status change requires confirmation + reason.
- [ ] Audit action `CLUB_STATUS_CHANGED` with before/after status.
- [ ] RPC rejects unauthorized roles.

---

## 5. Audit log tests

### 5.1 Module entitlements

- [ ] After module toggle, `/operator/audit` lists event with actor email/role.
- [ ] Club detail → Audit tab shows club-scoped entry.
- [ ] Entry includes `before_json` / `after_json` where applicable.

### 5.2 Plan catalog

- [ ] Plan matrix change appears as `PLAN_MODULE_CHANGED` or `PLAN_CHANGED`.
- [ ] Reason from dialog stored on audit row when provided via RPC.

### 5.3 Club status and plan (operator RPCs)

- [ ] `set_operator_club_status` / `set_operator_club_plan` pass reason into audit.
- [ ] Direct `clubs.status` update via service role still triggers `CLUB_STATUS_CHANGED` trigger.

### 5.4 Platform users (`/operator/settings`)

- [ ] OWNER sees grant, invite, role change, enable/disable actions with reason dialogs.
- [ ] OPERATOR with `operator.access.manage` sees read-only table (no mutations).
- [ ] `PLATFORM_USER_CREATED`, `PLATFORM_USER_DISABLED`, `PLATFORM_USER_ROLE_CHANGED`, `PLATFORM_USER_ENABLED` appear in audit.
- [ ] Invite for existing email returns guidance to use “Grant existing user”.

---

## 6. UI navigation tests

- [ ] Operator sidebar lists all nav items for OWNER; SUPPORT lacks Analytics; VIEWER lacks Support.
- [ ] Club dashboard sidebar does **not** link to `/operator`.
- [ ] Operator top bar shows platform context (not club switcher as primary).
- [ ] “Back to clubs” from club detail works.
- [ ] Cross-links: Performance ↔ Issues ↔ Analytics load without permission leaks.
- [ ] Mobile/narrow layout: sidebar collapses; routes still guarded.

---

## 7. Regression tests — normal club dashboard

Ensure Control Center work did not widen club access.

- [ ] Club admin opens `/dashboard` — works; no operator nav.
- [ ] Club admin `/operator` — blocked.
- [ ] Trainer opens `/members`, `/teams` — normal RBAC unchanged.
- [ ] Partner portal routes unchanged.
- [ ] Public club pages (`/club/:slug`) load without auth.
- [ ] `platform_users` RLS: authenticated club user cannot `select` from `platform_users` directly.
- [ ] Club member JWT cannot read another club via operator RPCs (`get_operator_club_detail` for foreign club → permission error).

---

## 8. Optional JWT integration probes

Extend `src/test/rls.integration.test.ts` pattern with env-gated operator cases (staging only):

```bash
RLS_TEST_SUPABASE_URL=... \
RLS_TEST_SUPABASE_ANON_KEY=... \
RLS_TEST_JWT_CLUB_ADMIN=... \
RLS_TEST_JWT_PLATFORM_VIEWER=... \
npm test -- src/test/operator-access.integration.test.ts
```

Suggested cases when file exists:

- Club admin JWT → `get_operator_platform_overview` fails.
- VIEWER JWT → read RPC succeeds; `set_operator_club_module_entitlement` fails.
- OPERATOR JWT → module entitlement RPC succeeds (use disposable test club).

---

## 8. Financials, charts & shell UX (2026-07-08)

Path: **`/operator/financials`**, **`/operator`**, **`/operator/overview`**, **`/operator/analytics`**.

### 8.1 Financials page

- [ ] Revenue cards show MRR/ARR from live clubs + plan catalog (or zero when no paying clubs).
- [ ] Cost model: edit tool name/amount; add/remove tool; save with comment; reload page — saved values persist (`localStorage`).
- [ ] Development section: toggle **By lines of code** vs **By effort**; totals update; summary line shows selected method + € total.
- [ ] Investment timeline shows **Betriebsausgaben**, **Entwicklung** (purple dashed), **Einnahmen**, **Netto** lines.
- [ ] **Show lines** toggles: hide **Entwicklung** → development line disappears; **Netto** Y-axis rescales (net = revenue − operating only).
- [ ] Re-enable **Entwicklung** → net includes development spend again.
- [ ] Legend click still highlights/dims a visible series.
- [ ] Legend text readable in **dark mode** (foreground color, not slice/series color).
- [ ] Hover metric **ⓘ** bubble — full tooltip visible (not clipped by card).
- [ ] Currency icons use **Euro**, not dollar.

### 8.2 Charts (Overview / Analytics)

- [ ] Overview: club growth area spans **all months** (flat segments when no new clubs).
- [ ] Overview: club status pie legend labels readable in dark mode.
- [ ] Analytics: module usage and active users bar charts render; tooltips readable.

### 8.3 Legal page

- [ ] **`/operator/legal`**: select template; Edit tab allows body changes; Preview tab text visible (dark ink on light preview).
- [ ] Signature block: club signature column on the **right** (two-column layout).
- [ ] PDF download renders two-column signatures.

### 8.4 Navigation & scroll

- [ ] Scroll down on Financials; navigate to Clubs via sidebar — new page starts at **top** (not mid-scroll).
- [ ] Repeat for mobile bottom nav.

### 8.5 i18n

- [ ] Switch to DE — financials, performance, issues, audit, support, settings, legal strings translated.
- [ ] Chart axis/tooltip labels localized where applicable.
- [ ] Development effort labels use **man-days** (not person-days) in EN/DE.

### 8.6 Mobile layout (~390px)

- [ ] Overview, Financials, Analytics, Clubs, Users, Audit, Legal, Performance — no horizontal page scroll (cards fit viewport width).
- [ ] Financials cost-breakdown pie and revenue-by-plan bar legends wrap inside card (no card wider than screen).
- [ ] Bottom nav scrolls horizontally; active item visible.
- [ ] Performance **App-Status** metric labels wrap without overlapping icons (DE long labels).

---

## Automated test index

| File | Covers |
|---|---|
| `src/lib/operator-permissions.test.ts` | Role normalization, permission matrix helpers |
| `src/lib/operator-control-center-security.test.ts` | Security matrix, route guards, RPC/audit contracts |
| `src/lib/operator-control-center-migration.test.ts` | Foundation migration, RLS deny, access RPCs |
| `src/lib/operator-club-module-entitlements.test.ts` | Module RPC + audit triggers |
| `src/lib/platform-catalog-schema.test.ts` | Catalog tables + audit actions |
| `src/lib/platform-catalog-admin.test.ts` | Catalog RPC guards + plan-module audit |
| `src/lib/operator-nav.test.ts` | Operator route isolation from club dashboard |
| `src/lib/operator-formatters.test.ts` | Shared formatters and badge variant helpers |
| `src/lib/operator-financials.test.ts` | Revenue/cost model, development cost, investment timeline |

See **[operator-control-center.md](./operator-control-center.md)** for architecture, permissions, and data model context.

```bash
npm run test -- src/lib/operator-control-center-security.test.ts src/lib/operator-permissions.test.ts src/lib/operator-formatters.test.ts
npm run lint
npm run build
```

---

## Known gaps (track before release)

- [ ] `/operator/support` still placeholder — support tools QA blocked.
- [ ] Deploy `20260801170000_operator_settings_and_club_controls.sql` and `invite-platform-user` Edge Function before staging Settings QA.
- [ ] No React component tests for `RequireOperator` — rely on RPC + manual QA.
- [ ] Operator integration tests env-gated — not run in default CI.
