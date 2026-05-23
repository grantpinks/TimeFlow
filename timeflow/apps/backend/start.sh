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
echo "  SESSION_SECRET: ${SESSION_SECRET:+***SET***}"
echo "  ENCRYPTION_KEY: ${ENCRYPTION_KEY:+***SET***}"
echo ""
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
# Invoke the Prisma 5.x CLI via Node (no reliance on pnpm/npx in PATH at container start).
node ./node_modules/prisma/build/index.js migrate deploy
echo ""
echo "📦 Migration status:"
node ./node_modules/prisma/build/index.js migrate status
echo ""
echo "🔍 Verifying database schema matches deployed code..."
node scripts/verify-db-schema.js
echo "✅ Migrations complete!"
echo ""
echo "▶️  Starting node dist/index.js..."
echo "================================================"
echo ""

exec node dist/index.js
