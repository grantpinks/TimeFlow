'use client';

import { useMemo, useRef, useState } from 'react';
import {
  FlowCommandStrip,
  type FlowCommandStripHandle,
} from '@/components/analytics/FlowCommandStrip';
import { FlowAIAssistantPanel } from '@/components/ai/FlowAIAssistantPanel';
import {
  useGoalTracking,
  useCompletionMetrics,
  useProductivityTrends,
  useCategoryBreakdown,
} from '@/hooks/useAnalytics';
import { buildProactiveBriefing } from '@/utils/buildProactiveBriefing';

interface FlowTodayCommandSectionProps {
  timeZone?: string;
}

export function FlowTodayCommandSection({ timeZone }: FlowTodayCommandSectionProps) {
  const stripRef = useRef<FlowCommandStripHandle>(null);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [aiInitialPrompt, setAiInitialPrompt] = useState<string | null>(null);

  const { data: goalTracking } = useGoalTracking();
  const { data: completion } = useCompletionMetrics('today');
  const { data: productivity } = useProductivityTrends(7);
  const { data: categories } = useCategoryBreakdown();

  const insightLine = useMemo(
    () =>
      buildProactiveBriefing({
        goalTracking,
        completion,
        productivity,
        categories,
      }),
    [goalTracking, completion, productivity, categories]
  );

  const openAI = (prompt?: string) => {
    setAiInitialPrompt(prompt ?? null);
    setShowAIPanel(true);
  };

  return (
    <>
      <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50 via-primary-50/20 to-cyan-50/20 p-4 shadow-sm">
        <FlowCommandStrip
          ref={stripRef}
          timeZone={timeZone}
          insightLine={insightLine}
          onSubmit={(prompt) => openAI(prompt)}
        />
      </div>

      <FlowAIAssistantPanel
        isOpen={showAIPanel}
        onClose={() => {
          setShowAIPanel(false);
          setAiInitialPrompt(null);
        }}
        initialPrompt={aiInitialPrompt}
      />
    </>
  );
}
