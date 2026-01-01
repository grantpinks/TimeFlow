/**
 * Email Category Override Service
 *
 * Manages user overrides for email categorization.
 * Overrides take precedence over heuristic-based categorization.
 */

import { prisma } from '../config/prisma.js';

export interface EmailCategoryOverride {
  id: string;
  userId: string;
  overrideType: 'sender' | 'domain' | 'threadId';
  overrideValue: string;
  categoryName: string;
  reason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateOverrideInput {
  userId: string;
  overrideType: 'sender' | 'domain' | 'threadId';
  overrideValue: string;
  categoryName: string;
  reason?: string;
}

/**
 * Get all overrides for a user
 */
export async function getUserOverrides(userId: string): Promise<EmailCategoryOverride[]> {
  return prisma.emailCategoryOverride.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Create a new override (or update if exists)
 */
export async function upsertOverride(input: CreateOverrideInput): Promise<EmailCategoryOverride> {
  return prisma.emailCategoryOverride.upsert({
    where: {
      userId_overrideType_overrideValue: {
        userId: input.userId,
        overrideType: input.overrideType,
        overrideValue: input.overrideValue,
      },
    },
    create: input,
    update: {
      categoryName: input.categoryName,
      reason: input.reason,
    },
  });
}

/**
 * Delete an override by ID
 */
export async function deleteOverride(userId: string, overrideId: string): Promise<void> {
  await prisma.emailCategoryOverride.deleteMany({
    where: {
      id: overrideId,
      userId, // Ensure user owns this override
    },
  });
}

/**
 * Find override for a given email sender
 */
export async function findOverrideForSender(
  userId: string,
  senderEmail: string
): Promise<EmailCategoryOverride | null> {
  // Check for exact sender match first
  const exactMatch = await prisma.emailCategoryOverride.findFirst({
    where: {
      userId,
      overrideType: 'sender',
      overrideValue: senderEmail.toLowerCase(),
    },
  });

  if (exactMatch) return exactMatch;

  // Check for domain match
  const domain = senderEmail.split('@')[1];
  if (domain) {
    const domainMatch = await prisma.emailCategoryOverride.findFirst({
      where: {
        userId,
        overrideType: 'domain',
        overrideValue: domain.toLowerCase(),
      },
    });

    if (domainMatch) return domainMatch;
  }

  return null;
}

/**
 * Find override for a thread ID
 */
export async function findOverrideForThread(
  userId: string,
  threadId: string
): Promise<EmailCategoryOverride | null> {
  return prisma.emailCategoryOverride.findFirst({
    where: {
      userId,
      overrideType: 'threadId',
      overrideValue: threadId,
    },
  });
}

/**
 * Apply overrides to categorize an email
 * Returns category name if override exists, null otherwise
 */
export async function applyCategoryOverride(
  userId: string,
  senderEmail: string,
  threadId?: string
): Promise<string | null> {
  // Check thread override first (most specific)
  if (threadId) {
    const threadOverride = await findOverrideForThread(userId, threadId);
    if (threadOverride) return threadOverride.categoryName;
  }

  // Check sender/domain override
  const senderOverride = await findOverrideForSender(userId, senderEmail);
  if (senderOverride) return senderOverride.categoryName;

  return null;
}
