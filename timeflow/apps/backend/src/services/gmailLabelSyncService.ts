import { google, gmail_v1 } from 'googleapis';
import { EmailCategoryConfig, GmailLabelSyncState } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { getUserOAuth2Client } from '../config/google.js';
import { decrypt, encrypt } from '../utils/crypto.js';
import { env } from '../config/env.js';
import { findClosestGmailColor, getGmailColorByBackground, GmailColor } from '../utils/gmailColors.js';
import { categorizeEmail, normalizeEmailCategoryId } from './emailCategorizationService.js';
import { applyCategoryOverride } from './emailOverrideService.js';

/**
 * Gmail Label Sync Service
 *
 * Sprint 16 Phase A: Manual Gmail label sync
 */

export interface SyncResult {
  success: boolean;
  syncedCategories: number;
  syncedThreads: number;
  errors: string[];
}

async function getGmailClient(userId: string): Promise<gmail_v1.Gmail> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.googleAccessToken) {
    throw new Error('User not authenticated with Google');
  }

  const oauth2Client = getUserOAuth2Client(
    user.googleAccessToken,
    decrypt(user.googleRefreshToken),
    user.googleAccessTokenExpiry?.getTime()
  );

  oauth2Client.on('tokens', async (tokens) => {
    await prisma.user.update({
      where: { id: userId },
      data: {
        googleAccessToken: tokens.access_token ?? user.googleAccessToken,
        googleRefreshToken: encrypt(tokens.refresh_token) ?? user.googleRefreshToken,
        googleAccessTokenExpiry: tokens.expiry_date
          ? new Date(tokens.expiry_date)
          : user.googleAccessTokenExpiry,
      },
    });
  });

  return google.gmail({ version: 'v1', auth: oauth2Client });
}

/**
 * Get or create GmailLabelSyncState for a user
 */
async function getOrCreateSyncState(userId: string): Promise<GmailLabelSyncState> {
  const existing = await prisma.gmailLabelSyncState.findUnique({
    where: { userId },
  });

  if (existing) {
    return existing;
  }

  return prisma.gmailLabelSyncState.create({
    data: {
      userId,
      backfillDays: 7,
      backfillMaxThreads: 100,
    },
  });
}

/**
 * Create or update a Gmail label
 *
 * @returns Gmail label ID or null if creation failed
 */
async function createOrUpdateGmailLabel(
  gmail: gmail_v1.Gmail,
  category: EmailCategoryConfig,
  gmailColor: GmailColor
): Promise<string | null> {
  try {
    const labelName = `TimeFlow/${category.gmailLabelName ?? category.name ?? category.categoryId}`;
    const safeColor =
      getGmailColorByBackground(gmailColor.backgroundColor) ??
      findClosestGmailColor(category.color ?? '#cfe2f3');

    if (safeColor.backgroundColor !== gmailColor.backgroundColor) {
      await prisma.emailCategoryConfig.update({
        where: { id: category.id },
        data: { gmailLabelColor: safeColor.backgroundColor },
      });
    }

    if (category.gmailLabelId) {
      try {
        await gmail.users.labels.get({
          userId: 'me',
          id: category.gmailLabelId,
        });

        const response = await gmail.users.labels.update({
          userId: 'me',
          id: category.gmailLabelId,
          requestBody: {
            name: labelName,
            color: {
              backgroundColor: safeColor.backgroundColor,
              textColor: safeColor.textColor,
            },
            labelListVisibility: 'labelShow',
            messageListVisibility: 'show',
          },
        });

        return response.data.id ?? null;
      } catch (error: any) {
        if (error.code === 404) {
          return null;
        }
        if (String(error.message).includes('allowed color palette')) {
          await prisma.emailCategoryConfig.update({
            where: { id: category.id },
            data: { gmailLabelColor: null },
          });
          const response = await gmail.users.labels.update({
            userId: 'me',
            id: category.gmailLabelId,
            requestBody: {
              name: labelName,
              labelListVisibility: 'labelShow',
              messageListVisibility: 'show',
            },
          });
          return response.data.id ?? null;
        }
        throw error;
      }
    }

    try {
      const response = await gmail.users.labels.create({
        userId: 'me',
        requestBody: {
          name: labelName,
          color: {
            backgroundColor: safeColor.backgroundColor,
            textColor: safeColor.textColor,
          },
          labelListVisibility: 'labelShow',
          messageListVisibility: 'show',
        },
      });

      return response.data.id ?? null;
    } catch (error: any) {
      if (String(error.message).includes('Label name exists')) {
        const existingLabels = await gmail.users.labels.list({ userId: 'me' });
        const match = existingLabels.data.labels?.find((label) => label.name === labelName);
        if (match?.id) {
          await prisma.emailCategoryConfig.update({
            where: { id: category.id },
            data: { gmailLabelId: match.id },
          });
          return match.id;
        }
      }
      if (String(error.message).includes('allowed color palette')) {
        await prisma.emailCategoryConfig.update({
          where: { id: category.id },
          data: { gmailLabelColor: null },
        });
        const response = await gmail.users.labels.create({
          userId: 'me',
          requestBody: {
            name: labelName,
            labelListVisibility: 'labelShow',
            messageListVisibility: 'show',
          },
        });
        return response.data.id ?? null;
      }
      throw error;
    }
  } catch (error: any) {
    if (error?.code === 404) {
      return null;
    }
    console.error(`Error creating/updating label for category ${category.name ?? category.categoryId}:`, error);
    throw error;
  }
}

/**
 * Apply a Gmail label to a thread
 */
async function applyLabelToThread(
  gmail: gmail_v1.Gmail,
  threadId: string,
  labelId: string
): Promise<boolean> {
  try {
    await gmail.users.threads.modify({
      userId: 'me',
      id: threadId,
      requestBody: {
        addLabelIds: [labelId],
      },
    });
    return true;
  } catch (error: any) {
    console.error(`Error applying label to thread ${threadId}:`, error);
    return false;
  }
}

/**
 * Sync Gmail labels for a user's categories
 *
 * Main entry point for manual sync trigger
 */
export async function syncGmailLabels(
  userId: string,
  options?: {
    backfillDays?: number;
    backfillMaxThreads?: number;
    minIntervalMinutes?: number;
  }
): Promise<SyncResult> {
  const result: SyncResult = {
    success: false,
    syncedCategories: 0,
    syncedThreads: 0,
    errors: [],
  };

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        emailCategoryConfigs: {
          where: { gmailSyncEnabled: true },
        },
      },
    });

    if (!user) {
      result.errors.push('User not found');
      return result;
    }

    if (!user.googleRefreshToken || !user.googleAccessToken) {
      result.errors.push('Google account not connected');
      return result;
    }

    const gmail = await getGmailClient(userId);
    const syncState = await getOrCreateSyncState(userId);

    if (options?.minIntervalMinutes && syncState.lastSyncedAt) {
      const elapsedMs = Date.now() - syncState.lastSyncedAt.getTime();
      const minIntervalMs = options.minIntervalMinutes * 60 * 1000;
      if (elapsedMs < minIntervalMs) {
        result.success = true;
        return result;
      }
    }

    for (const category of user.emailCategoryConfigs) {
      try {
        const overrideColor = category.gmailLabelColor;
        const overrideMatch = overrideColor ? getGmailColorByBackground(overrideColor) : undefined;
        const fallbackColor = findClosestGmailColor(category.color ?? '#cfe2f3');
        const gmailColor = overrideMatch ?? fallbackColor;

        if (overrideColor && !overrideMatch) {
          await prisma.emailCategoryConfig.update({
            where: { id: category.id },
            data: { gmailLabelColor: gmailColor.backgroundColor },
          });
        }

        const gmailLabelId = await createOrUpdateGmailLabel(gmail, category, gmailColor);

        if (gmailLabelId === null) {
          await prisma.emailCategoryConfig.update({
            where: { id: category.id },
            data: {
              gmailSyncEnabled: false,
              gmailLabelId: null,
            },
          });
          result.errors.push(
            `Label for category "${category.name ?? category.categoryId}" was deleted from Gmail. Sync disabled.`
          );
          continue;
        }

        await prisma.emailCategoryConfig.update({
          where: { id: category.id },
          data: { gmailLabelId },
        });

        result.syncedCategories++;

        const threadsSynced = await syncThreadsForCategory(
          gmail,
          userId,
          category.categoryId,
          gmailLabelId,
          syncState,
          options
        );
        result.syncedThreads += threadsSynced;
      } catch (error: any) {
        result.errors.push(`Error syncing category "${category.name ?? category.categoryId}": ${error.message}`);
      }
    }

    await prisma.gmailLabelSyncState.update({
      where: { userId },
      data: {
        lastSyncedAt: new Date(),
        lastSyncThreadCount: result.syncedThreads,
        lastSyncError: result.errors.length > 0 ? result.errors.join('; ') : null,
      },
    });

    result.success = result.errors.length === 0;
    return result;
  } catch (error: any) {
    result.errors.push(`Sync failed: ${error.message}`);
    return result;
  }
}

/**
 * Sync threads for a specific category (backfill logic)
 */
async function syncThreadsForCategory(
  gmail: gmail_v1.Gmail,
  userId: string,
  categoryId: string,
  gmailLabelId: string,
  syncState: GmailLabelSyncState,
  options?: {
    backfillDays?: number;
    backfillMaxThreads?: number;
  }
): Promise<number> {
  try {
    const backfillDays = options?.backfillDays ?? syncState.backfillDays;
    const backfillMaxThreads = options?.backfillMaxThreads ?? syncState.backfillMaxThreads;
    const query = `newer_than:${backfillDays}d -in:spam -in:trash`;
    const listResponse = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: Math.min(backfillMaxThreads, 500),
    });

    const messageRefs = listResponse.data.messages || [];
    if (messageRefs.length === 0) {
      return 0;
    }

    const seenThreads = new Set<string>();
    let syncedCount = 0;

    for (const ref of messageRefs) {
      if (!ref.id || syncedCount >= backfillMaxThreads) {
        continue;
      }

      const full = await gmail.users.messages.get({
        userId: 'me',
        id: ref.id,
        format: 'metadata',
        metadataHeaders: ['From', 'Subject', 'Importance'],
      });

      const message = full.data;
      const threadId = message.threadId;
      if (!threadId || seenThreads.has(threadId)) {
        continue;
      }

      const labels = message.labelIds || [];
      const from = message.payload?.headers?.find((h) => h.name?.toLowerCase() === 'from')?.value ?? '';
      const subject = message.payload?.headers?.find((h) => h.name?.toLowerCase() === 'subject')?.value ?? '';
      const snippet = message.snippet ?? '';

      const senderEmail = from.match(/<(.+)>/)?.[1] ?? from;
      const overrideCategory = await applyCategoryOverride(userId, senderEmail, threadId);
      const normalizedOverride = normalizeEmailCategoryId(overrideCategory);
      const categorized = normalizedOverride
        ? normalizedOverride
        : categorizeEmail({
          from,
          subject,
          snippet,
          labels,
        });

      if (categorized !== categoryId) {
        continue;
      }

      const success = await applyLabelToThread(gmail, threadId, gmailLabelId);
      if (success) {
        syncedCount++;
        seenThreads.add(threadId);
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    return syncedCount;
  } catch (error: any) {
    console.error(`Error syncing threads for category ${categoryId}:`, error);
    return 0;
  }
}

/**
 * Sync Gmail labels on inbox fetch (optional, bounded)
 */
export async function syncGmailLabelsOnInboxFetch(userId: string): Promise<void> {
  if (env.GMAIL_SYNC_ON_INBOX_FETCH !== 'true') return;

  try {
    await syncGmailLabels(userId, {
      backfillDays: 1,
      backfillMaxThreads: 25,
      minIntervalMinutes: 10,
    });
  } catch (error) {
    console.error('Inbox fetch Gmail sync failed:', error);
  }
}

/**
 * Remove all TimeFlow labels from Gmail
 *
 * Escape hatch: Allows user to restore pre-TimeFlow state
 */
export async function removeAllTimeFlowLabels(userId: string): Promise<SyncResult> {
  const result: SyncResult = {
    success: false,
    syncedCategories: 0,
    syncedThreads: 0,
    errors: [],
  };

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        emailCategoryConfigs: {
          where: {
            gmailLabelId: { not: null },
          },
        },
      },
    });

    if (!user) {
      result.errors.push('User not found');
      return result;
    }

    if (!user.googleRefreshToken || !user.googleAccessToken) {
      result.errors.push('Google account not connected');
      return result;
    }

    const gmail = await getGmailClient(userId);

    for (const category of user.emailCategoryConfigs) {
      if (!category.gmailLabelId) continue;

      try {
        await gmail.users.labels.delete({
          userId: 'me',
          id: category.gmailLabelId,
        });

        await prisma.emailCategoryConfig.update({
          where: { id: category.id },
          data: {
            gmailLabelId: null,
            gmailSyncEnabled: false,
          },
        });

        result.syncedCategories++;
      } catch (error: any) {
        if (error.code === 404) {
          await prisma.emailCategoryConfig.update({
            where: { id: category.id },
            data: {
              gmailLabelId: null,
              gmailSyncEnabled: false,
            },
          });
          result.syncedCategories++;
        } else {
          result.errors.push(
            `Error deleting label \"${category.name ?? category.categoryId}\": ${error.message}`
          );
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    const syncState = await getOrCreateSyncState(userId);
    await prisma.gmailLabelSyncState.update({
      where: { id: syncState.id },
      data: {
        lastSyncedAt: null,
        lastSyncThreadCount: 0,
        lastSyncError: null,
      },
    });

    result.success = result.errors.length === 0;
    return result;
  } catch (error: any) {
    result.errors.push(`Failed to remove labels: ${error.message}`);
    return result;
  }
}

/**
 * Update sync settings for a user
 */
export async function updateSyncSettings(
  userId: string,
  settings: {
    backfillDays?: number;
    backfillMaxThreads?: number;
  }
): Promise<GmailLabelSyncState> {
  const syncState = await getOrCreateSyncState(userId);

  return prisma.gmailLabelSyncState.update({
    where: { id: syncState.id },
    data: {
      backfillDays: settings.backfillDays ?? syncState.backfillDays,
      backfillMaxThreads: settings.backfillMaxThreads ?? syncState.backfillMaxThreads,
    },
  });
}

/**
 * Get sync status for a user
 */
export async function getSyncStatus(userId: string): Promise<GmailLabelSyncState | null> {
  return prisma.gmailLabelSyncState.findUnique({
    where: { userId },
  });
}
