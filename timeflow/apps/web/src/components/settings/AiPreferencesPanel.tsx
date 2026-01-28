'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';

interface AiPreferencesPanelProps {
  wakeTime: string;
  sleepTime: string;
  meetingStartTime: string | null;
  meetingEndTime: string | null;
  useMeetingHours: boolean;
  onSave: (preferences: {
    wakeTime: string;
    sleepTime: string;
    meetingStartTime: string | null;
    meetingEndTime: string | null;
    useMeetingHours: boolean;
  }) => void;
}

export function AiPreferencesPanel({
  wakeTime: initialWakeTime,
  sleepTime: initialSleepTime,
  meetingStartTime: initialMeetingStartTime,
  meetingEndTime: initialMeetingEndTime,
  useMeetingHours: initialUseMeetingHours,
  onSave,
}: AiPreferencesPanelProps) {
  const [wakeTime, setWakeTime] = useState(initialWakeTime);
  const [sleepTime, setSleepTime] = useState(initialSleepTime);
  const [meetingStartTime, setMeetingStartTime] = useState(initialMeetingStartTime || '09:00');
  const [meetingEndTime, setMeetingEndTime] = useState(initialMeetingEndTime || '17:00');
  const [useMeetingHours, setUseMeetingHours] = useState(initialUseMeetingHours);

  const handleSave = () => {
    onSave({
      wakeTime,
      sleepTime,
      meetingStartTime: useMeetingHours ? meetingStartTime : null,
      meetingEndTime: useMeetingHours ? meetingEndTime : null,
      useMeetingHours,
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">AI Assistant Preferences</h2>
        <p className="mt-2 text-sm text-slate-600">
          Help Flow understand your schedule and preferences for better task and meeting suggestions.
        </p>
      </div>

      {/* Working Hours Section */}
      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Working Hours</h3>
        <p className="text-sm text-slate-600 mb-4">
          Flow uses these hours to schedule tasks and avoid suggesting work outside your preferred times.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="wake-time" className="block text-sm font-medium text-slate-700 mb-2">
              Wake Time (Start of Day)
            </label>
            <input
              id="wake-time"
              type="time"
              value={wakeTime}
              onChange={(e) => setWakeTime(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label htmlFor="sleep-time" className="block text-sm font-medium text-slate-700 mb-2">
              Sleep Time (End of Day)
            </label>
            <input
              id="sleep-time"
              type="time"
              value={sleepTime}
              onChange={(e) => setSleepTime(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>

        <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
          <p className="text-sm text-emerald-800">
            <strong>Tip:</strong> Flow will only suggest scheduling tasks between {wakeTime} and {sleepTime}.
          </p>
        </div>
      </section>

      {/* Meeting Preferences Section */}
      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Meeting Preferences</h3>
        <p className="text-sm text-slate-600 mb-4">
          Set specific hours for when meetings can be scheduled. This helps Flow protect your deep work time.
        </p>

        <div className="space-y-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={useMeetingHours}
              onChange={(e) => setUseMeetingHours(e.target.checked)}
              className="w-4 h-4 text-primary-600 border-slate-300 rounded focus:ring-primary-500"
            />
            <span className="text-sm font-medium text-slate-700">
              Limit meeting hours (recommended for deep work protection)
            </span>
          </label>

          {useMeetingHours && (
            <div className="ml-7 grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label htmlFor="meeting-start" className="block text-sm font-medium text-slate-700 mb-2">
                  Earliest Meeting Time
                </label>
                <input
                  id="meeting-start"
                  type="time"
                  value={meetingStartTime}
                  onChange={(e) => setMeetingStartTime(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label htmlFor="meeting-end" className="block text-sm font-medium text-slate-700 mb-2">
                  Latest Meeting Time
                </label>
                <input
                  id="meeting-end"
                  type="time"
                  value={meetingEndTime}
                  onChange={(e) => setMeetingEndTime(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
          )}
        </div>

        {useMeetingHours && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Deep Work Protection:</strong> Flow will only suggest meetings between {meetingStartTime} and {meetingEndTime}, preserving time before/after for focused work.
            </p>
          </div>
        )}
      </section>

      {/* AI Behavior Insights */}
      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">How Flow Uses These Preferences</h3>
        <ul className="space-y-3 text-sm text-slate-700">
          <li className="flex items-start gap-2">
            <span className="text-primary-600 font-bold">•</span>
            <span><strong>Task Scheduling:</strong> Flow schedules tasks within your working hours ({wakeTime} - {sleepTime})</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary-600 font-bold">•</span>
            <span><strong>Meeting Suggestions:</strong> When enabled, meetings are limited to {useMeetingHours ? `${meetingStartTime} - ${meetingEndTime}` : 'your full working hours'}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary-600 font-bold">•</span>
            <span><strong>Daily Planning:</strong> Flow uses these times to suggest realistic daily schedules</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary-600 font-bold">•</span>
            <span><strong>Availability Queries:</strong> "When am I free?" considers your preferred hours automatically</span>
          </li>
        </ul>
      </section>

      {/* Save Button */}
      <div className="flex justify-end pt-4">
        <Button onClick={handleSave} className="px-6 py-3">
          Save Preferences
        </Button>
      </div>
    </div>
  );
}
