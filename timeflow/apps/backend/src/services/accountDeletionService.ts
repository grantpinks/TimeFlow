import type { FastifyBaseLogger } from 'fastify';
import { prisma } from '../config/prisma.js';
import * as authService from './authService.js';
import { getStripeClient } from './stripeService.js';

interface AccountDeletionCleanup {
  googleRefreshTokens: string[];
  stripeSubscriptionId: string | null;
}

async function snapshotExternalCleanupTargets(userId: string): Promise<AccountDeletionCleanup> {
  const [user, googleAccounts] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { googleRefreshToken: true, stripeSubscriptionId: true },
    }),
    prisma.connectedAccount.findMany({
      where: {
        userId,
        provider: 'google',
        googleRefreshToken: { not: null },
      },
      select: { googleRefreshToken: true },
    }),
  ]);

  const googleRefreshTokens = new Set<string>();
  if (user?.googleRefreshToken) {
    googleRefreshTokens.add(user.googleRefreshToken);
  }
  for (const account of googleAccounts) {
    if (account.googleRefreshToken) {
      googleRefreshTokens.add(account.googleRefreshToken);
    }
  }

  return {
    googleRefreshTokens: [...googleRefreshTokens],
    stripeSubscriptionId: user?.stripeSubscriptionId ?? null,
  };
}

async function revokeGoogleTokens(tokens: string[]): Promise<void> {
  await Promise.allSettled(
    tokens.map((token) => authService.revokeGoogleRefreshToken(token))
  );
}

/**
 * Deletes all user-owned rows in FK-safe order, then the User record.
 */
export async function deleteAllUserData(userId: string): Promise<void> {
  await prisma.$transaction(
    async (tx) => {
      await tx.meetingActionToken.deleteMany({
        where: { meeting: { userId } },
      });
      await tx.meeting.deleteMany({ where: { userId } });
      await tx.schedulingLink.deleteMany({ where: { userId } });

      await tx.scheduledTask.deleteMany({
        where: { task: { userId } },
      });
      await tx.task.deleteMany({ where: { userId } });

      await tx.habitCompletion.deleteMany({ where: { userId } });
      await tx.habitActionHistory.deleteMany({ where: { userId } });
      await tx.scheduledHabit.deleteMany({ where: { userId } });
      await tx.habit.deleteMany({ where: { userId } });

      await tx.identityXpEvent.deleteMany({ where: { userId } });
      await tx.identityUnlock.deleteMany({ where: { userId } });
      await tx.identity.deleteMany({ where: { userId } });

      await tx.eventCategorization.deleteMany({ where: { userId } });
      await tx.categoryTrainingProfile.deleteMany({ where: { userId } });
      await tx.category.deleteMany({ where: { userId } });

      await tx.conversationMessage.deleteMany({
        where: { conversation: { userId } },
      });
      await tx.conversation.deleteMany({ where: { userId } });

      await tx.emailCategoryConfig.deleteMany({ where: { userId } });
      await tx.inboxCache.deleteMany({ where: { userId } });
      await tx.emailCategoryOverride.deleteMany({ where: { userId } });
      await tx.emailActionState.deleteMany({ where: { userId } });
      await tx.gmailLabelSyncState.deleteMany({ where: { userId } });

      await tx.assistantMetric.deleteMany({ where: { userId } });
      await tx.appliedSchedule.deleteMany({ where: { userId } });
      await tx.schedulingJob.deleteMany({ where: { userId } });

      await tx.connectedAccount.deleteMany({ where: { userId } });
      await tx.appleCalendarAccount.deleteMany({ where: { userId } });

      await tx.usageLog.deleteMany({ where: { userId } });
      await tx.subscription.deleteMany({ where: { userId } });
      await tx.writingVoiceProfile.deleteMany({ where: { userId } });
      await tx.userRestDay.deleteMany({ where: { userId } });
      await tx.userFlowCustomization.deleteMany({ where: { userId } });

      await tx.user.delete({ where: { id: userId } });
    },
    { timeout: 60_000 }
  );
}

/**
 * Permanently deletes a user account. DB rows are removed first; Google/Stripe
 * cleanup runs afterward so a failed transaction does not strand a revoked account.
 */
export async function deleteUserAccount(
  userId: string,
  log?: FastifyBaseLogger
): Promise<void> {
  const cleanup = await snapshotExternalCleanupTargets(userId);

  await deleteAllUserData(userId);

  await revokeGoogleTokens(cleanup.googleRefreshTokens);

  if (cleanup.stripeSubscriptionId) {
    try {
      await getStripeClient().subscriptions.cancel(cleanup.stripeSubscriptionId);
    } catch (err) {
      log?.warn(
        { err, userId, stripeSubscriptionId: cleanup.stripeSubscriptionId },
        'Stripe subscription cancel failed after account deletion'
      );
    }
  }
}
