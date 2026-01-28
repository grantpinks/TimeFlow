'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui';
import Link from 'next/link';

export interface Insight {
  id: string;
  type: 'nudge' | 'suggestion' | 'warning' | 'celebration';
  title: string;
  message: string;
  actionLabel?: string;
  actionUrl?: string;
  priority: 'low' | 'medium' | 'high';
  surfaceKey: 'today' | 'calendar' | 'inbox';
  dismissible: boolean;
  createdAt: string;
}

interface InsightBannerProps {
  insight: Insight;
  onDismiss?: (insightId: string) => void;
}

export function InsightBanner({ insight, onDismiss }: InsightBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  const handleDismiss = () => {
    setIsDismissed(true);
    if (onDismiss) {
      onDismiss(insight.id);
    }
  };

  // Type-based styling
  const typeStyles = {
    nudge: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-900',
      icon: '💡',
    },
    suggestion: {
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      text: 'text-purple-900',
      icon: '✨',
    },
    warning: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-900',
      icon: '⚠️',
    },
    celebration: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-900',
      icon: '🎉',
    },
  };

  const style = typeStyles[insight.type];

  if (isDismissed) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={`relative rounded-lg border ${style.border} ${style.bg} p-4 shadow-sm`}
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 text-2xl">{style.icon}</div>
          <div className="flex-1">
            <h3 className={`text-sm font-semibold ${style.text}`}>{insight.title}</h3>
            <p className={`mt-1 text-sm ${style.text}`}>{insight.message}</p>
            
            {insight.actionLabel && insight.actionUrl && (
              <div className="mt-3">
                <Link href={insight.actionUrl}>
                  <Button size="sm" variant="primary">
                    {insight.actionLabel}
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {insight.dismissible && (
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="Dismiss insight"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

interface InsightListProps {
  insights: Insight[];
  onDismiss?: (insightId: string) => void;
}

export function InsightList({ insights, onDismiss }: InsightListProps) {
  if (insights.length === 0) {
    return null;
  }

  // Sort by priority: high > medium > low
  const priorityOrder = { high: 3, medium: 2, low: 1 };
  const sortedInsights = [...insights].sort((a, b) => {
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });

  return (
    <div className="space-y-3">
      {sortedInsights.map((insight) => (
        <InsightBanner key={insight.id} insight={insight} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
