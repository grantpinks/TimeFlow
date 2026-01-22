#!/usr/bin/env bash

set -euo pipefail

if command -v npx >/dev/null 2>&1; then
  npx kill-port 3001 || true
  npx kill-port 3000 || true
fi

pkill -f "ngrok http 3001" || true
