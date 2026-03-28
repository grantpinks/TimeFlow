# Render Deployment Checklist - Stripe Integration

## Critical Environment Variables for Production

The backend is currently crashing on Render because Stripe environment variables are missing. Add these in the Render dashboard under **Environment** tab:

### 🔴 Required Immediately (Backend won't start without these)

```bash
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxx
```

**How to get it:**
1. Go to https://dashboard.stripe.com/apikeys
2. Toggle to "Live mode" (top right)
3. Copy the "Secret key" (starts with `sk_live_`)
4. Paste into Render env vars

### 🟡 Required for Checkout Flow (Get from Stripe Dashboard)

```bash
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx
STRIPE_PRICE_PRO_MONTHLY=price_xxxxxxxxxxxxxxxxxxxxx
STRIPE_PRICE_PRO_YEARLY=price_xxxxxxxxxxxxxxxxxxxxx
STRIPE_PRICE_FLOW_STATE_MONTHLY=price_xxxxxxxxxxxxxxxxxxxxx
STRIPE_PRICE_FLOW_STATE_YEARLY=price_xxxxxxxxxxxxxxxxxxxxx
```

**How to create Stripe Products & Prices:**

1. **Create Products** (https://dashboard.stripe.com/products):

   **Product 1: TimeFlow Pro**
   - Name: `TimeFlow Pro`
   - Description: `Proactive AI assistant, up to 3 calendars, 5 projects, 3 booking links`
   - Pricing:
     - Monthly: $5.00 USD recurring
     - Yearly: $50.00 USD recurring (describe as "2 months free")

   **Product 2: TimeFlow Flow State**
   - Name: `TimeFlow Flow State`
   - Description: `Autonomous AI, unlimited calendars/projects, Gmail integration, unlimited booking links`
   - Pricing:
     - Monthly: $11.99 USD recurring
     - Yearly: $119.90 USD recurring (describe as "2 months free")

2. **Copy Price IDs**:
   - After creating each price, click on it and copy the Price ID (starts with `price_`)
   - Add each to Render environment variables

3. **Create Webhook**:
   - Go to https://dashboard.stripe.com/webhooks
   - Click "Add endpoint"
   - Endpoint URL: `https://timeflow-wosj.onrender.com/webhooks/stripe`
   - Events to listen for:
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
   - Copy the **Signing secret** (starts with `whsec_`)

### ✅ Already Configured on Render

These should already be set, but verify they exist:

```bash
NODE_ENV=production
DATABASE_URL=postgresql://...
SESSION_SECRET=...
ENCRYPTION_KEY=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=https://timeflow-wosj.onrender.com/api/auth/google/callback
APP_BASE_URL=https://time-flow.app
OPENAI_API_KEY=...
```

## Deployment Steps

### Step 1: Add Stripe Secret Key
1. Go to Render dashboard → Your backend service → Environment
2. Add `STRIPE_SECRET_KEY` with your live Stripe key
3. Save changes (this will trigger a redeploy)
4. Wait for deploy to complete
5. Check logs - should see `✅ Server ready at http://...` instead of Stripe error

### Step 2: Set Up Stripe Products (Do This in Test Mode First)
1. Switch Stripe dashboard to **Test mode**
2. Create both products with test prices
3. Copy test price IDs
4. Test locally with test keys in `apps/backend/.env`
5. Verify checkout flow works
6. Then repeat in **Live mode** for production

### Step 3: Add Price IDs to Render
1. Add all 4 `STRIPE_PRICE_*` variables to Render
2. Redeploy

### Step 4: Configure Webhook
1. Create webhook in Stripe dashboard pointing to production URL
2. Add `STRIPE_WEBHOOK_SECRET` to Render
3. Redeploy
4. Test webhook by creating a test subscription in Stripe

### Step 5: Update Frontend Environment
Make sure Vercel (or your web host) has:
```bash
NEXT_PUBLIC_API_URL=https://timeflow-wosj.onrender.com
```

## Testing Checklist

Once deployed:

- [ ] Backend starts without Stripe errors
- [ ] `/health` endpoint returns 200
- [ ] `/api/billing/subscription` returns user's plan (requires auth)
- [ ] Pricing page loads and shows tiers
- [ ] Click "Upgrade to Pro" → Stripe Checkout opens
- [ ] Complete test payment → Redirected back to app
- [ ] User's plan updates to "PRO" in database
- [ ] Stripe webhook fires and logs in Render console
- [ ] Flow Credits limit updates (200 → 2000)

## Troubleshooting

**Issue**: Backend still crashing after adding STRIPE_SECRET_KEY
- **Check**: Make sure you saved the env var and redeployed
- **Check**: Ensure key starts with `sk_live_` (not `pk_`)
- **Check**: No extra spaces in the env var value

**Issue**: Checkout redirects but subscription not created
- **Check**: Webhook secret is correct
- **Check**: Webhook endpoint is reachable (not blocked by firewall)
- **Check**: Check Stripe webhook logs for delivery errors

**Issue**: User charged but still on free tier
- **Check**: Webhook fired successfully (check Stripe dashboard → Webhooks → Events)
- **Check**: Backend logs for webhook processing errors
- **Check**: Database `Subscription` table has entry

## Cost Estimate

**Stripe Fees** (per transaction):
- 2.9% + $0.30 per successful card charge
- Example: $5 Pro subscription = $0.445 fee → You receive $4.555

**Expected Monthly Costs**:
- 100 Pro users ($5/mo) = $500 gross, ~$455 net after Stripe fees
- 50 Flow State users ($11.99/mo) = $599.50 gross, ~$564 net after fees

## Next Steps After Deployment

1. **Monitor First Week**:
   - Watch Render logs for any Stripe errors
   - Check Stripe dashboard daily for failed payments
   - Monitor database for orphaned subscriptions

2. **Set Up Alerts**:
   - Stripe: Email notifications for failed payments
   - Render: Alert on backend crashes

3. **Plan Marketing**:
   - Announce pricing on social media
   - Email beta users about new paid tiers
   - Update landing page with clear value props

4. **Legal Review**:
   - Terms of Service mention subscriptions
   - Privacy Policy mentions Stripe
   - Refund policy clearly stated
