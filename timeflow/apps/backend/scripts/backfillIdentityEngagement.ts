/**
 * One-off backfill: set Identity.completionCountTotal and milestoneTier from
 * historical completed tasks + habit completions, then recompute streaks per user.
 *
 * Usage (from apps/backend, with DATABASE_URL):
 *   pnpm exec tsx scripts/backfillIdentityEngagement.ts
 *   pnpm exec tsx scripts/backfillIdentityEngagement.ts --dry-run
 */

import 'dotenv/config';
import { prisma } from '../src/config/prisma.js';
import * as identityEngagementService from '../src/services/identityEngagementService.js';

function tierFromCompletionCount(total: number): 0 | 25 | 50 | 100 {
  if (total >= 100) return 100;
  if (total >= 50) return 50;
  if (total >= 25) return 25;
  return 0;
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');

  const identities = await prisma.identity.findMany({
    select: { id: true, userId: true },
  });

  for (const { id, userId } of identities) {
    const taskCount = await prisma.task.count({
      where: { identityId: id, status: 'completed' },
    });
    const habitCount = await prisma.habitCompletion.count({
      where: { status: 'completed', habit: { identityId: id } },
    });
    const total = taskCount + habitCount;
    const tier = tierFromCompletionCount(total);

    if (dryRun) {
      console.log(
        `[dry-run] identity ${id} user=${userId} tasks=${taskCount} habits=${habitCount} total=${total} tier=${tier}`
      );
      continue;
    }

    await prisma.identity.update({
      where: { id },
      data: {
        completionCountTotal: total,
        milestoneTier: tier,
      },
    });
  }

  const userIds = [...new Set(identities.map((i) => i.userId))];
  for (const userId of userIds) {
    if (dryRun) {
      console.log(`[dry-run] would recompute streaks for user ${userId}`);
      continue;
    }
    await identityEngagementService.recomputeAllStreaksForUser(userId);
  }

  if (!dryRun) {
    console.log(`Updated ${identities.length} identities; recomputed streaks for ${userIds.length} users.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
