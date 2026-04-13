'use client';

export type LoadingSpinnerSize = 'sm' | 'md' | 'lg' | 'xl';

const sizeClasses: Record<LoadingSpinnerSize, string> = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-2',
  xl: 'h-14 w-14 border-[3px]',
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
}

/**
 * Shared loading indicator — same `animate-spin` motion everywhere; tokenized sizes/colors.
 */
export function LoadingSpinner({
  size = 'md',
  variant = 'default',
  label = 'Loading',
  className = '',
}: LoadingSpinnerProps) {
  const ring = [variantClasses[variant], className].filter(Boolean).join(' ');
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
