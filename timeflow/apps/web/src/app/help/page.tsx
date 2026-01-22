'use client';

import Link from 'next/link';
import Image from 'next/image';
import { track } from '@/lib/analytics';

export default function HelpPage() {
  const sections = [
    {
      title: 'Getting Started',
      items: [
        {
          q: 'How do I sign up for TimeFlow?',
          a: 'Click "Get Started Free" on the homepage and sign in with your Google account. TimeFlow needs Google Calendar access to schedule tasks automatically.',
        },
        {
          q: 'Is TimeFlow really free?',
          a: 'Yes! During our beta period, all features are completely free. We\'ll announce pricing before charging anyone.',
        },
        {
          q: 'What data does TimeFlow access?',
          a: 'TimeFlow reads your Google Calendar events to avoid scheduling conflicts and creates new events for scheduled tasks. We never access email content without explicit permission (for email categorization features).',
        },
      ],
    },
    {
      title: 'Using the AI Assistant',
      items: [
        {
          q: 'How do I talk to the AI assistant?',
          a: 'Go to the Assistant page and type naturally, like "Schedule my tasks for tomorrow" or "What does my week look like?" The AI understands conversational language.',
        },
        {
          q: 'What can the AI assistant do?',
          a: 'Flow can schedule tasks, check availability, suggest time slots, reorganize your day, and answer questions about your calendar.',
        },
        {
          q: 'Why isn\'t the AI responding?',
          a: 'Check your network connection. AI requests can take 5-10 seconds for complex schedules. If it still fails, try refreshing the page or contact support.',
        },
      ],
    },
    {
      title: 'Tasks & Scheduling',
      items: [
        {
          q: 'How does smart scheduling work?',
          a: 'TimeFlow analyzes your tasks (priority, duration, due date) and existing calendar events to find optimal time slots. It respects your wake/sleep times and avoids conflicts.',
        },
        {
          q: 'Can I reschedule tasks manually?',
          a: 'Yes! Drag tasks in the Calendar view to reschedule, or ask the AI assistant to "move my presentation to Friday afternoon."',
        },
        {
          q: 'What happens if I miss a deadline?',
          a: 'Tasks that miss their due date are marked with a visual indicator. You can still schedule them—TimeFlow will notify you they\'re overdue.',
        },
      ],
    },
    {
      title: 'Email Intelligence',
      items: [
        {
          q: 'How does email categorization work?',
          a: 'TimeFlow uses AI to categorize emails into 10 smart categories (Work, Personal, Shopping, Travel, etc.). You can customize categories in Settings.',
        },
        {
          q: 'Does TimeFlow read my emails?',
          a: 'Only if you enable email categorization. We process email metadata (sender, subject) locally and use AI to suggest categories. We never store email content.',
        },
      ],
    },
    {
      title: 'Habits & Routines',
      items: [
        {
          q: 'How do I create a habit?',
          a: 'Go to Habits > Add Habit. Set a name, duration, frequency (daily, weekdays, custom), and preferred time window (e.g., "morning").',
        },
        {
          q: 'What\'s the difference between a task and a habit?',
          a: 'Tasks are one-time items with deadlines. Habits are recurring activities (like "morning workout" or "evening reading") that repeat on a schedule.',
        },
      ],
    },
    {
      title: 'Troubleshooting',
      items: [
        {
          q: 'TimeFlow isn\'t syncing with Google Calendar',
          a: 'Go to Settings > Calendar and click "Reconnect Google Calendar." Make sure you granted calendar access during sign-in.',
        },
        {
          q: 'I\'m getting an authentication error',
          a: 'Your session may have expired. Try signing out and signing back in. If the problem persists, contact support@timeflow.app.',
        },
        {
          q: 'The app is running slow',
          a: 'Try refreshing the page. If you have 100+ tasks or events, performance may degrade—we\'re working on optimizations. Contact support if issues persist.',
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <Image src="/branding/main_logo.png" alt="TimeFlow" width={150} height={40} priority />
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/" className="text-gray-600 hover:text-teal-600">Home</Link>
            <Link href="/contact" className="text-gray-600 hover:text-teal-600">Contact</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-20">
        <section className="grid lg:grid-cols-[1.2fr_0.8fr] gap-12 items-center mb-16">
          <div>
            <span className="inline-flex items-center rounded-full bg-teal-50 text-teal-700 px-3 py-1 text-xs font-semibold uppercase tracking-widest">
              Help Center
            </span>
            <h1 className="text-5xl font-bold text-gray-900 mt-4 mb-6">How can we help?</h1>
            <p className="text-xl text-gray-600">
              Everything you need to get the most out of TimeFlow, from onboarding to troubleshooting.
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

        <div className="space-y-12">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">{section.title}</h2>
              <div className="space-y-6">
                {section.items.map((faq) => (
                  <div key={faq.q} className="bg-gray-50 rounded-xl p-6 border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">{faq.q}</h3>
                    <p className="text-gray-700 leading-relaxed">{faq.a}</p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Contact Support */}
        <div className="mt-20 text-center bg-teal-50 rounded-2xl py-12 px-6 border border-teal-100 shadow-sm">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Still Need Help?</h2>
          <p className="text-lg text-gray-600 mb-8">
            Our support team is here to help you succeed with TimeFlow.
          </p>
          <Link
            href="/contact"
            onClick={() => track('homepage_cta_clicked', { cta_text: 'Contact Support', location: 'help-cta' })}
            className="inline-block px-8 py-4 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-colors"
          >
            Contact Support
          </Link>
        </div>
      </main>

      <footer className="border-t border-gray-200 py-8 mt-16">
        <div className="max-w-7xl mx-auto px-6 text-center text-gray-600 text-sm">
          © 2025 TimeFlow. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
