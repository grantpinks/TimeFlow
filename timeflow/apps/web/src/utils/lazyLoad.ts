'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Hook for lazy loading components when they enter viewport
 *
 * Uses IntersectionObserver to efficiently detect when an element
 * becomes visible in the viewport. This is useful for deferring
 * expensive component rendering until the user scrolls near them.
 *
 * @param options - Optional IntersectionObserver configuration
 * @returns Object with targetRef (attach to container) and isVisible flag
 *
 * @example
 * ```tsx
 * function HeavyComponent() {
 *   const { targetRef, isVisible } = useLazyLoad();
 *
 *   return (
 *     <div ref={targetRef}>
 *       {isVisible ? (
 *         <ExpensiveChart data={largeDataset} />
 *       ) : (
 *         <div className="h-96 bg-slate-100 animate-pulse" />
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useLazyLoad(options?: IntersectionObserverInit) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const targetRef = useRef<HTMLDivElement>(null);
  // Store options in ref to avoid observer recreation on every options change
  const optionsRef = useRef(options);

  useEffect(() => {
    // Update options ref if they change
    optionsRef.current = options;
  }, [options]);

  useEffect(() => {
    const currentTarget = targetRef.current;

    // Guard against null target - don't create observer if no element to observe
    if (!currentTarget) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px', // Preload 50px before entering viewport
        threshold: 0.1, // Trigger when 10% visible
        ...optionsRef.current,
      }
    );

    observer.observe(currentTarget);

    return () => observer.disconnect();
    // Empty deps array - observer is created once and uses optionsRef
  }, []);

  return { targetRef, isVisible: isIntersecting };
}
