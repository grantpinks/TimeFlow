'use client';

import { useState, useRef } from 'react';

interface SwipeGestureConfig {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number; // Minimum distance to trigger swipe (default: 50px)
}

/**
 * Hook for detecting swipe gestures
 */
export function useSwipeGesture({
  onSwipeLeft,
  onSwipeRight,
  threshold = 50,
}: SwipeGestureConfig) {
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > threshold;
    const isRightSwipe = distance < -threshold;

    if (isLeftSwipe && onSwipeLeft) {
      onSwipeLeft();
    }
    if (isRightSwipe && onSwipeRight) {
      onSwipeRight();
    }

    setTouchStart(null);
    setTouchEnd(null);
  };

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };
}

/**
 * Hook for pull-to-refresh gesture
 */
export function usePullToRefresh(onRefresh: () => Promise<void>) {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef<number>(0);
  const threshold = 80; // Pixels to pull before triggering refresh

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY.current === 0 || window.scrollY > 0) return;

    const currentY = e.touches[0].clientY;
    const distance = currentY - startY.current;

    if (distance > 0 && distance < threshold * 2) {
      setPullDistance(distance);
      setIsPulling(true);
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance >= threshold) {
      await onRefresh();
    }

    setIsPulling(false);
    setPullDistance(0);
    startY.current = 0;
  };

  const progress = Math.min(pullDistance / threshold, 1);

  return {
    isPulling,
    pullDistance,
    progress,
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };
}
