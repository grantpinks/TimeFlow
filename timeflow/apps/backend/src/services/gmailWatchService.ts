import { google, gmail_v1 } from 'googleapis';
import { prisma } from '../config/prisma.js';
import { getUserOAuth2Client } from '../config/google.js';
import { decrypt, encrypt } from '../utils/crypto.js';
import { normalizeEmailCategoryId, scoreEmailCategoryWithFallback } from './emailCategorizationService.js';
import { applyCategoryOverride } from './emailOverrideService.js';
import { createOrUpdateGmailLabel, syncGmailLabels } from './gmailLabelSyncService.js';
import { findClosestGmailColor, getGmailColorByBackground } from '../utils/gmailColors.js';

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

async function getOrCreateSyncState(userId: string) {
  const existing = await prisma.gmailLabelSyncState.findUnique({ where: { userId } });
  if (existing) return existing;
  return prisma.gmailLabelSyncState.create({
    data: {
      userId,
      backfillDays: 7,
      backfillMaxThreads: 100,
    },
  });
}

export async function startGmailWatch(
  userId: string,
  options: { topicName: string; labelIds?: string[] }
) {
  const { topicName, labelIds } = options;
  if (!topicName) {
    throw new Error('Pub/Sub topic name is required');
  }

  const gmail = await getGmailClient(userId);
  await getOrCreateSyncState(userId);

  const response = await gmail.users.watch({
    userId: 'me',
    requestBody: {
      topicName,
      labelIds: labelIds ?? ['INBOX'],
    },
  });

  const historyId = response.data.historyId ?? null;
  const expirationMs = response.data.expiration ? Number(response.data.expiration) : null;
  const watchExpiration = expirationMs ? new Date(expirationMs) : null;

  return prisma.gmailLabelSyncState.update({
    where: { userId },
    data: {
      watchEnabled: true,
      watchResourceId: response.data.id ?? null,
      watchTopicName: topicName,
      lastHistoryId: historyId,
      watchExpiration,
    },
  });
}

export async function stopGmailWatch(userId: string) {
  const gmail = await getGmailClient(userId);
  await gmail.users.stop({ userId: 'me' });

  await getOrCreateSyncState(userId);
  return prisma.gmailLabelSyncState.update({
    where: { userId },
    data: {
      watchEnabled: false,
      watchResourceId: null,
      watchExpiration: null,
    },
  });
}

export async function syncFromHistory(userId: string, incomingHistoryId: string) {
  const syncState = await getOrCreateSyncState(userId);
  if (syncState.lastHistoryId) {
    const previous = BigInt(syncState.lastHistoryId);
    if (BigInt(incomingHistoryId) <= previous) {
      return { processedThreads: 0, skipped: true };
    }
  }

  const gmail = await getGmailClient(userId);
  const startHistoryId = syncState.lastHistoryId ?? incomingHistoryId;
  const threadIds = new Set<string>();
  let pageToken: string | undefined;

  try {
    do {
      const response = await gmail.users.history.list({
        userId: 'me',
        startHistoryId,
        historyTypes: ['messageAdded'],
        pageToken,
      });

      const history = response.data.history ?? [];
      for (const record of history) {
        for (const messageAdded of record.messagesAdded ?? []) {
          const threadId = messageAdded.message?.threadId;
          if (threadId) {
            threadIds.add(threadId);
          }
        }
      }

      pageToken = response.data.nextPageToken ?? undefined;
    } while (pageToken);
  } catch (error: any) {
    if (error?.code === 404 || String(error?.message ?? '').includes('HistoryId')) {
      await syncGmailLabels(userId, { backfillDays: 1, backfillMaxThreads: 25 });
      await prisma.gmailLabelSyncState.update({
        where: { userId },
        data: { lastHistoryId: incomingHistoryId },
      });
      return { processedThreads: 0, fallback: true };
    }
    throw error;
  }

  if (threadIds.size === 0) {
    await prisma.gmailLabelSyncState.update({
      where: { userId },
      data: { lastHistoryId: incomingHistoryId },
    });
    return { processedThreads: 0 };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      emailCategoryConfigs: {
        where: { gmailSyncEnabled: true },
      },
    },
  });

  if (!user) {
    return { processedThreads: 0 };
  }

  const categoryById = new Map(
    user.emailCategoryConfigs.map((category) => [category.categoryId, category])
  );

  for (const threadId of threadIds) {
    const thread = await gmail.users.threads.get({
      userId: 'me',
      id: threadId,
      format: 'metadata',
      metadataHeaders: ['From', 'Subject'],
    });

    const message = thread.data.messages?.[0];
    if (!message) continue;

    const labels = message.labelIds ?? [];
    const from = message.payload?.headers?.find((h) => h.name?.toLowerCase() === 'from')?.value ?? '';
    const subject = message.payload?.headers?.find((h) => h.name?.toLowerCase() === 'subject')?.value ?? '';
    const snippet = message.snippet ?? '';
    const senderEmail = from.match(/<(.+)>/)?.[1] ?? from;

    const overrideCategory = senderEmail
      ? await applyCategoryOverride(userId, senderEmail, threadId)
      : null;

    const normalizedOverride = normalizeEmailCategoryId(overrideCategory);
    const categorized = normalizedOverride
      ? normalizedOverride
      : (
          await scoreEmailCategoryWithFallback({
            from,
            subject,
            snippet,
            labels,
          })
        ).category;

    const categoryConfig = categoryById.get(categorized);
    if (!categoryConfig) continue;

    const overrideColor = categoryConfig.gmailLabelColor;
    const overrideMatch = overrideColor ? getGmailColorByBackground(overrideColor) : undefined;
    const gmailColor = overrideMatch ?? findClosestGmailColor(categoryConfig.color ?? '#cfe2f3');

    const gmailLabelId =
      categoryConfig.gmailLabelId ||
      (await createOrUpdateGmailLabel(gmail, categoryConfig, gmailColor));

    if (!gmailLabelId) continue;

    await gmail.users.threads.modify({
      userId: 'me',
      id: threadId,
      requestBody: { addLabelIds: [gmailLabelId] },
    });
  }

  await prisma.gmailLabelSyncState.update({
    where: { userId },
    data: { lastHistoryId: incomingHistoryId },
  });

  return { processedThreads: threadIds.size };
}
