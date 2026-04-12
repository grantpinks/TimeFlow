#!/bin/bash
# fetch-render-logs.sh
# Fetches the latest Render backend logs and writes them to Backend Log Testing.md
#
# SETUP (one-time — already done if you followed the setup steps):
#   export RENDER_API_KEY="rnd_..."
#   export RENDER_SERVICE_ID="srv-d56336m3jp1c73a6mbsg"
#   export RENDER_OWNER_ID="tea-d5631ph5pdvs73cf5420"
#
# USAGE:
#   bash scripts/fetch-render-logs.sh           # pull latest logs once
#   bash scripts/fetch-render-logs.sh --watch   # auto-refresh every 10s (use during deploys)
#   bash scripts/fetch-render-logs.sh --build   # show only build/deploy logs
#   bash scripts/fetch-render-logs.sh --lines 200  # show more lines (default: 100)

set -e

RENDER_API_KEY="${RENDER_API_KEY:-}"
RENDER_SERVICE_ID="${RENDER_SERVICE_ID:-srv-d56336m3jp1c73a6mbsg}"
RENDER_OWNER_ID="${RENDER_OWNER_ID:-tea-d5631ph5pdvs73cf5420}"
OUTPUT_FILE="Backend Log Testing.md"
WATCH_MODE=false
BUILD_ONLY=false
LINES=100

# Parse args
while [[ $# -gt 0 ]]; do
  case $1 in
    --watch) WATCH_MODE=true; shift ;;
    --build) BUILD_ONLY=true; shift ;;
    --lines) LINES="$2"; shift 2 ;;
    *) shift ;;
  esac
done

if [[ -z "$RENDER_API_KEY" ]]; then
  echo "❌ RENDER_API_KEY is not set."
  echo "   Get one at: https://dashboard.render.com/u/settings"
  echo "   Then: export RENDER_API_KEY=\"rnd_...\""
  exit 1
fi

strip_ansi() {
  # Remove ANSI escape codes so logs are readable in the markdown file
  sed 's/\x1b\[[0-9;]*[a-zA-Z]//g; s/\x1b([A-Z]//g; s/\x1b\[[0-9]*m//g'
}

fetch_logs() {
  # Get latest deploy status
  DEPLOY_JSON=$(curl -sf \
    "https://api.render.com/v1/services/${RENDER_SERVICE_ID}/deploys?limit=1" \
    -H "Authorization: Bearer ${RENDER_API_KEY}" \
    -H "Accept: application/json")

  DEPLOY_STATUS=$(echo "$DEPLOY_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['deploy']['status'])" 2>/dev/null || echo "unknown")
  DEPLOY_COMMIT=$(echo "$DEPLOY_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['deploy']['commit']['id'][:8])" 2>/dev/null || echo "unknown")
  DEPLOY_MSG=$(echo "$DEPLOY_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['deploy']['commit']['message'].split('\n')[0][:60])" 2>/dev/null || echo "")

  # Fetch runtime logs
  LOGS_JSON=$(curl -sf \
    "https://api.render.com/v1/logs?ownerId=${RENDER_OWNER_ID}&resource=${RENDER_SERVICE_ID}&limit=${LINES}" \
    -H "Authorization: Bearer ${RENDER_API_KEY}" \
    -H "Accept: application/json")

  LOGS=$(echo "$LOGS_JSON" | python3 -c "
import sys, json
data = json.load(sys.stdin)
logs = data.get('logs', [])
for entry in reversed(logs):
    ts = entry.get('timestamp', '')[:19].replace('T', ' ')
    msg = entry.get('message', '')
    print(f'{ts}  {msg}')
" 2>/dev/null | strip_ansi)

  if [[ -z "$LOGS" ]]; then
    LOGS="(no logs returned)"
  fi

  # Status emoji
  case "$DEPLOY_STATUS" in
    live) STATUS_ICON="🟢 LIVE" ;;
    build_failed) STATUS_ICON="🔴 BUILD FAILED" ;;
    building|update_in_progress) STATUS_ICON="🟡 BUILDING..." ;;
    *) STATUS_ICON="⚪ $DEPLOY_STATUS" ;;
  esac

  # Write to file
  {
    echo "# Render Backend Logs"
    echo "**Status:** $STATUS_ICON  |  **Commit:** \`$DEPLOY_COMMIT\`"
    echo "**Message:** $DEPLOY_MSG"
    echo "**Fetched:** $(date '+%Y-%m-%d %H:%M:%S')"
    echo ""
    echo '```'
    echo "$LOGS"
    echo '```'
  } > "$OUTPUT_FILE"

  echo "$STATUS_ICON  |  commit: $DEPLOY_COMMIT  |  $DEPLOY_MSG"
  echo "✅ Written to $OUTPUT_FILE"
}

if [[ "$WATCH_MODE" == true ]]; then
  echo "👀 Watch mode — refreshing every 10s. Ctrl+C to stop."
  echo ""
  while true; do
    fetch_logs
    echo "--- refreshing in 10s ---"
    sleep 10
  done
else
  fetch_logs
fi
