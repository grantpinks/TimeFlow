'use client';

export interface AdherenceDay {
  date: string;
  scheduled: number;
  completed: number;
}

export interface HabitAdherenceMiniChartProps {
  series: AdherenceDay[];
  /** Number of trailing days to show (default 15) */
  maxDays?: number;
  /** Tighter bars for habit rows */
  compact?: boolean;
}

function barClass(day: AdherenceDay): string {
  if (day.scheduled === 0) return 'bg-slate-100';
  if (day.completed === day.scheduled) return 'bg-green-500';
  if (day.completed > 0) return 'bg-amber-400';
  return 'bg-red-300';
}

export function HabitAdherenceMiniChart({
  series,
  maxDays = 15,
  compact = false,
}: HabitAdherenceMiniChartProps) {
  if (!series.length) return null;

  const days = series.slice(-maxDays);
  const barHeight = compact ? 'h-5' : 'h-8';

  return (
    <div data-testid="habit-adherence-mini-chart">
      <div className="text-[10px] font-medium text-slate-500 mb-1">
        Last {days.length} days
      </div>
      <div className="flex gap-0.5">
        {days.map((day) => (
          <div
            key={day.date}
            className="flex-1 flex flex-col items-center gap-0.5 min-w-0"
            title={`${day.date}: ${day.completed}/${day.scheduled}`}
          >
            <div className={`w-full ${barHeight} rounded-sm ${barClass(day)}`} />
            {!compact && (
              <div className="text-[10px] text-slate-400">
                {new Date(day.date).getDate()}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
