'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error') || 'unknown';

  const errorMessages: Record<string, string> = {
    callback_failed: 'Failed to complete sign in. Please try again.',
    no_token: 'Authentication failed. No token received.',
    access_denied: 'Access was denied. Please grant the required permissions.',
    unknown: 'An unknown error occurred during sign in.',
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-8 h-8 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">
          Authentication Error
        </h1>
        <p className="text-slate-600 mb-6">
          {errorMessages[error] || errorMessages.unknown}
        </p>
        <Link
          href="/"
          className="inline-block bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 font-medium"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}

