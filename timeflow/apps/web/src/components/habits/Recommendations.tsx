/**
 * Habit Recommendations Component
 *
 * Displays 1-3 actionable recommendation cards based on habit insights.
 */

'use client';

import { useEffect } from 'react';
import { Panel } from '@/components/ui';
import { FlowMascot } from '@/components/FlowMascot';
import { track, hashHabitId } from '@/lib/analytics';
import type { HabitRecommendation } from '@timeflow/shared';

interface RecommendationsProps {
  recommendations: HabitRecommendation[];
  onActionClick?: (recommendation: HabitRecommendation) => void;
}

export function Recommendations({ recommendations, onActionClick }: RecommendationsProps) {
  // Track recommendations viewed (privacy-safe - hashed IDs)
  useEffect(() => {
    if (recommendations.length > 0) {
      recommendations.forEach((rec) => {
        track('habits.recommendation.viewed', {
          recommendation_type: rec.type,
          habit_id_hash: hashHabitId(rec.habitId),
        });
      });
    }
  }, [recommendations]);

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Flow Coach Header */}
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          <FlowMascot size="md" expression="happy" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Flow's Recommendations</h2>
          <p className="text-sm text-slate-600">Your AI habits coach</p>
        </div>
      </div>

      {/* Recommendation Cards */}
      <div className="space-y-3">
        {recommendations.map((rec, index) => (
          <RecommendationCard
            key={`${rec.habitId}-${rec.type}-${index}`}
            recommendation={rec}
            onActionClick={onActionClick}
          />
        ))}
      </div>
    </div>
  );
}

interface RecommendationCardProps {
  recommendation: HabitRecommendation;
  onActionClick?: (recommendation: HabitRecommendation) => void;
}

function RecommendationCard({ recommendation, onActionClick }: RecommendationCardProps) {
  const { type, habitTitle, metric, insight, action, priority } = recommendation;

  // Determine card styling based on type and priority
  const getCardStyle = () => {
    if (type === 'streak_at_risk') {
      return {
        border: 'border-amber-300',
        bg: 'bg-amber-50',
        iconBg: 'bg-amber-200',
        iconText: 'text-amber-800',
        metricText: 'text-amber-900',
        insightText: 'text-amber-800',
        buttonBg: 'bg-amber-600 hover:bg-amber-700',
        buttonText: 'text-white',
        icon: '🔥', // Streak fire emoji
      };
    } else if (type === 'low_adherence') {
      return {
        border: 'border-blue-300',
        bg: 'bg-blue-50',
        iconBg: 'bg-blue-200',
        iconText: 'text-blue-800',
        metricText: 'text-blue-900',
        insightText: 'text-blue-800',
        buttonBg: 'bg-blue-600 hover:bg-blue-700',
        buttonText: 'text-white',
        icon: '📊', // Chart emoji
      };
    } else if (type === 'repeated_skip_no_time' || type === 'repeated_skip_forgot') {
      return {
        border: 'border-purple-300',
        bg: 'bg-purple-50',
        iconBg: 'bg-purple-200',
        iconText: 'text-purple-800',
        metricText: 'text-purple-900',
        insightText: 'text-purple-800',
        buttonBg: 'bg-purple-600 hover:bg-purple-700',
        buttonText: 'text-white',
        icon: type === 'repeated_skip_forgot' ? '💭' : '⏰', // Thought bubble or clock
      };
    } else {
      return {
        border: 'border-slate-300',
        bg: 'bg-slate-50',
        iconBg: 'bg-slate-200',
        iconText: 'text-slate-800',
        metricText: 'text-slate-900',
        insightText: 'text-slate-800',
        buttonBg: 'bg-slate-600 hover:bg-slate-700',
        buttonText: 'text-white',
        icon: '💡', // Lightbulb emoji
      };
    }
  };

  const style = getCardStyle();

  return (
    <Panel className={`${style.bg} border-2 ${style.border}`}>
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={`flex-shrink-0 w-12 h-12 ${style.iconBg} rounded-full flex items-center justify-center text-2xl shadow-sm`}>
          {style.icon}
        </div>

        {/* Content */}
        <div className="flex-1 space-y-2">
          {/* Habit Title */}
          <div className="flex items-center gap-2">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {habitTitle}
            </div>
            {priority === 1 && (
              <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded">
                Urgent
              </span>
            )}
          </div>

          {/* Metric - What Flow noticed */}
          <div>
            <div className={`text-base font-bold ${style.metricText}`}>
              {metric.label}
            </div>
            {metric.context && (
              <div className="text-sm text-slate-600 mt-0.5">{metric.context}</div>
            )}
          </div>

          {/* Insight - Flow's coaching message */}
          <div className={`text-sm leading-relaxed ${style.insightText}`}>
            <span className="font-medium">Flow says:</span> {insight}
          </div>

          {/* Action CTA */}
          <button
            onClick={() => onActionClick?.(recommendation)}
            className={`mt-3 px-5 py-2.5 ${style.buttonBg} ${style.buttonText} rounded-lg font-semibold text-sm transition-all hover:shadow-md active:scale-95`}
          >
            {action.label}
          </button>
        </div>
      </div>
    </Panel>
  );
}
