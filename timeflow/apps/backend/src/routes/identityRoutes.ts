/**
 * Identity Routes
 */

import { FastifyInstance } from 'fastify';
import { requireAuth } from '../middlewares/auth.js';
import * as identityController from '../controllers/identityController.js';

export async function registerIdentityRoutes(server: FastifyInstance) {
  // List all identities
  server.get('/identities', { preHandler: requireAuth }, identityController.listIdentities);

  // Progress for today (or ?date=YYYY-MM-DD)
  server.get('/identities/progress', { preHandler: requireAuth }, identityController.getProgress);

  // Migration helpers
  server.get(
    '/identities/migration/status',
    { preHandler: requireAuth },
    identityController.getMigrationStatus
  );
  server.post(
    '/identities/migration/run',
    { preHandler: requireAuth },
    identityController.runMigration
  );

  // CRUD
  server.get(
    '/identities/:id',
    { preHandler: requireAuth },
    identityController.getIdentity
  );
  server.post('/identities', { preHandler: requireAuth }, identityController.createIdentity);
  server.patch(
    '/identities/:id',
    { preHandler: requireAuth },
    identityController.updateIdentity
  );
  server.delete(
    '/identities/:id',
    { preHandler: requireAuth },
    identityController.deleteIdentity
  );

  // Reorder
  server.post(
    '/identities/reorder',
    { preHandler: requireAuth },
    identityController.reorderIdentities
  );
}
