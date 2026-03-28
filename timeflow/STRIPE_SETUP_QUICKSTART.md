# Stripe Setup - Quick Start Guide

## 🚨 IMMEDIATE ACTION REQUIRED

Your backend is currently crashing on Render with this error:
```
Error: Neither apiKey nor config.authenticator provided
```

This is because `STRIPE_SECRET_KEY` is missing from your Render environment variables.

---

## Step 1: Add Stripe Secret Key to Render (5 minutes)

### Get Your Stripe Key
1. Go to https://dashboard.stripe.com/test/apikeys
2. **Toggle to TEST mode first** (top right - should say "Test mode")
3. Copy the **Secret key** (starts with `sk_test_`)

### Add to Render
1. Go to https://dashboard.render.com
2. Click your backend service (timeflow-wosj)
3. Go to **Environment** tab
4. Click **Add Environment Variable**
5. Add:
   - **Key**: `STRIPE_SECRET_KEY`
   - **Value**: `sk_test_...` (paste your test key)
6. Click **Save Changes**
7. Render will auto-redeploy

### Verify It Works
Wait 2-3 minutes for deploy, then check:
- Backend logs should show `✅ Server ready` (not Stripe error)
- Visit: https://timeflow-wosj.onrender.com/health
- Should return: `{"status":"ok"}`

---

## Step 2: Create Stripe Products & Prices (15 minutes)

### Create Products in Test Mode

**Product 1: TimeFlow Pro**
1. Go to https://dashboard.stripe.com/test/products
2. Click **+ Add product**
3. Fill in:
   - **Name**: `TimeFlow Pro`
   - **Description**: `Proactive AI assistant, 3 calendars, 5 projects, 3 booking links, 2,000 Flow Credits/month`

4. **Add pricing** (you'll create TWO prices for this product):

   **Price 1: Monthly**
   - Model: `Recurring`
   - Price: `$5.00`
   - Billing period: `Monthly`
   - Click **Add pricing**

   **Price 2: Yearly**
   - Click **Add another price**
   - Model: `Recurring`
   - Price: `$50.00`
   - Billing period: `Yearly`
   - Click **Add pricing**

5. Click **Save product**
6. **COPY THE PRICE IDs**:
   - Click on the Monthly price → Copy the Price ID (e.g., `price_1ABC...`)
   - Click on the Yearly price → Copy the Price ID (e.g., `price_1DEF...`)
   - Save these somewhere - you'll need them next!

**Product 2: TimeFlow Flow State**
1. Click **+ Add product** again
2. Fill in:
   - **Name**: `TimeFlow Flow State`
   - **Description**: `Autonomous AI, unlimited calendars/projects, Gmail integration, unlimited booking links, 8,000 Flow Credits/month`

3. **Add pricing**:

   **Price 1: Monthly**
   - Model: `Recurring`
   - Price: `$11.99`
   - Billing period: `Monthly`

   **Price 2: Yearly**
   - Click **Add another price**
   - Model: `Recurring`
   - Price: `$119.90`
   - Billing period: `Yearly`

4. Click **Save product**
5. **COPY THE PRICE IDs** (same as above)

---

## Step 3: Add Price IDs to Render

Go back to Render → Environment tab → Add these 4 variables:

```bash
STRIPE_PRICE_PRO_MONTHLY=price_xxxxxxxxxxxxx          # from Product 1, monthly
STRIPE_PRICE_PRO_YEARLY=price_xxxxxxxxxxxxx           # from Product 1, yearly
STRIPE_PRICE_FLOW_STATE_MONTHLY=price_xxxxxxxxxxxxx   # from Product 2, monthly
STRIPE_PRICE_FLOW_STATE_YEARLY=price_xxxxxxxxxxxxx    # from Product 2, yearly
```

Click **Save Changes** → Render will redeploy.

---

## Step 4: Set Up Stripe Webhook (10 minutes)

### Create Webhook Endpoint
1. Go to https://dashboard.stripe.com/test/webhooks
2. Click **+ Add endpoint**
3. **Endpoint URL**: `https://timeflow-wosj.onrender.com/webhooks/stripe`
4. **Events to send**:
   - Click **Select events**
   - Check these boxes:
     - ✅ `customer.subscription.created`
     - ✅ `customer.subscription.updated`
     - ✅ `customer.subscription.deleted`
     - ✅ `invoice.payment_succeeded`
     - ✅ `invoice.payment_failed`
5. Click **Add endpoint**

### Add Webhook Secret to Render
1. After creating the endpoint, Stripe shows you a **Signing secret** (starts with `whsec_`)
2. Copy it
3. Go back to Render → Environment → Add:
   - **Key**: `STRIPE_WEBHOOK_SECRET`
   - **Value**: `whsec_...` (paste the signing secret)
4. Save Changes

---

## Step 5: Test the Complete Flow (5 minutes)

### Test Checkout
1. Go to https://time-flow.app/pricing
2. Toggle to **Annual** billing
3. Click **Get Pro** button
4. Should redirect to Stripe Checkout
5. Use test card: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., 12/25)
   - CVC: Any 3 digits (e.g., 123)
   - ZIP: Any 5 digits (e.g., 12345)
6. Complete checkout
7. Should redirect back to time-flow.app/settings?billing=success

### Verify Subscription Created
1. Go to https://dashboard.stripe.com/test/subscriptions
2. Should see your new subscription
3. Go to https://dashboard.stripe.com/test/webhooks
4. Click your webhook endpoint
5. Should see events delivered successfully

### Verify in Database
Check your database that the user's:
- `planTier` updated to `PRO`
- `flowCreditsLimit` updated to `2000`
- `stripeCustomerId` is set
- `stripeSubscriptionId` is set

---

## Step 6: Go Live (When Ready)

**DO NOT do this until you've tested thoroughly in test mode!**

1. **Switch Stripe to Live Mode**
   - Toggle to Live mode (top right in Stripe dashboard)
   - Create the same products/prices
   - Copy the LIVE Price IDs

2. **Update Render Environment Variables**
   - Replace `STRIPE_SECRET_KEY` with live key (`sk_live_...`)
   - Replace all 4 `STRIPE_PRICE_*` variables with live Price IDs
   - Create webhook in live mode, update `STRIPE_WEBHOOK_SECRET`

3. **Test with Real Card** (your own)
   - Complete checkout
   - Cancel immediately after if you don't want to keep it

---

## Troubleshooting

### "Failed to create checkout session"
- Check Render logs for errors
- Ensure `STRIPE_SECRET_KEY` is set
- Ensure Price IDs are correct (start with `price_`)

### Checkout opens but payment fails
- Check Stripe Dashboard → Events for error details
- Ensure you're using a valid test card

### Webhook not firing
- Check Stripe Dashboard → Webhooks → Your endpoint → Events
- Look for delivery failures
- Ensure webhook URL is exactly: `https://timeflow-wosj.onrender.com/webhooks/stripe`
- Check Render logs for webhook processing errors

### User's plan doesn't update after payment
- Check webhook was delivered (Stripe dashboard)
- Check Render logs for webhook processing errors
- Verify `STRIPE_WEBHOOK_SECRET` matches Stripe dashboard

---

## Quick Reference: Environment Variables

**Required for Payments to Work:**
```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_YEARLY=price_...
STRIPE_PRICE_FLOW_STATE_MONTHLY=price_...
STRIPE_PRICE_FLOW_STATE_YEARLY=price_...
```

**Test Credit Cards:**
- Success: `4242 4242 4242 4242`
- Declined: `4000 0000 0000 0002`
- Requires auth: `4000 0025 0000 3155`

---

## Next Steps After Setup

1. **Wire Usage Tracking** - Enforce Flow Credit limits
2. **Add Overuse Billing** - Charge for credits over limit
3. **Build Account Settings** - Show current plan, credits used, upgrade/cancel
4. **Add Billing Portal** - Let users manage payment methods (already coded at `/api/billing/manage`)
5. **Email Notifications** - Alert users when credits running low

---

**Need Help?**
- Stripe Docs: https://stripe.com/docs/billing/subscriptions/overview
- Render Docs: https://render.com/docs/environment-variables
