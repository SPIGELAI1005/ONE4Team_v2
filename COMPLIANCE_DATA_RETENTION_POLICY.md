# ONE4Team Data Retention and Deletion Policy

## Purpose
Define retention windows and deletion rules for personal and operational data across Germany, EU, and US deployments.

## Principles
- Keep only what is necessary for service delivery, security, and legal obligations.
- Minimize high-risk operational metadata where possible.
- Apply consistent deletion and anonymization workflows.

## Retention Schedule (Default)
| Data Category | Table/Source | Default Retention | Deletion Method | Owner |
|---|---|---|---|---|
| Account + profile data | `profiles`, auth user data | contract duration + legal requirements | account deletion workflow + scheduled cleanup | Product owner |
| Membership and role records | `club_memberships` | contract duration | archive or delete per controller request | Product owner |
| Invite requests | `club_invite_requests` | 12 months | scheduled purge of closed records | Club admin + Ops |
| Invite tokens | `club_invites` | 90 days after expiry/usage | scheduled purge | Ops |
| Member drafts | `club_member_drafts` | 180 days inactive | scheduled purge | Club admin |
| Abuse rate-limit ledger | `request_rate_limits` | 90 days | scheduled purge | Security owner |
| Abuse alerts (resolved) | `abuse_alerts` | 180 days | scheduled purge or anonymize metadata | Security owner |
| App logs/telemetry queue | client/runtime telemetry | 30 days (unless security escalation) | rolling cleanup | Engineering |

## Enforcement
- Weekly scheduled cleanup job must run for:
  - `request_rate_limits`
  - `abuse_alerts` (resolved and older than threshold)
  - expired/used invite records
- Each cleanup run logs:
  - records deleted
  - execution timestamp
  - environment
  - operator/job id

## Legal Hold
- If litigation, regulatory, or formal dispute requires preservation, retention suspension applies to relevant records.
- Legal hold must be documented with owner and expected review date.

## Data Subject Deletion Requests
- Club/controller request is authoritative for member/profile-related data.
- Deletion tickets must include:
  - requester identity
  - data scope
  - completion date
  - exceptions (if legal obligation blocks full deletion)

## Review Cadence
- Quarterly review of retention windows and operational impact.
- Any schema changes adding personal data must update this policy in the same PR.
