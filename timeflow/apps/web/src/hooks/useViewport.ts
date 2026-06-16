'use client';

import { useEffect, useState } from 'react';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

/**
 * Hook to detect current viewport breakpoint
 * Mobile: < 768px
 * Tablet: 768px - 1023px
 * Desktop: >= 1024px
 */
export function useViewport() {
  // Initialize with undefined for SSR safety - will be set on client mount
  const [breakpoint, setBreakpoint] = useState<Breakpoint | undefined>(undefined);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Mark that we're on client to prevent hydration mismatch
    setIsClient(true);

    const getBreakpoint = (): Breakpoint => {
      if (window.matchMedia('(max-width: 767px)').matches) {
        return 'mobile';
      } else if (window.matchMedia('(max-width: 1023px)').matches) {
        return 'tablet';
      } else {
        return 'desktop';
      }
    };

    // Initialize on mount
    setBreakpoint(getBreakpoint());

    // Throttle resize events to prevent performance issues
    let timeoutId: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setBreakpoint(getBreakpoint());
      }, 150); // 150ms debounce - balances responsiveness with performance
    };

    // Use passive listener for better scroll performance
    window.addEventListener('resize', handleResize, { passive: true });

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // During SSR or initial client render, default to desktop to avoid hydration mismatch
  // Once client is mounted, use actual breakpoint
  const currentBreakpoint = isClient && breakpoint !== undefined ? breakpoint : 'desktop';

  return {
    isMobile: currentBreakpoint === 'mobile',
    isTablet: currentBreakpoint === 'tablet',
    isDesktop: currentBreakpoint === 'desktop',
    breakpoint: currentBreakpoint,
  };
}
