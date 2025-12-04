'use client';

import type { SchedulePreview, Task } from '@timeflow/shared';

interface SchedulePreviewCardProps {
  preview: SchedulePreview;
  tasks: Task[];
  onApply: () => void;
  onCancel: () => void;
  applying?: boolean;
}

export default function SchedulePreviewCard({
  preview,
  tasks,
  onApply,
  onCancel,
  applying = false,
}: SchedulePreviewCardProps) {
  const getTaskById = (taskId: string) => tasks.find((t) => t.id === taskId);

  const formatTime = (isoString: string) =>
    new Date(isoString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

  const formatDate = (isoString: string) =>
    new Date(isoString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });

  const blocksByDate = preview.blocks.reduce((acc, block) => {
    const date = formatDate(block.start);
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(block);
    return acc;
  }, {} as Record<string, typeof preview.blocks>);

  const confidenceColor =
    preview.confidence === 'high'
      ? 'text-green-700 bg-green-50 border-green-200'
      : preview.confidence === 'medium'
        ? 'text-yellow-700 bg-yellow-50 border-yellow-200'
        : 'text-orange-700 bg-orange-50 border-orange-200';

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-800">Schedule Recommendation</h3>
        <span className={`text-xs font-medium px-2 py-1 rounded-full border ${confidenceColor}`}>
          {preview.confidence} confidence
        </span>
      </div>

      {/* Summary (if provided) */}
      {preview.summary && <p className="text-sm text-slate-600 mb-4">{preview.summary}</p>}

      {/* Time blocks grouped by date */}
      <div className="space-y-4 mb-4">
        {Object.entries(blocksByDate).map(([date, blocks]) => (
          <div key={date} className="border border-slate-200 rounded-lg">
            <div className="bg-slate-50 text-slate-700 text-sm font-medium px-3 py-2 rounded-t-lg">
              {date}
            </div>
            <div className="divide-y divide-slate-200">
              {blocks.map((block, index) => {
                const task = getTaskById(block.taskId);
                const title = task?.title ?? 'Task';

                return (
                  <div key={`${block.taskId}-${index}`} className="flex items-center gap-3 px-3 py-2">
                    <div className="w-2 h-2 rounded-full bg-primary-500" aria-hidden />
                    <div className="flex-1">
                      <p className="font-medium text-slate-800">{title}</p>
                      <p className="text-sm text-slate-500">
                        {formatTime(block.start)} - {formatTime(block.end)}
                      </p>
                    </div>
                    {block.overflowedDeadline && (
                      <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded">
                        Past deadline
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Conflicts/Warnings */}
      {preview.conflicts && preview.conflicts.length > 0 && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm font-semibold text-yellow-800 mb-2">Warnings:</p>
          <ul className="text-sm text-yellow-700 list-disc list-inside space-y-1">
            {preview.conflicts.map((conflict, index) => (
              <li key={index}>{conflict}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={onApply}
          disabled={applying}
          className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {applying ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Applying...
            </span>
          ) : (
            'Apply Schedule'
          )}
        </button>
        <button
          onClick={onCancel}
          disabled={applying}
          className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
