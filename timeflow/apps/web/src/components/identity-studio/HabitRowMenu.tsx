'use client';

import { useEffect, useRef, useState } from 'react';
import type { Identity } from '@timeflow/shared';

export interface HabitRowMenuProps {
  onEdit: () => void;
  onDelete: () => void;
  identities?: Identity[];
  currentIdentityId?: string | null;
  onMoveToIdentity?: (identityId: string | null) => void;
}

export function HabitRowMenu({
  onEdit,
  onDelete,
  identities = [],
  currentIdentityId,
  onMoveToIdentity,
}: HabitRowMenuProps) {
  const [open, setOpen] = useState(false);
  const [showMove, setShowMove] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setShowMove(false);
      }
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [open]);

  const moveTargets = identities.filter((i) => i.id !== currentIdentityId);

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        aria-label="Habit actions"
        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
        onClick={() => {
          setOpen((v) => !v);
          setShowMove(false);
        }}
      >
        ⋯
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 min-w-[10rem] rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          <button
            type="button"
            className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
          >
            Edit
          </button>
          {onMoveToIdentity && (moveTargets.length > 0 || currentIdentityId) && (
            <button
              type="button"
              className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              onClick={() => setShowMove((v) => !v)}
            >
              Move to…
            </button>
          )}
          {showMove && onMoveToIdentity && (
            <div className="border-t border-slate-100 py-1 max-h-40 overflow-y-auto">
              {currentIdentityId && (
                <button
                  type="button"
                  className="block w-full px-3 py-1.5 text-left text-xs text-slate-600 hover:bg-slate-50"
                  onClick={() => {
                    setOpen(false);
                    setShowMove(false);
                    onMoveToIdentity(null);
                  }}
                >
                  Unassigned
                </button>
              )}
              {moveTargets.map((identity) => (
                <button
                  key={identity.id}
                  type="button"
                  className="block w-full px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50"
                  onClick={() => {
                    setOpen(false);
                    setShowMove(false);
                    onMoveToIdentity(identity.id);
                  }}
                >
                  {identity.icon} {identity.name}
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
