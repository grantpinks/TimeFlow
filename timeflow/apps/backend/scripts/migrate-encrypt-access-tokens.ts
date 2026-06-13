/**
 * One-off migration: encrypt plaintext Google access tokens at rest.
 *
 * Usage (from apps/backend, with DATABASE_URL + ENCRYPTION_KEY):
 *   pnpm exec tsx scripts/migrate-encrypt-access-tokens.ts
 *   pnpm exec tsx scripts/migrate-encrypt-access-tokens.ts --dry-run
 */

import 'dotenv/config';
import { prisma } from '../src/config/prisma.js';
import { encrypt, isEncryptedTokenFormat } from '../src/utils/crypto.js';

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  let userUpdated = 0;
  let accountUpdated = 0;

  const users = await prisma.user.findMany({
    where: { googleAccessToken: { not: null } },
    select: { id: true, googleAccessToken: true },
  });

  for (const user of users) {
    const token = user.googleAccessToken;
    if (!token || isEncryptedTokenFormat(token)) continue;

    const encrypted = encrypt(token);
    if (!encrypted) continue;

    if (dryRun) {
      console.log(`[dry-run] would encrypt User.googleAccessToken id=${user.id}`);
    } else {
      await prisma.user.update({
        where: { id: user.id },
        data: { googleAccessToken: encrypted },
      });
    }
    userUpdated += 1;
  }

  const accounts = await prisma.connectedAccount.findMany({
    where: { googleAccessToken: { not: null } },
    select: { id: true, googleAccessToken: true },
  });

  for (const account of accounts) {
    const token = account.googleAccessToken;
    if (!token || isEncryptedTokenFormat(token)) continue;

    const encrypted = encrypt(token);
    if (!encrypted) continue;

    if (dryRun) {
      console.log(`[dry-run] would encrypt ConnectedAccount.googleAccessToken id=${account.id}`);
    } else {
      await prisma.connectedAccount.update({
        where: { id: account.id },
        data: { googleAccessToken: encrypted },
      });
    }
    accountUpdated += 1;
  }

  console.log(
    `${dryRun ? '[dry-run] ' : ''}Encrypted access tokens — users: ${userUpdated}, connected accounts: ${accountUpdated}`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
