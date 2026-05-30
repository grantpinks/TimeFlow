'use client';

import { AuthPageLayout } from '@/components/auth/AuthPageLayout';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import Link from 'next/link';
import { track } from '@/lib/analytics';
import { useEffect, useState } from 'react';

export default function LoginPage() {
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    // Track page view - using console for now
    if (typeof window !== 'undefined') {
      console.log('Login page viewed');

      // Check if user was redirected due to session expiration
      const redirectPath = sessionStorage.getItem('auth_redirect_path');
      if (redirectPath) {
        setSessionExpired(true);
        // Auto-clear after 5 seconds
        setTimeout(() => setSessionExpired(false), 5000);
      }
    }
  }, []);

  return (
    <AuthPageLayout
      heading="Welcome Back to TimeFlow"
      subheading="Sign in to continue organizing your schedule"
    >
      <div className="space-y-6">
        {/* Session Expired Notice */}
        {sessionExpired && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
            <svg
              className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-900">Session Expired</p>
              <p className="text-sm text-amber-700 mt-1">
                Your session has expired. Please sign in again to continue.
              </p>
            </div>
          </div>
        )}
        {/* Google Sign In Button */}
        <div className="flex justify-center">
          <GoogleSignInButton
            variant="primary"
            text="Sign in with Google"
            location="login_page"
          />
        </div>

        {/* Trust Signal */}
        <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
          <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          <span>Secure OAuth 2.0 authentication</span>
        </div>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white text-gray-500">New to TimeFlow?</span>
          </div>
        </div>

        {/* Sign Up Link */}
        <div className="text-center">
          <Link
            href="/get-started"
            onClick={() => track('homepage_navigation_clicked', { destination: 'get-started', from: 'login_page' })}
            className="text-teal-600 hover:text-teal-700 font-semibold text-sm hover:underline transition-colors"
          >
            Create a free account →
          </Link>
        </div>

        {/* Additional Info */}
        <div className="pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500 text-center leading-relaxed">
            By signing in, you agree to our{' '}
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
