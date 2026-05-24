'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { track } from '@/lib/analytics';
import { getGoogleAuthUrl } from '@/lib/api';
import { useEffect } from 'react';
import { AppShellWhenAuthed } from '@/components/AppShellWhenAuthed';
import { HomepageFooter } from '@/components/homepage/HomepageFooter';

const fadeInVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

function WhyTimeFlowContent() {
  useEffect(() => {
    track('why_timeflow_page_viewed');
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative py-20 sm:py-28 px-4 sm:px-6 hero-gradient overflow-hidden">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeInVariants}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
              Why TimeFlow Is Different
            </h1>
            <p className="text-xl sm:text-2xl text-white/90 mb-8 max-w-3xl mx-auto font-medium">
              We don't just manage tasks. We give you back your life.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Our Philosophy */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInVariants}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Schedule Work Around Your Life,<br />Not the Other Way Around
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
              Most productivity tools force your life to fit around your work. TimeFlow does the opposite.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: '🎯',
                title: 'Habits First, Meetings Second',
                description: 'Your recurring routines get priority placement. Work fills in around them, not through them.',
              },
              {
                icon: '🧠',
                title: 'AI That Learns, Not Just Schedules',
                description: 'Our AI understands your energy patterns, preferences, and context to suggest optimal time slots.',
              },
              {
                icon: '⏰',
                title: 'Reclaim Time for What Matters',
                description: 'Average users save 8+ hours per week by eliminating scheduling conflicts and wasted gaps.',
              },
            ].map((principle, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white rounded-xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow"
              >
                <div className="text-4xl mb-4">{principle.icon}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{principle.title}</h3>
                <p className="text-gray-600 leading-relaxed">{principle.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Competitive Comparison */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInVariants}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              How TimeFlow Compares
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
              See why thousands are switching from traditional task managers to TimeFlow
            </p>
          </motion.div>

          <div className="space-y-8">
            {[
              {
                competitor: 'Todoist',
                problem: 'Task lists without time blocking',
                solution: 'TimeFlow automatically finds time slots for every task on your calendar',
                icon: '📝',
              },
              {
                competitor: 'Motion',
                problem: 'No email intelligence or habit awareness',
                solution: 'TimeFlow reads your inbox and protects your recurring habits',
                icon: '📧',
              },
              {
                competitor: 'Sunsama',
                problem: 'Manual time blocking every day',
                solution: 'TimeFlow's AI schedules everything automatically based on your priorities',
                icon: '🤖',
              },
              {
                competitor: 'Google Calendar',
                problem: 'No task management or AI optimization',
                solution: 'TimeFlow combines calendar + tasks + AI into one seamless experience',
                icon: '📅',
              },
            ].map((comparison, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-gray-50 rounded-xl p-6 sm:p-8 border border-gray-200"
              >
                <div className="flex flex-col sm:flex-row items-start gap-6">
                  <div className="text-4xl flex-shrink-0">{comparison.icon}</div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      TimeFlow vs {comparison.competitor}
                    </h3>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-semibold text-red-600 mb-1">❌ {comparison.competitor}</p>
                        <p className="text-gray-600 text-sm">{comparison.problem}</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-teal-600 mb-1">✅ TimeFlow</p>
                        <p className="text-gray-600 text-sm">{comparison.solution}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Success Stories */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInVariants}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Real People, Real Time Savings
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
              Here's what our users did with their reclaimed time
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                name: 'Sarah M.',
                role: 'Product Manager',
                time: '8 hours/week',
                achievement: 'Started a side business',
                quote: "I finally had time to launch the consulting business I'd been dreaming about for years.",
              },
              {
                name: 'James K.',
                role: 'Entrepreneur',
                time: '6 hours/week',
                achievement: 'Morning workouts daily',
                quote: 'TimeFlow protects my 7am workout slot no matter what meetings try to schedule over it.',
              },
              {
                name: 'Maya R.',
                role: 'Designer',
                time: '5 hours/week',
                achievement: 'Quality family time',
                quote: 'I actually make it to dinner with my kids now. The email categorization is brilliant.',
              },
              {
                name: 'Alex T.',
                role: 'Developer',
                time: '10 hours/week',
                achievement: 'Deep focus blocks',
                quote: 'No more context switching. TimeFlow batches similar tasks and gives me 3-hour focus blocks.',
              },
            ].map((story, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white rounded-xl p-8 shadow-lg border border-gray-100"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-xl font-bold text-teal-600">{story.name[0]}</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{story.name}</h3>
                    <p className="text-sm text-gray-600">{story.role}</p>
                  </div>
                </div>
                <div className="mb-4 p-4 bg-teal-50 rounded-lg border border-teal-100">
                  <p className="text-2xl font-bold text-teal-600 mb-1">{story.time} saved</p>
                  <p className="text-sm font-semibold text-gray-700">Used to: {story.achievement}</p>
                </div>
                <p className="text-gray-600 italic leading-relaxed">"{story.quote}"</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* The Science Behind TimeFlow */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInVariants}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Built on Proven Science
            </h2>
            <p className="text-lg sm:text-xl text-gray-600">
              TimeFlow is grounded in research on productivity, habit formation, and cognitive science
            </p>
          </motion.div>

          <div className="space-y-6">
            {[
              {
                title: 'Time Blocking Research',
                description: 'Studies show time blocking increases productivity by 40% compared to traditional to-do lists.',
                citation: 'Cal Newport, Deep Work (2016)',
              },
              {
                title: 'Habit Formation Science',
                description: 'Recurring activities placed at consistent times are 3x more likely to become lasting habits.',
                citation: 'James Clear, Atomic Habits (2018)',
              },
              {
                title: 'Flow State Optimization',
                description: 'Uninterrupted 90-minute blocks allow the brain to enter deep focus states for maximum productivity.',
                citation: 'Mihaly Csikszentmihalyi, Flow (1990)',
              },
            ].map((research, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-gradient-to-r from-teal-50 to-white rounded-xl p-6 border-l-4 border-teal-600"
              >
                <h3 className="text-xl font-bold text-gray-900 mb-2">{research.title}</h3>
                <p className="text-gray-700 mb-3 leading-relaxed">{research.description}</p>
                <p className="text-sm text-teal-600 font-medium">Source: {research.citation}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 hero-gradient">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInVariants}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to Reclaim Your Time?
            </h2>
            <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
              Join thousands who've taken back control of their schedules
            </p>
            <Link
              href="/get-started"
              onClick={() => track('homepage_cta_clicked', { cta_text: 'Start Free Trial', location: 'why_timeflow_footer' })}
              className="inline-flex items-center justify-center px-10 py-5 bg-white text-teal-600 rounded-xl font-bold text-lg hover:shadow-2xl transition-all duration-300 hover:scale-105"
            >
              Start Your Free Trial →
            </Link>
            <p className="mt-6 text-white/80 text-sm">
              Free 14-day trial • No credit card required • Cancel anytime
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

export default function WhyTimeFlowPage() {
  return (
    <AppShellWhenAuthed
      fallback={
        <div className="min-h-screen">
          {/* Header */}
          <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-4">
              <Link href="/" className="flex items-center">
                <Image
                  src="/branding/main_logo.png"
                  alt="TimeFlow"
                  width={120}
                  height={32}
                  priority
                  className="h-8 sm:h-10 w-auto"
                />
              </Link>
              <nav className="hidden md:flex items-center gap-6 lg:gap-8">
                <Link href="/features" className="text-gray-600 hover:text-teal-600 font-medium transition-colors text-sm lg:text-base">
                  Features
                </Link>
                <Link href="/pricing" className="text-gray-600 hover:text-teal-600 font-medium transition-colors text-sm lg:text-base">
                  Pricing
                </Link>
                <Link href="/why-timeflow" className="text-gray-600 hover:text-teal-600 font-medium transition-colors text-sm lg:text-base">
                  Why TimeFlow
                </Link>
                <Link href="/login" className="text-gray-600 hover:text-teal-600 font-medium transition-colors text-sm lg:text-base">
                  Sign In
                </Link>
                <Link
                  href="/get-started"
                  className="bg-teal-600 text-white px-5 lg:px-6 py-2.5 lg:py-3 min-h-[44px] rounded-lg hover:bg-teal-700 active:bg-teal-800 font-medium text-sm lg:text-base transition-all inline-flex items-center justify-center"
                >
                  Get Started Free
                </Link>
              </nav>
              <Link
                href="/get-started"
                className="md:hidden bg-teal-600 text-white px-4 py-2.5 min-h-[44px] rounded-lg hover:bg-teal-700 active:bg-teal-800 font-medium text-sm transition-all inline-flex items-center justify-center"
              >
                Get Started
              </Link>
            </div>
          </header>

          <main className="pt-20">
            <WhyTimeFlowContent />
          </main>

          <HomepageFooter />
        </div>
      }
    >
      <WhyTimeFlowContent />
    </AppShellWhenAuthed>
  );
}
