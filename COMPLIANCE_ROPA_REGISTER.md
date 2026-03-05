# ONE4Team ROPA Register (Processing Activities)

## Instructions
- Maintain one row per processing activity.
- Update in the same PR as schema or feature changes.
- Keep legal basis and retention aligned with current policies.

| Activity ID | Processing Activity | Data Subjects | Data Categories | Purpose | Legal Basis | Systems/Storage | Recipients/Subprocessors | Retention | Regional Notes | Owner | Last Reviewed |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ROPA-001 | Account authentication and profile management | admins, trainers, members | identity/contact, auth identifiers | account access and security | contract, legitimate interest | Supabase auth + `profiles` | Supabase, Vercel | contract duration + legal obligations | EU/US market usage | `<fill>` | `<fill>` |
| ROPA-002 | Club membership and role assignment | club staff and members | role, club association, status | access control and operations | contract | `club_memberships` | Supabase | contract duration | multi-tenant isolation required | `<fill>` | `<fill>` |
| ROPA-003 | Invite and join request processing | prospective members | name, email, message, request metadata | onboarding and membership approval | contract, legitimate interest | `club_invite_requests`, `club_invites` | Supabase | 12 months / 90 days token lifecycle | anti-abuse controls active | `<fill>` | `<fill>` |
| ROPA-004 | Abuse prevention and rate limiting | requesting users | IP/device/user-agent risk metadata, counters | fraud and abuse prevention | legitimate interest, security | `request_rate_limits`, `abuse_alerts` | Supabase | see retention policy (default 90-180 days) | higher risk; minimize and purge | `<fill>` | `<fill>` |
| ROPA-005 | Club communication and announcements | club members | message content, sender metadata, attachments | team communication | contract | `messages`, `announcements`, storage | Supabase | policy-defined lifecycle | storage policy required | `<fill>` | `<fill>` |
| ROPA-006 | Product telemetry and reliability | authenticated/anonymous users | event names, timestamps, non-sensitive metadata | service quality and funnel analysis | legitimate interest | client telemetry queue + analytics sink | `<fill>` | default 30 days | disable sensitive content capture | `<fill>` | `<fill>` |

## Review Checklist
- [ ] New processing activities added.
- [ ] Legal basis validated with legal/compliance owner.
- [ ] Retention windows mapped to policy.
- [ ] Subprocessor/transfers section current.
