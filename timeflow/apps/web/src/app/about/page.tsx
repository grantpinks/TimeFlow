'use client';

import Link from 'next/link';
import Image from 'next/image';
import { track } from '@/lib/analytics';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header - reuse homepage pattern */}
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
        {/* Hero Section */}
        <section className="py-20 px-6">
          <div className="max-w-6xl mx-auto grid lg:grid-cols-[1.2fr_0.8fr] gap-12 items-center">
            <div>
              <span className="inline-flex items-center rounded-full bg-teal-50 text-teal-700 px-3 py-1 text-xs font-semibold uppercase tracking-widest">
                About TimeFlow
              </span>
              <h1 className="text-5xl font-bold text-gray-900 mt-4 mb-6">
                We're Building the AI Assistant<br />You Actually Want to Use
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed">
                TimeFlow started from a simple frustration: existing productivity tools either
                overwhelm you with features or don't do enough. We built an AI scheduling
                assistant that actually understands your priorities, habits, and life.
              </p>
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
