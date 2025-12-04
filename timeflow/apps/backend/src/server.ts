/**
 * Fastify Server Factory
 *
 * Creates and configures the Fastify instance with plugins and routes.
 */

import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import fastifyJwt from '@fastify/jwt';
import { env } from './config/env.js';

// Route registrations (will be created next)
import { registerAuthRoutes } from './routes/authRoutes.js';
import { registerUserRoutes } from './routes/userRoutes.js';
import { registerTaskRoutes } from './routes/tasksRoutes.js';
import { registerCalendarRoutes } from './routes/calendarRoutes.js';
import { registerScheduleRoutes } from './routes/scheduleRoutes.js';
import { registerAssistantRoutes } from './routes/assistantRoutes.js';

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

  await server.register(fastifyJwt, {
    secret: env.SESSION_SECRET,
    sign: {
      expiresIn: '15m',
    },
  });

  // Basic rate limiting to protect the API
  await server.register(rateLimit, {
    max: env.RATE_LIMIT_MAX ?? 100,
    timeWindow: env.RATE_LIMIT_WINDOW ?? '1 minute',
    keyGenerator: (request) => request.ip,
    allowList: (req) => req.url?.startsWith('/health') || false,
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
      await registerAssistantRoutes(api);
    },
    { prefix: '/api' }
  );

  return server;
}

