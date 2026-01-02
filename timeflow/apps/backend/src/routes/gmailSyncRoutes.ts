/**
 * Gmail Sync Routes
 *
 * Manual Gmail label sync endpoints for Sprint 16 Phase A.
 */

import { FastifyInstance } from 'fastify';
import { requireAuth } from '../middlewares/auth.js';
import {
  syncGmailLabels,
  removeAllTimeFlowLabels,
  updateSyncSettings,
  getSyncStatus,
} from '../services/gmailLabelSyncService.js';
import { startGmailWatch, stopGmailWatch } from '../services/gmailWatchService.js';
import { env } from '../config/env.js';
import { handleGmailPush } from '../controllers/gmailPushController.js';

function extractErrorDetails(error: any): {
  message: string;
  code?: string | number;
  status?: number;
  reason?: string;
} {
  const message = error?.message ? String(error.message) : 'Unknown error';
  const code = error?.code;
  const status = error?.response?.status ?? error?.statusCode;
  const reason = error?.response?.data?.error?.message ?? error?.response?.data?.error;
  return { message, code, status, reason };
}

export async function registerGmailSyncRoutes(server: FastifyInstance) {
  // Pub/Sub push handler for Gmail watch notifications
  server.post('/integrations/gmail/push', handleGmailPush);

  // Trigger manual Gmail label sync
  server.post('/gmail-sync/sync', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const userId = request.user!.id;
      void syncGmailLabels(userId)
        .then((result) => {
          if (!result.success) {
            request.log.warn(
              { errors: result.errors, syncedCategories: result.syncedCategories },
              'Gmail sync completed with errors'
            );
          }
        })
        .catch((error) => {
          const details = extractErrorDetails(error);
          request.log.error({ details, error }, 'Background Gmail sync failed');
        });

      return reply.status(202).send({
        message: 'Gmail sync started',
        status: 'in_progress',
      });
    } catch (error: any) {
      const details = extractErrorDetails(error);
      request.log.error({ details, error }, 'Error syncing Gmail labels');
      return reply
        .status(500)
        .send({ message: 'Failed to sync Gmail labels', error: details.message, details });
    }
  });

  // Remove all TimeFlow labels from Gmail (escape hatch)
  server.delete('/gmail-sync/labels', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const userId = request.user!.id;
      const result = await removeAllTimeFlowLabels(userId);

      if (result.success) {
        return reply.send({
          message: 'All TimeFlow labels removed successfully',
          removedCategories: result.syncedCategories,
        });
      }

      return reply.status(400).send({
        message: 'Label removal completed with errors',
        removedCategories: result.syncedCategories,
        errors: result.errors,
      });
    } catch (error: any) {
      request.log.error(error, 'Error removing TimeFlow labels');
      return reply.status(500).send({ message: 'Failed to remove labels', error: error.message });
    }
  });

  // Get sync status for current user
  server.get('/gmail-sync/status', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const userId = request.user!.id;
      const status = await getSyncStatus(userId);

      return reply.send(
        status || {
          lastSyncedAt: null,
          lastSyncThreadCount: 0,
          lastSyncError: null,
          backfillDays: 7,
          backfillMaxThreads: 100,
        }
      );
    } catch (error: any) {
      request.log.error(error, 'Error getting sync status');
      return reply.status(500).send({ message: 'Failed to get sync status', error: error.message });
    }
  });

  // Update sync settings
  server.patch('/gmail-sync/settings', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const userId = request.user!.id;
      const body =
        request.body && typeof request.body === 'object'
          ? (request.body as {
              backfillDays?: number;
              backfillMaxThreads?: number;
            })
          : {};
      const { backfillDays, backfillMaxThreads } = body;

      if (backfillDays === undefined && backfillMaxThreads === undefined) {
        return reply.status(400).send({ message: 'No settings provided' });
      }

      if (backfillDays !== undefined && (backfillDays < 1 || backfillDays > 30)) {
        return reply.status(400).send({ message: 'backfillDays must be between 1 and 30' });
      }

      if (backfillMaxThreads !== undefined && (backfillMaxThreads < 10 || backfillMaxThreads > 500)) {
        return reply.status(400).send({ message: 'backfillMaxThreads must be between 10 and 500' });
      }

      const syncState = await updateSyncSettings(userId, {
        backfillDays,
        backfillMaxThreads,
      });

      return reply.send(syncState);
    } catch (error: any) {
      request.log.error(error, 'Error updating sync settings');
      return reply.status(500).send({ message: 'Failed to update settings', error: error.message });
    }
  });

  // Enable Gmail watch (Pub/Sub background sync)
  server.post('/gmail-sync/watch/enable', { preHandler: requireAuth }, async (request, reply) => {
    if (!env.GMAIL_PUBSUB_TOPIC) {
      return reply.status(400).send({ message: 'GMAIL_PUBSUB_TOPIC is not configured' });
    }

    const userId = request.user!.id;
    const syncState = await startGmailWatch(userId, { topicName: env.GMAIL_PUBSUB_TOPIC });
    return reply.send(syncState);
  });

  // Disable Gmail watch
  server.post('/gmail-sync/watch/disable', { preHandler: requireAuth }, async (request, reply) => {
    const userId = request.user!.id;
    const syncState = await stopGmailWatch(userId);
    return reply.send(syncState);
  });
}
