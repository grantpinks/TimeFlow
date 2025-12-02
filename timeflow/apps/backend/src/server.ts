/**
 * Fastify Server Factory
 *
 * Creates and configures the Fastify instance with plugins and routes.
 */

import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { env } from './config/env.js';

// Route registrations (will be created next)
import { registerAuthRoutes } from './routes/authRoutes.js';
import { registerUserRoutes } from './routes/userRoutes.js';
import { registerTaskRoutes } from './routes/tasksRoutes.js';
import { registerCalendarRoutes } from './routes/calendarRoutes.js';
import { registerScheduleRoutes } from './routes/scheduleRoutes.js';

export async function buildServer(): Promise<FastifyInstance> {
  const server = Fastify({
    logger: {
      level: env.NODE_ENV === 'development' ? 'info' : 'warn',
    },
  });

  // Register plugins
  await server.register(cors, {
    origin: env.APP_BASE_URL || true,
    credentials: true,
  });

  // Health check
  server.get('/health', async () => ({ status: 'ok' }));

  // Register API routes under /api prefix
  await server.register(
    async (api) => {
      await registerAuthRoutes(api);
      await registerUserRoutes(api);
      await registerTaskRoutes(api);
      await registerCalendarRoutes(api);
      await registerScheduleRoutes(api);
    },
    { prefix: '/api' }
  );

  return server;
}

