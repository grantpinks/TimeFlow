'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { initAnalytics, trackPageView } from '@/lib/analytics';

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Initialize PostHog on mount
  useEffect(() => {
    initAnalytics();
  }, []);

  // Track page views on route changes
  useEffect(() => {
    if (pathname) {
      const search = typeof window !== 'undefined' ? window.location.search : '';
      const url = `${pathname}${search}`;
      trackPageView(url);
    }
  }, [pathname]);

  return <>{children}</>;
}
