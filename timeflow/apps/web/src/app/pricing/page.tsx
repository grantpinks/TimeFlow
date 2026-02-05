'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getGoogleAuthUrl, createCheckoutSession } from '@/lib/api';
import { track } from '@/lib/analytics';

// Plan definitions — prices match docs/PRICING_MODEL.md
const PLANS = [
  {
    key: 'starter',
    name: 'Starter',
    price: { monthly: 0, yearly: 0 },
    planKeys: { monthly: null as string | null, yearly: null as string | null },
    credits: 200,
    creditsLabel: '200 credits/mo',
    highlight: false,
    cta: 'Join Beta — Free',
    description: 'Everything you need to get started with AI-powered scheduling.',
    features: [
      'Basic task creation & scheduling',
      'Google Calendar sync (1 calendar)',
      'AI Assistant — reactive mode',
      '200 Flow Credits per month',
      'Simple habit tracking',
    ],
  },
  {
    key: 'pro',
    name: 'Pro',
    price: { monthly: 5, yearly: 50 },
    planKeys: { monthly: 'PRO_MONTHLY', yearly: 'PRO_YEARLY' },
    credits: 2000,
    creditsLabel: '2,000 credits/mo',
    highlight: true,
    cta: 'Get Pro',
    description: 'More power, more AI, more flexibility for the busy professional.',
    features: [
      'Everything in Starter',
      'Advanced scheduling (subtasks, recurring, priorities)',
      'Up to 3 calendar syncs',
      'AI Assistant — proactive mode',
      '2,000 Flow Credits per month',
      'Up to 3 booking links',
      '$2 / 1,000 extra credits if you go over',
    ],
  },
  {
    key: 'flow_state',
    name: 'Flow State',
    price: { monthly: 11.99, yearly: 119.90 },
    planKeys: { monthly: 'FLOW_STATE_MONTHLY', yearly: 'FLOW_STATE_YEARLY' },
    credits: 8000,
    creditsLabel: '8,000 credits/mo',
    highlight: false,
    cta: 'Get Flow State',
    description: 'Autopilot-grade productivity. Let TimeFlow handle the heavy lifting.',
    features: [
      'Everything in Pro',
      'Unlimited projects & calendars',
      'AI Assistant — autonomous mode',
      '8,000 Flow Credits per month',
      'Deep email integration (Gmail)',
      'Unlimited booking links',
      'Group scheduling',
      '$1.50 / 1,000 extra credits if you go over',
    ],
  },
];

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);
  const [loading, setLoading] = useState<string | null>(null); // which plan is being checked out

  const handleCheckout = async (plan: (typeof PLANS)[number]) => {
    const planKey = annual ? plan.planKeys.yearly : plan.planKeys.monthly;
    if (!planKey) return; // Free plan — no checkout

    setLoading(plan.key);
    track('billing.checkout_started', { plan: plan.key, billing: annual ? 'yearly' : 'monthly' });

    try {
      const { url } = await createCheckoutSession(planKey);
      if (url) {
        window.location.href = url;
      }
    } catch (err) {
      console.error('Checkout failed:', err);
      alert('Failed to start checkout. Please try again or contact support.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <Image
              src="/branding/main_logo.png"
              alt="TimeFlow"
              width={150}
              height={40}
              priority
            />
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              onClick={() => track('homepage_navigation_clicked', { destination: 'home' })}
              className="text-gray-600 hover:text-teal-600 font-medium transition-colors"
            >
              Home
            </Link>
            <a
              href={getGoogleAuthUrl()}
              onClick={() => track('homepage_cta_clicked', { cta_text: 'Join Beta', location: 'header' })}
              className="bg-teal-600 text-white px-5 py-2 rounded-lg hover:bg-teal-700 font-medium transition-colors"
            >
              Join the Beta
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-16">
        {/* Hero */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Start free. Upgrade when you're ready. No hidden fees — just more AI power when you need it.
          </p>
        </div>

        {/* Annual / Monthly Toggle */}
        <div className="flex items-center justify-center gap-4 mb-14">
          <span className={`text-sm font-medium ${!annual ? 'text-gray-900' : 'text-gray-500'}`}>Monthly</span>
          <button
            onClick={() => setAnnual(!annual)}
            className={`relative w-14 h-7 rounded-full transition-colors ${annual ? 'bg-teal-600' : 'bg-gray-300'}`}
            aria-label="Toggle annual billing"
          >
            <span
              className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${annual ? 'translate-x-7' : 'translate-x-0'}`}
            />
          </button>
          <span className={`text-sm font-medium ${annual ? 'text-gray-900' : 'text-gray-500'}`}>
            Annual <span className="text-teal-600 font-semibold">(save ~17%)</span>
          </span>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {PLANS.map((plan) => {
            const price = annual ? plan.price.yearly : plan.price.monthly;
            const isFree = plan.price.monthly === 0;
            const isHighlight = plan.highlight;

            return (
              <div
                key={plan.key}
                className={`relative rounded-2xl border p-8 flex flex-col ${
                  isHighlight
                    ? 'border-teal-500 bg-teal-50 shadow-lg ring-2 ring-teal-500'
                    : 'border-gray-200 bg-white shadow-sm'
                }`}
              >
                {/* "Most Popular" badge */}
                {isHighlight && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-teal-600 text-white text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wide">
                      Most Popular
                    </span>
                  </div>
                )}

                {/* Plan name */}
                <h2 className="text-xl font-bold text-gray-900 mb-1">{plan.name}</h2>
                <p className="text-sm text-gray-500 mb-5">{plan.description}</p>

                {/* Price */}
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-5xl font-bold text-gray-900">
                    ${isFree ? '0' : annual ? (price / 12).toFixed(2) : price.toFixed(2)}
                  </span>
                  <span className="text-gray-500 text-sm">/month</span>
                </div>
                {annual && !isFree && (
                  <p className="text-xs text-teal-600 font-medium mb-4">
                    Billed ${price.toFixed(2)} annually
                  </p>
                )}
                {!annual && !isFree && <p className="text-xs text-gray-400 mb-4">&nbsp;</p>}
                {isFree && <p className="text-xs text-gray-400 mb-4">&nbsp;</p>}

                {/* Credits badge */}
                <div className="inline-flex items-center gap-1.5 bg-white border border-gray-200 rounded-full px-3 py-1 mb-6 w-fit">
                  <span className="text-xs font-semibold text-teal-700">{plan.creditsLabel}</span>
                </div>

                {/* Features list */}
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="text-teal-600 mt-0.5 flex-shrink-0">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                      <span className="text-sm text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                {isFree ? (
                  <a
                    href={getGoogleAuthUrl()}
                    onClick={() => track('homepage_cta_clicked', { cta_text: plan.cta, location: 'pricing-card' })}
                    className="block w-full text-center px-6 py-3 rounded-lg font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-colors"
                  >
                    {plan.cta}
                  </a>
                ) : (
                  <button
                    onClick={() => handleCheckout(plan)}
                    disabled={loading === plan.key}
                    className={`block w-full text-center px-6 py-3 rounded-lg font-semibold transition-colors ${
                      isHighlight
                        ? 'bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50'
                        : 'bg-gray-900 text-white hover:bg-black disabled:opacity-50'
                    }`}
                  >
                    {loading === plan.key ? 'Opening checkout...' : plan.cta}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* FAQ / Notes */}
        <div className="max-w-3xl mx-auto mt-16 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Questions?</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-left">
            <div>
              <h4 className="text-sm font-semibold text-gray-800 mb-1">What are Flow Credits?</h4>
              <p className="text-sm text-gray-600">
                Flow Credits power AI features like scheduling suggestions, email drafts, and proactive coaching. Each action costs a small number of credits, refreshed monthly.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-800 mb-1">Can I cancel anytime?</h4>
              <p className="text-sm text-gray-600">
                Yes. Canceling takes effect at the end of your current billing period — you keep full access until then.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-800 mb-1">What happens if I run out of credits?</h4>
              <p className="text-sm text-gray-600">
                On paid plans, you can go over at a small per-block charge. On the free plan, AI features pause until the next month.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-800 mb-1">Do I need a credit card for the free tier?</h4>
              <p className="text-sm text-gray-600">
                No. The free tier requires only a Google account to sign in. No payment info needed.
              </p>
            </div>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-gray-400 mt-12">
          All prices in USD. Annual billing is charged as a single payment at the start of each year.
        </p>
      </main>
    </div>
  );
}
