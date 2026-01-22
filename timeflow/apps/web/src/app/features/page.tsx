'use client';

import Link from 'next/link';
import Image from 'next/image';
import { getGoogleAuthUrl } from '@/lib/api';
import { track } from '@/lib/analytics';

const impactStats = [
  {
    label: 'Weekly planning time',
    value: '↓ 40%',
    detail: 'Illustrative',
    color: 'from-teal-500 to-emerald-400',
  },
  {
    label: 'Focused work blocks',
    value: '+6 hrs',
    detail: 'Illustrative',
    color: 'from-orange-400 to-amber-400',
  },
  {
    label: 'Inbox turnaround',
    value: '2x faster',
    detail: 'Illustrative',
    color: 'from-sky-500 to-cyan-400',
  },
];

const sections = [
  {
    category: 'AI Scheduling',
    description: 'Flow understands context and turns natural language into a balanced day.',
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
    description: 'Capture work fast, then let the system prioritize for you.',
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
    description: 'Turn email into scheduled time blocks, not mental load.',
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
    description: 'Protect the routines that keep you consistent and healthy.',
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
    description: 'Switch contexts quickly without losing the plan.',
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

export default function FeaturesPage() {
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

      <main className="max-w-7xl mx-auto px-6 py-20">
        <section className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center mb-20">
          <div>
            <span className="inline-flex items-center rounded-full bg-teal-50 text-teal-700 px-3 py-1 text-xs font-semibold uppercase tracking-widest">
              Features
            </span>
            <h1 className="text-5xl font-bold text-gray-900 mt-4 mb-6">All Features</h1>
            <p className="text-xl text-gray-600 max-w-2xl">
              TimeFlow blends AI scheduling, task management, email intelligence,
              and habit tracking into a single daily command center.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href={getGoogleAuthUrl()}
                onClick={() => track('homepage_cta_clicked', { cta_text: 'Start Free Beta', location: 'features-hero' })}
                className="inline-flex items-center px-6 py-3 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-colors"
              >
                Start Free Beta
              </a>
              <Link
                href="/pricing"
                className="inline-flex items-center px-6 py-3 border border-gray-200 text-gray-900 font-semibold rounded-lg hover:border-teal-300"
              >
                See Pricing
              </Link>
            </div>
          </div>
          <div className="bg-gradient-to-br from-teal-50 to-orange-50 rounded-3xl p-8 shadow-xl border border-teal-100">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-500">Weekly Balance</p>
                  <h3 className="text-lg font-semibold text-gray-900">Smart Schedule</h3>
                </div>
                <Image
                  src="/branding/flow-default.png"
                  alt="TimeFlow mascot"
                  width={48}
                  height={48}
                />
              </div>
              <div className="space-y-3">
                {['Deep Work', 'Meetings', 'Habits', 'Admin'].map((label, index) => (
                  <div key={label} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-20">{label}</span>
                    <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-400"
                        style={{ width: `${70 - index * 12}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 grid grid-cols-3 gap-3">
                {['Mon', 'Wed', 'Fri'].map((day, index) => (
                  <div key={day} className="rounded-xl border border-gray-100 p-3">
                    <p className="text-xs text-gray-500">{day}</p>
                    <div className="mt-2 h-14 flex items-end gap-1">
                      {[6, 10, 8, 12].map((value, i) => (
                        <div
                          key={`${day}-${i}`}
                          className="flex-1 rounded-md bg-teal-100"
                          style={{ height: `${value * (index + 1)}%` }}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mb-20">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Impact at a Glance</h2>
              <p className="text-gray-600 mt-2">Stylized projections of how Flow reshapes your week.</p>
            </div>
            <span className="text-xs text-gray-400 uppercase tracking-[0.2em]">Illustrative</span>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {impactStats.map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className={`h-2 rounded-full bg-gradient-to-r ${stat.color}`} />
                <p className="mt-4 text-sm text-gray-500">{stat.label}</p>
                <div className="flex items-end gap-2 mt-2">
                  <span className="text-3xl font-bold text-gray-900">{stat.value}</span>
                  <span className="text-xs text-gray-400 mb-1">{stat.detail}</span>
                </div>
                <div className="mt-4 h-12 flex items-end gap-2">
                  {[20, 40, 28, 50].map((height, index) => (
                    <div
                      key={`${stat.label}-${height}-${index}`}
                      className="flex-1 rounded-md bg-gray-100"
                      style={{ height: `${height}%` }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-16">
          {sections.map((section) => (
            <div key={section.category} className="rounded-3xl border border-gray-100 bg-gray-50 p-10">
              <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-10">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">{section.category}</h2>
                  <p className="text-gray-600 mt-2 max-w-2xl">{section.description}</p>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <span className="inline-flex w-2 h-2 rounded-full bg-teal-500" />
                  Live in beta
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                {section.items.map((feature) => (
                  <div key={feature.name} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.name}</h3>
                    <p className="text-gray-600">{feature.description}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        <section className="mt-20 grid lg:grid-cols-[0.9fr_1.1fr] gap-10 items-center">
          <div className="bg-slate-900 text-white rounded-3xl p-10 shadow-xl">
            <h3 className="text-2xl font-bold mb-4">Your week, orchestrated</h3>
            <p className="text-gray-300 mb-8">
              Flow prioritizes deep work first, then fits meetings and admin tasks around your personal routines.
            </p>
            <div className="space-y-4">
              {[
                { label: 'Deep Work', width: '85%' },
                { label: 'Meetings', width: '55%' },
                { label: 'Habits', width: '70%' },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
                    <span>{item.label}</span>
                    <span>{item.width}</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-teal-400 to-emerald-400" style={{ width: item.width }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-gradient-to-br from-teal-50 to-orange-50 rounded-3xl p-10 border border-teal-100">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">What changes in your day</h3>
            <div className="grid sm:grid-cols-2 gap-6">
              {[
                { title: 'Less planning, more doing', detail: 'Auto-schedule tasks in minutes.' },
                { title: 'Protected habit time', detail: 'Habits hold their slots.' },
                { title: 'Inbox reduced to blocks', detail: 'Batch email at the right time.' },
                { title: 'AI avoids conflicts', detail: 'Schedule with confidence.' },
              ].map((item) => (
                <div key={item.title} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                  <h4 className="font-semibold text-gray-900 mb-2">{item.title}</h4>
                  <p className="text-sm text-gray-600">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-20 text-center bg-gradient-to-br from-teal-50 to-orange-50 rounded-3xl py-16 px-6 border border-teal-100 shadow-lg">
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
        </section>
      </main>

      <footer className="border-t border-gray-200 py-8 mt-16">
        <div className="max-w-7xl mx-auto px-6 text-center text-gray-600 text-sm">
          © 2025 TimeFlow. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
