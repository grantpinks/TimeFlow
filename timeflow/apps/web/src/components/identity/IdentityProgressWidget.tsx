'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { IdentityDayProgress } from '@timeflow/shared';
import { hexWithOpacity } from '@/lib/identityConstants';
import * as api from '@/lib/api';

interface IdentityProgressWidgetProps {
  /** Called when user clicks an identity pill to filter the page */
  onFilterChange?: (identityId: string | null) => void;
  activeFilter?: string | null;
  className?: string;
}

/**
 * Compact horizontal row of identity progress pills shown in the Today page header.
 * Each pill shows the icon, name, completion count, and total minutes.
 * Clicking a pill filters the page by that identity.
 */
export function IdentityProgressWidget({
  onFilterChange,
  activeFilter = null,
  className = '',
}: IdentityProgressWidgetProps) {
  const [progress, setProgress] = useState<IdentityDayProgress[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProgress = useCallback(async () => {
    try {
      const result = await api.getIdentityProgress();
      setProgress(result.identities);
    } catch {
      // Silent — widget is non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProgress();
    // Refresh every 5 minutes
    const interval = setInterval(fetchProgress, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchProgress]);

  if (loading || progress.length === 0) return null;

  return (
    <div className={`flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide ${className}`}>
      {/* "All" pill to clear filter */}
      {activeFilter && onFilterChange && (
        <button
          onClick={() => onFilterChange(null)}
          className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors border border-slate-200"
        >
          All
        </button>
      )}

      <AnimatePresence>
        {progress.map((item) => {
          const isActive = activeFilter === item.identityId;
          const hasProgress = item.completedCount > 0 || item.inProgressCount > 0;

          const bg = isActive
            ? hexWithOpacity(item.color, 0.18)
            : hasProgress
            ? hexWithOpacity(item.color, 0.08)
            : 'transparent';
          const border = isActive
            ? item.color
            : hasProgress
            ? hexWithOpacity(item.color, 0.3)
            : hexWithOpacity(item.color, 0.2);

          return (
            <motion.button
              key={item.identityId}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={() =>
                onFilterChange?.(isActive ? null : item.identityId)
              }
              className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-150 hover:scale-105 active:scale-95"
              style={{
                backgroundColor: bg,
                borderColor: border,
                borderStyle: hasProgress ? 'solid' : 'dashed',
                opacity: hasProgress ? 1 : 0.65,
              }}
              title={
                hasProgress
                  ? `${item.name}: ${item.completedCount} completed, ${item.totalMinutes} min`
                  : `${item.name}: nothing completed yet today`
              }
            >
              <span className="text-sm">{item.icon}</span>

              {/* Name (hidden on xs) */}
              <span
                className="hidden sm:block text-xs font-semibold"
                style={{ color: hasProgress ? item.color : '#94a3b8' }}
              >
                {item.name}
              </span>

              {/* Stats — only shown when there's progress */}
              {hasProgress && (
                <span className="text-xs font-medium text-slate-600">
                  {item.completedCount > 0 && (
                    <span>{item.completedCount} done</span>
                  )}
                  {item.completedCount > 0 && item.totalMinutes > 0 && (
                    <span className="text-slate-400 mx-0.5">·</span>
                  )}
                  {item.totalMinutes > 0 && (
                    <span>{item.totalMinutes}m</span>
                  )}
                </span>
              )}

              {/* Completion check */}
              {item.completedCount > 0 && item.inProgressCount === 0 && (
                <svg
                  className="w-3 h-3 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  style={{ color: item.color }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </motion.button>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
