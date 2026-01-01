/**
 * ListRow Component
 *
 * Replaces "card-per-task" pattern with a cleaner row inside a Panel.
 * Supports checkbox, title, metadata, and right-side actions that appear on hover/focus.
 *
 * Design Philosophy:
 * - Flat list inside elevated Panel (not individual card shadows)
 * - Small accent indicator instead of thick left bars
 * - Hide secondary actions until hover/focus
 * - Title is dominant; metadata is secondary
 */

import React, { useState } from 'react';

interface ListRowProps {
  /** Main content (title) */
  title: string;
  /** Secondary metadata line (e.g., "Due: Tomorrow • 30min • Priority 2") */
  metadata?: string;
  /** Optional checkbox for completion/selection */
  checkbox?: React.ReactNode;
  /** Actions to show on hover (edit, delete, etc.) */
  actions?: React.ReactNode;
  /** Small accent color indicator (dot or thin bar) */
  accentColor?: string;
  /** Whether this row is selected/active */
  selected?: boolean;
  /** Click handler for the row */
  onClick?: () => void;
  className?: string;
}

export function ListRow({
  title,
  metadata,
  checkbox,
  actions,
  accentColor,
  selected = false,
  onClick,
  className = '',
}: ListRowProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`
        group
        flex items-center gap-3
        py-3 px-4
        border-b border-slate-100 last:border-b-0
        ${selected ? 'bg-primary-50' : 'hover:bg-slate-50'}
        transition-colors duration-fast
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Optional accent indicator */}
      {accentColor && (
        <div
          className="w-1 h-1 rounded-full flex-shrink-0"
          style={{ backgroundColor: accentColor }}
        />
      )}

      {/* Optional checkbox */}
      {checkbox && <div className="flex-shrink-0">{checkbox}</div>}

      {/* Content area */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium text-slate-900 truncate">{title}</h3>
        {metadata && (
          <p className="mt-0.5 text-xs text-slate-500">{metadata}</p>
        )}
      </div>

      {/* Actions (visible on hover/focus or always if selected) */}
      {actions && (
        <div
          className={`
            flex-shrink-0 flex items-center gap-1
            transition-opacity duration-fast
            ${isHovered || selected ? 'opacity-100' : 'opacity-0 group-focus-within:opacity-100'}
          `}
        >
          {actions}
        </div>
      )}
    </div>
  );
}
