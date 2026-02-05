/**
 * Diagnostics Routes
 * 
 * Endpoints to help debug production issues
 */

import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../middlewares/auth.js';
import * as diagnosticsController from '../controllers/diagnosticsController.js';

export async function registerDiagnosticsRoutes(server: FastifyInstance) {
  // Check Google Calendar connection
  server.get(
    '/diagnostics/calendar',
    {
      preHandler: requireAuth,
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    },
    diagnosticsController.checkCalendar
  );

  // Check environment variables
  server.get(
    '/diagnostics/env',
    {
      preHandler: requireAuth,
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    },
    diagnosticsController.checkEnvironment
  );
}
