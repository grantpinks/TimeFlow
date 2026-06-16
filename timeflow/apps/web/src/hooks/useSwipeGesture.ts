'use client';

import { useRef, useState } from 'react';

interface SwipeGestureConfig {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number; // Minimum distance to trigger swipe (default: 50px)
}

/**
 * Hook for detecting swipe gestures
 * Uses refs instead of state to avoid unnecessary re-renders
 */
export function useSwipeGesture({
  onSwipeLeft,
  onSwipeRight,
  threshold = 50,
}: SwipeGestureConfig) {
  // Use refs instead of state - we don't need re-renders for touch tracking
  const touchStart = useRef<number | null>(null);
  const touchEnd = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchEnd.current = null;
    touchStart.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEnd.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    // Check for null explicitly - clientX can legitimately be 0 at screen edge
    if (touchStart.current === null || touchEnd.current === null) return;

    const distance = touchStart.current - touchEnd.current;
    const isLeftSwipe = distance > threshold;
    const isRightSwipe = distance < -threshold;

    if (isLeftSwipe && onSwipeLeft) {
      onSwipeLeft();
    }
    if (isRightSwipe && onSwipeRight) {
      onSwipeRight();
    }

    touchStart.current = null;
    touchEnd.current = null;
  };

  // Handle touch cancel (user drags off screen, interruption, etc.)
  const handleTouchCancel = () => {
    touchStart.current = null;
    touchEnd.current = null;
  };

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    onTouchCancel: handleTouchCancel,
  };
}

/**
 * Hook for pull-to-refresh gesture
 * Includes timeout protection and reliable scroll detection
 */
export function usePullToRefresh(onRefresh: () => Promise<void>) {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef<number>(0);
  const threshold = 80; // Pixels to pull before triggering refresh

  const handleTouchStart = (e: React.TouchEvent) => {
    // Use <= 1 instead of === 0 for more reliable detection (floating point, iOS quirks)
    if (window.scrollY <= 1 && !isRefreshing) {
      startY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY.current === 0 || window.scrollY > 1 || isRefreshing) return;

    const currentY = e.touches[0].clientY;
    const distance = currentY - startY.current;

    if (distance > 0 && distance < threshold * 2) {
      setPullDistance(distance);
      setIsPulling(true);
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);

      try {
        // Race against 10-second timeout to prevent infinite refresh loops
        await Promise.race([
          onRefresh(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Refresh timeout')), 10000)
          ),
        ]);
      } catch (error) {
        console.error('Pull-to-refresh failed:', error);
      } finally {
        setIsRefreshing(false);
      }
    }

    setIsPulling(false);
    setPullDistance(0);
    startY.current = 0;
  };

  const handleTouchCancel = () => {
    setIsPulling(false);
    setPullDistance(0);
    startY.current = 0;
  };

  const progress = Math.min(pullDistance / threshold, 1);

  return {
    isPulling,
    pullDistance,
    progress,
    isRefreshing,
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    onTouchCancel: handleTouchCancel,
  };
}
