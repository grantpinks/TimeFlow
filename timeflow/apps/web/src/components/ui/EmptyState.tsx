/**
 * EmptyState Component
 *
 * A calm, typography-first empty state pattern.
 * No bordered "empty card" - just a message and clear action.
 *
 * Design Philosophy:
 * - Minimal visual weight (no heavy borders)
 * - Clear, friendly message
 * - Single primary action when appropriate
 * - Generous spacing for calm feel
 */

import React from 'react';

interface EmptyStateProps {
  /** Icon element (SVG) to display */
  icon?: React.ReactNode;
  /** Main message */
  title: string;
  /** Optional description/hint */
  description?: string;
  /** Optional primary action button/link */
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-6 text-center ${className}`}>
      {icon && (
        <div className="mb-4 text-slate-300">
          {icon}
        </div>
      )}

      <h3 className="text-lg font-medium text-slate-700 mb-2">
        {title}
      </h3>

      {description && (
        <p className="text-sm text-slate-500 mb-6 max-w-md">
          {description}
        </p>
      )}

      {action && (
        <div>
          {action}
        </div>
      )}
    </div>
  );
}
