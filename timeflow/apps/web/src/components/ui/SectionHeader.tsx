/**
 * SectionHeader Component
 *
 * A typography-led section header with optional count badge and right-side actions.
 * Replaces heavy borders and boxes with clean type hierarchy.
 *
 * Design Philosophy:
 * - Uses typography instead of visual dividers
 * - Optional count badge for context
 * - Actions on the right (buttons, links, etc.)
 * - Generous spacing below for rhythm
 */

import React from 'react';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  count?: number;
  /** Optional actions to display on the right (buttons, links, etc.) */
  actions?: React.ReactNode;
  className?: string;
}

export function SectionHeader({
  title,
  subtitle,
  count,
  actions,
  className = '',
}: SectionHeaderProps) {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4 mb-4 sm:mb-6 ${className}`}>
      <div className="flex-1">
        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
          <h2 className="text-xl sm:text-2xl font-semibold text-slate-900">{title}</h2>
          {count !== undefined && (
            <span className="inline-flex items-center justify-center min-w-[2rem] h-6 sm:h-7 px-2 sm:px-2.5 text-xs sm:text-sm font-medium text-slate-600 bg-slate-100 rounded-full">
              {count}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="mt-1 text-xs sm:text-sm text-slate-600">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
