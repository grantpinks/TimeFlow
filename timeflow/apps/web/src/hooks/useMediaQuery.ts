'use client';

import { useEffect, useState } from 'react';

/**
 * Hook to detect media query matches
 * @param query - CSS media query string (e.g., '(min-width: 768px)')
 * @returns boolean indicating if query matches
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const media = window.matchMedia(query);

    // Initialize state on mount
    setMatches(media.matches);

    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Modern browsers (Safari 14+, Chrome 45+, Firefox 55+)
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]); // Only re-run if query changes

  // During SSR, return false to avoid hydration mismatch
  return matches ?? false;
}
