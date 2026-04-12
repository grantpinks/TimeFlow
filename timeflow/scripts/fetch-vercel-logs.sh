#!/bin/bash
# fetch-vercel-logs.sh
# Fetches the latest Vercel deployment build logs and writes them to Vercel Log Testing.md
#
# SETUP (one-time):
#   1. Go to https://vercel.com/account/tokens → Create Token → name it "cursor-dev"
#   2. Run:
#        echo 'export VERCEL_TOKEN="your_token_here"' >> ~/.zshrc
#        source ~/.zshrc
#
# USAGE:
#   bash scripts/fetch-vercel-logs.sh           # pull latest deployment logs once
#   bash scripts/fetch-vercel-logs.sh --watch   # auto-refresh every 10s (use during deploys)
#   bash scripts/fetch-vercel-logs.sh --lines 200

set -e

VERCEL_TOKEN="${VERCEL_TOKEN:-}"
OUTPUT_FILE="Vercel Log Testing.md"
WATCH_MODE=false
LINES=100

while [[ $# -gt 0 ]]; do
  case $1 in
    --watch) WATCH_MODE=true; shift ;;
    --lines) LINES="$2"; shift 2 ;;
    *) shift ;;
  esac
done

if [[ -z "$VERCEL_TOKEN" ]]; then
  echo "❌ VERCEL_TOKEN is not set."
  echo "   Get one at: https://vercel.com/account/tokens"
  echo "   Then: export VERCEL_TOKEN=\"your_token_here\""
  echo "   And:  source ~/.zshrc"
  exit 1
fi

fetch_logs() {
  # 1. Find the timeflow project
  PROJECT_JSON=$(curl -sf \
    "https://api.vercel.com/v9/projects?limit=20" \
    -H "Authorization: Bearer ${VERCEL_TOKEN}" \
    -H "Accept: application/json")

  PROJECT_ID=$(echo "$PROJECT_JSON" | python3 -c "
import sys, json
data = json.load(sys.stdin)
projects = data.get('projects', [])
for p in projects:
    if 'timeflow' in p.get('name', '').lower() or 'time-flow' in p.get('name', '').lower():
        print(p['id'])
        break
" 2>/dev/null)

  if [[ -z "$PROJECT_ID" ]]; then
    echo "❌ Could not find timeflow project. Projects found:"
    echo "$PROJECT_JSON" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for p in data.get('projects', []):
    print('  -', p.get('name'), '→', p.get('id'))
" 2>/dev/null
    exit 1
  fi

  # 2. Get the latest deployment
  DEPLOY_JSON=$(curl -sf \
    "https://api.vercel.com/v6/deployments?projectId=${PROJECT_ID}&limit=1&target=production" \
    -H "Authorization: Bearer ${VERCEL_TOKEN}" \
    -H "Accept: application/json")

  DEPLOY_ID=$(echo "$DEPLOY_JSON" | python3 -c "
import sys, json
data = json.load(sys.stdin)
deps = data.get('deployments', [])
if deps: print(deps[0]['uid'])
" 2>/dev/null)

  DEPLOY_STATE=$(echo "$DEPLOY_JSON" | python3 -c "
import sys, json
data = json.load(sys.stdin)
deps = data.get('deployments', [])
if deps: print(deps[0].get('state', 'unknown'))
" 2>/dev/null)

  DEPLOY_URL=$(echo "$DEPLOY_JSON" | python3 -c "
import sys, json
data = json.load(sys.stdin)
deps = data.get('deployments', [])
if deps: print(deps[0].get('url', ''))
" 2>/dev/null)

  DEPLOY_COMMIT=$(echo "$DEPLOY_JSON" | python3 -c "
import sys, json
data = json.load(sys.stdin)
deps = data.get('deployments', [])
if deps:
    meta = deps[0].get('meta', {})
    sha = meta.get('githubCommitSha', '')
    msg = meta.get('githubCommitMessage', '').split('\n')[0][:60]
    print(f'{sha[:8]}  {msg}')
" 2>/dev/null)

  if [[ -z "$DEPLOY_ID" ]]; then
    echo "❌ Could not find a deployment for project $PROJECT_ID"
    exit 1
  fi

  # 3. Get build logs for that deployment
  LOGS_JSON=$(curl -sf \
    "https://api.vercel.com/v2/deployments/${DEPLOY_ID}/events?limit=${LINES}&direction=backward" \
    -H "Authorization: Bearer ${VERCEL_TOKEN}" \
    -H "Accept: application/json")

  LOGS=$(echo "$LOGS_JSON" | python3 -c "
import sys, json
data = json.load(sys.stdin)
# events is a list of log objects
if isinstance(data, list):
    events = data
else:
    events = data.get('events', [])
for e in events:
    ts_ms = e.get('created', 0)
    from datetime import datetime, timezone
    ts = datetime.fromtimestamp(ts_ms/1000, tz=timezone.utc).strftime('%Y-%m-%d %H:%M:%S')
    text = e.get('text', e.get('payload', {}).get('text', ''))
    if text:
        print(f'{ts}  {text}')
" 2>/dev/null)

  if [[ -z "$LOGS" ]]; then
    LOGS="(no log events returned — deployment may not have build logs available)"
  fi

  # Status emoji
  case "$DEPLOY_STATE" in
    READY) STATUS_ICON="🟢 READY" ;;
    ERROR) STATUS_ICON="🔴 ERROR" ;;
    BUILDING) STATUS_ICON="🟡 BUILDING..." ;;
    CANCELED) STATUS_ICON="⚫ CANCELED" ;;
    *) STATUS_ICON="⚪ $DEPLOY_STATE" ;;
  esac

  {
    echo "# Vercel Deployment Logs"
    echo "**Status:** $STATUS_ICON  |  **Commit:** \`$DEPLOY_COMMIT\`"
    echo "**URL:** https://$DEPLOY_URL"
    echo "**Fetched:** $(date '+%Y-%m-%d %H:%M:%S')"
    echo ""
    echo '```'
    echo "$LOGS"
    echo '```'
  } > "$OUTPUT_FILE"

  echo "$STATUS_ICON  |  $DEPLOY_COMMIT"
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
