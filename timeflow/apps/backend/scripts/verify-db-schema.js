/**
 * Post-migrate guard: fail startup if the DB schema does not match deployed code.
 * Prevents serving traffic when Prisma expects columns/tables that migrations did not apply.
 */
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

/** Columns on critical paths — extend when new migrations add required fields. */
const REQUIRED_COLUMNS = [{ table: 'User', column: 'identityEvolutionEnabled' }];

async function main() {
  const migrationsDir = path.join(__dirname, '..', 'prisma', 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    console.error('❌ prisma/migrations directory missing — cannot verify schema');
    process.exit(1);
  }

  const migrationFolders = fs
    .readdirSync(migrationsDir)
    .filter((entry) => fs.statSync(path.join(migrationsDir, entry)).isDirectory())
    .sort();

  if (migrationFolders.length === 0) {
    console.error('❌ No migration folders found');
    process.exit(1);
  }

  const latestExpected = migrationFolders[migrationFolders.length - 1];
  console.log(`📋 Latest expected migration: ${latestExpected} (${migrationFolders.length} on disk)`);

  const prisma = new PrismaClient();
  try {
    const applied = await prisma.$queryRaw`
      SELECT migration_name
      FROM "_prisma_migrations"
      WHERE rolled_back_at IS NULL AND finished_at IS NOT NULL
      ORDER BY finished_at DESC
      LIMIT 1
    `;
    const latestApplied = applied[0]?.migration_name ?? null;
    console.log(`📋 Latest applied migration: ${latestApplied ?? '(none)'}`);

    if (latestApplied !== latestExpected) {
      console.error(
        `❌ Schema drift: code expects "${latestExpected}" but database latest is "${latestApplied ?? 'none'}".`
      );
      console.error('   Re-run: node node_modules/prisma/build/index.js migrate deploy');
      process.exit(1);
    }

    for (const { table, column } of REQUIRED_COLUMNS) {
      try {
        await prisma.$queryRawUnsafe(
          `SELECT "${column}" FROM "${table}" WHERE false`
        );
      } catch (err) {
        console.error(`❌ Missing column "${table}"."${column}" — auth and other flows will fail.`);
        console.error(`   ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    }

    console.log('✅ Database schema verification passed');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('❌ Schema verification failed:', err);
  process.exit(1);
});
