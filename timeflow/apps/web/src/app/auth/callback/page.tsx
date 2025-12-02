'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { setAuthToken } from '@/lib/api';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (error) {
      router.push(`/auth/error?error=${error}`);
      return;
    }

    if (token) {
      setAuthToken(token);
      router.push('/tasks');
    } else {
      router.push('/auth/error?error=no_token');
    }
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
        <p className="text-slate-600">Signing you in...</p>
      </div>
    </div>
  );
}

