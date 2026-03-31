'use client';

import React from 'react';
import { hexWithOpacity } from '@/lib/identityConstants';

export interface IdentityLike {
  id?: string;
  name: string;
  color: string;
  icon: string;
}

interface IdentityBadgeProps {
  identity: IdentityLike;
  size?: 'sm' | 'md';
  onClick?: () => void;
  active?: boolean;
}

/**
 * Inline identity badge — used in TaskCard and filter bars.
 * sm: icon only (with tooltip)
 * md: icon + name
 */
export function IdentityBadge({ identity, size = 'md', onClick, active = false }: IdentityBadgeProps) {
  const bg = active ? hexWithOpacity(identity.color, 0.18) : hexWithOpacity(identity.color, 0.1);
  const border = active ? identity.color : hexWithOpacity(identity.color, 0.4);

  const base =
    'inline-flex items-center gap-1.5 rounded-full font-medium transition-all duration-150 border';

  const sizeClasses = size === 'sm'
    ? 'px-1.5 py-0.5 text-xs'
    : 'px-2.5 py-1 text-xs';

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className={`${base} ${sizeClasses} cursor-pointer hover:scale-105 active:scale-95`}
        style={{ backgroundColor: bg, borderColor: border, color: identity.color }}
        title={identity.name}
      >
        <span>{identity.icon}</span>
        {size === 'md' && <span style={{ color: identity.color }}>{identity.name}</span>}
      </button>
    );
  }

  return (
    <span
      className={`${base} ${sizeClasses}`}
      style={{ backgroundColor: bg, borderColor: border, color: identity.color }}
      title={identity.name}
    >
      <span>{identity.icon}</span>
      {size === 'md' && <span style={{ color: identity.color }}>{identity.name}</span>}
    </span>
  );
}
