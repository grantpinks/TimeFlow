# CASA Tier 2 Evidence Index

**Assessment deadline**: 2026-09-02  
**Google Cloud project**: `joga-bonito-465122`  
**Last updated**: 2026-06-13

---

## Core documents (lab kickoff package)

| Document | Path |
|----------|------|
| System description | `system-description.md` |
| Data classification | `data-classification.md` |
| Encryption statement | `encryption-statement.md` |
| OAuth token lifecycle | `oauth-token-lifecycle.md` |
| Deployment attestation | `deployment-attestation.md` |
| Data storage attestation | `data-storage-attestation.md` |
| Incident response runbook | `incident-response-runbook.md` |
| Vendor list | `../evidence/vendor-list.md` |
| Privacy policy (public) | https://time-flow.app/privacy |

---

## Self-scan results

| Scan | Location |
|------|----------|
| pnpm audit JSON | `self-scan-results/pnpm-audit.json` (CI artifact) |
| Semgrep SARIF | `self-scan-results/semgrep.sarif` (CI artifact) |
| OWASP ZAP baseline | `self-scan-results/zap-baseline-YYYYMMDD.html` (manual) |

Run ZAP: `bash timeflow/scripts/zap-baseline.sh`

---

## Policies

| Policy | Path |
|--------|------|
| Information security | `../policies/information-security-policy.md` |
| Access control | `../policies/access-control-policy.md` |
| Incident response | `../policies/incident-response-policy.md` |
| Data retention | `../policies/data-retention-policy.md` |

---

## Manual evidence (owner action)

| Item | Path |
|------|------|
| MFA screenshots | `evidence/mfa-screenshots/` |
| Access reviews | `../evidence/access-review-log.md` |
| Contact TAC Security | See `../../plans/2026-06-13-casa-tier2-readiness.md` Task 23 |

---

## Implementation plan

Full sprint plan: `../../plans/2026-06-13-casa-tier2-readiness.md`
