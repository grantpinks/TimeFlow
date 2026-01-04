/**
 * Metrics Tooltip Component
 *
 * Explains how streaks and adherence are calculated in calm, reassuring language.
 */

'use client';

import { useState } from 'react';

interface MetricsTooltipProps {
  type: 'streak' | 'adherence' | 'best-window';
}

export function MetricsTooltip({ type }: MetricsTooltipProps) {
  const [show, setShow] = useState(false);

  const content = {
    streak: {
      title: 'How streaks work',
      description: (
        <div className="space-y-2 text-sm">
          <p>
            A streak counts consecutive days where you completed your habit at least once.
          </p>
          <p>
            <strong>We use your timezone</strong> to determine "days," so if you complete a habit at 11:59pm in your timezone, it counts for that day.
          </p>
          <p>
            <strong>Grace period:</strong> If you completed yesterday but not today yet, your streak continues until end of day.
          </p>
          <p className="text-slate-600 italic">
            Note: Timezone changes and DST transitions are handled automatically—your streak is safe!
          </p>
        </div>
      ),
    },
    adherence: {
      title: 'How adherence is calculated',
      description: (
        <div className="space-y-2 text-sm">
          <p>
            Adherence = (completions / scheduled instances) × 100%
          </p>
          <p>
            If you scheduled a habit 10 times and completed it 8 times, that's 80% adherence.
          </p>
          <p>
            <strong>Why it matters:</strong> Adherence helps you see patterns—low adherence might mean the habit needs a better time slot or shorter duration.
          </p>
          <p className="text-slate-600 italic">
            We only count instances you actually scheduled, not days you skipped scheduling.
          </p>
        </div>
      ),
    },
    'best-window': {
      title: 'How we find your best window',
      description: (
        <div className="space-y-2 text-sm">
          <p>
            We analyze when you successfully complete habits and identify patterns.
          </p>
          <p>
            <strong>For example:</strong> If you complete "Morning Exercise" 90% of the time on Monday mornings but only 50% on Tuesday afternoons, Monday morning is your best window.
          </p>
          <p>
            <strong>Minimum data:</strong> We need at least 3 completions in a time slot to recommend it.
          </p>
          <p className="text-slate-600 italic">
            This helps you schedule habits when you're most likely to succeed.
          </p>
        </div>
      ),
    },
  };

  const { title, description } = content[type];

  return (
    <div className="relative inline-block">
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow(!show)}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-300 hover:bg-slate-400 transition-colors"
        aria-label="More information"
      >
        <span className="text-white text-xs font-bold">?</span>
      </button>

      {show && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-80 z-50">
          <div className="bg-slate-800 text-white rounded-lg shadow-xl p-4">
            {/* Arrow */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-px">
              <div className="border-8 border-transparent border-t-slate-800"></div>
            </div>

            <h4 className="font-semibold text-sm mb-2">{title}</h4>
            {description}
          </div>
        </div>
      )}
    </div>
  );
}
