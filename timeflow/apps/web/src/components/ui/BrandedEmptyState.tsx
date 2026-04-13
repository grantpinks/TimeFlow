'use client';

import type { ComponentProps, ReactNode } from 'react';
import { FlowMascot } from '@/components/FlowMascot';

type MascotExpression = ComponentProps<typeof FlowMascot>['expression'];

export interface BrandedEmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  mascotExpression?: MascotExpression;
  mascotSize?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

/**
 * Empty state using the Flow mascot (brand-consistent) instead of random emoji/icons.
 */
export function BrandedEmptyState({
  title,
  description,
  action,
  mascotExpression = 'encouraging',
  mascotSize = 'lg',
  className = '',
}: BrandedEmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-10 px-6 text-center ${className}`}
    >
      <div className="mb-4">
        <FlowMascot size={mascotSize} expression={mascotExpression} />
      </div>
      <h3 className="text-lg font-semibold text-slate-800 mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-slate-600 mb-6 max-w-md leading-relaxed">{description}</p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}
