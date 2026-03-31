# TimeFlow Payment & Stripe Integration - Complete Information

**Compiled**: 2026-02-04  
**Repository**: `/Users/grantpinkerton/Desktop/Time Flow/TimeFlow/timeflow`  
**Status**: Stripe infrastructure partially implemented; routes not yet registered

---

## 1. PRICING PAGE (Current State)

### File Path
`/Users/grantpinkerton/Desktop/Time Flow/TimeFlow/timeflow/apps/web/src/app/pricing/page.tsx`

### Current Content
- **Status**: ✅ Live, shows placeholder messaging
- **Line 48**: "Beta is free. Paid subscriptions are coming in Sprint 19."
- **Line 87**: "We're building simple, affordable tiers that match real usage. Billing lands in Sprint 19."
- **Two pricing cards**:
  1. **Beta Card** ($0) - Google Calendar sync, tasks, AI assistant with fair-use limits
  2. **Subscriptions Card** - "Contact us" CTA for early pricing feedback

### Key Elements
```typescript
// Lines 1-8: Client component with OAuth integration
'use client';
import Link from 'next/link';
import Image from 'next/image';
import { getGoogleAuthUrl } from '@/lib/api';
import { track } from '@/lib/analytics';

// Lines 42-112: Main pricing section with grid layout
// Two tier cards rendered side-by-side (md:grid-cols-2)
```

---

## 2. PRICING MODEL DOCUMENTATION

### File Path
`/Users/grantpinkerton/Desktop/Time Flow/TimeFlow/timeflow/docs/PRICING_MODEL.md`  
**Last Updated**: 2026-01-03

### Pricing Tiers

#### Tier 1: Starter (Free)
- **Price**: $0
- **Flow Credits**: 200/month
- **Features**:
  - Basic drag-and-drop scheduling
  - Simple task creation
  - Reactive AI assistant
  - Sync with 1 calendar
  - Simple daily/weekly habit reminders

#### Tier 2: Pro
- **Price**: $5/month or $50/year (2 months free on annual)
- **Flow Credits**: 2,000/month
- **Overuse Charge**: $2.00 per 1,000 additional credits
- **Features**:
  - Everything in Starter +
  - Advanced features (subtasks, recurring tasks, priorities) with up to 5 projects
  - Proactive AI assistant
  - Sync with up to 3 calendars + 1 productivity tool (Notion, Trello)
  - Flexible habit scheduling and progress tracking
  - Up to 3 active public booking links

#### Tier 3: Flow State
- **Price**: $11.99/month or $119.90/year (2 months free on annual)
- **Flow Credits**: 8,000/month
- **Overuse Charge**: $1.50 per 1,000 additional credits
- **Features**:
  - Everything in Pro +
  - Unlimited projects
  - Autonomous AI assistant
  - Unlimited calendar and productivity tool integrations
  - Deep communication integration (Gmail/Outlook)
  - Gamified habit tracking with detailed analytics
  - Unlimited public booking links
  - Group scheduling (find best time for multiple attendees)

### Flow Credits System

**Credit Costs Per Action**:
- Simple AI Command: 1 credit
- Complex AI Command / Proactive Suggestion: 5 credits
- Third-Party Integration Sync: 1 credit
- AI Email Summarization/Drafting: 15 credits

**Monthly Allotments**:
- Starter: 200 credits
- Pro: 2,000 credits
- Flow State: 8,000 credits

---

## 3. DATABASE SCHEMA (Prisma)

### File Path
`/Users/grantpinkerton/Desktop/Time Flow/TimeFlow/timeflow/apps/backend/prisma/schema.prisma`

### User Model - Subscription Fields (Lines 46-60)
```prisma
// Subscription & Billing (Sprint 18)
stripeCustomerId     String?   @unique
stripeSubscriptionId String?   @unique
planTier             String    @default("FREE") // FREE | PRO | FLOW_STATE
subscriptionStatus   String? // active | trialing | past_due | canceled | incomplete
billingCycleStart    DateTime?
billingCycleEnd      DateTime?
trialEndsAt          DateTime?
betaTierOverride     String? // For beta users: HEAVY (higher AI quotas)

// Flow Credits (Sprint 18)
flowCreditsUsed  Int       @default(0)
flowCreditsLimit Int       @default(200) // FREE: 200, PRO: 2000, FLOW_STATE: 8000
creditsResetAt   DateTime?

// Relations
subscriptions    Subscription[]
usageLogs        UsageLog[]
```

### Subscription Model (Lines 531-549)
```prisma
model Subscription {
  id                   String    @id @default(cuid())
  userId               String
  stripeSubscriptionId String    @unique
  stripePriceId        String // Price ID from Stripe (links to plan)
  status               String // active | trialing | past_due | canceled | incomplete
  currentPeriodStart   DateTime
  currentPeriodEnd     DateTime
  cancelAtPeriodEnd    Boolean   @default(false)
  canceledAt           DateTime?
  createdAt            DateTime  @default(now())
  updatedAt            DateTime  @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([stripeSubscriptionId])
  @@index([status])
}
```

### UsageLog Model (Lines 551-563)
```prisma
model UsageLog {
  id         String   @id @default(cuid())
  userId     String
  action     String // SIMPLE_AI_COMMAND | COMPLEX_AI_COMMAND | EMAIL_DRAFT | SYNC | PROACTIVE_SUGGESTION
  creditCost Int // Credits deducted for this action
  timestamp  DateTime @default(now())
  metadata   Json? // Additional context (feature used, endpoint called, etc.)

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, timestamp])
  @@index([action])
}
```

---

## 4. STRIPE SERVICE

### File Path
`/Users/grantpinkerton/Desktop/Time Flow/TimeFlow/timeflow/apps/backend/src/services/stripeService.ts`  
**Lines**: 332 total

### Configuration (Lines 1-39)
```typescript
import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia', // Latest Stripe API version
  typescript: true,
});

// Stripe Price IDs (configured via environment variables)
export const STRIPE_PRICE_IDS = {
  PRO_MONTHLY: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || '',
  PRO_YEARLY: process.env.STRIPE_PRO_YEARLY_PRICE_ID || '',
  FLOW_STATE_MONTHLY: process.env.STRIPE_FLOW_STATE_MONTHLY_PRICE_ID || '',
  FLOW_STATE_YEARLY: process.env.STRIPE_FLOW_STATE_YEARLY_PRICE_ID || '',
} as const;

export const PLAN_CREDITS = {
  FREE: 200,
  PRO: 2000,
  FLOW_STATE: 8000,
} as const;

export type PlanTier = keyof typeof PLAN_CREDITS;
```

### Exported Functions

#### 1. getOrCreateStripeCustomer (Lines 44-75)
```typescript
export async function getOrCreateStripeCustomer(
  userId: string,
  email: string,
  name?: string
): Promise<string>
```
- Checks if user already has a Stripe customer ID
- Creates new customer if needed
- Stores customer ID in User model with userId in metadata
- Returns customer ID

#### 2. createSubscription (Lines 80-149)
```typescript
export async function createSubscription(
  userId: string,
  priceId: string,
  trialDays?: number
): Promise<Stripe.Subscription>
```
- Ensures user has Stripe customer
- Creates subscription with payment behavior: `default_incomplete`
- Saves default payment method on subscription
- Determines plan tier from price ID
- Updates User with subscription details:
  - `stripeSubscriptionId`
  - `planTier` (PRO or FLOW_STATE)
  - `subscriptionStatus`
  - `billingCycleStart/End`
  - `trialEndsAt`
  - `flowCreditsLimit` (based on tier)
  - `creditsResetAt`
- Creates audit trail in Subscription model
- Returns full subscription object with expanded invoice

#### 3. cancelSubscription (Lines 154-201)
```typescript
export async function cancelSubscription(
  userId: string,
  immediately = false
): Promise<Stripe.Subscription>
```
- Can cancel at period end (graceful) or immediately
- Updates Subscription model with cancellation status
- Downgrades user to FREE tier on immediate cancellation
- Handles optionally adding cancellation reason

#### 4. changeSubscriptionPlan (Lines 206-256)
```typescript
export async function changeSubscriptionPlan(
  userId: string,
  newPriceId: string
): Promise<Stripe.Subscription>
```
- Supports upgrade/downgrade
- Uses `proration_behavior: 'create_prorations'` for mid-cycle changes
- Updates User plan tier and credits limit
- Determines new tier from price ID

#### 5. syncSubscriptionFromWebhook (Lines 261-313)
```typescript
export async function syncSubscriptionFromWebhook(
  subscription: Stripe.Subscription
): Promise<void>
```
- Called by webhook handler
- Reads userId from subscription metadata
- Upserts Subscription record (create or update)
- Updates User with latest status, billing dates, tier, credits
- Handles status transitions (active, trialing, past_due, canceled)

#### 6. getStripeClient (Lines 318-320)
```typescript
export function getStripeClient(): Stripe {
  return stripe;
}
```
- Returns configured Stripe instance for custom operations

### Export Summary (Lines 322-331)
```typescript
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
```

---

## 5. STRIPE WEBHOOK CONTROLLER

### File Path
`/Users/grantpinkerton/Desktop/Time Flow/TimeFlow/timeflow/apps/backend/src/controllers/stripeWebhookController.ts`  
**Lines**: 214 total

### Main Handler (Lines 25-84)
```typescript
export async function handleStripeWebhook(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void>
```

**Event Types Handled**:
1. **customer.subscription.created** → `handleSubscriptionChange`
2. **customer.subscription.updated** → `handleSubscriptionChange`
3. **customer.subscription.deleted** → `handleSubscriptionDeleted`
4. **invoice.payment_succeeded** → `handlePaymentSucceeded`
5. **invoice.payment_failed** → `handlePaymentFailed`
6. **checkout.session.completed** → `handleCheckoutCompleted`

### Event Handlers

#### handleSubscriptionChange (Lines 89-92)
- Calls `syncSubscriptionFromWebhook()` to sync status to database
- Logs subscription status change

#### handleSubscriptionDeleted (Lines 97-123)
- Syncs final subscription state
- Downgrades user to FREE tier
- Sets `subscriptionStatus: 'canceled'`
- Resets credits to 200 (FREE limit)

#### handlePaymentSucceeded (Lines 128-158)
- Resets credits at start of new billing period
- Sets `flowCreditsUsed: 0`
- Updates `creditsResetAt` to next billing period end

#### handlePaymentFailed (Lines 163-194)
- Updates user `subscriptionStatus: 'past_due'`
- **TODO** (Line 192): Send notification to user about payment failure

#### handleCheckoutCompleted (Lines 199-209)
- Logs completion message
- Subscription will be synced via `subscription.created` event

### Signature Verification
```typescript
// Lines 39-44: Stripe webhook signature verification
event = stripe.webhooks.constructEvent(
  request.rawBody || request.body,
  signature,
  process.env.STRIPE_WEBHOOK_SECRET || ''
);
```

---

## 6. USAGE TRACKING SERVICE

### File Path
`/Users/grantpinkerton/Desktop/Time Flow/TimeFlow/timeflow/apps/backend/src/services/usageTrackingService.ts`  
**Lines**: 283 total

### Credit Costs (Lines 24-31)
```typescript
export const CREDIT_COSTS = {
  SIMPLE_AI_COMMAND: 1,
  COMPLEX_AI_COMMAND: 5,
  PROACTIVE_SUGGESTION: 5,
  SYNC: 1,
  EMAIL_DRAFT: 15,
  EMAIL_SUMMARY: 10,
} as const;

export type UsageAction = keyof typeof CREDIT_COSTS;
```

### Exported Functions

#### hasCreditsAvailable (Lines 38-88)
```typescript
export async function hasCreditsAvailable(
  userId: string,
  action: UsageAction
): Promise<{ 
  allowed: boolean; 
  reason?: string; 
  creditsRemaining?: number 
}>
```
- Checks if credits need reset (monthly cycle)
- Applies beta tier override if present
- Calculates remaining credits
- Returns decision + remaining balance

#### trackUsage (Lines 93-144)
```typescript
export async function trackUsage(
  userId: string,
  action: UsageAction,
  metadata?: Record<string, any>
): Promise<{ 
  success: boolean; 
  creditsRemaining: number; 
  error?: string 
}>
```
- Checks availability first
- Creates UsageLog record (transactional)
- Increments `flowCreditsUsed` on User
- Returns success + remaining balance

#### resetMonthlyCredits (Lines 149-179)
```typescript
export async function resetMonthlyCredits(userId: string): Promise<void>
```
- Called at billing cycle boundary
- Resets `flowCreditsUsed` to 0
- Sets new `creditsResetAt` (30 days out)
- Respects beta tier override

#### getCreditUsageStats (Lines 184-220)
```typescript
export async function getCreditUsageStats(userId: string): Promise<{
  used: number;
  limit: number;
  remaining: number;
  percentUsed: number;
  resetDate: Date | null;
  planTier: string;
}>
```
- Returns current usage dashboard data
- Calculates percent used
- Includes reset date

#### getUsageHistory (Lines 225-247)
```typescript
export async function getUsageHistory(
  userId: string,
  limit = 50
): Promise<Array<{
  action: string;
  creditCost: number;
  timestamp: Date;
  metadata?: any;
}>>
```
- Returns last N usage entries (default 50)
- Ordered by timestamp descending

#### withUsageTracking (Lines 252-272)
```typescript
export function withUsageTracking<T extends (...args: any[]) => Promise<any>>(
  action: UsageAction,
  fn: T
): T
```
- Middleware wrapper
- Tracks usage before executing function
- First argument must be userId
- Throws error if insufficient credits

---

## 7. PACKAGE DEPENDENCIES

### Backend (apps/backend/package.json)
**Lines 22-37** - Dependencies section:

```json
"dependencies": {
  "@fastify/cors": "^10.0.0",
  "@fastify/jwt": "^9.0.0",
  "@fastify/rate-limit": "^10.3.0",
  "@prisma/client": "^5.20.0",
  "@timeflow/scheduling": "workspace:*",
  "@timeflow/shared": "workspace:*",
  "dotenv": "^16.4.0",
  "fast-xml-parser": "^5.3.3",
  "fastify": "^5.0.0",
  "googleapis": "^144.0.0",
  "luxon": "^3.4.4",
  "openai": "^6.15.0",
  "stripe": "^20.2.0",        // ✅ INSTALLED
  "zod": "^3.23.0"
}
```

### Web (apps/web/package.json)
- **NO stripe dependency** (client-side handles via Stripe.js/Elements)
- Stripe payment forms typically loaded from Stripe CDN

### Root (package.json)
- No stripe dependency (monorepo workspace config only)

---

## 8. ENVIRONMENT VARIABLES

### Required for Stripe (Not yet in production .env example)

**Missing from `.env.production.example` lines 1-32**:
```
# Stripe Configuration (MISSING - NEEDS TO BE ADDED)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs (from Stripe dashboard)
STRIPE_PRO_MONTHLY_PRICE_ID=price_...
STRIPE_PRO_YEARLY_PRICE_ID=price_...
STRIPE_FLOW_STATE_MONTHLY_PRICE_ID=price_...
STRIPE_FLOW_STATE_YEARLY_PRICE_ID=price_...
```

**Present in development `.env` (lines 1-21)**:
- Does NOT have Stripe secrets (intentionally omitted for safety)

---

## 9. SPRINT 18 ROADMAP ENTRY

### File Path
`/Users/grantpinkerton/Desktop/Time Flow/TimeFlow/timeflow/ARCHITECT_ROADMAP_SPRINT1-17.md`  
**Lines**: 1003-1062

### Title
"Sprint 18: Subscriptions, Payments & Scale"

### Duration
Week 35-36

### Focus
Introduce subscription-based pricing and payments, wire value-adding features into tiers, and prepare platform for public scale.

### Goals
- [ ] Pricing plans (Free, Pro, Flow State) defined and implemented
- [ ] Users can start, manage, and cancel subscriptions via Stripe
- [ ] Key premium features gated and stable
- [ ] Core systems (API, scheduling, queues) monitored and scaled

### Task Breakdown

**Pricing & Plan Design**:
| ID | Task | Agent | Hours |
|----|------|-------|-------|
| 18.1 | Define pricing tiers based on `docs/PRICING_MODEL.md` | Architect | 4-6h |
| 18.2 | Design upgrade/downgrade flows and in-app messaging | Claude | 4-6h |
| 18.G1 | Document subscription flows (update `docs/PRICING_MODEL.md`) | Gemini | 4-6h |

**Payments & Subscription Infrastructure**:
| ID | Task | Agent | Hours |
|----|------|-------|-------|
| 18.3 | Integrate Stripe (create subscriptions, billing) | Codex | 8-12h |
| 18.4 | Implement webhook handlers for subscription sync | Codex | 4-6h |
| 18.5 | Build subscription management UI in Settings | Codex | 6-8h |

**Feature Gating & Value-Add**:
| ID | Task | Agent | Hours |
|----|------|-------|-------|
| 18.6 | Implement `/pricing` page | Codex | 8-12h |
| 18.7 | Create entitlement system (canUseUnlimitedAI, etc.) | Codex | 6-8h |
| 18.8 | Implement backend usage tracking & Flow Credits deduction | Codex | 10-15h |
| 18.9 | Develop credit usage UI components | Codex | 4-6h |
| 18.10 | Add upgrade prompts when limits met | Codex | 4-6h |

**Scaling & Reliability**:
| ID | Task | Agent | Hours |
|----|------|-------|-------|
| 18.15 | Review API rate limits, circuit breakers | Codex | 4-6h |
| 18.16 | Implement monitoring & alerting | Codex | 4-6h |

### Acceptance Criteria
- [ ] Pricing page (`/pricing`) is live and accurate
- [ ] Users can subscribe, manage, and see plan details
- [ ] AI Assistant respects subscription tier and credit limits
- [ ] Overuse charges correctly applied
- [ ] Basic recurring tasks, templates, streaks functional
- [ ] Core systems ready for public scale

---

## 10. SPRINT 19 CONTEXT

### File Path
`/Users/grantpinkerton/Desktop/Time Flow/TimeFlow/timeflow/docs/plans/2026-01-01-sprint-18-public-beta-launch.md`

### Current Pricing Page Status (Line 48)
"Beta is free. Paid subscriptions are coming in Sprint 19."

### Sprint 19 Scope
- **Public Beta Launch** with Google-only auth
- Beta access gating (email allowlist + "Heavy beta" tier override)
- AI cost controls (per-user quotas + global cap)
- Basic onboarding and "SaaS-grade" documentation

### Note on Subscriptions
Line 31: "**Subscriptions**: Sprint 19 (but we lay the foundations in Sprint 18)."

---

## 11. STRIPE INTEGRATION - CURRENT STATUS

### ✅ IMPLEMENTED
1. **Stripe Service** (`stripeService.ts`)
   - Customer creation/retrieval
   - Subscription creation/cancellation/upgrade-downgrade
   - Webhook event syncing
   - Plan tier and credit management

2. **Webhook Handler** (`stripeWebhookController.ts`)
   - Signature verification
   - Handles 6 event types
   - Syncs to database

3. **Usage Tracking** (`usageTrackingService.ts`)
   - Credit deduction logic
   - Monthly reset cycles
   - Usage history logging

4. **Database Models** (Prisma)
   - User subscription fields (Stripe IDs, plan tier, status, billing dates)
   - Subscription audit table
   - UsageLog for tracking

5. **Pricing Model** Documentation
   - Three tiers with clear feature boundaries
   - Flow Credits system defined
   - Overuse charge pricing

6. **Pricing Page** (Web)
   - Visual layout complete
   - Currently shows beta messaging + "coming soon"

### ❌ NOT IMPLEMENTED / MISSING

1. **Route Registration**
   - ❌ NO routes registered in `server.ts` for Stripe endpoints
   - ❌ NO payment/subscription management endpoints exposed
   - ❌ NO webhook endpoint mounted

2. **API Endpoints** (need to create)
   - ❌ `POST /api/billing/checkout-session` (create Stripe Checkout)
   - ❌ `GET /api/billing/subscription` (get user's current subscription)
   - ❌ `PUT /api/billing/subscription` (change plan)
   - ❌ `DELETE /api/billing/subscription` (cancel subscription)
   - ❌ `GET /api/billing/usage` (get credit usage stats)
   - ❌ `POST /api/billing/webhook` (Stripe webhook endpoint)
   - ❌ `POST /api/billing/customer-portal` (redirect to Stripe customer portal)

3. **Entitlement System**
   - ❌ Feature gating functions (canUseRecurringTasks(), hasAnalytics(), etc.)
   - ❌ UI-level permission checks
   - ❌ Middleware enforcement

4. **Web Frontend**
   - ❌ Settings page subscription management UI
   - ❌ Upgrade/downgrade flow components
   - ❌ Payment method management
   - ❌ Credit usage dashboard widget

5. **Environment Configuration**
   - ❌ `.env.production.example` missing Stripe secrets
   - ❌ No Stripe price ID setup instructions
   - ❌ No webhook secret configuration docs

6. **Webhook Endpoint**
   - ❌ NOT mounted in `server.ts`
   - ❌ Requires raw body for signature verification (special Fastify handling)

7. **Checkout Flow**
   - ❌ NO Stripe Checkout Session creation
   - ❌ NO payment method collection
   - ❌ NO success/cancel redirect handling

8. **Testing**
   - ❌ NO unit tests for stripeService functions
   - ❌ NO integration tests for webhook handling
   - ❌ NO E2E tests for checkout flows

9. **Documentation**
   - ❌ NO payment integration docs
   - ❌ NO Stripe dashboard setup guide
   - ❌ NO webhook testing instructions
   - ⚠️ Pricing Model doc is complete but not yet public-facing

### ⚠️ INCOMPLETE / NEEDS ATTENTION

1. **Payment Failure Notifications**
   - Line 192 in `stripeWebhookController.ts`: TODO - Send user notification

2. **Subscription Management Page**
   - Mentioned in Sprint 18 task 18.5 (6-8h remaining)
   - No UI components built yet

3. **Entitlement Checks**
   - Services created but not yet enforced at route level
   - Credits can be deducted but UI doesn't check limits upfront

---

## 12. CRITICAL MISSING PIECES FOR LAUNCH

### Phase 1: Route Registration (Required)
```typescript
// apps/backend/src/routes/billingRoutes.ts (NEEDS TO BE CREATED)
export async function registerBillingRoutes(api: FastifyInstance): Promise<void> {
  // POST /api/billing/checkout-session
  // GET /api/billing/subscription
  // PUT /api/billing/subscription
  // DELETE /api/billing/subscription
  // GET /api/billing/usage
  // POST /api/billing/webhook (raw body handling)
  // POST /api/billing/customer-portal
}

// apps/backend/src/server.ts (Lines 77-98, ADD THIS)
import { registerBillingRoutes } from './routes/billingRoutes.js';
// Inside the api registration block:
await registerBillingRoutes(api);
```

### Phase 2: Web API Client Methods
```typescript
// apps/web/src/lib/api.ts - ADD THESE:
export async function createCheckoutSession(priceId: string): Promise<{ sessionId: string }>
export async function getSubscription(): Promise<Subscription>
export async function changeSubscriptionPlan(priceId: string): Promise<void>
export async function cancelSubscription(): Promise<void>
export async function getCreditUsageStats(): Promise<CreditUsageStats>
```

### Phase 3: Settings UI Components
```typescript
// apps/web/src/app/settings/billing/page.tsx (NEEDS TO BE CREATED)
// - Display current plan tier
// - Show credit usage progress bar
// - Plan change buttons
// - Cancel subscription option
// - Payment method management link to customer portal
```

### Phase 4: Environment & Secrets
```bash
# Add to .env.production and deployment platforms:
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_MONTHLY_PRICE_ID=price_...
STRIPE_PRO_YEARLY_PRICE_ID=price_...
STRIPE_FLOW_STATE_MONTHLY_PRICE_ID=price_...
STRIPE_FLOW_STATE_YEARLY_PRICE_ID=price_...
```

---

## 13. QUICK REFERENCE: FILE LOCATIONS

| Component | File Path | Status |
|-----------|-----------|--------|
| **Pricing Page** | `apps/web/src/app/pricing/page.tsx` | ✅ Exists (placeholder) |
| **Pricing Model** | `docs/PRICING_MODEL.md` | ✅ Complete |
| **Stripe Service** | `apps/backend/src/services/stripeService.ts` | ✅ Exists |
| **Webhook Controller** | `apps/backend/src/controllers/stripeWebhookController.ts` | ✅ Exists |
| **Usage Tracking** | `apps/backend/src/services/usageTrackingService.ts` | ✅ Exists |
| **Prisma Schema** | `apps/backend/prisma/schema.prisma` | ✅ Models defined |
| **Billing Routes** | `apps/backend/src/routes/billingRoutes.ts` | ❌ NOT CREATED |
| **Web API Client** | `apps/web/src/lib/api.ts` | ⚠️ No payment methods |
| **Settings/Billing Page** | `apps/web/src/app/settings/billing/page.tsx` | ❌ NOT CREATED |
| **Roadmap** | `ARCHITECT_ROADMAP_SPRINT1-17.md` | ✅ Sprint 18 entry |
| **Production .env** | `apps/backend/.env.production.example` | ⚠️ Missing Stripe vars |

---

## SUMMARY

TimeFlow has **solid backend infrastructure** for Stripe integration (services, webhooks, database models) but is **missing the frontend route handlers and UI**. The pricing model is well-defined, but the checkout flow has not been wired end-to-end. 

**Estimated work to launch**:
- Route registration + controllers: 2-4 hours
- Web API client methods: 1-2 hours  
- Settings/billing UI: 4-6 hours
- Testing + integration: 3-4 hours
- **Total: 10-16 hours for full payment flow**

Sprint 18 task list shows this was initially scoped at **18-30 hours total for all payment/pricing work**, with much already done. The remaining work is primarily frontend/integration layers.

