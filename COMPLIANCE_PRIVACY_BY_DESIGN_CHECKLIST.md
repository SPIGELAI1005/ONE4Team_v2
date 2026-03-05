# ONE4Team Privacy by Design Checklist

Use this checklist in every release candidate and any feature touching personal data.

## 1) Data Mapping
- [ ] Data fields are explicitly documented (what, why, where stored).
- [ ] Sensitive/high-risk fields are marked.
- [ ] Data flows across frontend, API/RPC, DB, and third parties are reviewed.

## 2) Minimization and Purpose Limitation
- [ ] Only required fields are collected.
- [ ] Optional fields are clearly marked.
- [ ] No new field is added without a stated purpose.

## 3) Access and Authorization
- [ ] RLS/policy behavior reviewed for new tables/queries.
- [ ] Privileged paths use explicit server-side checks/RPC boundaries.
- [ ] UI controls do not expose unauthorized actions.

## 4) Retention and Deletion
- [ ] Retention window defined in `COMPLIANCE_DATA_RETENTION_POLICY.md`.
- [ ] Deletion/anonymization method documented.
- [ ] Cleanup ownership and schedule defined.

## 5) Security Controls
- [ ] Input validation and abuse controls updated where relevant.
- [ ] Error handling avoids exposing sensitive internals.
- [ ] Logging avoids unnecessary personal data leakage.

## 6) User Transparency
- [ ] Privacy notice/legal text updated if processing changed.
- [ ] User-facing copy explains critical processing (for example join/invite implications).
- [ ] Consent/legal-basis impact reviewed.

## 7) Regional Impact
- [ ] Germany/EU review: GDPR and contractual safeguards checked.
- [ ] US review: youth-data/COPPA impact assessed if applicable.
- [ ] Cross-border transfer implications reviewed.

## 8) Evidence
- [ ] Checklist completion stored with release notes.
- [ ] Reviewer and date recorded.
- [ ] Open risks explicitly waived with owner sign-off.
