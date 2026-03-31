'use client';

import Link from 'next/link';
import Image from 'next/image';
import { track } from '@/lib/analytics';

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center flex-shrink-0">
            <Image 
              src="/branding/main_logo.png" 
              alt="TimeFlow" 
              width={120}
              height={32}
              className="w-28 sm:w-36 h-auto"
              priority 
            />
          </Link>
          <nav className="flex items-center gap-3 sm:gap-6">
            <Link href="/" className="text-gray-600 hover:text-teal-600 active:text-teal-700 transition-colors text-sm sm:text-base min-h-[44px] inline-flex items-center">Home</Link>
            <Link href="/about" className="text-gray-600 hover:text-teal-600 active:text-teal-700 transition-colors text-sm sm:text-base min-h-[44px] inline-flex items-center hidden sm:inline-flex">About</Link>
            <Link href="/pricing" className="text-gray-600 hover:text-teal-600 active:text-teal-700 transition-colors text-sm sm:text-base min-h-[44px] inline-flex items-center">Pricing</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <section className="grid lg:grid-cols-[1.2fr_0.8fr] gap-8 sm:gap-12 items-center mb-12 sm:mb-16">
          <div>
            <span className="inline-flex items-center rounded-full bg-teal-50 text-teal-700 px-3 py-1 text-xs font-semibold uppercase tracking-widest">
              Contact
            </span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mt-3 sm:mt-4 mb-4 sm:mb-6">Get in Touch</h1>
            <p className="text-base sm:text-xl text-gray-600 leading-relaxed">
              We&apos;re a small team, but we read every message. Reach out for support, partnerships, or press.
            </p>
          </div>
          <div className="bg-gradient-to-br from-teal-50 to-orange-50 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-xl border border-teal-100">
            <Image
              src="/branding/flow-default.png"
              alt="TimeFlow mascot"
              width={320}
              height={320}
              className="mx-auto w-full max-w-[280px] sm:max-w-full h-auto"
            />
          </div>
        </section>

        <div className="grid md:grid-cols-2 gap-6 sm:gap-12">
          {/* Support */}
          <div className="bg-gray-50 rounded-xl sm:rounded-2xl p-6 sm:p-8 border border-gray-100 shadow-sm">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">Support</h2>
            <p className="text-sm sm:text-base text-gray-600 mb-5 sm:mb-6">
              Need help with TimeFlow? Check our help docs or reach out directly.
            </p>
            <div className="space-y-3 sm:space-y-4">
              <Link
                href="/help"
                onClick={() => track('homepage_navigation_clicked', { destination: 'help-center' })}
                className="block px-6 py-3.5 min-h-[48px] bg-white border border-gray-200 rounded-lg text-gray-900 font-medium hover:border-teal-600 active:border-teal-700 transition-colors text-center text-sm sm:text-base"
              >
                Visit Help Center
              </Link>
              <a
                href="mailto:support@time-flow.app"
                onClick={() => track('homepage_cta_clicked', { cta_text: 'Email Support', location: 'contact-support' })}
                className="block px-6 py-3.5 min-h-[48px] bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 active:bg-teal-800 transition-colors text-center text-sm sm:text-base"
              >
                Email Support
              </a>
            </div>
          </div>

          {/* General Inquiries */}
          <div className="bg-gray-50 rounded-xl sm:rounded-2xl p-6 sm:p-8 border border-gray-100 shadow-sm">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">General Inquiries</h2>
            <p className="text-sm sm:text-base text-gray-600 mb-5 sm:mb-6">
              Questions about pricing, partnerships, or press? We&apos;d love to hear from you.
            </p>
            <div className="space-y-3 sm:space-y-4">
              <a
                href="mailto:hello@time-flow.app"
                onClick={() => track('homepage_cta_clicked', { cta_text: 'hello@time-flow.app', location: 'contact-general' })}
                className="block px-6 py-3.5 min-h-[48px] bg-white border border-gray-200 rounded-lg text-gray-900 font-medium hover:border-teal-600 active:border-teal-700 transition-colors text-center text-sm sm:text-base"
              >
                hello@time-flow.app
              </a>
            </div>
          </div>
        </div>

        {/* FAQ Preview */}
        <div className="mt-12 sm:mt-16 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-5 sm:mb-6">Common Questions</h2>
          <div className="space-y-5 sm:space-y-6 text-left max-w-2xl mx-auto">
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
              <div key={faq.q} className="bg-gray-50 rounded-xl p-5 sm:p-6 border border-gray-100 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">{faq.q}</h3>
                <p className="text-gray-600 text-sm sm:text-base">{faq.a}</p>
              </div>
            ))}
          </div>
          <Link
            href="/help"
            onClick={() => track('homepage_navigation_clicked', { destination: 'help-faqs' })}
            className="inline-flex items-center mt-6 sm:mt-8 text-teal-600 hover:text-teal-700 active:text-teal-800 font-medium min-h-[44px] px-3"
          >
            View all FAQs →
          </Link>
        </div>
      </main>

      <footer className="border-t border-gray-200 py-6 sm:py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center text-gray-600 text-xs sm:text-sm">
          © 2025 TimeFlow. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
