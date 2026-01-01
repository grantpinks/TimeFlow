'use client';

import { useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import * as api from '@/lib/api';

export default function CancelPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const token = searchParams.get('token') || '';

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleCancel() {
    if (!token) {
      setError('Invalid cancellation link');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      await api.cancelPublicMeeting(slug, token);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel meeting');
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-8 text-center">
          <div className="text-red-500 text-5xl mb-4">✕</div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Invalid Link</h1>
          <p className="text-slate-600">
            This cancellation link is invalid or has expired.
          </p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-8 text-center">
          <div className="text-green-500 text-5xl mb-4">✓</div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Meeting Cancelled</h1>
          <p className="text-slate-600">
            Your meeting has been cancelled successfully. You&apos;ll receive a confirmation email shortly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-8">
        <h1 className="text-2xl font-bold text-slate-800 mb-4 text-center">Cancel Meeting</h1>

        {error && (
          <div className="mb-6 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="mb-6 text-center">
          <div className="text-yellow-500 text-5xl mb-4">⚠️</div>
          <p className="text-slate-600">
            Are you sure you want to cancel this meeting?
          </p>
          <p className="text-sm text-slate-500 mt-2">
            This action cannot be undone.
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleCancel}
            disabled={submitting}
            className="w-full bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
          >
            {submitting ? 'Cancelling...' : 'Yes, Cancel Meeting'}
          </button>
          <button
            onClick={() => window.close()}
            disabled={submitting}
            className="w-full bg-white text-slate-700 px-6 py-3 rounded-lg border border-slate-300 hover:bg-slate-50 font-medium"
          >
            No, Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
