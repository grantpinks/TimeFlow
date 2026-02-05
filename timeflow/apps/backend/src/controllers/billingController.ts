/**
 * Billing Controller
 *
 * Handles user-facing billing operations: creating Stripe Checkout sessions,
 * retrieving subscription/credit status, cancellation, and Stripe Billing Portal.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { getStripeClient, getOrCreateStripeCustomer, cancelSubscription, STRIPE_PRICE_IDS } from '../services/stripeService.js';
import { getCreditUsageStats } from '../services/usageTrackingService.js';

const stripe = getStripeClient();

/**
 * POST /api/billing/checkout
 *
 * Creates a Stripe Checkout Session for the requested plan.
 * Body: { priceId: string }
 * Returns: { url: string } — redirect the user to this URL.
 */
/** Map of plan keys the frontend can send → Stripe Price IDs (resolved server-side) */
const PLAN_KEY_TO_PRICE: Record<string, string> = {
  PRO_MONTHLY: STRIPE_PRICE_IDS.PRO_MONTHLY,
  PRO_YEARLY: STRIPE_PRICE_IDS.PRO_YEARLY,
  FLOW_STATE_MONTHLY: STRIPE_PRICE_IDS.FLOW_STATE_MONTHLY,
  FLOW_STATE_YEARLY: STRIPE_PRICE_IDS.FLOW_STATE_YEARLY,
};

export async function createCheckoutSession(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const userId = request.user.id;
  const { planKey } = request.body as { planKey?: string };

  // Resolve plan key → Stripe Price ID server-side (secrets never leave backend)
  const priceId = planKey ? PLAN_KEY_TO_PRICE[planKey] : undefined;
  if (!priceId) {
    reply.code(400).send({ error: 'Invalid plan key. Must be one of: PRO_MONTHLY, PRO_YEARLY, FLOW_STATE_MONTHLY, FLOW_STATE_YEARLY' });
    return;
  }

  try {
    // Ensure user has a Stripe customer record
    const user = await (await import('../config/prisma.js')).prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });

    if (!user) {
      reply.code(404).send({ error: 'User not found' });
      return;
    }

    const customerId = await getOrCreateStripeCustomer(userId, user.email, user.name || undefined);

    // Determine success/cancel URLs based on origin
    const origin = request.headers.origin || process.env.APP_BASE_URL || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/settings?billing=success`,
      cancel_url: `${origin}/pricing`,
      metadata: { userId },
      // Allow user to enter tax ID if required by locale
      tax_id_collection: { enabled: false },
    });

    reply.code(200).send({ url: session.url });
  } catch (error: any) {
    console.error('Checkout session creation failed:', error);
    reply.code(500).send({ error: 'Failed to create checkout session' });
  }
}

/**
 * GET /api/billing/subscription
 *
 * Returns the current user's subscription status and credit usage.
 * No body required.
 */
export async function getSubscriptionStatus(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const userId = request.user.id;

  try {
    const { prisma } = await import('../config/prisma.js');

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        planTier: true,
        subscriptionStatus: true,
        stripeSubscriptionId: true,
        billingCycleStart: true,
        billingCycleEnd: true,
        trialEndsAt: true,
        flowCreditsUsed: true,
        flowCreditsLimit: true,
        creditsResetAt: true,
        betaTierOverride: true,
      },
    });

    if (!user) {
      reply.code(404).send({ error: 'User not found' });
      return;
    }

    const credits = await getCreditUsageStats(userId);

    reply.code(200).send({
      planTier: user.betaTierOverride || user.planTier,
      subscriptionStatus: user.subscriptionStatus,
      hasActiveSubscription: !!user.stripeSubscriptionId && user.subscriptionStatus !== 'canceled',
      billingCycleStart: user.billingCycleStart,
      billingCycleEnd: user.billingCycleEnd,
      trialEndsAt: user.trialEndsAt,
      credits,
    });
  } catch (error: any) {
    console.error('Failed to get subscription status:', error);
    reply.code(500).send({ error: 'Failed to retrieve subscription status' });
  }
}

/**
 * POST /api/billing/cancel
 *
 * Cancels the user's subscription at the end of the current billing period.
 * Body: { immediately?: boolean } — defaults to false (cancel at period end).
 */
export async function cancelUserSubscription(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const userId = request.user.id;
  const { immediately } = (request.body as { immediately?: boolean }) || {};

  try {
    await cancelSubscription(userId, immediately === true);
    reply.code(200).send({ success: true, canceledImmediately: immediately === true });
  } catch (error: any) {
    console.error('Subscription cancellation failed:', error);
    reply.code(400).send({ error: error.message || 'Failed to cancel subscription' });
  }
}

/**
 * POST /api/billing/manage
 *
 * Creates a Stripe Billing Portal session so the user can manage
 * their payment method, invoices, and subscription directly in Stripe.
 * Returns: { url: string }
 */
export async function createBillingPortalSession(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const userId = request.user.id;

  try {
    const { prisma } = await import('../config/prisma.js');

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true },
    });

    if (!user?.stripeCustomerId) {
      reply.code(400).send({ error: 'No Stripe customer found. Please subscribe first.' });
      return;
    }

    const origin = request.headers.origin || process.env.APP_BASE_URL || 'http://localhost:3000';

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${origin}/settings`,
    });

    reply.code(200).send({ url: session.url });
  } catch (error: any) {
    console.error('Billing portal session creation failed:', error);
    reply.code(500).send({ error: 'Failed to create billing portal session' });
  }
}

export default {
  createCheckoutSession,
  getSubscriptionStatus,
  cancelUserSubscription,
  createBillingPortalSession,
};
