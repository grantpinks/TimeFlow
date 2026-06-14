# Incident Response Policy

**Version**: 1.0  
**Effective date**: 2026-06-13  
**Owner**: Grant Pinkerton  
**Review cadence**: Annually

---

## 1. Purpose

Establish requirements for detecting, responding to, and recovering from security incidents affecting TimeFlow.

---

## 2. Scope

All security events impacting production systems, user data, or OAuth integrations.

---

## 3. Incident definition

A security incident is any event that:

- Compromises confidentiality, integrity, or availability of user data
- Bypasses authentication or authorization controls
- Exposes secrets, tokens, or credentials
- Indicates unauthorized access to production infrastructure

---

## 4. Response requirements

### 4.1 Detection

- Monitor Render/Vercel logs for auth anomalies.
- Review CI security scan failures (Semgrep, pnpm audit).
- Act on user reports to privacy@time-flow.app within 24 hours.

### 4.2 Classification & timing

| Severity | Initial response | User notification |
|----------|------------------|-------------------|
| P0 Critical | 1 hour | Within 72 hours if data affected |
| P1 High | 4 hours | As warranted |
| P2 Medium | 24 hours | If user-impacting |
| P3 Low | Next business cycle | Not required |

### 4.3 Response steps

1. **Identify** — Confirm incident; assign severity.
2. **Contain** — Stop ongoing harm (rotate secrets, block access, disable feature).
3. **Eradicate** — Remove root cause (patch, revoke tokens, redeploy).
4. **Recover** — Restore normal operations; verify integrity.
5. **Learn** — Postmortem with action items.

Detailed procedures: `../casa/incident-response-runbook.md`.

### 4.4 Communication

- Internal: document timeline and decisions in writing.
- External: notify affected users and regulators as required by law.
- Google: report restricted-scope incidents per API Services User Data Policy.

### 4.5 Evidence preservation

- Save relevant logs before rotation/deletion.
- Document actions taken with timestamps.
- Store records under `docs/compliance/evidence/`.

---

## 5. Testing

- Conduct at least one tabletop exercise per quarter.
- Template: `../evidence/incident-tabletop-template.md`.

---

## 6. Related documents

- `../casa/incident-response-runbook.md`
- `information-security-policy.md`
