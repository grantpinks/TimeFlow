/**
 * Stripe Service
 *
 * Handles all Stripe payment and subscription operations for Sprint 18.
 *
 * Features:
 * - Create Stripe customers
 * - Create and manage subscriptions
 * - Handle subscription lifecycle (upgrades, downgrades, cancellations)
 * - Process webhook events
 */

import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Initialize Stripe lazily so a missing key doesn't crash the server at startup
let _stripe: Stripe | null = null;
export function getStripeClient(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY env var is not set');
    _stripe = new Stripe(key, {
      apiVersion: '2024-12-18.acacia',
      typescript: true,
    });
  }
  return _stripe;
}

// Stripe Price IDs (set via env vars on Render)
export const STRIPE_PRICE_IDS = {
  PRO_MONTHLY: process.env.STRIPE_PRICE_PRO_MONTHLY || '',
  PRO_YEARLY: process.env.STRIPE_PRICE_PRO_YEARLY || '',
  FLOW_STATE_MONTHLY: process.env.STRIPE_PRICE_FLOW_STATE_MONTHLY || '',
  FLOW_STATE_YEARLY: process.env.STRIPE_PRICE_FLOW_STATE_YEARLY || '',
} as const;

// Plan tiers and their Flow Credits limits
export const PLAN_CREDITS = {
  FREE: 200,
  PRO: 2000,
  FLOW_STATE: 8000,
} as const;

export type PlanTier = keyof typeof PLAN_CREDITS;

/**
 * Create or retrieve a Stripe customer for a user
 */
export async function getOrCreateStripeCustomer(
  userId: string,
  email: string,
  name?: string
): Promise<string> {
  // Check if user already has a Stripe customer ID
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });

  if (user?.stripeCustomerId) {
    return user.stripeCustomerId;
  }

  // Create new Stripe customer
  const customer = await getStripeClient().customers.create({
    email,
    name,
    metadata: {
      userId,
    },
  });

  // Save Stripe customer ID to user
  await prisma.user.update({
    where: { id: userId },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}

/**
 * Create a subscription for a user
 */
export async function createSubscription(
  userId: string,
  priceId: string,
  trialDays?: number
): Promise<Stripe.Subscription> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true, email: true, name: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Ensure user has a Stripe customer
  const customerId = user.stripeCustomerId ||
    await getOrCreateStripeCustomer(userId, user.email, user.name || undefined);

  // Create subscription
  const subscription = await getStripeClient().subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    trial_period_days: trialDays,
    payment_behavior: 'default_incomplete',
    payment_settings: {
      save_default_payment_method: 'on_subscription',
    },
    expand: ['latest_invoice.payment_intent'],
    metadata: {
      userId,
    },
  });

  // Determine plan tier from price ID
  let planTier: PlanTier = 'FREE';
  if (priceId === STRIPE_PRICE_IDS.PRO_MONTHLY || priceId === STRIPE_PRICE_IDS.PRO_YEARLY) {
    planTier = 'PRO';
  } else if (priceId === STRIPE_PRICE_IDS.FLOW_STATE_MONTHLY || priceId === STRIPE_PRICE_IDS.FLOW_STATE_YEARLY) {
    planTier = 'FLOW_STATE';
  }

  // Update user with subscription details
  await prisma.user.update({
    where: { id: userId },
    data: {
      stripeSubscriptionId: subscription.id,
      planTier,
      subscriptionStatus: subscription.status,
      billingCycleStart: new Date(subscription.current_period_start * 1000),
      billingCycleEnd: new Date(subscription.current_period_end * 1000),
      trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
      flowCreditsLimit: PLAN_CREDITS[planTier],
      creditsResetAt: new Date(subscription.current_period_end * 1000),
    },
  });

  // Create subscription record for audit trail
  await prisma.subscription.create({
    data: {
      userId,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    },
  });

  return subscription;
}

/**
 * Cancel a subscription (at period end)
 */
export async function cancelSubscription(
  userId: string,
  immediately = false
): Promise<Stripe.Subscription> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeSubscriptionId: true },
  });

  if (!user?.stripeSubscriptionId) {
    throw new Error('User has no active subscription');
  }

  const subscription = await getStripeClient().subscriptions.update(
    user.stripeSubscriptionId,
    {
      cancel_at_period_end: !immediately,
      ...(immediately && { cancellation_details: { comment: 'Canceled by user' } }),
    }
  );

  if (immediately) {
    await getStripeClient().subscriptions.cancel(user.stripeSubscriptionId);
  }

  // Update subscription record
  await prisma.subscription.updateMany({
    where: {
      userId,
      stripeSubscriptionId: user.stripeSubscriptionId,
    },
    data: {
      cancelAtPeriodEnd: !immediately,
      canceledAt: immediately ? new Date() : null,
      status: immediately ? 'canceled' : subscription.status,
    },
  });

  // Update user status
  await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionStatus: immediately ? 'canceled' : subscription.status,
    },
  });

  return subscription;
}

/**
 * Upgrade/downgrade a subscription
 */
export async function changeSubscriptionPlan(
  userId: string,
  newPriceId: string
): Promise<Stripe.Subscription> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeSubscriptionId: true },
  });

  if (!user?.stripeSubscriptionId) {
    throw new Error('User has no active subscription');
  }

  // Get current subscription
  const currentSubscription = await getStripeClient().subscriptions.retrieve(
    user.stripeSubscriptionId
  );

  // Update subscription with new price
  const updatedSubscription = await getStripeClient().subscriptions.update(
    user.stripeSubscriptionId,
    {
      items: [
        {
          id: currentSubscription.items.data[0].id,
          price: newPriceId,
        },
      ],
      proration_behavior: 'create_prorations',
    }
  );

  // Determine new plan tier
  let planTier: PlanTier = 'FREE';
  if (newPriceId === STRIPE_PRICE_IDS.PRO_MONTHLY || newPriceId === STRIPE_PRICE_IDS.PRO_YEARLY) {
    planTier = 'PRO';
  } else if (newPriceId === STRIPE_PRICE_IDS.FLOW_STATE_MONTHLY || newPriceId === STRIPE_PRICE_IDS.FLOW_STATE_YEARLY) {
    planTier = 'FLOW_STATE';
  }

  // Update user with new tier
  await prisma.user.update({
    where: { id: userId },
    data: {
      planTier,
      flowCreditsLimit: PLAN_CREDITS[planTier],
    },
  });

  return updatedSubscription;
}

/**
 * Sync subscription status from Stripe webhook
 */
export async function syncSubscriptionFromWebhook(
  subscription: Stripe.Subscription
): Promise<void> {
  const userId = subscription.metadata.userId;
  if (!userId) {
    console.warn('Subscription webhook missing userId in metadata');
    return;
  }

  const priceId = subscription.items.data[0]?.price.id;

  // Determine plan tier
  let planTier: PlanTier = 'FREE';
  if (priceId === STRIPE_PRICE_IDS.PRO_MONTHLY || priceId === STRIPE_PRICE_IDS.PRO_YEARLY) {
    planTier = 'PRO';
  } else if (priceId === STRIPE_PRICE_IDS.FLOW_STATE_MONTHLY || priceId === STRIPE_PRICE_IDS.FLOW_STATE_YEARLY) {
    planTier = 'FLOW_STATE';
  }

  // Update or create subscription record
  await prisma.subscription.upsert({
    where: { stripeSubscriptionId: subscription.id },
    create: {
      userId,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
    update: {
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
    },
  });

  // Update user
  await prisma.user.update({
    where: { id: userId },
    data: {
      planTier,
      subscriptionStatus: subscription.status,
      billingCycleStart: new Date(subscription.current_period_start * 1000),
      billingCycleEnd: new Date(subscription.current_period_end * 1000),
      flowCreditsLimit: PLAN_CREDITS[planTier],
      creditsResetAt: new Date(subscription.current_period_end * 1000),
    },
  });
}

export default {
  getOrCreateStripeCustomer,
  createSubscription,
  cancelSubscription,
  changeSubscriptionPlan,
  syncSubscriptionFromWebhook,
  getStripeClient,
  STRIPE_PRICE_IDS,
  PLAN_CREDITS,
};
