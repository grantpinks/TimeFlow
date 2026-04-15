'use client';

import { HeroSection } from '@/components/homepage/HeroSection';
import { ProblemStatement } from '@/components/homepage/ProblemStatement';
import { FeaturesGrid } from '@/components/homepage/FeaturesGrid';
import { HowItWorks } from '@/components/homepage/HowItWorks';
import { FeatureDeepDive } from '@/components/homepage/FeatureDeepDive';
import { Testimonials } from '@/components/homepage/Testimonials';
import { PricingTeaser } from '@/components/homepage/PricingTeaser';
import { FinalCTA } from '@/components/homepage/FinalCTA';
import { HomepageFooter } from '@/components/homepage/HomepageFooter';
import { StructuredData } from '@/components/homepage/StructuredData';
import { HabitPlannerPreview } from '@/components/homepage/HabitPlannerPreview';
import { CompetitiveDifferentiation } from '@/components/homepage/CompetitiveDifferentiation';
import Link from 'next/link';
import Image from 'next/image';
import { User } from 'lucide-react';
import { getGoogleAuthUrl } from '@/lib/api';
import { track } from '@/lib/analytics';
import { AppShellWhenAuthed } from '@/components/AppShellWhenAuthed';

function HomeMarketingSections() {
  return (
    <>
      <HeroSection />

      <ProblemStatement />

      <div id="features">
        <FeaturesGrid />
      </div>

      <div id="how-it-works">
        <HowItWorks />
      </div>

      {/* AI Assistant Deep-Dive */}
      <FeatureDeepDive
        id="ai-assistant-section"
        title="Your AI Assistant That Actually Reads Emails"
        subtitle="Unlike simple habit trackers, TimeFlow connects to your inbox and turns emails into scheduled actions automatically."
        benefits={[
          'Auto-extracts tasks and meetings from Gmail',
          'Suggests optimal scheduling based on your energy patterns',
          'Handles meeting coordination with natural language',
          'Learns your preferences and adapts over time',
        ]}
        ctaText="Try It Now"
        ctaLink={getGoogleAuthUrl()}
        onCtaClick={() => track('homepage_cta_clicked', { cta_text: 'Try It Now', location: 'ai-assistant-section' })}
        visual={
          <div className="bg-gradient-to-br from-teal-50 to-orange-50 rounded-2xl p-8 shadow-xl border border-teal-100">
            <div className="bg-white rounded-xl p-6 space-y-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div
                  className="w-8 h-8 rounded-full bg-slate-100 flex-shrink-0 flex items-center justify-center border border-slate-200"
                  aria-hidden
                >
                  <User className="w-4 h-4 text-slate-500" strokeWidth={2} />
                </div>
                <div className="flex-1">
                  <div className="bg-gray-100 rounded-lg p-3">
                    <p className="text-gray-700">Schedule my tasks for tomorrow morning</p>
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Image
                  src="/branding/flow-default.png"
                  alt="AI Assistant"
                  width={32}
                  height={32}
                  className="rounded-full flex-shrink-0"
                />
                <div className="flex-1">
                  <div className="bg-teal-50 border border-teal-100 rounded-lg p-3">
                    <p className="text-gray-800">
                      I found 3 open slots tomorrow morning. Your highest priority is &quot;Prepare presentation&quot; (1h). I can schedule it at 9am, after your team standup. Does that work?
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium">
                  Apply Schedule
                </button>
                <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium">
                  Suggest Alternative
                </button>
              </div>
            </div>
          </div>
        }
        gradient={true}
      />

      {/* Email Intelligence Deep-Dive */}
      <FeatureDeepDive
        id="email-section"
        title="Smart Email Categorization"
        subtitle="Turn your inbox into actionable time blocks."
        benefits={[
          '10 smart categories (Personal, Work, Promotion, etc.)',
          'Auto-tagging with AI',
          'Priority sorting by importance',
          'Time blocking suggestions',
        ]}
        ctaText="Learn More"
        ctaLink={getGoogleAuthUrl()}
        onCtaClick={() => track('homepage_cta_clicked', { cta_text: 'Learn More', location: 'email-section' })}
        visual={
          <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
            <div className="space-y-3">
              {[
                { emoji: '💼', category: 'Work', subject: 'Team meeting at 3pm tomorrow', color: '#8B5CF6' },
                { emoji: '🛍️', category: 'Shopping', subject: 'Your order has been shipped', color: '#F59E0B' },
                { emoji: '💰', category: 'Finance', subject: 'Your invoice is ready', color: '#06B6D4' },
                { emoji: '👥', category: 'Personal', subject: 'Family dinner this Sunday?', color: '#3B82F6' },
              ].map((email, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:shadow-sm transition-shadow">
                  <span className="text-2xl">{email.emoji}</span>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{email.subject}</p>
                    <p className="text-sm text-gray-500">inbox@example.com</p>
                  </div>
                  <span
                    className="text-xs px-2 py-1 rounded-full font-medium"
                    style={{
                      backgroundColor: `${email.color}15`,
                      color: email.color,
                      border: `1px solid ${email.color}40`,
                    }}
                  >
                    {email.category}
                  </span>
                </div>
              ))}
            </div>
          </div>
        }
        reverse={true}
      />

      {/* Habit Scheduling Deep-Dive */}
      <FeatureDeepDive
        id="habits-section"
        title="Habit-Aware Scheduling"
        subtitle="Schedule work around your life, not the other way around."
        benefits={[
          'Recurring habits get priority placement',
          'Flexible time windows (e.g., "morning workout")',
          'Smart suggestions based on history',
          'Automatic rescheduling when conflicts arise',
        ]}
        ctaText="Get Started"
        ctaLink={getGoogleAuthUrl()}
        onCtaClick={() => track('homepage_cta_clicked', { cta_text: 'Get Started', location: 'habits-section' })}
        visual={
          <HabitPlannerPreview />
        }
        gradient={true}
      />

      <CompetitiveDifferentiation />

      <Testimonials />

      <div id="pricing">
        <PricingTeaser />
      </div>

      <FinalCTA />
    </>
  );
}

export default function HomePage() {
  return (
    <>
      <StructuredData />
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
            <a
              href="#features"
              onClick={() => track('homepage_navigation_clicked', { destination: 'features' })}
              className="text-gray-600 hover:text-teal-600 font-medium transition-colors text-sm lg:text-base"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              onClick={() => track('homepage_navigation_clicked', { destination: 'how-it-works' })}
              className="text-gray-600 hover:text-teal-600 font-medium transition-colors text-sm lg:text-base"
            >
              How It Works
            </a>
            <a
              href="#pricing"
              onClick={() => track('homepage_navigation_clicked', { destination: 'pricing' })}
              className="text-gray-600 hover:text-teal-600 font-medium transition-colors text-sm lg:text-base"
            >
              Pricing
            </a>
            <a
              href="#why-timeflow"
              onClick={() => track('homepage_navigation_clicked', { destination: 'why-timeflow' })}
              className="text-gray-600 hover:text-teal-600 font-medium transition-colors text-sm lg:text-base"
            >
              Why TimeFlow
            </a>
            <Link
              href="/today"
              onClick={() => track('homepage_navigation_clicked', { destination: 'sign-in' })}
              className="text-gray-600 hover:text-teal-600 font-medium transition-colors text-sm lg:text-base"
            >
              Sign In
            </Link>
            <a
              href={getGoogleAuthUrl()}
              onClick={() => track('homepage_cta_clicked', { cta_text: 'Get Started Free', location: 'header' })}
              className="bg-teal-600 text-white px-5 lg:px-6 py-2.5 lg:py-3 min-h-[44px] rounded-lg hover:bg-teal-700 active:bg-teal-800 font-medium text-sm lg:text-base transition-all inline-flex items-center justify-center"
            >
              Get Started Free
            </a>
          </nav>
          {/* Mobile menu button */}
          <a
            href={getGoogleAuthUrl()}
            className="md:hidden bg-teal-600 text-white px-4 py-2.5 min-h-[44px] rounded-lg hover:bg-teal-700 active:bg-teal-800 font-medium text-sm transition-all inline-flex items-center justify-center"
          >
            Get Started
          </a>
        </div>
      </header>

            {/* Main content */}
            <main>
              <HomeMarketingSections />
            </main>

            <HomepageFooter />
          </div>
        }
      >
        <HomeMarketingSections />
      </AppShellWhenAuthed>
    </>
  );
}
