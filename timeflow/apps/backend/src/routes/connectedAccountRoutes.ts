import { FastifyInstance } from 'fastify';
import { requireAuth } from '../middlewares/auth.js';
import * as connectedAccountController from '../controllers/connectedAccountController.js';

export async function registerConnectedAccountRoutes(server: FastifyInstance) {
  server.get(
    '/connected-accounts',
    { preHandler: requireAuth },
    connectedAccountController.listConnectedAccounts
  );

  server.post(
    '/connected-accounts/icloud',
    { preHandler: requireAuth },
    connectedAccountController.connectIcloudAccount
  );

  server.patch(
    '/connected-calendars/:connectedCalendarId',
    { preHandler: requireAuth },
    connectedAccountController.patchConnectedCalendar
  );

  server.delete(
    '/connected-accounts/:connectedAccountId',
    { preHandler: requireAuth },
    connectedAccountController.disconnectConnectedAccount
  );
}
