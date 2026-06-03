'use client';

import type { Identity } from '@timeflow/shared';

export interface IdentityStudioRailProps {
  identities: Identity[];
  unassignedCount: number;
  habitCountByIdentityId: Record<string, number>;
  focusedIdentityId: string | null;
  onFocusChange: (identityId: string | null) => void;
  className?: string;
}

function pillClass(active: boolean): string {
  return [
    'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
    active
      ? 'border-primary-500 bg-primary-50 text-primary-900'
      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50',
  ].join(' ');
}

export function IdentityStudioRail({
  identities,
  unassignedCount,
  habitCountByIdentityId,
  focusedIdentityId,
  onFocusChange,
  className = '',
}: IdentityStudioRailProps) {
  const handleIdentityClick = (id: string) => {
    onFocusChange(focusedIdentityId === id ? null : id);
  };

  return (
    <nav
      className={`flex flex-col gap-2 ${className}`}
      aria-label="Filter by identity"
      data-testid="identity-studio-rail"
    >
      <div className="hidden lg:flex flex-col gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 px-1">
          Identities
        </span>
        <button
          type="button"
          className={pillClass(focusedIdentityId === null)}
          onClick={() => onFocusChange(null)}
          aria-pressed={focusedIdentityId === null}
        >
          All
        </button>
        {identities.map((identity) => {
          const count = habitCountByIdentityId[identity.id] ?? 0;
          const active = focusedIdentityId === identity.id;
          return (
            <button
              key={identity.id}
              type="button"
              className={`${pillClass(active)} text-left`}
              onClick={() => handleIdentityClick(identity.id)}
              aria-pressed={active}
            >
              <span className="mr-1">{identity.icon}</span>
              {identity.name}
              <span className="ml-1 text-slate-500">({count})</span>
            </button>
          );
        })}
        {unassignedCount > 0 && (
          <button
            type="button"
            className={pillClass(focusedIdentityId === '__none__')}
            onClick={() => handleIdentityClick('__none__')}
            aria-pressed={focusedIdentityId === '__none__'}
          >
            Unassigned
            <span className="ml-1 text-slate-500">({unassignedCount})</span>
          </button>
        )}
      </div>

      {/* Mobile: horizontal scroller */}
      <div className="flex lg:hidden gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
        <button
          type="button"
          className={pillClass(focusedIdentityId === null)}
          onClick={() => onFocusChange(null)}
          aria-pressed={focusedIdentityId === null}
        >
          All
        </button>
        {identities.map((identity) => {
          const count = habitCountByIdentityId[identity.id] ?? 0;
          const active = focusedIdentityId === identity.id;
          return (
            <button
              key={identity.id}
              type="button"
              className={pillClass(active)}
              onClick={() => handleIdentityClick(identity.id)}
              aria-pressed={active}
            >
              {identity.icon} {identity.name} ({count})
            </button>
          );
        })}
        {unassignedCount > 0 && (
          <button
            type="button"
            className={pillClass(focusedIdentityId === '__none__')}
            onClick={() => handleIdentityClick('__none__')}
            aria-pressed={focusedIdentityId === '__none__'}
          >
            Unassigned ({unassignedCount})
          </button>
        )}
      </div>
    </nav>
  );
}
