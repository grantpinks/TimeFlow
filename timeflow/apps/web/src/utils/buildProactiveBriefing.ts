import type {
  CategoryBreakdownResponse,
  CompletionMetricsResponse,
  GoalTrackingResponse,
  ProductivityTrendsResponse,
} from '@timeflow/shared';

type BriefingInput = {
  goalTracking?: GoalTrackingResponse | null;
  completion?: CompletionMetricsResponse | null;
  productivity?: ProductivityTrendsResponse | null;
  categories?: CategoryBreakdownResponse | null;
};

function formatPeakTime(bestTimeOfDay: string): string {
  if (!bestTimeOfDay || bestTimeOfDay === 'N/A') return '';
  const [startHour] = bestTimeOfDay.split('-');
  const hour = parseInt(startHour, 10);
  if (Number.isNaN(hour)) return bestTimeOfDay;
  const endHour = hour + 1;
  const format = (h: number) => {
    const period = h >= 12 ? 'pm' : 'am';
    const display = h % 12 === 0 ? 12 : h % 12;
    return `${display}${period}`;
  };
  return `${format(hour)}–${format(endHour)}`;
}

/**
 * Build a proactive one-line briefing for the Flow command strip.
 */
export function buildProactiveBriefing({
  goalTracking,
  completion,
  productivity,
  categories,
}: BriefingInput): string | undefined {
  const parts: string[] = [];

  if (goalTracking?.overdueCount) {
    parts.push(
      `${goalTracking.overdueCount} overdue — ask Flow to help you tackle them`
    );
  } else if (goalTracking?.dueTodayCount) {
    parts.push(`${goalTracking.dueTodayCount} due today`);
  }

  if (productivity?.weeklyTrend === 'up') {
    parts.push('completion trend is up this week');
  } else if (productivity?.weeklyTrend === 'down') {
    parts.push('completions dipped — want a lighter plan?');
  }

  const peak = productivity ? formatPeakTime(productivity.bestTimeOfDay) : '';
  if (peak) {
    parts.push(`peak focus around ${peak}`);
  }

  const topCategory = categories?.topCategories?.[0];
  if (topCategory && categories?.categoryDistribution?.length) {
    const entry = categories.categoryDistribution.find((c) => c.categoryName === topCategory);
    if (entry && entry.taskCount > 0) {
      parts.push(`most active: ${topCategory}`);
    }
  }

  if (completion && completion.totalActiveTasks > 0 && parts.length < 2) {
    parts.push(`${completion.totalActiveTasks} active tasks`);
  }

  if (parts.length === 0) {
    return 'Ask Flow to plan your day, schedule tasks, or show productivity trends.';
  }

  return parts.slice(0, 3).join(' · ');
}
