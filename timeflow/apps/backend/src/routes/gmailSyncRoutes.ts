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

export async function registerGmailSyncRoutes(server: FastifyInstance) {
  // Trigger manual Gmail label sync
  server.post('/gmail-sync/sync', { preHandler: requireAuth }, async (request, reply) => {
    try {
      const userId = request.user!.id;
      const result = await syncGmailLabels(userId);

      if (result.success) {
        return reply.send({
          message: 'Sync completed successfully',
          syncedCategories: result.syncedCategories,
          syncedThreads: result.syncedThreads,
        });
      }

      return reply.status(400).send({
        message: 'Sync completed with errors',
        syncedCategories: result.syncedCategories,
        syncedThreads: result.syncedThreads,
        errors: result.errors,
      });
    } catch (error: any) {
      request.log.error(error, 'Error syncing Gmail labels');
      return reply.status(500).send({ message: 'Failed to sync Gmail labels', error: error.message });
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
}
