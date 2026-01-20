'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <Image src="/branding/main_logo.png" alt="TimeFlow" width={150} height={40} priority />
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-20">
        <section className="grid lg:grid-cols-[1.2fr_0.8fr] gap-12 items-center mb-12">
          <div>
            <span className="inline-flex items-center rounded-full bg-teal-50 text-teal-700 px-3 py-1 text-xs font-semibold uppercase tracking-widest">
              Legal
            </span>
            <h1 className="text-5xl font-bold text-gray-900 mt-4 mb-4">Terms of Service</h1>
            <p className="text-lg text-gray-600 leading-relaxed">
              These terms keep TimeFlow safe and fair for everyone. Please review them before using the service.
            </p>
            <p className="text-gray-500 mt-4">Last Updated: January 20, 2026</p>
          </div>
          <div className="bg-gradient-to-br from-teal-50 to-orange-50 rounded-3xl p-8 shadow-xl border border-teal-100">
            <Image
              src="/branding/flow-default.png"
              alt="TimeFlow mascot"
              width={360}
              height={360}
              className="mx-auto"
            />
          </div>
        </section>

        <div className="prose prose-lg max-w-none">
          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-700 leading-relaxed">
              By accessing or using TimeFlow ("Service"), you agree to be bound by these Terms of Service
              ("Terms"). If you do not agree, do not use the Service.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">2. Service Description</h2>
            <p className="text-gray-700 leading-relaxed">
              TimeFlow is an AI-powered scheduling assistant that helps you manage tasks, emails, habits,
              and calendar events. The Service integrates with Google Calendar and Gmail.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">3. Beta Terms</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              TimeFlow is currently in beta:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>The Service is provided free of charge during the beta period</li>
              <li>Features may change without notice</li>
              <li>We may limit or suspend access to maintain service quality</li>
              <li>Beta users will receive advance notice before paid tiers launch</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">4. User Accounts</h2>
            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">4.1 Account Creation</h3>
            <p className="text-gray-700 leading-relaxed">
              You must sign in with a valid Google account. You are responsible for maintaining
              the security of your account credentials.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">4.2 Account Eligibility</h3>
            <p className="text-gray-700 leading-relaxed">
              You must be at least 13 years old to use TimeFlow. By creating an account, you represent
              that you meet this requirement.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">4.3 Account Termination</h3>
            <p className="text-gray-700 leading-relaxed">
              You may delete your account at any time from Settings. We may suspend or terminate
              accounts that violate these Terms.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">5. Acceptable Use</h2>
            <p className="text-gray-700 leading-relaxed mb-4">You agree NOT to:</p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Use the Service for illegal activities</li>
              <li>Attempt to reverse engineer, hack, or disrupt the Service</li>
              <li>Share your account with others</li>
              <li>Use the Service to spam or harass others</li>
              <li>Scrape or automate access beyond normal use</li>
              <li>Resell or redistribute the Service</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">6. Data and Privacy</h2>
            <p className="text-gray-700 leading-relaxed">
              Your use of the Service is governed by our{' '}
              <Link href="/privacy" className="text-teal-600 hover:underline">Privacy Policy</Link>.
              By using TimeFlow, you consent to our data practices as described.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">7. Intellectual Property</h2>
            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">7.1 TimeFlow Property</h3>
            <p className="text-gray-700 leading-relaxed">
              All content, features, and functionality (including software, UI, logos) are owned by
              TimeFlow and protected by copyright and trademark laws.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">7.2 Your Content</h3>
            <p className="text-gray-700 leading-relaxed">
              You retain ownership of your tasks, calendar data, and preferences. By using the Service,
              you grant us a limited license to process this data to provide the Service.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">8. Third-Party Integrations</h2>
            <p className="text-gray-700 leading-relaxed">
              TimeFlow integrates with Google Calendar and Gmail. Your use of these services is
              governed by Google's Terms of Service and Privacy Policy, not ours.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">9. Disclaimers</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>We do not guarantee uninterrupted or error-free service</li>
              <li>AI recommendations are suggestions, not guarantees</li>
              <li>You are responsible for verifying AI-generated schedules</li>
              <li>We are not liable for missed deadlines or scheduling conflicts</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">10. Limitation of Liability</h2>
            <p className="text-gray-700 leading-relaxed">
              To the maximum extent permitted by law, TimeFlow shall not be liable for any indirect,
              incidental, special, or consequential damages arising from your use of the Service.
              Our total liability shall not exceed $100 USD.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">11. Indemnification</h2>
            <p className="text-gray-700 leading-relaxed">
              You agree to indemnify and hold TimeFlow harmless from any claims, damages, or expenses
              arising from your use of the Service or violation of these Terms.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">12. Changes to Terms</h2>
            <p className="text-gray-700 leading-relaxed">
              We may modify these Terms at any time. We'll notify you of significant changes via
              email or app notification. Continued use after changes constitutes acceptance.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">13. Governing Law</h2>
            <p className="text-gray-700 leading-relaxed">
              These Terms are governed by the laws of [State/Country - to be determined]. Disputes
              shall be resolved in the courts of [Jurisdiction - to be determined].
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">14. Contact Us</h2>
            <p className="text-gray-700 leading-relaxed">
              Questions about these Terms? Contact us at:
            </p>
            <p className="text-gray-700 leading-relaxed mt-4">
              Email: <a href="mailto:legal@timeflow.app" className="text-teal-600 hover:underline">legal@timeflow.app</a><br />
              Address: [To be added - company registered address]
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-gray-200 py-8 mt-16">
        <div className="max-w-7xl mx-auto px-6 text-center text-gray-600 text-sm">
          © 2025 TimeFlow. All rights reserved. | <Link href="/privacy" className="hover:text-teal-600">Privacy</Link>
        </div>
      </footer>
    </div>
  );
}
