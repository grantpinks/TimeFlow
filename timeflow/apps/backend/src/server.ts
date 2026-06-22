/**
 * Fastify Server Factory
 *
 * Creates and configures the Fastify instance with plugins and routes.
 */

import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import fastifyJwt from '@fastify/jwt';
import { env } from './config/env.js';
import { ACCESS_COOKIE_NAME } from './utils/sessionCookies.js';
import { prisma } from './config/prisma.js';

// Route registrations
import { registerAuthRoutes } from './routes/authRoutes.js';
import { registerUserRoutes } from './routes/userRoutes.js';
import { registerTaskRoutes } from './routes/tasksRoutes.js';
import { registerCategoryRoutes } from './routes/categoryRoutes.js';
import { registerCalendarRoutes } from './routes/calendarRoutes.js';
import { registerEventCategorizationRoutes } from './routes/eventCategorizationRoutes.js';
import { registerScheduleRoutes } from './routes/scheduleRoutes.js';
import { registerAssistantRoutes } from './routes/assistantRoutes.js';
import { registerHabitRoutes } from './routes/habitRoutes.js';
import { registerDiagnosticsRoutes } from './routes/diagnosticsRoutes.js';
import { registerEmailRoutes } from './routes/emailRoutes.js';
import { registerEmailOverrideRoutes } from './routes/emailOverrideRoutes.js';
import { registerConversationRoutes } from './routes/conversationRoutes.js';
import { registerSchedulingLinkRoutes } from './routes/schedulingLinkRoutes.js';
import { registerAvailabilityRoutes } from './routes/availabilityRoutes.js';
import { registerBookingRoutes } from './routes/bookingRoutes.js';
import { registerMeetingRoutes } from './routes/meetingRoutes.js';
import { startWatchRenewalJob } from './services/gmailWatchScheduler.js';
import { registerGmailSyncRoutes } from './routes/gmailSyncRoutes.js';
import { registerBillingRoutes, registerStripeWebhookRoute } from './routes/billingRoutes.js';
import { registerIdentityRoutes } from './routes/identityRoutes.js';
import { registerInternalCronRoutes } from './routes/internalCronRoutes.js';
import { registerAnalyticsRoutes } from './routes/analyticsRoutes.js';
import { registerConnectedAccountRoutes } from './routes/connectedAccountRoutes.js';
import { validateOrigin } from './middlewares/validateOrigin.js';

export async function buildServer(): Promise<FastifyInstance> {
  const server = Fastify({
    logger: {
      level: env.NODE_ENV === 'development' ? 'info' : 'warn',
    },
    // Trust first proxy hop (Render/Vercel) for rate limiting and client IP.
    trustProxy: 1,
  });

  // Register plugins
  await server.register(cors, {
    origin: [env.APP_BASE_URL],
    credentials: true,
  });

  await server.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  });

  await server.register(cookie, {
    secret: env.SESSION_SECRET,
    parseOptions: {},
  });

  await server.register(fastifyJwt, {
    secret: env.SESSION_SECRET,
    sign: {
      expiresIn: '24h',
    },
  });

  // Basic rate limiting to protect the API (per-user when authenticated, per-IP otherwise)
  // Higher limit for normal usage since calendar page makes ~10 parallel requests on load
  await server.register(rateLimit, {
    max: env.RATE_LIMIT_MAX ?? 500,
    timeWindow: env.RATE_LIMIT_WINDOW ?? '1 minute',
    keyGenerator: (request) => {
      const authHeader = request.headers.authorization;
      const tokenFromHeader =
        authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;
      const tokenFromCookie = request.cookies?.[ACCESS_COOKIE_NAME];
      const token = tokenFromHeader ?? tokenFromCookie;

      if (token) {
        try {
          const payload = request.server.jwt.verify<{ sub?: string }>(token);
          if (payload?.sub) {
            return `user:${payload.sub}`;
          }
        } catch {
          // fall through to IP
        }
      }

      const forwardedFor = request.headers['x-forwarded-for'];
      const forwardedIp = Array.isArray(forwardedFor)
        ? forwardedFor[0]
        : forwardedFor?.split(',')[0]?.trim();
      return forwardedIp || request.ip;
    },
    allowList: (req) =>
      req.url?.startsWith('/health') ||
      req.url?.startsWith('/api/integrations/gmail/push') ||
      false,
  });

  // Health check — includes DB + latest migration for deploy drift detection
  server.get('/health', async (request, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      const latest = await prisma.$queryRaw<Array<{ migration_name: string }>>`
        SELECT migration_name
        FROM "_prisma_migrations"
        WHERE rolled_back_at IS NULL AND finished_at IS NOT NULL
        ORDER BY finished_at DESC
        LIMIT 1
      `;
      return {
        status: 'ok',
        db: 'connected',
        latestMigration: latest[0]?.migration_name ?? null,
      };
    } catch (error) {
      request.log.error(error, 'Health check failed');
      return reply.status(503).send({ status: 'degraded', db: 'unavailable' });
    }
  });

  await registerInternalCronRoutes(server);

  // Register API routes under /api prefix
  await server.register(
    async (api) => {
      api.addHook('preHandler', validateOrigin);
      await registerAuthRoutes(api);
      await registerUserRoutes(api);
      await registerTaskRoutes(api);
      await registerCategoryRoutes(api);
      await registerCalendarRoutes(api);
      await registerEventCategorizationRoutes(api);
      await registerScheduleRoutes(api);
      await registerAssistantRoutes(api);
      await registerHabitRoutes(api);
      await registerEmailRoutes(api);
      await registerEmailOverrideRoutes(api);
      await registerGmailSyncRoutes(api);
      await registerConversationRoutes(api);
      await registerSchedulingLinkRoutes(api);
      await registerAvailabilityRoutes(api);
      await registerBookingRoutes(api);
      await registerMeetingRoutes(api);
      await registerBillingRoutes(api);
      await registerIdentityRoutes(api);
      await registerAnalyticsRoutes(api);
      await registerConnectedAccountRoutes(api);
      await registerDiagnosticsRoutes(api);
    },
    { prefix: '/api' }
  );

  // Stripe webhook — registered at root, outside /api, no auth.
  // Must come after the /api block so the raw-body parser doesn't
  // interfere with the default JSON parsing used by other routes.
  await registerStripeWebhookRoute(server);

  if (env.NODE_ENV !== 'test') {
    startWatchRenewalJob();
  }

  return server;
}
