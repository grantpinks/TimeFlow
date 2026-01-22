#!/usr/bin/env bash

set -euo pipefail

pnpm dev:backend &
pnpm dev:web &
ngrok http 3001
