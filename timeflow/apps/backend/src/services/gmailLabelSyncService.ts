import { google, gmail_v1 } from 'googleapis';
import { EmailCategoryConfig, GmailLabelSyncState } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { getUserOAuth2Client } from '../config/google.js';
import { decrypt, encrypt } from '../utils/crypto.js';
import { findClosestGmailColor, GmailColor } from '../utils/gmailColors.js';
import { categorizeEmail } from './emailCategorizationService.js';

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
    const labelName = `TimeFlow/${category.name ?? category.categoryId}`;

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
              backgroundColor: gmailColor.backgroundColor,
              textColor: gmailColor.textColor,
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
        throw error;
      }
    }

    const response = await gmail.users.labels.create({
      userId: 'me',
      requestBody: {
        name: labelName,
        color: {
          backgroundColor: gmailColor.backgroundColor,
          textColor: gmailColor.textColor,
        },
        labelListVisibility: 'labelShow',
        messageListVisibility: 'show',
      },
    });

    return response.data.id ?? null;
  } catch (error: any) {
    console.error(`Error creating/updating label for category ${category.name ?? category.categoryId}:`, error);
    return null;
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
export async function syncGmailLabels(userId: string): Promise<SyncResult> {
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

    for (const category of user.emailCategoryConfigs) {
      try {
        const gmailColor = findClosestGmailColor(category.color ?? '#cfe2f3');

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
          syncState
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
  syncState: GmailLabelSyncState
): Promise<number> {
  try {
    const query = `newer_than:${syncState.backfillDays}d -in:spam -in:trash`;
    const listResponse = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: Math.min(syncState.backfillMaxThreads, 500),
    });

    const messageRefs = listResponse.data.messages || [];
    if (messageRefs.length === 0) {
      return 0;
    }

    const seenThreads = new Set<string>();
    let syncedCount = 0;

    for (const ref of messageRefs) {
      if (!ref.id || syncedCount >= syncState.backfillMaxThreads) {
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

      const categorized = categorizeEmail({
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

// Continue to Part 2...
