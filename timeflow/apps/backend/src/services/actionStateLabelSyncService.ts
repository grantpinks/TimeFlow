/**
 * Action-State Label Sync Service
 * 
 * Sprint 16 Task 16.10: Sync action states (NeedsReply, ReadLater) to Gmail labels
 * 
 * This service:
 * - Creates/manages TimeFlow action-state labels in Gmail
 * - Syncs local action states → Gmail label additions/removals
 * - Supports bidirectional sync (Gmail label changes → action states)
 */

import { google, gmail_v1 } from 'googleapis';
import { prisma } from '../config/prisma.js';
import { getUserOAuth2Client } from '../config/google.js';
import { decrypt, encrypt } from '../utils/crypto.js';
import type { EmailActionState } from '@timeflow/shared';

/**
 * Action-state to Gmail label mapping
 */
const ACTION_STATE_LABEL_MAP: Record<EmailActionState, string> = {
  needs_reply: 'TimeFlow/NeedsReply',
  read_later: 'TimeFlow/ReadLater',
};

/**
 * Reverse mapping: Gmail label → action state
 */
const LABEL_TO_ACTION_STATE_MAP: Record<string, EmailActionState> = {
  'TimeFlow/NeedsReply': 'needs_reply',
  'TimeFlow/ReadLater': 'read_later',
};

/**
 * Gmail label colors for action states (using Gmail's standard palette)
 */
const ACTION_STATE_COLORS: Record<EmailActionState, { backgroundColor: string; textColor: string }> = {
  needs_reply: {
    backgroundColor: '#fb4c2f', // Red (urgent)
    textColor: '#ffffff',
  },
  read_later: {
    backgroundColor: '#16a765', // Green (queue)
    textColor: '#ffffff',
  },
};

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
 * Get or create an action-state label in Gmail
 * @returns Gmail label ID
 */
export async function getOrCreateActionStateLabel(
  gmail: gmail_v1.Gmail,
  actionState: EmailActionState
): Promise<string> {
  const labelName = ACTION_STATE_LABEL_MAP[actionState];
  const color = ACTION_STATE_COLORS[actionState];

  // Check if label already exists
  const listResponse = await gmail.users.labels.list({ userId: 'me' });
  const existingLabel = listResponse.data.labels?.find((label) => label.name === labelName);

  if (existingLabel?.id) {
    // Update color if needed
    try {
      await gmail.users.labels.update({
        userId: 'me',
        id: existingLabel.id,
        requestBody: {
          name: labelName,
          color,
          labelListVisibility: 'labelShow',
          messageListVisibility: 'show',
        },
      });
    } catch (error: any) {
      // Ignore color errors (user may have custom colors)
      console.warn(`[ActionStateSync] Failed to update label color for ${labelName}:`, error.message);
    }
    return existingLabel.id;
  }

  // Create new label
  const createResponse = await gmail.users.labels.create({
    userId: 'me',
    requestBody: {
      name: labelName,
      color,
      labelListVisibility: 'labelShow',
      messageListVisibility: 'show',
    },
  });

  if (!createResponse.data.id) {
    throw new Error(`Failed to create Gmail label: ${labelName}`);
  }

  console.log(`[ActionStateSync] Created Gmail label: ${labelName} (${createResponse.data.id})`);
  return createResponse.data.id;
}

/**
 * Sync action state to Gmail labels for a single thread
 * 
 * @param userId - TimeFlow user ID
 * @param threadId - Gmail thread ID
 * @param actionState - New action state (null = remove all action-state labels)
 */
export async function syncActionStateToGmail(
  userId: string,
  threadId: string,
  actionState: EmailActionState | null
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { actionStateLabelSyncEnabled: true },
  });

  // Skip if sync not enabled
  if (!user?.actionStateLabelSyncEnabled) {
    return;
  }

  const gmail = await getGmailClient(userId);

  // Get current labels on the thread
  const thread = await gmail.users.threads.get({
    userId: 'me',
    id: threadId,
    format: 'minimal',
  });

  const currentLabels = thread.data.messages?.[0]?.labelIds ?? [];

  // Determine which action-state labels to add/remove
  const allActionStateLabels: string[] = [];
  for (const state of Object.keys(ACTION_STATE_LABEL_MAP) as EmailActionState[]) {
    const labelId = await getOrCreateActionStateLabel(gmail, state);
    allActionStateLabels.push(labelId);
  }

  const labelsToRemove = currentLabels.filter((labelId) => allActionStateLabels.includes(labelId));
  let labelsToAdd: string[] = [];

  if (actionState) {
    const targetLabelId = await getOrCreateActionStateLabel(gmail, actionState);
    labelsToAdd = [targetLabelId];
  }

  // Apply label changes
  if (labelsToAdd.length > 0 || labelsToRemove.length > 0) {
    await gmail.users.threads.modify({
      userId: 'me',
      id: threadId,
      requestBody: {
        addLabelIds: labelsToAdd,
        removeLabelIds: labelsToRemove,
      },
    });

    console.log(`[ActionStateSync] Synced ${threadId}: +${labelsToAdd.length} -${labelsToRemove.length}`);
  }
}

/**
 * Sync Gmail labels → action states (bidirectional sync)
 * 
 * Called when processing Gmail watch notifications.
 * Updates local action states based on Gmail label changes.
 * 
 * @param userId - TimeFlow user ID
 * @param threadId - Gmail thread ID
 * @param labelIds - Current Gmail label IDs on the thread
 */
export async function syncGmailLabelsToActionState(
  userId: string,
  threadId: string,
  labelIds: string[]
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { actionStateLabelSyncEnabled: true },
  });

  // Skip if sync not enabled
  if (!user?.actionStateLabelSyncEnabled) {
    return;
  }

  const gmail = await getGmailClient(userId);

  // Get label names from IDs
  const listResponse = await gmail.users.labels.list({ userId: 'me' });
  const labels = listResponse.data.labels ?? [];
  
  const labelNames = labelIds
    .map((id) => labels.find((label) => label.id === id)?.name)
    .filter((name): name is string => !!name);

  // Check which action-state labels are present
  let detectedActionState: EmailActionState | null = null;
  
  for (const labelName of labelNames) {
    if (LABEL_TO_ACTION_STATE_MAP[labelName]) {
      detectedActionState = LABEL_TO_ACTION_STATE_MAP[labelName];
      break; // Only one action state per thread
    }
  }

  // Get current local action state
  const currentState = await prisma.emailActionState.findUnique({
    where: { userId_threadId: { userId, threadId } },
  });

  const currentActionState = currentState?.actionState as EmailActionState | null;

  // Update local state if changed
  if (currentActionState !== detectedActionState) {
    if (detectedActionState) {
      await prisma.emailActionState.upsert({
        where: { userId_threadId: { userId, threadId } },
        create: { userId, threadId, actionState: detectedActionState },
        update: { actionState: detectedActionState },
      });
    } else {
      await prisma.emailActionState.deleteMany({
        where: { userId, threadId },
      });
    }

    console.log(
      `[ActionStateSync] Gmail→Local sync: ${threadId} changed from ${currentActionState} to ${detectedActionState}`
    );
  }
}

/**
 * Bulk sync action states to Gmail (useful for initial setup)
 * 
 * @param userId - TimeFlow user ID
 * @param limit - Max threads to sync (default: 100)
 */
export async function bulkSyncActionStatesToGmail(
  userId: string,
  limit: number = 100
): Promise<{ synced: number; errors: number }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { actionStateLabelSyncEnabled: true },
  });

  if (!user?.actionStateLabelSyncEnabled) {
    throw new Error('Action-state label sync not enabled for this user');
  }

  const actionStates = await prisma.emailActionState.findMany({
    where: { userId },
    take: limit,
  });

  let synced = 0;
  let errors = 0;

  for (const state of actionStates) {
    try {
      await syncActionStateToGmail(userId, state.threadId, state.actionState as EmailActionState);
      synced++;
    } catch (error: any) {
      console.error(`[ActionStateSync] Failed to sync ${state.threadId}:`, error.message);
      errors++;
    }
  }

  console.log(`[ActionStateSync] Bulk sync complete: ${synced} synced, ${errors} errors`);
  return { synced, errors };
}
