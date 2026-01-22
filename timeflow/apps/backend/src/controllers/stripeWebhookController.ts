/**
 * Stripe Webhook Controller
 *
 * Handles incoming Stripe webhook events to keep subscription status in sync.
 *
 * Critical Events:
 * - customer.subscription.created
 * - customer.subscription.updated
 * - customer.subscription.deleted
 * - invoice.payment_succeeded
 * - invoice.payment_failed
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import Stripe from 'stripe';
import { getStripeClient, syncSubscriptionFromWebhook } from '../services/stripeService';

const stripe = getStripeClient();

/**
 * Handle Stripe webhook events
 *
 * This endpoint must use raw body for signature verification
 */
export async function handleStripeWebhook(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const signature = request.headers['stripe-signature'];

  if (!signature) {
    reply.code(400).send({ error: 'No stripe-signature header' });
    return;
  }

  let event: Stripe.Event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(
      request.rawBody || request.body, // Use raw body for signature verification
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    reply.code(400).send({ error: `Webhook Error: ${err.message}` });
    return;
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionChange(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    reply.code(200).send({ received: true });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    reply.code(500).send({ error: 'Webhook processing failed' });
  }
}

/**
 * Handle subscription created or updated
 */
async function handleSubscriptionChange(subscription: Stripe.Subscription): Promise<void> {
  console.log(`Subscription ${subscription.status}:`, subscription.id);
  await syncSubscriptionFromWebhook(subscription);
}

/**
 * Handle subscription deleted/canceled
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  console.log('Subscription canceled:', subscription.id);

  // Sync final status
  await syncSubscriptionFromWebhook(subscription);

  const userId = subscription.metadata.userId;
  if (!userId) {
    console.warn('Subscription deletion missing userId in metadata');
    return;
  }

  // Downgrade user to FREE tier
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();

  await prisma.user.update({
    where: { id: userId },
    data: {
      planTier: 'FREE',
      subscriptionStatus: 'canceled',
      flowCreditsLimit: 200, // FREE tier limit
    },
  });

  await prisma.$disconnect();
}

/**
 * Handle successful payment
 */
async function handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
  console.log('Payment succeeded:', invoice.id);

  const subscriptionId = invoice.subscription as string;
  if (!subscriptionId) {
    return;
  }

  // Retrieve subscription to get userId
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const userId = subscription.metadata.userId;

  if (!userId) {
    console.warn('Invoice payment success missing userId in subscription metadata');
    return;
  }

  // Reset credits at the start of new billing period
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();

  await prisma.user.update({
    where: { id: userId },
    data: {
      flowCreditsUsed: 0, // Reset usage
      creditsResetAt: new Date(subscription.current_period_end * 1000),
    },
  });

  await prisma.$disconnect();
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  console.error('Payment failed:', invoice.id);

  const subscriptionId = invoice.subscription as string;
  if (!subscriptionId) {
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const userId = subscription.metadata.userId;

  if (!userId) {
    console.warn('Invoice payment failure missing userId in subscription metadata');
    return;
  }

  // Mark subscription as past_due
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();

  await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionStatus: 'past_due',
    },
  });

  await prisma.$disconnect();

  // TODO: Send notification to user about payment failure
  console.log(`User ${userId} payment failed - should notify user`);
}

/**
 * Handle checkout session completed
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  console.log('Checkout completed:', session.id);

  const subscriptionId = session.subscription as string;
  if (!subscriptionId) {
    return;
  }

  // Subscription will be synced via subscription.created event
  console.log(`Checkout complete for subscription: ${subscriptionId}`);
}

export default {
  handleStripeWebhook,
};
