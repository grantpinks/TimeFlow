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
  const [breakpoint, setBreakpoint] = useState<Breakpoint | undefined>(undefined);

  useEffect(() => {
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

    // Update on resize
    const handleResize = () => {
      setBreakpoint(getBreakpoint());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // During SSR, default to desktop to avoid hydration issues
  const currentBreakpoint = breakpoint ?? 'desktop';

  return {
    isMobile: currentBreakpoint === 'mobile',
    isTablet: currentBreakpoint === 'tablet',
    isDesktop: currentBreakpoint === 'desktop',
    breakpoint: currentBreakpoint,
  };
}
