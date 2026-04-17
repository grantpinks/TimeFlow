'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Layout } from '@/components/Layout';
import { useUser } from '@/hooks/useUser';
import { SchedulingLinksPanel } from '@/components/SchedulingLinksPanel';
import { MeetingManagerPanel } from '@/components/MeetingManagerPanel';
import * as api from '@/lib/api';
import type { BillingSubscriptionStatus } from '@/lib/api';
import { canShowAiDebugToggle, getAiDebugEnabled, setAiDebugEnabled as persistAiDebugEnabled } from '@/lib/aiDebug';
import { track } from '@/lib/analytics';
import type {
  Calendar,
  DailyScheduleConfig,
  DailyMeetingConfig,
  UserRestDaysResponse,
} from '@timeflow/shared';

export default function SettingsPage() {
  const { user, loading, updatePreferences } = useUser();
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [calendarsLoading, setCalendarsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form state
  const [wakeTime, setWakeTime] = useState('08:00');
  const [sleepTime, setSleepTime] = useState('23:00');
  const [useCustomSchedule, setUseCustomSchedule] = useState(false);
  const [dailySchedule, setDailySchedule] = useState<DailyScheduleConfig>({});
  const [timeZone, setTimeZone] = useState('America/Chicago');
  const [defaultDuration, setDefaultDuration] = useState(30);
  const [defaultCalendarId, setDefaultCalendarId] = useState<string>('');
  const [eventPrefixEnabled, setEventPrefixEnabled] = useState(true);
  const [eventPrefix, setEventPrefix] = useState('TF|');
  const [calendarDragDropMode, setCalendarDragDropMode] = useState<'instant' | 'confirm'>('instant');
  const [aiDebugEnabled, setAiDebugEnabled] = useState(false);
  const showAiDebugToggle = canShowAiDebugToggle();

  // Meeting preference state
  const [useMeetingHours, setUseMeetingHours] = useState(false);
  const [meetingStartTime, setMeetingStartTime] = useState('09:00');
  const [meetingEndTime, setMeetingEndTime] = useState('17:00');
  const [blockedDays, setBlockedDays] = useState<string[]>([]);
  const [useCustomMeetingSchedule, setUseCustomMeetingSchedule] = useState(false);
  const [dailyMeetingSchedule, setDailyMeetingSchedule] = useState<DailyMeetingConfig>({});

  // Habit notification preferences (opt-in)
  const [notifyStreakAtRisk, setNotifyStreakAtRisk] = useState(false);
  const [notifyMissedHighPriority, setNotifyMissedHighPriority] = useState(false);
  const [notifyWeeklyIdentityRecap, setNotifyWeeklyIdentityRecap] = useState(false);

  const [restDaysInfo, setRestDaysInfo] = useState<UserRestDaysResponse | null>(null);
  const [restDateInput, setRestDateInput] = useState('');
  const [restReason, setRestReason] = useState<'sick' | 'travel' | 'rest' | 'other'>('rest');

  // Billing
  const [billing, setBilling] = useState<BillingSubscriptionStatus | null>(null);
  const [billingLoading, setBillingLoading] = useState(true);
  const [billingAction, setBillingAction] = useState<string | null>(null); // 'cancel' | 'manage' | null

  // Initialize form from user data
  useEffect(() => {
    if (user) {
      setWakeTime(user.wakeTime);
      setSleepTime(user.sleepTime);
      setTimeZone(user.timeZone);
      setDefaultDuration(user.defaultTaskDurationMinutes);
      setDefaultCalendarId(user.defaultCalendarId || '');
      setEventPrefixEnabled(user.eventPrefixEnabled ?? true);
      setEventPrefix(user.eventPrefix || 'TF|');
      setCalendarDragDropMode(user.calendarDragDropMode === 'confirm' ? 'confirm' : 'instant');

      // Initialize daily schedule
      const schedule = user.dailyScheduleConstraints || user.dailySchedule;
      if (schedule && Object.keys(schedule).length > 0) {
        setUseCustomSchedule(true);
        setDailySchedule(schedule);
      } else {
        setUseCustomSchedule(false);
        setDailySchedule({});
      }

      // Load meeting preferences
      if (user.meetingStartTime && user.meetingEndTime) {
        setUseMeetingHours(true);
        setMeetingStartTime(user.meetingStartTime);
        setMeetingEndTime(user.meetingEndTime);
      }
      if (user.blockedDaysOfWeek && user.blockedDaysOfWeek.length > 0) {
        setBlockedDays(user.blockedDaysOfWeek);
      }
      const meetingSchedule = user.dailyMeetingSchedule;
      if (meetingSchedule && Object.keys(meetingSchedule).length > 0) {
        setUseCustomMeetingSchedule(true);
        setDailyMeetingSchedule(meetingSchedule);
      }

      // Load habit notification preferences
      setNotifyStreakAtRisk(user.notifyStreakAtRisk ?? false);
      setNotifyMissedHighPriority(user.notifyMissedHighPriority ?? false);
      setNotifyWeeklyIdentityRecap(user.notifyWeeklyIdentityRecap ?? false);
    }
  }, [user]);

  useEffect(() => {
    async function loadRestDays() {
      try {
        const data = await api.getRestDays();
        setRestDaysInfo(data);
      } catch {
        setRestDaysInfo(null);
      }
    }
    if (user) loadRestDays();
  }, [user]);

  useEffect(() => {
    if (showAiDebugToggle) {
      setAiDebugEnabled(getAiDebugEnabled());
    }
  }, [showAiDebugToggle]);

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

  // Fetch billing status
  useEffect(() => {
    async function fetchBilling() {
      try {
        const status = await api.getBillingStatus();
        setBilling(status);
      } catch (err) {
        // If the endpoint doesn't exist yet or user is not authed, fail silently
        console.warn('Billing status unavailable:', err);
      } finally {
        setBillingLoading(false);
      }
    }

    fetchBilling();
  }, []);

  // Billing action handlers
  const handleCancelSubscription = async () => {
    if (!window.confirm('Cancel your subscription? You will keep access until the end of your billing period.')) return;
    setBillingAction('cancel');
    try {
      await api.cancelBillingSubscription(false);
      setMessage({ type: 'success', text: 'Subscription will be canceled at the end of your billing period.' });
      // Refresh billing status
      const updated = await api.getBillingStatus();
      setBilling(updated);
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to cancel subscription.' });
    } finally {
      setBillingAction(null);
    }
  };

  const handleOpenBillingPortal = async () => {
    setBillingAction('manage');
    try {
      const { url } = await api.openBillingPortal();
      if (url) window.location.href = url;
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to open billing portal.' });
    } finally {
      setBillingAction(null);
    }
  };


  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      await updatePreferences({
        wakeTime,
        sleepTime,
        dailySchedule: useCustomSchedule ? dailySchedule : null,
        dailyScheduleConstraints: useCustomSchedule ? dailySchedule : null,
        timeZone,
        defaultTaskDurationMinutes: defaultDuration,
        defaultCalendarId: defaultCalendarId || undefined,
        eventPrefixEnabled,
        eventPrefix: eventPrefixEnabled ? eventPrefix.trim() || 'TF|' : eventPrefix,
        calendarDragDropMode,

        // Meeting preferences
        meetingStartTime: useMeetingHours ? meetingStartTime : null,
        meetingEndTime: useMeetingHours ? meetingEndTime : null,
        blockedDaysOfWeek: blockedDays.length > 0 ? blockedDays : [],
        dailyMeetingSchedule: useCustomMeetingSchedule ? dailyMeetingSchedule : null,

        // Habit notification preferences
        notifyStreakAtRisk,
        notifyMissedHighPriority,
        notifyWeeklyIdentityRecap,
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

  // Helper function to update a day's schedule
  const updateDaySchedule = (day: keyof DailyScheduleConfig, field: 'wakeTime' | 'sleepTime', value: string) => {
    setDailySchedule((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        wakeTime: field === 'wakeTime' ? value : prev[day]?.wakeTime || wakeTime,
        sleepTime: field === 'sleepTime' ? value : prev[day]?.sleepTime || sleepTime,
      },
    }));
  };

  // Helper function to toggle custom schedule mode
  const handleToggleCustomSchedule = (enabled: boolean) => {
    setUseCustomSchedule(enabled);
    if (enabled && Object.keys(dailySchedule).length === 0) {
      // Initialize all days with current wake/sleep times
      const days: (keyof DailyScheduleConfig)[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const newSchedule: DailyScheduleConfig = {};
      days.forEach((day) => {
        newSchedule[day] = { wakeTime, sleepTime };
      });
      setDailySchedule(newSchedule);
    }
  };

  const handleAiDebugToggle = (enabled: boolean) => {
    setAiDebugEnabled(enabled);
    persistAiDebugEnabled(enabled);
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

  // Days of the week
  const daysOfWeek: { key: keyof DailyScheduleConfig; label: string }[] = [
    { key: 'monday', label: 'Mon' },
    { key: 'tuesday', label: 'Tue' },
    { key: 'wednesday', label: 'Wed' },
    { key: 'thursday', label: 'Thu' },
    { key: 'friday', label: 'Fri' },
    { key: 'saturday', label: 'Sat' },
    { key: 'sunday', label: 'Sun' },
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
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Settings</h1>
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
          {/* Google / Gmail connection */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Google Connection</h2>
                <p className="text-slate-600 text-sm">
                  Gmail inbox requires a connected Google account with read-only access.
                </p>
              </div>
              <span className="text-sm font-medium text-green-700 bg-green-50 border border-green-200 px-3 py-1 rounded-full">
                Connected
              </span>
            </div>
            <p className="text-sm text-slate-600 mb-3">
              If emails stop loading, reconnect your Google account to refresh permissions.
            </p>
            <a
              href={api.getGoogleAuthUrl()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
            >
              Reconnect Google
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>

          {showAiDebugToggle && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">AI Debugging (Admin)</h2>
                  <p className="text-slate-600 text-sm">
                    Show AI error details for troubleshooting. Hidden unless enabled by env.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleAiDebugToggle(!aiDebugEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    aiDebugEnabled ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                  aria-pressed={aiDebugEnabled}
                  aria-label="Toggle AI debugging"
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      aiDebugEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* Billing & Plan */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Billing & Plan</h2>
              <Link
                href="/pricing"
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                View all plans
              </Link>
            </div>

            {billingLoading ? (
              <p className="text-sm text-slate-500">Loading billing info...</p>
            ) : billing ? (
              <div className="space-y-4">
                {/* Current plan + credits */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold px-2.5 py-0.5 rounded-full ${
                        billing.planTier === 'FLOW_STATE'
                          ? 'bg-purple-100 text-purple-800'
                          : billing.planTier === 'PRO'
                            ? 'bg-teal-100 text-teal-800'
                            : 'bg-slate-100 text-slate-700'
                      }`}>
                        {billing.planTier === 'FLOW_STATE' ? 'Flow State' : billing.planTier === 'PRO' ? 'Pro' : 'Starter'}
                      </span>
                      {billing.subscriptionStatus === 'past_due' && (
                        <span className="text-xs font-semibold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Payment due</span>
                      )}
                    </div>
                    {billing.billingCycleEnd && billing.hasActiveSubscription && (
                      <p className="text-xs text-slate-500 mt-1">
                        Renews {new Date(billing.billingCycleEnd).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Flow Credits</p>
                    <p className="text-sm font-semibold text-slate-800">
                      {billing.credits.remaining.toLocaleString()} <span className="text-slate-400 font-normal">/ {billing.credits.limit.toLocaleString()}</span>
                    </p>
                  </div>
                </div>

                {/* Credits progress bar */}
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      billing.credits.percentUsed > 80 ? 'bg-red-500' : billing.credits.percentUsed > 50 ? 'bg-amber-500' : 'bg-teal-500'
                    }`}
                    style={{ width: `${Math.min(billing.credits.percentUsed, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500">
                  {billing.credits.percentUsed}% used this month
                  {billing.credits.resetDate && (
                    <span className="ml-2">— resets {new Date(billing.credits.resetDate).toLocaleDateString()}</span>
                  )}
                </p>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-2">
                  {billing.hasActiveSubscription ? (
                    <>
                      <button
                        type="button"
                        onClick={handleOpenBillingPortal}
                        disabled={billingAction === 'manage'}
                        className="px-4 py-1.5 text-sm border border-primary-300 text-primary-700 rounded-lg hover:bg-primary-50 disabled:opacity-50 transition-colors"
                      >
                        {billingAction === 'manage' ? 'Opening...' : 'Manage payment'}
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelSubscription}
                        disabled={billingAction === 'cancel'}
                        className="px-4 py-1.5 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
                      >
                        {billingAction === 'cancel' ? 'Canceling...' : 'Cancel subscription'}
                      </button>
                    </>
                  ) : (
                    <Link
                      href="/pricing"
                      className="px-4 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                    >
                      Upgrade plan
                    </Link>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                Billing information is not available. <Link href="/pricing" className="text-primary-600 hover:underline">View pricing</Link>
              </p>
            )}
          </div>

          {/* Working Hours */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Working Hours
            </h2>
            <p className="text-slate-600 mb-4">
              TimeFlow will only schedule tasks during these hours
            </p>

            {/* Toggle for custom schedule */}
            <div className="mb-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useCustomSchedule}
                  onChange={(e) => handleToggleCustomSchedule(e.target.checked)}
                  className="w-4 h-4 text-primary-600 border-slate-300 rounded focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-slate-700">
                  Set different hours for each day of the week
                </span>
              </label>
            </div>

            {!useCustomSchedule ? (
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
            ) : (
              <div className="space-y-3">
                {daysOfWeek.map((day) => (
                  <div key={day.key} className="grid grid-cols-[80px_1fr_1fr] gap-4 items-center">
                    <div className="text-sm font-medium text-slate-700">
                      {day.label}
                    </div>
                    <div>
                      <input
                        type="time"
                        value={dailySchedule[day.key]?.wakeTime || wakeTime}
                        onChange={(e) => updateDaySchedule(day.key, 'wakeTime', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                      />
                    </div>
                    <div>
                      <input
                        type="time"
                        value={dailySchedule[day.key]?.sleepTime || sleepTime}
                        onChange={(e) => updateDaySchedule(day.key, 'sleepTime', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                      />
                    </div>
                  </div>
                ))}
                <p className="text-xs text-slate-500 mt-4">
                  Tip: Different wake/sleep times for weekends vs weekdays help create a more realistic schedule
                </p>
              </div>
            )}
          </div>

          {/* Meeting Availability Section */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Meeting Availability</h2>
            <p className="text-sm text-slate-600 mb-4">
              Configure when you&apos;re available for meetings. This is separate from your general working hours.
            </p>

            {/* Meeting Hours Toggle */}
            <div className="mb-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useMeetingHours}
                  onChange={(e) => setUseMeetingHours(e.target.checked)}
                  className="w-4 h-4 text-primary-600 border-slate-300 rounded focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-slate-700">
                  Set specific hours for meetings (different from work hours)
                </span>
              </label>
            </div>

            {/* Simple Meeting Hours */}
            {useMeetingHours && !useCustomMeetingSchedule && (
              <div className="mb-6 grid grid-cols-2 gap-4 pl-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Meeting Start Time
                  </label>
                  <input
                    type="time"
                    value={meetingStartTime}
                    onChange={(e) => setMeetingStartTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Meeting End Time
                  </label>
                  <input
                    type="time"
                    value={meetingEndTime}
                    onChange={(e) => setMeetingEndTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            )}

            {/* Blocked Days */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Days Not Available for Meetings
              </label>
              <div className="flex flex-wrap gap-2">
                {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => {
                      if (blockedDays.includes(day)) {
                        setBlockedDays(blockedDays.filter((d) => d !== day));
                      } else {
                        setBlockedDays([...blockedDays, day]);
                      }
                    }}
                    className={`px-4 py-2 rounded-lg border transition-colors ${
                      blockedDays.includes(day)
                        ? 'bg-red-100 text-red-800 border-red-300'
                        : 'bg-white text-slate-700 border-slate-300 hover:border-primary-300'
                    }`}
                  >
                    {day.charAt(0).toUpperCase() + day.slice(1)}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Select days when you don&apos;t want to accept any meetings
              </p>
            </div>

            {/* Custom Per-Day Meeting Schedule Toggle */}
            {useMeetingHours && (
              <div className="mb-6">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useCustomMeetingSchedule}
                    onChange={(e) => setUseCustomMeetingSchedule(e.target.checked)}
                    className="w-4 h-4 text-primary-600 border-slate-300 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm font-medium text-slate-700">
                    Set different meeting hours for each day
                  </span>
                </label>
              </div>
            )}

            {/* Per-Day Meeting Config */}
            {useMeetingHours && useCustomMeetingSchedule && (
              <div className="pl-6 space-y-4">
                {(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const).map((day) => {
                  const config = dailyMeetingSchedule[day] || { isAvailable: true };
                  return (
                    <div key={day} className="border border-slate-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={config.isAvailable}
                            onChange={(e) => {
                              setDailyMeetingSchedule({
                                ...dailyMeetingSchedule,
                                [day]: { ...config, isAvailable: e.target.checked },
                              });
                            }}
                            className="w-4 h-4 text-primary-600 border-slate-300 rounded focus:ring-primary-500"
                          />
                          <span className="text-sm font-medium text-slate-800">
                            {day.charAt(0).toUpperCase() + day.slice(1)}
                          </span>
                        </label>
                      </div>

                      {config.isAvailable && (
                        <div className="grid grid-cols-2 gap-4 mt-2">
                          <div>
                            <label className="block text-xs text-slate-600 mb-1">Start</label>
                            <input
                              type="time"
                              value={config.startTime || meetingStartTime}
                              onChange={(e) => {
                                setDailyMeetingSchedule({
                                  ...dailyMeetingSchedule,
                                  [day]: { ...config, startTime: e.target.value },
                                });
                              }}
                              className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-600 mb-1">End</label>
                            <input
                              type="time"
                              value={config.endTime || meetingEndTime}
                              onChange={(e) => {
                                setDailyMeetingSchedule({
                                  ...dailyMeetingSchedule,
                                  [day]: { ...config, endTime: e.target.value },
                                });
                              }}
                              className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Time Zone */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
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
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
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
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Default Calendar
            </h2>
            <p className="text-slate-600 mb-4">
              Tasks will be scheduled in this Google Calendar
            </p>

            {calendarsLoading ? (
              <div className="text-slate-500">Loading calendars...</div>
            ) : calendars.length === 0 ? (
              <div className="text-slate-500">
                No calendars found. Make sure you have connected Google Calendar.
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

          {/* Calendar drag and drop */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Calendar drag and drop
            </h2>
            <p className="text-slate-600 mb-4">
              When you drag an unscheduled task onto the week/day grid, choose whether to schedule it immediately (with a short undo) or confirm the time in a dialog first.
            </p>
            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="calendarDragDropMode"
                  className="mt-1"
                  checked={calendarDragDropMode === 'instant'}
                  onChange={() => setCalendarDragDropMode('instant')}
                />
                <span>
                  <span className="text-sm font-medium text-slate-800">Schedule immediately on drop</span>
                  <span className="block text-xs text-slate-500 mt-0.5">
                    Recommended. You can undo for 5 seconds after dropping.
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="calendarDragDropMode"
                  className="mt-1"
                  checked={calendarDragDropMode === 'confirm'}
                  onChange={() => setCalendarDragDropMode('confirm')}
                />
                <span>
                  <span className="text-sm font-medium text-slate-800">Ask before scheduling</span>
                  <span className="block text-xs text-slate-500 mt-0.5">
                    Opens a confirmation step with the chosen time slot before saving.
                  </span>
                </span>
              </label>
            </div>
          </div>

          {/* Event Prefix */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Calendar Event Prefix
            </h2>
            <p className="text-slate-600 mb-4">
              Add a prefix to TimeFlow-created calendar events.
            </p>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={eventPrefixEnabled}
                onChange={(e) => setEventPrefixEnabled(e.target.checked)}
                className="w-4 h-4 text-primary-600 border-slate-300 rounded focus:ring-primary-500"
              />
              <span className="text-sm font-medium text-slate-700">
                Use prefix for TimeFlow events
              </span>
            </label>

            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Prefix text
              </label>
              <input
                type="text"
                value={eventPrefix}
                onChange={(e) => setEventPrefix(e.target.value)}
                disabled={!eventPrefixEnabled}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-slate-50 disabled:text-slate-400"
              />
              <p className="text-xs text-slate-500 mt-2">
                Example: TF| Deep Work
              </p>
            </div>
          </div>

          {/* Scheduling Links */}
          <SchedulingLinksPanel />

          {/* Meeting Manager */}
          <MeetingManagerPanel />

          {/* Habit Notifications */}
          <div
            id="habit-notifications"
            className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 scroll-mt-24"
          >
            <h2 className="text-lg font-semibold text-slate-900 mb-2">
              Habit Notifications
            </h2>
            <p className="text-sm text-slate-600 mb-6">
              Get opt-in reminders to help maintain your habit streaks and stay on track.
            </p>

            <div className="space-y-4">
              {/* Streak At Risk Notification */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyStreakAtRisk}
                  onChange={(e) => setNotifyStreakAtRisk(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-primary-600 border-slate-300 rounded focus:ring-primary-500"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-slate-700 block">
                    Streak-at-risk reminders
                  </span>
                  <p className="text-xs text-slate-500 mt-1">
                    Get notified when a habit streak will break if not completed today
                  </p>
                </div>
              </label>

              {/* Missed High Priority Notification */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyMissedHighPriority}
                  onChange={(e) => setNotifyMissedHighPriority(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-primary-600 border-slate-300 rounded focus:ring-primary-500"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-slate-700 block">
                    Missed high-priority habit reminders
                  </span>
                  <p className="text-xs text-slate-500 mt-1">
                    Get notified when you miss a high-priority habit
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyWeeklyIdentityRecap}
                  onChange={(e) => setNotifyWeeklyIdentityRecap(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-primary-600 border-slate-300 rounded focus:ring-primary-500"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-slate-700 block">
                    Weekly identity recap email
                  </span>
                  <p className="text-xs text-slate-500 mt-1">
                    Sends a Sunday snapshot to your Gmail address using your connected Google account. Requires Gmail
                    access.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Rest days (streak preservation) */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Rest &amp; sick days</h2>
            <p className="text-sm text-slate-600 mb-4">
              Mark days when you cannot complete identity-linked work. Rest days bridge streaks without breaking them.
              Limit: {restDaysInfo?.restDaysLimit ?? 2} per rolling 30 days (
              {restDaysInfo?.restDaysUsedInRolling30 ?? 0} used).
            </p>
            <div className="flex flex-wrap gap-2 items-end mb-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Date (YYYY-MM-DD)</label>
                <input
                  type="text"
                  value={restDateInput}
                  onChange={(e) => setRestDateInput(e.target.value)}
                  placeholder={new Date().toISOString().slice(0, 10)}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm w-44"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Reason</label>
                <select
                  value={restReason}
                  onChange={(e) =>
                    setRestReason(e.target.value as 'sick' | 'travel' | 'rest' | 'other')
                  }
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
                >
                  <option value="rest">Rest</option>
                  <option value="sick">Sick</option>
                  <option value="travel">Travel</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <button
                type="button"
                onClick={async () => {
                  const d = restDateInput.trim() || new Date().toISOString().slice(0, 10);
                  try {
                    await api.addRestDay({ localDate: d, reason: restReason });
                    track('identity.rest_day_marked', { local_date: d, reason: restReason });
                    const data = await api.getRestDays();
                    setRestDaysInfo(data);
                    setRestDateInput('');
                    setMessage({ type: 'success', text: 'Rest day saved.' });
                  } catch (err) {
                    setMessage({
                      type: 'error',
                      text: err instanceof Error ? err.message : 'Could not save rest day',
                    });
                  }
                }}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
              >
                Add rest day
              </button>
            </div>
            {restDaysInfo && restDaysInfo.restDays.length > 0 && (
              <ul className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
                {restDaysInfo.restDays.map((rd) => (
                  <li
                    key={rd.id}
                    className="flex items-center justify-between px-3 py-2 text-sm"
                  >
                    <span>
                      {rd.localDate}{' '}
                      <span className="text-slate-500">({rd.reason})</span>
                    </span>
                    <button
                      type="button"
                      className="text-red-600 hover:underline"
                      onClick={async () => {
                        try {
                          await api.deleteRestDay(rd.localDate);
                          const data = await api.getRestDays();
                          setRestDaysInfo(data);
                        } catch {
                          setMessage({ type: 'error', text: 'Failed to remove rest day' });
                        }
                      }}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Identities */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-1">
                  My Identities
                </h2>
                <p className="text-slate-600 text-sm">
                  Link your tasks and habits to who you're becoming — up to 5 identities.
                </p>
              </div>
              <Link
                href="/settings/identities"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Manage Identities
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>

          {/* Categories */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-1">
                  Categories
                </h2>
                <p className="text-slate-600 text-sm">
                  Create custom categories and train AI to auto-sort new events.
                </p>
              </div>
              <Link
                href="/settings/email-categories"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Manage Categories
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>

          {/* Writing & Voice */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-1">
                  Writing &amp; Voice
                </h2>
                <p className="text-slate-600 text-sm">
                  Configure how AI drafts emails in your unique voice and style.
                </p>
              </div>
              <Link
                href="/settings/writing-voice"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Configure Voice
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
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
