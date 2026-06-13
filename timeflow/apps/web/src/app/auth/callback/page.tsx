'use client';

import { Suspense, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui';

/** Read OAuth params from the live URL (reliable on external redirect; useSearchParams can be empty briefly). */
function readOAuthCallbackParams(): {
  error: string | null;
  state: string | null;
} {
  if (typeof window === 'undefined') {
    return { error: null, state: null };
  }
  const params = new URLSearchParams(window.location.search);
  return {
    error: params.get('error'),
    state: params.get('state'),
  };
}

/** Only allow same-origin relative return paths from OAuth state. */
function safeReturnPath(state: string | null): string {
  if (!state) return '/today';
  if (state.startsWith('/') && !state.startsWith('//')) return state;
  return '/today';
}

/** Parse OAuth state (plain path or base64url JSON from backend). */
function parseOAuthReturnPath(state: string | null): string {
  if (!state) return '/today';
  if (state.startsWith('/') && !state.startsWith('//')) {
    return safeReturnPath(state);
  }
  try {
    let base64 = state.replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4;
    if (pad) base64 += '='.repeat(4 - pad);
    const json = atob(base64);
    const parsed = JSON.parse(json) as { returnTo?: string };
    if (parsed.returnTo) return safeReturnPath(parsed.returnTo);
  } catch {
    // fall through
  }
  return safeReturnPath(state);
}

function AuthCallbackContent() {
  const router = useRouter();
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;

    const { error, state } = readOAuthCallbackParams();

    if (error) {
      router.replace(`/auth/error?error=${encodeURIComponent(error)}`);
      return;
    }

    // Session cookies are set by the backend OAuth callback redirect.
    const redirectTo = parseOAuthReturnPath(state);
    router.replace(redirectTo);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="flex justify-center">
          <LoadingSpinner size="lg" label="Signing in" />
        </div>
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
            <div className="flex justify-center">
              <LoadingSpinner size="lg" label="Signing in" />
            </div>
            <p className="text-slate-600 mt-4">Signing you in…</p>
          </div>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
