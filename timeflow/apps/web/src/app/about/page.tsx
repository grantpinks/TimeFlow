'use client';

import Link from 'next/link';
import Image from 'next/image';
import { track } from '@/lib/analytics';

const milestones = [
  { year: '2024', title: 'The first prototype', detail: 'An AI agent that scheduled a single day in 90 seconds.' },
  { year: '2025', title: 'Flow was born', detail: 'We merged habits, tasks, and email into one timeline.' },
  { year: '2026', title: 'Beta launch', detail: 'Opening TimeFlow to early adopters building their ideal week.' },
];

const principles = [
  {
    title: 'Privacy First',
    description: 'Your data stays yours. We encrypt everything and never sell your information.',
  },
  {
    title: 'AI That Works',
    description: 'No gimmicks. Flow handles real scheduling complexity, not demo tricks.',
  },
  {
    title: 'Human Rhythm',
    description: 'Work fits around your life, not the other way around.',
  },
];

const impact = [
  { label: 'Planning overhead', value: '↓ 40%', note: 'Illustrative' },
  { label: 'Weekly time reclaimed', value: '+6 hrs', note: 'Illustrative' },
  { label: 'Habits protected', value: '4x', note: 'Illustrative' },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center">
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
        <section className="py-20 px-6">
          <div className="max-w-6xl mx-auto grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
            <div>
              <span className="inline-flex items-center rounded-full bg-teal-50 text-teal-700 px-3 py-1 text-xs font-semibold uppercase tracking-widest">
                About TimeFlow
              </span>
              <h1 className="text-5xl font-bold text-gray-900 mt-4 mb-6">
                We're Building the AI Assistant<br />You Actually Want to Use
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed">
                TimeFlow started from a simple frustration: existing productivity tools either overwhelm you
                with features or don't do enough. We built an AI scheduling assistant that understands your
                priorities, habits, and life.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  href="/pricing"
                  onClick={() => track('homepage_cta_clicked', { cta_text: 'Join the Beta — Free', location: 'about-hero' })}
                  className="inline-flex items-center px-6 py-3 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-colors"
                >
                  Join the Beta — Free
                </Link>
                <Link
                  href="/features"
                  className="inline-flex items-center px-6 py-3 border border-gray-200 text-gray-900 font-semibold rounded-lg hover:border-teal-300"
                >
                  Explore Features
                </Link>
              </div>
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
          </div>
        </section>

        <section className="py-16 px-6 bg-gray-50">
          <div className="max-w-5xl mx-auto grid lg:grid-cols-[0.9fr_1.1fr] gap-10 items-center">
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Mission</h2>
              <p className="text-lg text-gray-700 leading-relaxed mb-4">
                Every knowledge worker deserves a personal assistant that handles the tedious parts of time
                management—so you can focus on work that matters.
              </p>
              <p className="text-lg text-gray-700 leading-relaxed">
                TimeFlow uses AI to automatically schedule tasks, categorize emails, protect your habits,
                and keep your calendar balanced—without constant babysitting.
              </p>
            </div>
            <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">
              <div className="flex items-center gap-4 mb-6">
                <Image
                  src="/branding/flow-thinking.png"
                  alt="Flow thinking"
                  width={64}
                  height={64}
                />
                <div>
                  <p className="text-sm text-gray-500">Why we exist</p>
                  <h3 className="text-xl font-semibold text-gray-900">Human-first scheduling</h3>
                </div>
              </div>
              <ul className="space-y-4 text-gray-600">
                <li className="flex items-start gap-3">
                  <span className="text-teal-600">•</span>
                  Replace time-blocking spreadsheets with a single intelligent timeline.
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-teal-600">•</span>
                  Protect deep work and habits automatically.
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-teal-600">•</span>
                  Keep your week balanced with AI suggestions you can trust.
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section className="py-16 px-6">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Our Principles</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {principles.map((value) => (
                <div key={value.title} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                  <div className="h-10 w-10 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center mb-4">
                    <span className="font-semibold">TF</span>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">{value.title}</h3>
                  <p className="text-gray-600">{value.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 px-6 bg-gray-50">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold text-gray-900">Our Story</h2>
              <span className="text-xs text-gray-400 uppercase tracking-[0.2em]">Illustrative</span>
            </div>
            <div className="space-y-6">
              {milestones.map((milestone) => (
                <div key={milestone.year} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                  <div className="flex items-start gap-6">
                    <div className="text-2xl font-bold text-teal-600">{milestone.year}</div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">{milestone.title}</h3>
                      <p className="text-gray-600">{milestone.detail}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 px-6">
          <div className="max-w-5xl mx-auto grid lg:grid-cols-[0.9fr_1.1fr] gap-10 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">By the Numbers</h2>
              <p className="text-gray-600 mb-8">Stylized outcomes from early beta scenarios.</p>
              <div className="space-y-4">
                {impact.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">{item.label}</span>
                      <span className="text-xs text-gray-400">{item.note}</span>
                    </div>
                    <div className="flex items-end gap-2 mt-2">
                      <span className="text-3xl font-bold text-gray-900">{item.value}</span>
                    </div>
                    <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-teal-500 to-emerald-400" style={{ width: '72%' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-3xl border border-gray-100 bg-slate-900 text-white p-8 shadow-xl">
              <h3 className="text-2xl font-bold mb-6">Meet the team</h3>
              <p className="text-gray-300 mb-8">
                Designers, engineers, and productivity nerds building AI that respects your time.
              </p>
              <div className="grid grid-cols-3 gap-4">
                {['GP', 'AR', 'NL', 'CJ', 'SK', 'JT'].map((initials) => (
                  <div key={initials} className="rounded-2xl bg-slate-800 p-4 text-center">
                    <div className="h-12 w-12 rounded-full bg-teal-500/20 text-teal-300 flex items-center justify-center mx-auto mb-3">
                      <span className="font-semibold">{initials}</span>
                    </div>
                    <p className="text-sm text-gray-300">Core Team</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 px-6">
          <div className="max-w-3xl mx-auto text-center bg-gradient-to-br from-teal-50 to-orange-50 rounded-3xl py-16 px-8 border border-teal-100 shadow-lg">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Join Us on the Journey
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              We're in beta and actively building with feedback from early users.
            </p>
            <Link
              href="/pricing"
              onClick={() => track('homepage_cta_clicked', { cta_text: 'Join the Beta — Free', location: 'about-cta' })}
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
