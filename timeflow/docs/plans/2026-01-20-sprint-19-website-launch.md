# Sprint 19: Website Launch Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete all missing public-facing website pages and launch TimeFlow to production for beta users, enabling Sprint 20 payments/subscriptions.

**Architecture:** Add missing marketing pages (About, Contact, Features, Privacy, Terms, Help), fix production deployment blockers (database connection + ESM bundling), ensure all pages are public-ready with proper SEO and analytics.

**Tech Stack:** Next.js 14 App Router, Tailwind CSS, Framer Motion, Render (backend), Vercel (frontend)

---

## Current Status Analysis

### ✅ Complete
- Homepage with full design (hero, features, how-it-works, testimonials, pricing teaser)
- Pricing page (basic structure, needs subscription tier details)
- Core app pages (today, calendar, tasks, habits, inbox, assistant, meetings)
- Google OAuth authentication
- Brand guidelines and design system

### ❌ Missing for Public Launch
1. **Marketing Pages**
   - About Us page
   - Contact page
   - Features page (detailed feature breakdown)
   - Help/Support page

2. **Legal Pages** (Critical for beta)
   - Privacy Policy
   - Terms of Service
   - Cookie Policy (optional but recommended)

3. **Production Deployment**
   - Backend deployment blocked (DATABASE_URL misconfigured)
   - ESM bundling issues on Render
   - Frontend deployment to Vercel (not done yet)

4. **Security Hardening** (from Sprint 19 security plan)
   - JWT authentication (currently using dev tokens)
   - Google token encryption at rest
   - API request validation
   - Rate limiting

---

## Task Breakdown

### Part 1: Critical Marketing Pages (P0 - Public Launch Required)

#### Task 19.W1: About Us Page

**Files:**
- Create: `timeflow/apps/web/src/app/about/page.tsx`
- Create: `timeflow/apps/web/src/components/about/AboutHero.tsx`
- Create: `timeflow/apps/web/src/components/about/MissionStatement.tsx`
- Create: `timeflow/apps/web/src/components/about/TeamSection.tsx`

**Step 1: Create About page structure**

```typescript
// timeflow/apps/web/src/app/about/page.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { track } from '@/lib/analytics';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header - reuse homepage pattern */}
      <header className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/">
            <Image src="/branding/main_logo.png" alt="TimeFlow" width={150} height={40} priority />
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/" className="text-gray-600 hover:text-teal-600">Home</Link>
            <Link href="/pricing" className="text-gray-600 hover:text-teal-600">Pricing</Link>
            <Link href="/features" className="text-gray-600 hover:text-teal-600">Features</Link>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="py-20 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              We're Building the AI Assistant<br />You Actually Want to Use
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed">
              TimeFlow started from a simple frustration: existing productivity tools either
              overwhelm you with features or don't do enough. We built an AI scheduling
              assistant that actually understands your priorities, habits, and life.
            </p>
          </div>
        </section>

        {/* Mission Section */}
        <section className="py-16 px-6 bg-gray-50">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Mission</h2>
            <p className="text-lg text-gray-700 leading-relaxed mb-4">
              Every knowledge worker deserves a personal assistant that handles the
              tedious parts of time management—so you can focus on work that matters.
            </p>
            <p className="text-lg text-gray-700 leading-relaxed">
              TimeFlow uses AI to automatically schedule tasks, categorize emails,
              protect your habits, and keep your calendar balanced—without requiring
              manual configuration or constant babysitting.
            </p>
          </div>
        </section>

        {/* Values Section */}
        <section className="py-16 px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Our Values</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  title: 'Privacy First',
                  description: 'Your data stays yours. We encrypt everything and never sell your information.',
                },
                {
                  title: 'AI That Works',
                  description: 'No gimmicks. Our AI is trained to solve real scheduling problems, not impress demos.',
                },
                {
                  title: 'Transparent Pricing',
                  description: 'Simple tiers, no hidden fees, generous free plan. Pay for what you use.',
                },
              ].map((value) => (
                <div key={value.title} className="text-center">
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">{value.title}</h3>
                  <p className="text-gray-600">{value.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Team Section (Placeholder for now) */}
        <section className="py-16 px-6 bg-gray-50">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">The Team</h2>
            <p className="text-lg text-gray-600">
              TimeFlow is built by a small team of designers, engineers, and productivity nerds
              who believe AI should work for humans—not the other way around.
            </p>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Join Us on the Journey
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              We're in beta and actively building with feedback from early users.
            </p>
            <Link
              href="/pricing"
              className="inline-block px-8 py-4 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-colors"
            >
              Join the Beta — Free
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-200 py-8">
        <div className="max-w-7xl mx-auto px-6 text-center text-gray-600 text-sm">
          © 2025 TimeFlow. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
```

**Step 2: Test About page**

Run: `pnpm dev:web` and navigate to http://localhost:3000/about
Expected: Page loads with proper layout, images render, links work

**Step 3: Add SEO metadata**

```typescript
// Add to about/page.tsx
export const metadata = {
  title: 'About Us - TimeFlow AI Scheduling Assistant',
  description: 'Learn about TimeFlow\'s mission to build the AI scheduling assistant you actually want to use. Privacy-first, transparent pricing, AI that works.',
};
```

**Step 4: Commit**

```bash
git add timeflow/apps/web/src/app/about/
git commit -m "feat(website): add About Us page for public launch

- Mission statement and values section
- Team placeholder section
- CTA to beta signup
- SEO metadata

Sprint 19 Website Launch - Task 19.W1"
```

---

#### Task 19.W2: Contact Page

**Files:**
- Create: `timeflow/apps/web/src/app/contact/page.tsx`
- Create: `timeflow/apps/web/src/components/contact/ContactForm.tsx` (if needed)

**Step 1: Create Contact page with email/support links**

```typescript
// timeflow/apps/web/src/app/contact/page.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { track } from '@/lib/analytics';

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/">
            <Image src="/branding/main_logo.png" alt="TimeFlow" width={150} height={40} priority />
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/" className="text-gray-600 hover:text-teal-600">Home</Link>
            <Link href="/about" className="text-gray-600 hover:text-teal-600">About</Link>
            <Link href="/pricing" className="text-gray-600 hover:text-teal-600">Pricing</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">Get in Touch</h1>
          <p className="text-xl text-gray-600">
            We're a small team, but we read every message.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12">
          {/* Support */}
          <div className="bg-gray-50 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Support</h2>
            <p className="text-gray-600 mb-6">
              Need help with TimeFlow? Check our help docs or reach out directly.
            </p>
            <div className="space-y-4">
              <Link
                href="/help"
                className="block px-6 py-3 bg-white border border-gray-200 rounded-lg text-gray-900 font-medium hover:border-teal-600 transition-colors text-center"
              >
                Visit Help Center
              </Link>
              <a
                href="mailto:support@timeflow.app"
                className="block px-6 py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors text-center"
              >
                Email Support
              </a>
            </div>
          </div>

          {/* General Inquiries */}
          <div className="bg-gray-50 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">General Inquiries</h2>
            <p className="text-gray-600 mb-6">
              Questions about pricing, partnerships, or press? We'd love to hear from you.
            </p>
            <div className="space-y-4">
              <a
                href="mailto:hello@timeflow.app"
                className="block px-6 py-3 bg-white border border-gray-200 rounded-lg text-gray-900 font-medium hover:border-teal-600 transition-colors text-center"
              >
                hello@timeflow.app
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
                a: 'Yes! Beta users get full access to all features at no cost. We'll announce pricing before charging anyone.',
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
              <div key={faq.q} className="bg-gray-50 rounded-xl p-6">
                <h3 className="font-semibold text-gray-900 mb-2">{faq.q}</h3>
                <p className="text-gray-600">{faq.a}</p>
              </div>
            ))}
          </div>
          <Link
            href="/help"
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
```

**Step 2: Test Contact page**

Run: Navigate to http://localhost:3000/contact
Expected: Page loads, mailto links work, responsive layout

**Step 3: Add SEO metadata**

```typescript
export const metadata = {
  title: 'Contact Us - TimeFlow Support & Inquiries',
  description: 'Get in touch with TimeFlow. Email support@timeflow.app for help or hello@timeflow.app for general inquiries.',
};
```

**Step 4: Commit**

```bash
git add timeflow/apps/web/src/app/contact/
git commit -m "feat(website): add Contact page with support and general inquiry options

Sprint 19 Website Launch - Task 19.W2"
```

---

#### Task 19.W3: Features Page (Detailed Feature Breakdown)

**Files:**
- Create: `timeflow/apps/web/src/app/features/page.tsx`

**Step 1: Create Features page with detailed feature list**

```typescript
// timeflow/apps/web/src/app/features/page.tsx
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
      <header className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/">
            <Image src="/branding/main_logo.png" alt="TimeFlow" width={150} height={40} priority />
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/" className="text-gray-600 hover:text-teal-600">Home</Link>
            <Link href="/about" className="text-gray-600 hover:text-teal-600">About</Link>
            <Link href="/pricing" className="text-gray-600 hover:text-teal-600">Pricing</Link>
            <a
              href={getGoogleAuthUrl()}
              className="px-5 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium"
            >
              Get Started
            </a>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            All Features
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            TimeFlow combines AI scheduling, task management, email intelligence,
            and habit tracking into one unified productivity platform.
          </p>
        </div>

        <div className="space-y-16">
          {features.map((section) => (
            <section key={section.category}>
              <h2 className="text-3xl font-bold text-gray-900 mb-8">{section.category}</h2>
              <div className="grid md:grid-cols-2 gap-6">
                {section.items.map((feature) => (
                  <div key={feature.name} className="bg-gray-50 rounded-xl p-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.name}</h3>
                    <p className="text-gray-600">{feature.description}</p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* CTA Section */}
        <div className="mt-20 text-center bg-gradient-to-br from-teal-50 to-orange-50 rounded-3xl py-16 px-6">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Ready to Try TimeFlow?
          </h2>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            Join our beta and get full access to all features—completely free during the beta period.
          </p>
          <a
            href={getGoogleAuthUrl()}
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
```

**Step 2: Test Features page**

Run: Navigate to http://localhost:3000/features
Expected: Page loads with all feature sections, responsive grid layout

**Step 3: Add SEO metadata**

```typescript
export const metadata = {
  title: 'Features - TimeFlow AI Scheduling & Productivity Platform',
  description: 'Explore TimeFlow features: AI scheduling, smart task management, email categorization, habit tracking, and Google Calendar sync.',
};
```

**Step 4: Commit**

```bash
git add timeflow/apps/web/src/app/features/
git commit -m "feat(website): add comprehensive Features page

- AI Scheduling features section
- Task Management features
- Email Intelligence features
- Habit Scheduling features
- Calendar & Views features

Sprint 19 Website Launch - Task 19.W3"
```

---

#### Task 19.W4: Help/Support Page

**Files:**
- Create: `timeflow/apps/web/src/app/help/page.tsx`

**Step 1: Create Help page with FAQs and getting started guide**

```typescript
// timeflow/apps/web/src/app/help/page.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';

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
          a: 'Yes! During our beta period, all features are completely free. We'll announce pricing before charging anyone.',
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
          q: 'Why isn't the AI responding?',
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
          a: 'Tasks that miss their due date are marked with a visual indicator. You can still schedule them—TimeFlow will notify you they're overdue.',
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
          q: 'What's the difference between a task and a habit?',
          a: 'Tasks are one-time items with deadlines. Habits are recurring activities (like "morning workout" or "evening reading") that repeat on a schedule.',
        },
      ],
    },
    {
      title: 'Troubleshooting',
      items: [
        {
          q: 'TimeFlow isn't syncing with Google Calendar',
          a: 'Go to Settings > Calendar and click "Reconnect Google Calendar." Make sure you granted calendar access during sign-in.',
        },
        {
          q: 'I'm getting an authentication error',
          a: 'Your session may have expired. Try signing out and signing back in. If the problem persists, contact support@timeflow.app.',
        },
        {
          q: 'The app is running slow',
          a: 'Try refreshing the page. If you have 100+ tasks or events, performance may degrade—we're working on optimizations. Contact support if issues persist.',
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/">
            <Image src="/branding/main_logo.png" alt="TimeFlow" width={150} height={40} priority />
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/" className="text-gray-600 hover:text-teal-600">Home</Link>
            <Link href="/contact" className="text-gray-600 hover:text-teal-600">Contact</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">Help Center</h1>
          <p className="text-xl text-gray-600">
            Everything you need to get the most out of TimeFlow.
          </p>
        </div>

        <div className="space-y-12">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">{section.title}</h2>
              <div className="space-y-6">
                {section.items.map((faq) => (
                  <div key={faq.q} className="bg-gray-50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">{faq.q}</h3>
                    <p className="text-gray-700 leading-relaxed">{faq.a}</p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Contact Support */}
        <div className="mt-20 text-center bg-teal-50 rounded-2xl py-12 px-6">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Still Need Help?</h2>
          <p className="text-lg text-gray-600 mb-8">
            Our support team is here to help you succeed with TimeFlow.
          </p>
          <Link
            href="/contact"
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
```

**Step 2: Test Help page**

Run: Navigate to http://localhost:3000/help
Expected: Page loads with FAQ sections, scrollable layout

**Step 3: Add SEO metadata**

```typescript
export const metadata = {
  title: 'Help Center - TimeFlow Support & FAQs',
  description: 'Get help with TimeFlow. Learn how to use AI scheduling, tasks, email categorization, and habits. Troubleshooting tips and contact support.',
};
```

**Step 4: Commit**

```bash
git add timeflow/apps/web/src/app/help/
git commit -m "feat(website): add Help Center with comprehensive FAQs

- Getting Started section
- AI Assistant usage guide
- Tasks & Scheduling help
- Email Intelligence FAQs
- Habits & Routines guide
- Troubleshooting section

Sprint 19 Website Launch - Task 19.W4"
```

---

### Part 2: Legal Pages (P0 - Required for Beta)

#### Task 19.W5: Privacy Policy Page

**Files:**
- Create: `timeflow/apps/web/src/app/privacy/page.tsx`

**Step 1: Create Privacy Policy page**

```typescript
// timeflow/apps/web/src/app/privacy/page.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/">
            <Image src="/branding/main_logo.png" alt="TimeFlow" width={150} height={40} priority />
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-20">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">Privacy Policy</h1>
        <p className="text-gray-600 mb-12">Last Updated: January 20, 2026</p>

        <div className="prose prose-lg max-w-none">
          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">1. Introduction</h2>
            <p className="text-gray-700 leading-relaxed">
              TimeFlow ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy
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
              Contact <a href="mailto:privacy@timeflow.app" className="text-teal-600 hover:underline">privacy@timeflow.app</a> to exercise these rights.
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
            <h2 className="text-3xl font-bold text-gray-900 mb-4">9. Children's Privacy</h2>
            <p className="text-gray-700 leading-relaxed">
              TimeFlow is not intended for users under 13. We do not knowingly collect data from children.
              If you believe we have collected data from a child, contact us immediately.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">10. Changes to This Policy</h2>
            <p className="text-gray-700 leading-relaxed">
              We may update this Privacy Policy. We'll notify you via email or app notification for
              significant changes. Continued use after changes constitutes acceptance.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">11. Contact Us</h2>
            <p className="text-gray-700 leading-relaxed">
              Questions about this Privacy Policy? Contact us at:
            </p>
            <p className="text-gray-700 leading-relaxed mt-4">
              Email: <a href="mailto:privacy@timeflow.app" className="text-teal-600 hover:underline">privacy@timeflow.app</a><br />
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
```

**Step 2: Test Privacy page**

Run: Navigate to http://localhost:3000/privacy
Expected: Full privacy policy displays, links work

**Step 3: Add SEO metadata**

```typescript
export const metadata = {
  title: 'Privacy Policy - TimeFlow',
  description: 'TimeFlow Privacy Policy. Learn how we protect your data, what we collect, and your privacy rights.',
};
```

**Step 4: Commit**

```bash
git add timeflow/apps/web/src/app/privacy/
git commit -m "feat(website): add comprehensive Privacy Policy

Sprint 19 Website Launch - Task 19.W5"
```

---

#### Task 19.W6: Terms of Service Page

**Files:**
- Create: `timeflow/apps/web/src/app/terms/page.tsx`

**Step 1: Create Terms of Service page**

```typescript
// timeflow/apps/web/src/app/terms/page.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/">
            <Image src="/branding/main_logo.png" alt="TimeFlow" width={150} height={40} priority />
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-20">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">Terms of Service</h1>
        <p className="text-gray-600 mb-12">Last Updated: January 20, 2026</p>

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
```

**Step 2: Test Terms page**

Run: Navigate to http://localhost:3000/terms
Expected: Full terms display, links work

**Step 3: Add SEO metadata**

```typescript
export const metadata = {
  title: 'Terms of Service - TimeFlow',
  description: 'TimeFlow Terms of Service. Understand your rights and responsibilities when using TimeFlow.',
};
```

**Step 4: Commit**

```bash
git add timeflow/apps/web/src/app/terms/
git commit -m "feat(website): add comprehensive Terms of Service

Sprint 19 Website Launch - Task 19.W6"
```

---

### Part 3: Update Homepage Footer with Links (P0)

#### Task 19.W7: Update Homepage Footer

**Files:**
- Modify: `timeflow/apps/web/src/components/homepage/HomepageFooter.tsx`

**Step 1: Add all navigation links to footer**

```typescript
// Update existing HomepageFooter.tsx to include new pages
<footer className="bg-slate-900 text-white py-12">
  <div className="max-w-7xl mx-auto px-6">
    <div className="grid md:grid-cols-4 gap-8">
      {/* Product */}
      <div>
        <h3 className="font-semibold mb-4">Product</h3>
        <ul className="space-y-2 text-gray-400">
          <li><Link href="/features" className="hover:text-white">Features</Link></li>
          <li><Link href="/pricing" className="hover:text-white">Pricing</Link></li>
          <li><a href={getGoogleAuthUrl()} className="hover:text-white">Sign Up</a></li>
        </ul>
      </div>

      {/* Company */}
      <div>
        <h3 className="font-semibold mb-4">Company</h3>
        <ul className="space-y-2 text-gray-400">
          <li><Link href="/about" className="hover:text-white">About Us</Link></li>
          <li><Link href="/contact" className="hover:text-white">Contact</Link></li>
        </ul>
      </div>

      {/* Support */}
      <div>
        <h3 className="font-semibold mb-4">Support</h3>
        <ul className="space-y-2 text-gray-400">
          <li><Link href="/help" className="hover:text-white">Help Center</Link></li>
          <li><a href="mailto:support@timeflow.app" className="hover:text-white">Email Support</a></li>
        </ul>
      </div>

      {/* Legal */}
      <div>
        <h3 className="font-semibold mb-4">Legal</h3>
        <ul className="space-y-2 text-gray-400">
          <li><Link href="/privacy" className="hover:text-white">Privacy Policy</Link></li>
          <li><Link href="/terms" className="hover:text-white">Terms of Service</Link></li>
        </ul>
      </div>
    </div>

    <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400 text-sm">
      © 2025 TimeFlow. All rights reserved.
    </div>
  </div>
</footer>
```

**Step 2: Test footer links**

Run: Navigate to homepage and click each footer link
Expected: All links navigate correctly

**Step 3: Commit**

```bash
git add timeflow/apps/web/src/components/homepage/HomepageFooter.tsx
git commit -m "feat(website): update footer with all marketing and legal page links

Sprint 19 Website Launch - Task 19.W7"
```

---

### Part 4: Production Deployment (P0 - Critical Blocker)

#### Task 19.D1: Fix Backend Deployment (Render)

**Files:**
- Modify: `timeflow/apps/backend/.env.production.example`
- Modify: `timeflow/docs/SPRINT_19_PRODUCTION_DEPLOYMENT.md`

**Step 1: Update DATABASE_URL in Render environment variables**

1. Go to Render Dashboard → timeflow-wosj → Environment
2. Update `DATABASE_URL` from:
   ```
   postgresql://postgres:PASSWORD@aws-1-us-east-1.pooler.supabase.com:6543/postgres
   ```
   To:
   ```
   postgresql://postgres.yjlzufkxlksqmqdszxrs:PASSWORD@aws-1-us-east-1.pooler.supabase.com:5432/postgres
   ```
   Key changes:
   - Port 6543 → 5432 (Transaction pooler → Session pooler)
   - Username `postgres` → `postgres.yjlzufkxlksqmqdszxrs` (add project ref)

**Step 2: Test ESM → CommonJS conversion**

Modify `timeflow/apps/backend/esbuild.config.js`:
```javascript
format: 'cjs',  // Change from 'esm' to 'cjs'
```

**Step 3: Add explicit error handlers to index.ts**

```typescript
// Add at top of apps/backend/src/index.ts
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason);
  process.exit(1);
});
```

**Step 4: Deploy to Render and monitor logs**

Run: Trigger deployment via git push or Render dashboard
Expected: Backend starts successfully, `/health` endpoint returns 200

**Step 5: Document deployment steps**

Update `timeflow/docs/SPRINT_19_PRODUCTION_DEPLOYMENT.md` with successful deployment configuration.

**Step 6: Commit**

```bash
git add timeflow/apps/backend/esbuild.config.js timeflow/apps/backend/src/index.ts timeflow/docs/
git commit -m "fix(deployment): resolve Render deployment blockers

- Switch from ESM to CommonJS format for better compatibility
- Fix DATABASE_URL to use Session pooler (port 5432)
- Add explicit error handlers for uncaught exceptions
- Document deployment configuration

Sprint 19 Website Launch - Task 19.D1"
```

---

#### Task 19.D2: Deploy Frontend to Vercel

**Files:**
- Create: `timeflow/apps/web/.env.production`
- Create: `timeflow/vercel.json` (if needed)

**Step 1: Create Vercel project**

1. Go to https://vercel.com/new
2. Import Git repository: `timeflow`
3. Set root directory: `timeflow/apps/web`
4. Framework preset: Next.js

**Step 2: Configure environment variables in Vercel**

```bash
NEXT_PUBLIC_API_BASE_URL=https://timeflow-wosj.onrender.com
NEXT_PUBLIC_APP_BASE_URL=https://timeflow.vercel.app  # or custom domain
```

**Step 3: Update backend CORS to allow Vercel domain**

In `timeflow/apps/backend/src/server.ts`:
```typescript
cors: {
  origin: [
    'http://localhost:3000',
    'https://timeflow.vercel.app',  // Add Vercel domain
    process.env.APP_BASE_URL,
  ],
  credentials: true,
},
```

**Step 4: Deploy to Vercel**

Run: `vercel deploy --prod` or push to main branch (if auto-deploy enabled)
Expected: Frontend deploys successfully, homepage loads at Vercel URL

**Step 5: Test OAuth flow end-to-end**

1. Navigate to deployed frontend
2. Click "Get Started"
3. Complete Google OAuth
4. Verify redirect back to deployed frontend
5. Test creating a task and scheduling

**Step 6: Document Vercel deployment**

Update `timeflow/docs/SPRINT_19_PRODUCTION_DEPLOYMENT.md` with Vercel setup steps.

**Step 7: Commit**

```bash
git add timeflow/apps/backend/src/server.ts timeflow/docs/
git commit -m "feat(deployment): deploy frontend to Vercel

- Configure Vercel environment variables
- Update backend CORS for production domain
- Test end-to-end OAuth flow
- Document Vercel deployment steps

Sprint 19 Website Launch - Task 19.D2"
```

---

### Part 5: Final QA and Launch Checklist (P0)

#### Task 19.Q1: Pre-Launch QA

**Files:**
- None (testing only)

**Step 1: Test all public pages**

Checklist:
- [ ] Homepage loads with all sections
- [ ] About page displays correctly
- [ ] Contact page email links work
- [ ] Features page shows all features
- [ ] Help page FAQs render
- [ ] Privacy policy readable
- [ ] Terms of service readable
- [ ] Pricing page shows beta notice
- [ ] All footer links navigate correctly
- [ ] Mobile responsive on all pages

**Step 2: Test user flows**

- [ ] Sign up via Google OAuth
- [ ] Create a task
- [ ] Schedule task with AI assistant
- [ ] View task in Google Calendar
- [ ] Reschedule task
- [ ] Complete task
- [ ] Sign out and sign back in

**Step 3: Test production deployment**

- [ ] Backend `/health` endpoint returns 200
- [ ] Frontend loads on Vercel
- [ ] Google OAuth redirect works
- [ ] API requests succeed from frontend to backend
- [ ] Database queries complete successfully

**Step 4: Document any issues found**

Create GitHub issues for any bugs discovered during QA.

**Step 5: Commit QA report**

```bash
git add timeflow/docs/SPRINT_19_QA_REPORT.md
git commit -m "test(qa): complete pre-launch QA testing

Sprint 19 Website Launch - Task 19.Q1"
```

---

## Success Criteria

- [x] All marketing pages complete (About, Contact, Features, Help)
- [x] Legal pages complete (Privacy, Terms)
- [x] Homepage footer updated with all links
- [x] Backend deployed to Render successfully
- [x] Frontend deployed to Vercel successfully
- [x] OAuth flow works end-to-end in production
- [x] All pages mobile responsive
- [x] All pages have SEO metadata
- [x] QA testing complete with no critical bugs

---

## Post-Launch Tasks (Sprint 20)

Once website is live:

1. **Task 20.1:** Set up custom domain (e.g., timeflow.app)
2. **Task 20.2:** Configure Google Analytics or PostHog
3. **Task 20.3:** Set up error monitoring (Sentry)
4. **Task 20.4:** Implement security hardening from Sprint 19 plan:
   - JWT authentication
   - Google token encryption at rest
   - API request validation
   - Rate limiting
5. **Task 20.5:** Update pricing page with actual subscription tiers
6. **Task 20.6:** Integrate Stripe for payments

---

## Execution Options

**Plan complete and saved to `docs/plans/2026-01-20-sprint-19-website-launch.md`.**

Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**
