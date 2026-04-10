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
echo "📦 Running database migrations..."
# Use the bundled Prisma 5.x CLI — `npx prisma` can resolve to a global Prisma 7+ and break the schema.
./node_modules/.bin/prisma migrate deploy
echo "✅ Migrations complete!"
echo ""
echo "▶️  Starting node dist/index.js..."
echo "================================================"
echo ""

exec node dist/index.js
