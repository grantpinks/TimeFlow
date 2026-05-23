#!/bin/bash
set -e

echo "================================================"
echo "🚀 TimeFlow Backend Startup Script"
echo "================================================"
echo ""
echo "📂 Working directory: $(pwd)"
echo "📋 Environment variables:"
echo "  NODE_ENV: ${NODE_ENV:-not set}"
echo "  PORT: ${PORT:-not set}"
echo "  DATABASE_URL: ${DATABASE_URL:+***SET***}"
echo "  DIRECT_URL: ${DIRECT_URL:+***SET*** (used for migrations)}"
echo "  SESSION_SECRET: ${SESSION_SECRET:+***SET***}"
echo "  ENCRYPTION_KEY: ${ENCRYPTION_KEY:+***SET***}"
echo ""

run_prisma_cli() {
  if [ -n "$DIRECT_URL" ]; then
    DATABASE_URL="$DIRECT_URL" node ./node_modules/prisma/build/index.js "$@"
  else
    node ./node_modules/prisma/build/index.js "$@"
  fi
}

run_schema_check() {
  if [ -n "$DIRECT_URL" ]; then
    DATABASE_URL="$DIRECT_URL" node scripts/verify-db-schema.js
  else
    node scripts/verify-db-schema.js
  fi
}

echo "📁 Checking files:"
ls -lh dist/index.js || echo "❌ dist/index.js not found!"
echo ""
echo "🔧 Node version:"
node --version
echo ""
echo "📦 Migration folders on disk (latest 5):"
ls -1 prisma/migrations 2>/dev/null | tail -5 || echo "  (none found)"
echo ""
echo "📦 Running database migrations..."
# Supabase: use DIRECT_URL for DDL when set (pooler can miss or skew migration application).
run_prisma_cli migrate deploy
echo ""
echo "📦 Migration status:"
run_prisma_cli migrate status
echo ""
echo "🔍 Verifying database schema matches deployed code..."
run_schema_check
echo "✅ Migrations complete!"
echo ""
echo "▶️  Starting node dist/index.js..."
echo "================================================"
echo ""

exec node dist/index.js
