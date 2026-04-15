'use client';

import { Layout } from '@/components/Layout';
import { LoadingSpinner } from '@/components/ui';
import { useUser } from '@/hooks/useUser';

type Props = {
  children: React.ReactNode;
  /** Full-page shell when the user is not signed in (e.g. marketing header + footer). */
  fallback: React.ReactNode;
};

/**
 * When signed in, wraps content with the main app {@link Layout} (sidebar + mobile nav).
 * When signed out, renders `fallback` so marketing pages keep their public chrome.
 */
export function AppShellWhenAuthed({ children, fallback }: Props) {
  const { isAuthenticated, loading } = useUser();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-2">
        <LoadingSpinner size="lg" label="Loading" />
        <p className="text-sm text-slate-500">Loading…</p>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Layout>{children}</Layout>;
  }

  return <>{fallback}</>;
}
