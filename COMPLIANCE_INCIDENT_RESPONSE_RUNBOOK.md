# ONE4Team Incident Response Runbook

## Scope
Security, privacy, availability, and data-integrity incidents affecting ONE4Team environments.

## Severity Matrix
| Severity | Definition | Response Target |
|---|---|---|
| SEV-1 | active breach, major outage, high-risk data exposure | immediate, incident channel in <15 min |
| SEV-2 | significant degradation or policy/security control failure | triage in <60 min |
| SEV-3 | low-impact defect with workaround | same business day |

## Roles
- Incident Commander: `<fill>`
- Security Lead: `<fill>`
- Communications Lead: `<fill>`
- Engineering Lead: `<fill>`
- Compliance/Legal Lead: `<fill>`

## Response Workflow
1. Detect and declare incident with severity.
2. Contain blast radius (disable risky flows, block endpoints, roll back deployment if needed).
3. Investigate root cause and impact scope.
4. Notify internal stakeholders and affected customers when required.
5. Recover service and verify integrity.
6. Publish post-incident review and corrective actions.

## Immediate Playbooks
- Schema drift / rollout failure:
  - stop promotion
  - execute `supabase/PHASE12_VERIFY.sql`
  - rollback migration/deployment as needed
- Abuse escalation spike:
  - inspect `abuse_alerts`
  - increase rate-limit thresholds only through approved change
  - notify affected club operators
- Auth continuity regression:
  - verify protected-route redirect behavior and login return flow
  - deploy hotfix and run continuity e2e suite

## Notification Rules
- Internal: post incident status every 30-60 minutes for SEV-1/SEV-2.
- External customer notice: when data/security/availability impact meets contract or legal threshold.
- Regulatory notice: follow applicable GDPR/US obligations with legal review.

## Evidence and Audit Trail
- Required artifacts:
  - timeline with timestamps
  - systems/data impacted
  - user/customer impact estimate
  - remediation actions
  - prevention actions with owners and dates
- Store references in `RELEASE_NOTES_PHASE12.md` and `PROJECT_STATUS.md`.

## Post-Incident Review Template
- Incident ID:
- Trigger:
- Root cause:
- Impact:
- Detection gap:
- Corrective actions:
- Preventive actions:
- Owner and due dates:
