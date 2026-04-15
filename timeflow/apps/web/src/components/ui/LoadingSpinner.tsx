'use client';

import { FlowMascot } from '@/components/FlowMascot';

export type LoadingSpinnerSize = 'sm' | 'md' | 'lg' | 'xl';

const sizeClasses: Record<LoadingSpinnerSize, string> = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-2',
  xl: 'h-14 w-14 border-[3px]',
};

/** When Flow is centered in the ring, the wrapper is slightly larger than the plain ring for balance. */
const centeredWrapperClasses: Record<LoadingSpinnerSize, string> = {
  sm: 'h-10 w-10',
  md: 'h-12 w-12',
  lg: 'h-14 w-14',
  xl: 'h-16 w-16',
};

const centeredRingBorder: Record<LoadingSpinnerSize, string> = {
  sm: 'border-2',
  md: 'border-2',
  lg: 'border-2',
  xl: 'border-[3px]',
};

const mascotSizeForSpinner: Record<LoadingSpinnerSize, 'sm' | 'md'> = {
  sm: 'sm',
  md: 'sm',
  lg: 'sm',
  xl: 'md',
};

export type LoadingSpinnerVariant = 'default' | 'inbox' | 'inverse';

const variantClasses: Record<LoadingSpinnerVariant, string> = {
  default: 'border-slate-200 border-t-primary-600',
  /** Inbox accent (#0BAF9A) */
  inbox: 'border-[#0BAF9A]/25 border-t-[#0BAF9A]',
  /** On primary / dark buttons */
  inverse: 'border-white/35 border-t-white',
};

export interface LoadingSpinnerProps {
  size?: LoadingSpinnerSize;
  variant?: LoadingSpinnerVariant;
  /** Visually hidden label for screen readers */
  label?: string;
  /** Extra classes (merged after variant). Overrides border colors when needed. */
  className?: string;
  /**
   * Show Flow in the center of the ring with a soft pulse (default: true for `lg` and `xl`).
   * Set false for tight inline spinners (e.g. buttons) when using larger sizes.
   */
  centerMascot?: boolean;
}

function defaultCenterMascot(size: LoadingSpinnerSize): boolean {
  return size === 'lg' || size === 'xl';
}

/**
 * Shared loading indicator — spinning ring; optional Flow mascot centered inside with pulse (lg/xl by default).
 */
export function LoadingSpinner({
  size = 'md',
  variant = 'default',
  label = 'Loading',
  className = '',
  centerMascot = defaultCenterMascot(size),
}: LoadingSpinnerProps) {
  const ring = [variantClasses[variant], className].filter(Boolean).join(' ');

  if (!centerMascot) {
    return (
      <div role="status" className="inline-flex items-center justify-center" aria-busy="true">
        <span
          className={`inline-block animate-spin rounded-full ${sizeClasses[size]} ${ring}`}
          aria-hidden
        />
        <span className="sr-only">{label}</span>
      </div>
    );
  }

  const wrapper = centeredWrapperClasses[size];
  const borderW = centeredRingBorder[size];
  const mascotSz = mascotSizeForSpinner[size];
  const mascotVisual =
    size === 'sm' ? ('scale-[0.65]' as const) : size === 'md' ? ('scale-90' as const) : '';

  return (
    <div role="status" className={`relative inline-flex ${wrapper}`} aria-busy="true">
      <span
        className={`absolute inset-0 animate-spin rounded-full ${borderW} ${ring}`}
        aria-hidden
      />
      <span className="absolute inset-0 z-[1] flex items-center justify-center pointer-events-none">
        <span
          className={`animate-flow-mascot-pulse ${variant === 'inverse' ? 'drop-shadow-md' : ''} ${mascotVisual}`}
        >
          <FlowMascot size={mascotSz} expression="happy" />
        </span>
      </span>
      <span className="sr-only">{label}</span>
    </div>
  );
}
