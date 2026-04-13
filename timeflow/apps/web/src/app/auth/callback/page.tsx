'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { setAuthToken, setRefreshToken } from '../../../lib/api';
import { LoadingSpinner } from '@/components/ui';
import { FlowMascot } from '@/components/FlowMascot';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token') || searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');
    const error = searchParams.get('error');
    const state = searchParams.get('state'); // OAuth state parameter (returnTo URL)

    if (error) {
      router.push(`/auth/error?error=${error}`);
      return;
    }

    if (token) {
      setAuthToken(token);
      if (refreshToken) {
        setRefreshToken(refreshToken);
      }

      // If state parameter exists, redirect there (e.g., back to pricing with checkout param)
      // Otherwise, go to default /tasks page
      const redirectTo = state || '/tasks';
      router.push(redirectTo);
    } else {
      router.push('/auth/error?error=no_token');
    }
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="flex justify-center mb-3">
          <FlowMascot size="md" expression="happy" />
        </div>
        <LoadingSpinner size="lg" label="Signing in" />
        <p className="text-slate-600 mt-4">Signing you in…</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="flex justify-center mb-3">
              <FlowMascot size="md" expression="happy" />
            </div>
            <LoadingSpinner size="lg" label="Signing in" />
            <p className="text-slate-600 mt-4">Signing you in…</p>
          </div>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
