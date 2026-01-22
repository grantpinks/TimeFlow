/**
 * Usage Tracking Service (Flow Credits)
 *
 * Tracks and enforces Flow Credits usage for Sprint 18.
 *
 * Credit Costs (from PRICING_MODEL.md):
 * - Simple AI Command: 1 credit
 * - Complex AI Command / Proactive Suggestion: 5 credits
 * - Third-Party Integration Sync: 1 credit
 * - AI Email Summarization/Drafting: 15 credits
 *
 * Monthly Allotments:
 * - FREE: 200 credits
 * - PRO: 2,000 credits
 * - FLOW_STATE: 8,000 credits
 */

import { PrismaClient } from '@prisma/client';
import { PLAN_CREDITS, type PlanTier } from './stripeService';

const prisma = new PrismaClient();

// Credit costs for different actions
export const CREDIT_COSTS = {
  SIMPLE_AI_COMMAND: 1,
  COMPLEX_AI_COMMAND: 5,
  PROACTIVE_SUGGESTION: 5,
  SYNC: 1,
  EMAIL_DRAFT: 15,
  EMAIL_SUMMARY: 10,
} as const;

export type UsageAction = keyof typeof CREDIT_COSTS;

/**
 * Check if user has enough credits for an action
 */
export async function hasCreditsAvailable(
  userId: string,
  action: UsageAction
): Promise<{ allowed: boolean; reason?: string; creditsRemaining?: number }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      planTier: true,
      betaTierOverride: true,
      flowCreditsUsed: true,
      flowCreditsLimit: true,
      creditsResetAt: true,
      billingCycleEnd: true,
    },
  });

  if (!user) {
    return { allowed: false, reason: 'User not found' };
  }

  // Check if credits need to be reset (monthly cycle)
  const now = new Date();
  const resetDate = user.creditsResetAt || user.billingCycleEnd;

  if (resetDate && now >= resetDate) {
    // Reset credits at the start of new billing cycle
    await resetMonthlyCredits(userId);
    return {
      allowed: true,
      creditsRemaining: user.flowCreditsLimit - CREDIT_COSTS[action],
    };
  }

  // Calculate effective tier (beta override takes precedence)
  const effectiveTier = (user.betaTierOverride as PlanTier) || (user.planTier as PlanTier);
  const creditCost = CREDIT_COSTS[action];
  const creditsRemaining = user.flowCreditsLimit - user.flowCreditsUsed;

  if (creditsRemaining < creditCost) {
    return {
      allowed: false,
      reason: `Insufficient credits. You need ${creditCost} credits but only have ${creditsRemaining} remaining.`,
      creditsRemaining,
    };
  }

  return {
    allowed: true,
    creditsRemaining: creditsRemaining - creditCost,
  };
}

/**
 * Track usage and deduct credits
 */
export async function trackUsage(
  userId: string,
  action: UsageAction,
  metadata?: Record<string, any>
): Promise<{ success: boolean; creditsRemaining: number; error?: string }> {
  // Check if user has enough credits
  const creditCheck = await hasCreditsAvailable(userId, action);

  if (!creditCheck.allowed) {
    return {
      success: false,
      creditsRemaining: creditCheck.creditsRemaining || 0,
      error: creditCheck.reason,
    };
  }

  const creditCost = CREDIT_COSTS[action];

  // Deduct credits and log usage in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create usage log
    await tx.usageLog.create({
      data: {
        userId,
        action,
        creditCost,
        metadata: metadata || {},
      },
    });

    // Update user's credit usage
    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: {
        flowCreditsUsed: {
          increment: creditCost,
        },
      },
      select: {
        flowCreditsUsed: true,
        flowCreditsLimit: true,
      },
    });

    return {
      success: true,
      creditsRemaining: updatedUser.flowCreditsLimit - updatedUser.flowCreditsUsed,
    };
  });

  return result;
}

/**
 * Reset monthly credits at the start of a new billing cycle
 */
export async function resetMonthlyCredits(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      planTier: true,
      betaTierOverride: true,
      billingCycleEnd: true,
    },
  });

  if (!user) {
    return;
  }

  // Calculate effective tier
  const effectiveTier = (user.betaTierOverride as PlanTier) || (user.planTier as PlanTier);
  const newLimit = PLAN_CREDITS[effectiveTier];

  // Calculate next reset date (30 days from now)
  const nextResetDate = new Date();
  nextResetDate.setDate(nextResetDate.getDate() + 30);

  await prisma.user.update({
    where: { id: userId },
    data: {
      flowCreditsUsed: 0,
      flowCreditsLimit: newLimit,
      creditsResetAt: user.billingCycleEnd || nextResetDate,
    },
  });
}

/**
 * Get user's current credit usage stats
 */
export async function getCreditUsageStats(userId: string): Promise<{
  used: number;
  limit: number;
  remaining: number;
  percentUsed: number;
  resetDate: Date | null;
  planTier: string;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      planTier: true,
      betaTierOverride: true,
      flowCreditsUsed: true,
      flowCreditsLimit: true,
      creditsResetAt: true,
      billingCycleEnd: true,
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const effectiveTier = user.betaTierOverride || user.planTier;
  const remaining = user.flowCreditsLimit - user.flowCreditsUsed;
  const percentUsed = (user.flowCreditsUsed / user.flowCreditsLimit) * 100;

  return {
    used: user.flowCreditsUsed,
    limit: user.flowCreditsLimit,
    remaining,
    percentUsed: Math.round(percentUsed),
    resetDate: user.creditsResetAt || user.billingCycleEnd,
    planTier: effectiveTier,
  };
}

/**
 * Get usage history for a user
 */
export async function getUsageHistory(
  userId: string,
  limit = 50
): Promise<Array<{
  action: string;
  creditCost: number;
  timestamp: Date;
  metadata?: any;
}>> {
  const logs = await prisma.usageLog.findMany({
    where: { userId },
    orderBy: { timestamp: 'desc' },
    take: limit,
    select: {
      action: true,
      creditCost: true,
      timestamp: true,
      metadata: true,
    },
  });

  return logs;
}

/**
 * Middleware wrapper to track usage before executing a function
 */
export function withUsageTracking<T extends (...args: any[]) => Promise<any>>(
  action: UsageAction,
  fn: T
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    // First argument should be userId
    const userId = args[0] as string;

    // Check and track usage
    const trackingResult = await trackUsage(userId, action, {
      timestamp: new Date().toISOString(),
    });

    if (!trackingResult.success) {
      throw new Error(trackingResult.error || 'Insufficient credits');
    }

    // Execute the function
    return fn(...args);
  }) as T;
}

export default {
  hasCreditsAvailable,
  trackUsage,
  resetMonthlyCredits,
  getCreditUsageStats,
  getUsageHistory,
  withUsageTracking,
  CREDIT_COSTS,
};
