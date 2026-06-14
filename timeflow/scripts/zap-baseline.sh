#!/usr/bin/env bash
# OWASP ZAP baseline scan against production (CASA self-scan evidence).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="${ROOT}/docs/compliance/casa/self-scan-results"
TARGET="${ZAP_TARGET:-https://time-flow.app}"
REPORT_NAME="zap-baseline-$(date +%Y%m%d).html"

mkdir -p "${OUT_DIR}"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required. Install Docker Desktop and retry." >&2
  exit 1
fi

echo "Running ZAP baseline against ${TARGET}"
echo "Report: ${OUT_DIR}/${REPORT_NAME}"

docker run --rm \
  -v "${OUT_DIR}:/zap/wrk:rw" \
  ghcr.io/zaproxy/zaproxy:stable \
  zap-baseline.py \
  -t "${TARGET}" \
  -r "${REPORT_NAME}"

echo "Done. Open ${OUT_DIR}/${REPORT_NAME} in a browser."
