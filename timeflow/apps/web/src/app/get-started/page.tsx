'use client';

import { AuthPageLayout } from '@/components/auth/AuthPageLayout';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import Link from 'next/link';
import { track } from '@/lib/analytics';
import { useEffect } from 'react';

export default function GetStartedPage() {
  useEffect(() => {
    track('get_started_page_viewed');
  }, []);

  return (
    <AuthPageLayout
      heading="Get Started with TimeFlow"
      subheading="Reclaim your time in under 2 minutes"
    >
      <div className="space-y-6">
        {/* Steps Explainer */}
        <div className="space-y-4 pb-6 border-b border-gray-100">
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-sm">
              1
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Connect Google Calendar</h3>
              <p className="text-sm text-gray-600">
                We'll request read and write access to analyze your schedule and create optimized time blocks.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-sm">
              2
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">AI analyzes your patterns</h3>
              <p className="text-sm text-gray-600">
                TimeFlow learns your schedule, priorities, and habits to suggest the perfect time slots.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-sm">
              3
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Start reclaiming your time</h3>
              <p className="text-sm text-gray-600">
                Add tasks, let AI schedule them, and watch hours come back to your day.
              </p>
            </div>
          </div>
        </div>

        {/* Google Sign In Button */}
        <div className="flex justify-center">
          <GoogleSignInButton
            variant="primary"
            text="Continue with Google"
            location="get_started_page"
          />
        </div>

        {/* Trust Signals */}
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
            <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span>Free 14-day trial</span>
          </div>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
            <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span>No credit card required</span>
          </div>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
            <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span>Free plan available forever</span>
          </div>
        </div>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white text-gray-500">Already have an account?</span>
          </div>
        </div>

        {/* Sign In Link */}
        <div className="text-center">
          <Link
            href="/login"
            onClick={() => track('signin_link_clicked', { from: 'get_started_page' })}
            className="text-teal-600 hover:text-teal-700 font-semibold text-sm hover:underline transition-colors"
          >
            Sign in instead →
          </Link>
        </div>

        {/* Additional Info */}
        <div className="pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500 text-center leading-relaxed">
            By continuing, you agree to our{' '}
            <Link href="/terms" className="text-teal-600 hover:underline">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-teal-600 hover:underline">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </AuthPageLayout>
  );
}
