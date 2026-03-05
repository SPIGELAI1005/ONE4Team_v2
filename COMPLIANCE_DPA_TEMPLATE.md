# ONE4Team Data Processing Agreement (DPA) Template

## Parties
- Controller (Customer Club/Organization): `<fill>`
- Processor (Service Provider): `SPIGEL AI UG (ONE4Team)`
- Effective date: `<fill>`

## Scope of Processing
- Service: ONE4Team club management SaaS
- Purpose: member management, communication, scheduling, invite/onboarding, operational analytics
- Categories of data subjects:
  - club admins and staff
  - trainers and volunteers
  - players/members
  - parents/guardians (if applicable)
- Categories of personal data:
  - identity/contact data (name, email, phone)
  - membership and role data
  - usage and security metadata (IP/device/user-agent risk signals)
  - optional profile and operational data entered by controller

## Instructions and Lawfulness
- Processor acts only on documented controller instructions.
- Controller remains responsible for legal basis and transparency obligations.

## Security Measures (TOM Summary)
- Access control (role-based access, least privilege)
- Transport encryption and managed database controls
- Tenant isolation and RLS-backed authorization model
- Logging and incident response workflow
- Backup and recovery process

## Subprocessors
| Subprocessor | Purpose | Data Region | Contract Safeguard |
|---|---|---|---|
| Supabase | Database/auth/storage/functions | `<fill>` | DPA + SCC where needed |
| Vercel | App hosting/CDN | `<fill>` | DPA + SCC where needed |
| `<optional>` | `<fill>` | `<fill>` | `<fill>` |

## International Transfers
- Cross-border transfers require lawful transfer mechanisms (for example SCCs).
- Transfer locations and safeguards must be documented in this file before production rollout.

## Data Subject Rights Support
- Processor assists controller with access, rectification, erasure, restriction, and portability requests.
- SLA target for controller support request acknowledgment: `<fill>` business days.

## Incident Notification
- Processor notifies controller without undue delay after becoming aware of a personal-data incident.
- Initial notification target: within `<fill>` hours.

## Retention and Deletion
- Retention follows `COMPLIANCE_DATA_RETENTION_POLICY.md`.
- On termination, processor returns or deletes customer data per controller instruction unless legal retention applies.

## Audit and Evidence
- Controller may request reasonable evidence of controls and compliance.
- Evidence pack source files:
  - `RELEASE_NOTES_PHASE12.md`
  - `ENVIRONMENT_MATRIX.md`
  - `PHASE12_GO_NO_GO_CHECKLIST.md`

## Signatures
- Controller representative: `<fill>`
- Processor representative: `<fill>`
- Signature date: `<fill>`
