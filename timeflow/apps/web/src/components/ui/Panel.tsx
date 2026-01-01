/**
 * Panel Component
 *
 * A container with Level 1 elevation, generous padding, and soft radius.
 * Used for section containers across the app (Task lists, Today sections, etc.)
 *
 * Design Philosophy:
 * - Replaces bordered boxes with soft shadows for depth
 * - Generous spacing for a calm, organized feel
 * - Neutral-first styling (no loud colors unless intentional)
 */

import React from 'react';

interface PanelProps {
  children: React.ReactNode;
  className?: string;
  /** Padding size - default is 'normal' (24px) */
  padding?: 'none' | 'sm' | 'normal' | 'lg';
  /** Apply hover elevation on mouse over */
  hoverable?: boolean;
}

export function Panel({
  children,
  className = '',
  padding = 'normal',
  hoverable = false
}: PanelProps) {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    normal: 'p-6',
    lg: 'p-8',
  };

  return (
    <div
      className={`
        bg-white
        rounded-panel
        ${hoverable ? 'shadow-panel hover:shadow-hover' : 'shadow-panel'}
        ${paddingClasses[padding]}
        ${hoverable ? 'transition-shadow duration-fast' : ''}
        ${className}
      `}
      style={{
        boxShadow: 'var(--elevation-1)',
      }}
    >
      {children}
    </div>
  );
}
