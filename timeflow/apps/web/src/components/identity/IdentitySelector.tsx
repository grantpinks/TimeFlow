'use client';

import React, { useState, useRef, useEffect } from 'react';
import type { Identity } from '@timeflow/shared';
export type { Identity };
import { hexWithOpacity } from '@/lib/identityConstants';

interface IdentitySelectorProps {
  identities: Identity[];
  value: string | null;
  onChange: (identityId: string | null) => void;
  placeholder?: string;
  label?: string;
  showLinkPrompt?: boolean; // Show subtle "Link to identity?" styling
}

/**
 * Dropdown selector for linking a task or habit to an identity.
 */
export function IdentitySelector({
  identities,
  value,
  onChange,
  placeholder = 'Link to identity (optional)',
  label,
  showLinkPrompt = false,
}: IdentitySelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = identities.find((i) => i.id === value) ?? null;

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  if (identities.length === 0) return null;

  return (
    <div className="relative" ref={ref}>
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      )}

      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`
          w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-sm text-left
          transition-all duration-150
          ${selected
            ? 'bg-white border-slate-200 hover:border-slate-300'
            : showLinkPrompt
              ? 'bg-primary-50/60 border-primary-200 border-dashed text-primary-600 hover:bg-primary-50'
              : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
          }
        `}
      >
        {selected ? (
          <>
            <span className="text-base">{selected.icon}</span>
            <span className="font-medium" style={{ color: selected.color }}>{selected.name}</span>
            <svg className="w-4 h-4 text-slate-400 ml-auto flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </>
        ) : (
          <>
            {showLinkPrompt && (
              <svg className="w-4 h-4 text-primary-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            )}
            <span className={showLinkPrompt ? 'text-primary-600 font-medium' : 'text-slate-400'}>
              {placeholder}
            </span>
            <svg className="w-4 h-4 text-slate-400 ml-auto flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          {/* Clear option */}
          {value && (
            <button
              type="button"
              onClick={() => { onChange(null); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-slate-500 hover:bg-slate-50 transition-colors border-b border-slate-100"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Remove identity link
            </button>
          )}

          {identities.map((identity) => (
            <button
              key={identity.id}
              type="button"
              onClick={() => { onChange(identity.id); setOpen(false); }}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left transition-colors
                ${value === identity.id ? 'bg-slate-50' : 'hover:bg-slate-50'}
              `}
            >
              <span
                className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0"
                style={{ backgroundColor: hexWithOpacity(identity.color, 0.12) }}
              >
                {identity.icon}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900">{identity.name}</p>
                {identity.description && (
                  <p className="text-xs text-slate-500 truncate">{identity.description}</p>
                )}
              </div>
              {value === identity.id && (
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: identity.color }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
