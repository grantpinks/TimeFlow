# CASA Self-Scan Results

Artifacts from automated and manual security scans for the CASA Tier 2 assessment.

## Automated (CI)

| Scan | Workflow | Artifact |
|------|----------|----------|
| Dependency audit | `.github/workflows/security.yml` + `timeflow/.github/workflows/ci.yml` | `pnpm-audit.json` (uploaded per run) |
| SAST (Semgrep) | `.github/workflows/security.yml` | `semgrep.sarif` (uploaded per run) |

### Dependency audit backlog

`pnpm audit --audit-level=high` currently reports known transitive vulnerabilities (mostly dev tooling and mobile deps). The audit step runs in CI and saves JSON reports; it uses `continue-on-error: true` until the backlog is cleared. Track remediation via Dependabot PRs.

## Manual (before lab kickoff)

### OWASP ZAP baseline

From the repo root:

```bash
bash timeflow/scripts/zap-baseline.sh
```

Or directly:

```bash
docker run --rm -v "$(pwd)/timeflow/docs/compliance/casa/self-scan-results:/zap/wrk:rw" \
  ghcr.io/zaproxy/zaproxy:stable zap-baseline.py \
  -t https://time-flow.app \
  -r "zap-baseline-$(date +%Y%m%d).html"
```

Review and fix all High/Medium findings before contacting TAC Security.
