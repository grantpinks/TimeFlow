'use client';

import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { useUser } from '@/hooks/useUser';
import * as api from '@/lib/api';
import type { Calendar } from '@timeflow/shared';

export default function SettingsPage() {
  const { user, loading, updatePreferences } = useUser();
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [calendarsLoading, setCalendarsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form state
  const [wakeTime, setWakeTime] = useState('08:00');
  const [sleepTime, setSleepTime] = useState('23:00');
  const [timeZone, setTimeZone] = useState('America/Chicago');
  const [defaultDuration, setDefaultDuration] = useState(30);
  const [defaultCalendarId, setDefaultCalendarId] = useState<string>('');

  // Initialize form from user data
  useEffect(() => {
    if (user) {
      setWakeTime(user.wakeTime);
      setSleepTime(user.sleepTime);
      setTimeZone(user.timeZone);
      setDefaultDuration(user.defaultTaskDurationMinutes);
      setDefaultCalendarId(user.defaultCalendarId || '');
    }
  }, [user]);

  // Fetch calendars
  useEffect(() => {
    async function fetchCalendars() {
      try {
        const cals = await api.listCalendars();
        setCalendars(cals);
      } catch (err) {
        console.error('Failed to fetch calendars:', err);
      } finally {
        setCalendarsLoading(false);
      }
    }

    fetchCalendars();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      await updatePreferences({
        wakeTime,
        sleepTime,
        timeZone,
        defaultTaskDurationMinutes: defaultDuration,
        defaultCalendarId: defaultCalendarId || undefined,
      });
      setMessage({ type: 'success', text: 'Settings saved successfully!' });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to save settings',
      });
    } finally {
      setSaving(false);
    }
  };

  // Common timezones
  const timezones = [
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Anchorage',
    'Pacific/Honolulu',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Asia/Kolkata',
    'Australia/Sydney',
  ];

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-500">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Settings</h1>
        <p className="text-slate-600 mb-8">
          Configure your scheduling preferences
        </p>

        {message && (
          <div
            className={`mb-6 px-4 py-3 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-8">
          {/* Working Hours */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">
              Working Hours
            </h2>
            <p className="text-slate-600 mb-4">
              TimeFlow will only schedule tasks during these hours
            </p>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Wake Time
                </label>
                <input
                  type="time"
                  value={wakeTime}
                  onChange={(e) => setWakeTime(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Sleep Time
                </label>
                <input
                  type="time"
                  value={sleepTime}
                  onChange={(e) => setSleepTime(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>

          {/* Time Zone */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">
              Time Zone
            </h2>

            <select
              value={timeZone}
              onChange={(e) => setTimeZone(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {timezones.map((tz) => (
                <option key={tz} value={tz}>
                  {tz.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>

          {/* Default Task Duration */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">
              Default Task Duration
            </h2>
            <p className="text-slate-600 mb-4">
              New tasks will default to this duration
            </p>

            <select
              value={defaultDuration}
              onChange={(e) => setDefaultDuration(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>1 hour</option>
              <option value={90}>1.5 hours</option>
              <option value={120}>2 hours</option>
            </select>
          </div>

          {/* Default Calendar */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">
              Default Calendar
            </h2>
            <p className="text-slate-600 mb-4">
              Tasks will be scheduled in this Google Calendar
            </p>

            {calendarsLoading ? (
              <div className="text-slate-500">Loading calendars...</div>
            ) : calendars.length === 0 ? (
              <div className="text-slate-500">
                No calendars found. Make sure you've connected Google Calendar.
              </div>
            ) : (
              <select
                value={defaultCalendarId}
                onChange={(e) => setDefaultCalendarId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Primary Calendar</option>
                {calendars.map((cal) => (
                  <option key={cal.id} value={cal.id}>
                    {cal.summary} {cal.primary && '(Primary)'}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Save button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 font-medium"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}

