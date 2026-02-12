'use client';

import Link from 'next/link';
import Image from 'next/image';
import { track } from '@/lib/analytics';

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <Image src="/branding/main_logo.png" alt="TimeFlow" width={150} height={40} priority />
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/" className="text-gray-600 hover:text-teal-600">Home</Link>
            <Link href="/about" className="text-gray-600 hover:text-teal-600">About</Link>
            <Link href="/pricing" className="text-gray-600 hover:text-teal-600">Pricing</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-20">
        <section className="grid lg:grid-cols-[1.2fr_0.8fr] gap-12 items-center mb-16">
          <div>
            <span className="inline-flex items-center rounded-full bg-teal-50 text-teal-700 px-3 py-1 text-xs font-semibold uppercase tracking-widest">
              Contact
            </span>
            <h1 className="text-5xl font-bold text-gray-900 mt-4 mb-6">Get in Touch</h1>
            <p className="text-xl text-gray-600 leading-relaxed">
              We&apos;re a small team, but we read every message. Reach out for support, partnerships, or press.
            </p>
          </div>
          <div className="bg-gradient-to-br from-teal-50 to-orange-50 rounded-3xl p-8 shadow-xl border border-teal-100">
            <Image
              src="/branding/flow-default.png"
              alt="TimeFlow mascot"
              width={320}
              height={320}
              className="mx-auto"
            />
          </div>
        </section>

        <div className="grid md:grid-cols-2 gap-12">
          {/* Support */}
          <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Support</h2>
            <p className="text-gray-600 mb-6">
              Need help with TimeFlow? Check our help docs or reach out directly.
            </p>
            <div className="space-y-4">
              <Link
                href="/help"
                onClick={() => track('homepage_navigation_clicked', { destination: 'help-center' })}
                className="block px-6 py-3 bg-white border border-gray-200 rounded-lg text-gray-900 font-medium hover:border-teal-600 transition-colors text-center"
              >
                Visit Help Center
              </Link>
              <a
                href="mailto:support@time-flow.app"
                onClick={() => track('homepage_cta_clicked', { cta_text: 'Email Support', location: 'contact-support' })}
                className="block px-6 py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors text-center"
              >
                Email Support
              </a>
            </div>
          </div>

          {/* General Inquiries */}
          <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">General Inquiries</h2>
            <p className="text-gray-600 mb-6">
              Questions about pricing, partnerships, or press? We&apos;d love to hear from you.
            </p>
            <div className="space-y-4">
              <a
                href="mailto:hello@time-flow.app"
                onClick={() => track('homepage_cta_clicked', { cta_text: 'hello@time-flow.app', location: 'contact-general' })}
                className="block px-6 py-3 bg-white border border-gray-200 rounded-lg text-gray-900 font-medium hover:border-teal-600 transition-colors text-center"
              >
                hello@time-flow.app
              </a>
            </div>
          </div>
        </div>

        {/* FAQ Preview */}
        <div className="mt-16 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Common Questions</h2>
          <div className="space-y-6 text-left max-w-2xl mx-auto">
            {[
              {
                q: 'Is TimeFlow really free during beta?',
                a: 'Yes! Beta users get full access to all features at no cost. We&apos;ll announce pricing before charging anyone.',
              },
              {
                q: 'What happens to my data?',
                a: 'Your calendar data and tasks stay private. We encrypt sensitive data (like Google tokens) and never sell your information. See our Privacy Policy for details.',
              },
              {
                q: 'Can I use TimeFlow with Apple Calendar?',
                a: 'Not yet. We currently support Google Calendar, with Apple Calendar coming in a future sprint.',
              },
            ].map((faq) => (
              <div key={faq.q} className="bg-gray-50 rounded-xl p-6 border border-gray-100 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-2">{faq.q}</h3>
                <p className="text-gray-600">{faq.a}</p>
              </div>
            ))}
          </div>
          <Link
            href="/help"
            onClick={() => track('homepage_navigation_clicked', { destination: 'help-faqs' })}
            className="inline-block mt-8 text-teal-600 hover:text-teal-700 font-medium"
          >
            View all FAQs →
          </Link>
        </div>
      </main>

      <footer className="border-t border-gray-200 py-8">
        <div className="max-w-7xl mx-auto px-6 text-center text-gray-600 text-sm">
          © 2025 TimeFlow. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
