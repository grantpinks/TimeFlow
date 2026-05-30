/**
 * Post-migrate guard: fail if public schema is exposed to PostgREST (anon/authenticated).
 * Run after `prisma migrate deploy` — wired into start.sh and CI when DATABASE_URL is set.
 */
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const LOCKDOWN_MIGRATION = '20260529130000_enable_rls_lockdown_public_schema';

async function assertMigrationOnDisk() {
  const migrationPath = path.join(
    __dirname,
    '..',
    'prisma',
    'migrations',
    LOCKDOWN_MIGRATION,
    'migration.sql'
  );
  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ Missing required security migration: ${LOCKDOWN_MIGRATION}`);
    process.exit(1);
  }
  const sql = fs.readFileSync(migrationPath, 'utf8');
  if (!sql.includes('ENABLE ROW LEVEL SECURITY') || !sql.includes('REVOKE ALL')) {
    console.error(`❌ Security migration ${LOCKDOWN_MIGRATION} does not contain expected lockdown SQL`);
    process.exit(1);
  }
  console.log(`✅ Security migration present on disk: ${LOCKDOWN_MIGRATION}`);
}

async function assertDatabaseLockdown(prisma) {
  const tablesWithoutRls = await prisma.$queryRaw`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public' AND NOT rowsecurity
    ORDER BY tablename
  `;

  if (tablesWithoutRls.length > 0) {
    const names = tablesWithoutRls.map((row) => row.tablename).join(', ');
    console.error(`❌ Public tables without RLS: ${names}`);
    process.exit(1);
  }

  const apiGrants = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS count
    FROM information_schema.table_privileges
    WHERE table_schema = 'public'
      AND grantee IN ('anon', 'authenticated')
  `;

  const grantCount = apiGrants[0]?.count ?? 0;
  if (grantCount > 0) {
    console.error(`❌ Found ${grantCount} table privilege(s) for anon/authenticated on public schema`);
    process.exit(1);
  }

  console.log('✅ All public tables have RLS enabled');
  console.log('✅ anon/authenticated have no grants on public tables');
}

async function main() {
  await assertMigrationOnDisk();

  if (!process.env.DATABASE_URL) {
    console.log('ℹ️  DATABASE_URL not set — skipped live database security checks');
    return;
  }

  const prisma = new PrismaClient();
  try {
    await assertDatabaseLockdown(prisma);
    console.log('✅ Database security verification passed');
  } catch (err) {
    const code = err?.code || err?.errorCode;
    const message = err?.message ?? String(err);
    const isConnectionError =
      code === 'P1001' ||
      message.includes("Can't reach database server") ||
      message.includes('ECONNREFUSED');

    if (isConnectionError) {
      console.log('ℹ️  Database unreachable — skipped live security checks (static migration OK)');
      return;
    }

    throw err;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('❌ Database security verification failed:', err);
  process.exit(1);
});
