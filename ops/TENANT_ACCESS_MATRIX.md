# Tenant access matrix (ST-001)

High-level expectations for **PostgREST + RLS** (not a substitute for policy review in `supabase/migrations/`).

| Role (app) | `clubs` | `club_memberships` | `matches`, `competitions`, `teams` | `messages` | `billing_*` | Platform admin RPCs |
|------------|---------|---------------------|-------------------------------------|------------|-------------|----------------------|
| Anonymous | public slugs only (if any) | none | none | none | none | denied |
| Member (club A) | read club A; no other tenant | read/write self row in A; **no** other clubs | club_id = A | club_id = A | own club if exposed by RLS | `is_platform_admin` false |
| Trainer/admin (club A) | same club scope | manage roster in A | manage in A | manage in A | admin paths per policy | false |
| Platform admin | via RPC / policies | elevated reads per migration | read aggregates as defined | n/a | reconciliation RPCs | `is_platform_admin` true |

**Forbidden (must hold on staging with real JWTs):**

- Membership JWT for club A must not `select` rows with `club_id = B` on tenant tables.
- Non–platform-admin must not invoke `log_platform_admin_action` successfully (no-op return).

Automated checks: `src/test/rls.integration.test.ts` (env-gated), including a **mutation probe** on `clubs` for club B (staging data must be disposable).

Roster search: `search_club_members_page` uses `is_member_of_club`; matches display name, phone, master first/last name, internal club number (not login email in SQL; email still visible client-side from `list_club_membership_emails` for loaded rows).
