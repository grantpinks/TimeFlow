/**
 * Billing Routes
 *
 * Registers user-facing billing endpoints under /api/billing.
 * The Stripe webhook route is registered separately at the server root
 * (see registerStripeWebhookRoute) because it requires raw body parsing
 * and must NOT go through the JWT auth preHandler.
 */

import { FastifyInstance } from 'fastify';
import { requireAuth } from '../middlewares/auth.js';
import * as billingController from '../controllers/billingController.js';
import { handleStripeWebhook } from '../controllers/stripeWebhookController.js';

/**
 * Register billing API routes under /api prefix (with auth).
 */
export async function registerBillingRoutes(server: FastifyInstance) {
  // POST /api/billing/checkout — create a Stripe Checkout Session
  server.post(
    '/billing/checkout',
    { preHandler: requireAuth },
    billingController.createCheckoutSession
  );

  // GET /api/billing/subscription — get current plan + credits
  server.get(
    '/billing/subscription',
    { preHandler: requireAuth },
    billingController.getSubscriptionStatus
  );

  // POST /api/billing/cancel — cancel subscription
  server.post(
    '/billing/cancel',
    { preHandler: requireAuth },
    billingController.cancelUserSubscription
  );

  // POST /api/billing/manage — open Stripe Billing Portal
  server.post(
    '/billing/manage',
    { preHandler: requireAuth },
    billingController.createBillingPortalSession
  );
}

/**
 * Register the Stripe webhook route at the server ROOT (outside /api prefix).
 *
 * Stripe sends raw JSON and requires the exact payload bytes for HMAC
 * signature verification. We wrap this in an encapsulated Fastify plugin
 * so the custom content-type parser is scoped only to this route and
 * does not interfere with the default JSON parser used by all other routes.
 *
 * This route has NO auth — Stripe authenticates via HMAC signature.
 */
export async function registerStripeWebhookRoute(server: FastifyInstance) {
  await server.register(async (webhookServer: FastifyInstance) => {
    // Scoped parser: keeps the raw string as rawBody, also parses JSON
    // for convenience. Only applies inside this encapsulated context.
    webhookServer.addContentTypeParser(
      'application/json',
      { parseAs: 'string' },
      (_req, body, done) => {
        // Attach raw body so the webhook handler can verify the signature
        (_req as any).rawBody = body;
        try {
          done(null, JSON.parse(body as string));
        } catch (err) {
          done(err as Error);
        }
      }
    );

    // POST /webhooks/stripe — no auth, signature-verified
    webhookServer.post('/webhooks/stripe', handleStripeWebhook);
  });
}
