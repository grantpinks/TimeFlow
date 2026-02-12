'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function PrivacyPage() {
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
            <h1 className="text-5xl font-bold text-gray-900 mt-4 mb-4">Privacy Policy</h1>
            <p className="text-lg text-gray-600 leading-relaxed">
              We build TimeFlow with privacy in mind. This policy explains what we collect, why we collect it,
              and how you stay in control of your data.
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
            <h2 className="text-3xl font-bold text-gray-900 mb-4">1. Introduction</h2>
            <p className="text-gray-700 leading-relaxed">
              TimeFlow (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy
              explains how we collect, use, disclose, and safeguard your information when you use our
              AI scheduling assistant service.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">2. Information We Collect</h2>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">2.1 Account Information</h3>
            <p className="text-gray-700 leading-relaxed">
              When you sign up with Google OAuth, we collect:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Email address</li>
              <li>Google account ID</li>
              <li>Profile information (name, profile picture)</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">2.2 Calendar Data</h3>
            <p className="text-gray-700 leading-relaxed">
              With your permission, we access:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Google Calendar events (title, time, duration, attendees)</li>
              <li>Calendar metadata (timezone, default calendar)</li>
              <li>We create new events for scheduled tasks</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">2.3 Email Data (Optional)</h3>
            <p className="text-gray-700 leading-relaxed">
              If you enable email categorization:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Gmail message metadata (sender, subject, date)</li>
              <li>We DO NOT store full email content</li>
              <li>Category labels sync back to Gmail</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">2.4 Usage Data</h3>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Task creation and scheduling activity</li>
              <li>AI assistant conversation logs (for improvement)</li>
              <li>Feature usage analytics (anonymized)</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">3. How We Use Your Information</h2>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li><strong>Provide Services:</strong> Schedule tasks, categorize emails, manage habits</li>
              <li><strong>Improve AI:</strong> Train our AI assistant to give better recommendations</li>
              <li><strong>Support:</strong> Respond to your questions and troubleshoot issues</li>
              <li><strong>Security:</strong> Detect and prevent fraud or abuse</li>
              <li><strong>Analytics:</strong> Understand how users interact with TimeFlow (anonymized)</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">4. Data Security</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We take security seriously:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li><strong>Encryption:</strong> Google OAuth refresh tokens are encrypted at rest using AES-256-GCM</li>
              <li><strong>HTTPS:</strong> All data in transit uses TLS encryption</li>
              <li><strong>Access Control:</strong> Only authorized personnel can access production data</li>
              <li><strong>Regular Audits:</strong> We conduct security reviews before major releases</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">5. Data Sharing</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              <strong>We do not sell your data.</strong> We share information only in these cases:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li><strong>Service Providers:</strong> Cloud hosting (Render, Supabase), AI services (OpenAI) under strict contracts</li>
              <li><strong>Legal Requirements:</strong> If required by law or to protect rights and safety</li>
              <li><strong>Business Transfers:</strong> In the event of a merger or acquisition (with notice to you)</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">6. Your Rights</h2>
            <p className="text-gray-700 leading-relaxed mb-4">You have the right to:</p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li><strong>Access:</strong> Request a copy of your data</li>
              <li><strong>Delete:</strong> Request deletion of your account and data</li>
              <li><strong>Correct:</strong> Update inaccurate information</li>
              <li><strong>Revoke:</strong> Revoke Google Calendar/Gmail access at any time</li>
              <li><strong>Export:</strong> Download your tasks and calendar data</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              Contact <a href="mailto:privacy@time-flow.app" className="text-teal-600 hover:underline">privacy@time-flow.app</a> to exercise these rights.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">7. Third-Party Services</h2>
            <p className="text-gray-700 leading-relaxed">
              TimeFlow integrates with:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li><strong>Google:</strong> Calendar and Gmail APIs (see <a href="https://policies.google.com/privacy" className="text-teal-600 hover:underline" target="_blank">Google Privacy Policy</a>)</li>
              <li><strong>OpenAI:</strong> AI assistant powered by GPT models (see <a href="https://openai.com/policies/privacy-policy" className="text-teal-600 hover:underline" target="_blank">OpenAI Privacy Policy</a>)</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">8. Data Retention</h2>
            <p className="text-gray-700 leading-relaxed">
              We retain your data as long as your account is active. After account deletion:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Personal data deleted within 30 days</li>
              <li>Anonymized analytics retained for product improvement</li>
              <li>Backups purged within 90 days</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">9. Children&apos;s Privacy</h2>
            <p className="text-gray-700 leading-relaxed">
              TimeFlow is not intended for users under 13. We do not knowingly collect data from children.
              If you believe we have collected data from a child, contact us immediately.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">10. Changes to This Policy</h2>
            <p className="text-gray-700 leading-relaxed">
              We may update this Privacy Policy. We&apos;ll notify you via email or app notification for
              significant changes. Continued use after changes constitutes acceptance.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">11. Contact Us</h2>
            <p className="text-gray-700 leading-relaxed">
              Questions about this Privacy Policy? Contact us at:
            </p>
            <p className="text-gray-700 leading-relaxed mt-4">
              Email: <a href="mailto:privacy@time-flow.app" className="text-teal-600 hover:underline">privacy@time-flow.app</a><br />
              Address: [To be added - company registered address]
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-gray-200 py-8 mt-16">
        <div className="max-w-7xl mx-auto px-6 text-center text-gray-600 text-sm">
          © 2025 TimeFlow. All rights reserved. | <Link href="/terms" className="hover:text-teal-600">Terms</Link>
        </div>
      </footer>
    </div>
  );
}
