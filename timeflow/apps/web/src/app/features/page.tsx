'use client';

import Link from 'next/link';
import Image from 'next/image';
import { getGoogleAuthUrl } from '@/lib/api';
import { track } from '@/lib/analytics';

export default function FeaturesPage() {
  const features = [
    {
      category: 'AI Scheduling',
      items: [
        {
          name: 'Conversational AI Assistant',
          description: 'Chat naturally with Flow to schedule tasks, check availability, or reorganize your day.',
        },
        {
          name: 'Smart Task Scheduling',
          description: 'Automatically finds optimal time slots based on priorities, deadlines, and existing commitments.',
        },
        {
          name: 'Conflict Resolution',
          description: 'AI detects calendar conflicts and suggests alternatives before scheduling.',
        },
        {
          name: 'Context-Aware Suggestions',
          description: 'Learns your preferences over time (e.g., "no meetings before 10am").',
        },
      ],
    },
    {
      category: 'Task Management',
      items: [
        {
          name: 'Quick Task Capture',
          description: 'Add tasks with title, duration, priority, and due date in seconds.',
        },
        {
          name: 'Priority Sorting',
          description: 'Tasks automatically sort by due date and priority level (P1, P2, P3).',
        },
        {
          name: 'Deadline Tracking',
          description: 'Visual indicators show tasks at risk of missing deadlines.',
        },
        {
          name: 'Google Calendar Sync',
          description: 'Scheduled tasks appear in your Google Calendar automatically.',
        },
      ],
    },
    {
      category: 'Email Intelligence',
      items: [
        {
          name: 'Smart Categorization',
          description: '10 AI-powered categories: Work, Personal, Shopping, Travel, Finance, and more.',
        },
        {
          name: 'Priority Sorting',
          description: 'Important emails bubble to the top automatically.',
        },
        {
          name: 'Time Blocking Suggestions',
          description: 'AI suggests when to handle email batches based on your schedule.',
        },
        {
          name: 'Gmail Label Sync',
          description: 'Categories sync back to Gmail as labels for seamless workflow.',
        },
      ],
    },
    {
      category: 'Habit Scheduling',
      items: [
        {
          name: 'Recurring Habit Tracking',
          description: 'Define habits with flexible frequency (daily, weekdays, custom).',
        },
        {
          name: 'Priority Placement',
          description: 'Habits get scheduled first, ensuring your routine stays intact.',
        },
        {
          name: 'Flexible Time Windows',
          description: 'Set preferences like "morning workout" or "evening reading" without strict times.',
        },
        {
          name: 'Streak Tracking',
          description: 'Visual streak indicators keep you motivated.',
        },
      ],
    },
    {
      category: 'Calendar & Views',
      items: [
        {
          name: 'Today View',
          description: 'See your day at a glance with scheduled tasks and upcoming events.',
        },
        {
          name: 'Calendar View',
          description: 'Week/day/month views with drag-and-drop rescheduling.',
        },
        {
          name: 'Inbox View',
          description: 'Email triage interface with category filters and quick actions.',
        },
        {
          name: 'Meetings Dashboard',
          description: 'Manage meeting bookings, availability, and scheduling links.',
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
            <Link href="/about" className="text-gray-600 hover:text-teal-600">About</Link>
            <Link href="/pricing" className="text-gray-600 hover:text-teal-600">Pricing</Link>
            <a
              href={getGoogleAuthUrl()}
              onClick={() => track('homepage_cta_clicked', { cta_text: 'Get Started', location: 'features-header' })}
              className="px-5 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium"
            >
              Get Started
            </a>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-20">
        <section className="grid lg:grid-cols-[1.2fr_0.8fr] gap-12 items-center mb-16">
          <div>
            <span className="inline-flex items-center rounded-full bg-teal-50 text-teal-700 px-3 py-1 text-xs font-semibold uppercase tracking-widest">
              Features
            </span>
            <h1 className="text-5xl font-bold text-gray-900 mt-4 mb-6">All Features</h1>
            <p className="text-xl text-gray-600 max-w-2xl">
              TimeFlow combines AI scheduling, task management, email intelligence,
              and habit tracking into one unified productivity platform.
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

        <div className="space-y-16">
          {features.map((section) => (
            <section key={section.category}>
              <h2 className="text-3xl font-bold text-gray-900 mb-8">{section.category}</h2>
              <div className="grid md:grid-cols-2 gap-6">
                {section.items.map((feature) => (
                  <div key={feature.name} className="bg-gray-50 rounded-xl p-6 border border-gray-100 shadow-sm">
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.name}</h3>
                    <p className="text-gray-600">{feature.description}</p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* CTA Section */}
        <div className="mt-20 text-center bg-gradient-to-br from-teal-50 to-orange-50 rounded-3xl py-16 px-6 border border-teal-100 shadow-lg">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Ready to Try TimeFlow?
          </h2>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            Join our beta and get full access to all features—completely free during the beta period.
          </p>
          <a
            href={getGoogleAuthUrl()}
            onClick={() => track('homepage_cta_clicked', { cta_text: 'Start Free Beta', location: 'features-cta' })}
            className="inline-block px-8 py-4 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-colors"
          >
            Start Free Beta
          </a>
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
