'use client';

import Link from 'next/link';
import Image from 'next/image';
import { getGoogleAuthUrl } from '@/lib/api';
import { track } from '@/lib/analytics';

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
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
              onClick={() => track('pricing_nav_clicked', { destination: 'home' })}
              className="text-gray-600 hover:text-teal-600 font-medium transition-colors"
            >
              Home
            </Link>
            <a
              href={getGoogleAuthUrl()}
              onClick={() => track('pricing_cta_clicked', { cta_text: 'Join Beta', location: 'header' })}
              className="bg-teal-600 text-white px-5 py-2 rounded-lg hover:bg-teal-700 font-medium transition-colors"
            >
              Join the Beta
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Pricing
          </h1>
          <p className="text-lg text-gray-600">
            <span className="font-semibold text-gray-900">Beta is free.</span> Paid subscriptions are coming in Sprint 19.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="rounded-2xl border border-gray-200 p-8 bg-white shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Beta</h2>
            <div className="flex items-baseline gap-2 mb-6">
              <span className="text-5xl font-bold text-gray-900">$0</span>
              <span className="text-gray-600">during beta</span>
            </div>

            <ul className="space-y-3 mb-8 text-gray-700">
              <li className="flex items-start gap-3">
                <span className="text-teal-600">✓</span>
                Google Calendar sync
              </li>
              <li className="flex items-start gap-3">
                <span className="text-teal-600">✓</span>
                Tasks + smart scheduling
              </li>
              <li className="flex items-start gap-3">
                <span className="text-teal-600">✓</span>
                AI assistant (with fair-use limits)
              </li>
            </ul>

            <a
              href={getGoogleAuthUrl()}
              onClick={() => track('pricing_cta_clicked', { cta_text: 'Join Beta Free', location: 'beta-card' })}
              className="block w-full text-center px-6 py-3 rounded-lg font-semibold bg-teal-600 text-white hover:bg-teal-700 transition-colors"
            >
              Join the Beta — Free
            </a>
          </div>

          <div className="rounded-2xl border border-gray-200 p-8 bg-gradient-to-br from-gray-50 to-white">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Subscriptions</h2>
            <p className="text-gray-600 mb-6">
              We’re building simple, affordable tiers that match real usage. Billing lands in Sprint 19.
            </p>

            <div className="rounded-xl border border-gray-200 bg-white p-5 mb-6">
              <p className="text-sm text-gray-600 mb-1">What you can expect</p>
              <ul className="space-y-2 text-gray-800">
                <li>• Higher AI limits</li>
                <li>• Power-user scheduling features</li>
                <li>• Team features later (optional)</li>
              </ul>
            </div>

            <Link
              href="/contact"
              onClick={() => track('pricing_cta_clicked', { cta_text: 'Contact', location: 'subscriptions-card' })}
              className="block w-full text-center px-6 py-3 rounded-lg font-semibold bg-gray-900 text-white hover:bg-black transition-colors"
            >
              Contact us
            </Link>

            <p className="text-xs text-gray-500 mt-3 text-center">
              Want early input on pricing? Tell us what you’d pay and why.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}


