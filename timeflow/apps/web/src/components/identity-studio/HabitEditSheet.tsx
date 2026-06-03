'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type {
  Habit,
  HabitFrequency,
  Identity,
  TimeOfDay,
  CreateHabitRequest,
  UpdateHabitRequest,
} from '@timeflow/shared';
import { IdentitySelector } from '@/components/identity/IdentitySelector';

export interface HabitEditSheetProps {
  open: boolean;
  mode: 'create' | 'edit';
  habit?: Habit | null;
  initialIdentityId?: string | null;
  identities: Identity[];
  onClose: () => void;
  onCreate: (payload: CreateHabitRequest) => Promise<void>;
  onUpdate: (id: string, payload: UpdateHabitRequest) => Promise<void>;
}

function toggleDay(day: string, days: string[], setDays: (d: string[]) => void) {
  if (days.includes(day)) {
    setDays(days.filter((d) => d !== day));
  } else {
    setDays([...days, day]);
  }
}

export function HabitEditSheet({
  open,
  mode,
  habit,
  initialIdentityId,
  identities,
  onClose,
  onCreate,
  onUpdate,
}: HabitEditSheetProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState<HabitFrequency>('daily');
  const [daysOfWeek, setDaysOfWeek] = useState<string[]>([]);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay | ''>('');
  const [duration, setDuration] = useState(30);
  const [isActive, setIsActive] = useState(true);
  const [identityId, setIdentityId] = useState('');
  const [longTermGoal, setLongTermGoal] = useState('');
  const [whyStatement, setWhyStatement] = useState('');
  const [showExtra, setShowExtra] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError('');
    if (mode === 'edit' && habit) {
      setTitle(habit.title);
      setDescription(habit.description || '');
      setFrequency(habit.frequency as HabitFrequency);
      setDaysOfWeek(habit.daysOfWeek ?? []);
      setTimeOfDay((habit.preferredTimeOfDay as TimeOfDay) || '');
      setDuration(habit.durationMinutes);
      setIsActive(habit.isActive);
      setIdentityId(habit.identityId || '');
      setLongTermGoal(habit.longTermGoal || '');
      setWhyStatement(habit.whyStatement || '');
      setShowExtra(Boolean(habit.longTermGoal || habit.whyStatement || habit.description));
    } else {
      setTitle('');
      setDescription('');
      setFrequency('daily');
      setDaysOfWeek([]);
      setTimeOfDay('');
      setDuration(30);
      setIsActive(true);
      setIdentityId(initialIdentityId || '');
      setLongTermGoal('');
      setWhyStatement('');
      setShowExtra(false);
    }
  }, [open, mode, habit, initialIdentityId]);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (mode === 'create') {
        await onCreate({
          title: title.trim(),
          description: description.trim() || undefined,
          frequency,
          daysOfWeek: frequency === 'weekly' ? daysOfWeek : undefined,
          preferredTimeOfDay: timeOfDay || undefined,
          durationMinutes: duration,
          identityId: identityId || undefined,
          longTermGoal: longTermGoal.trim() || undefined,
          whyStatement: whyStatement.trim() || undefined,
        } satisfies CreateHabitRequest);
      } else if (habit) {
        await onUpdate(habit.id, {
          title: title.trim(),
          description: description.trim() || undefined,
          frequency,
          daysOfWeek: frequency === 'weekly' ? daysOfWeek : undefined,
          preferredTimeOfDay: timeOfDay || undefined,
          durationMinutes: duration,
          isActive,
          identityId: identityId === '' ? null : identityId,
          longTermGoal: longTermGoal.trim() || undefined,
          whyStatement: whyStatement.trim() || undefined,
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save habit');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative flex h-full w-full max-w-md flex-col bg-white shadow-xl">
        <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-lg font-semibold text-slate-900">
            {mode === 'create' ? 'Add habit' : 'Edit habit'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          >
            ✕
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              placeholder="e.g., Morning Exercise"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Identity</label>
            <IdentitySelector
              identities={identities}
              value={identityId || null}
              onChange={(id) => setIdentityId(id ?? '')}
              placeholder="Pick an identity…"
              showLinkPrompt
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Completions count toward this identity on{' '}
              <Link href="/today" className="text-primary-600 hover:underline">
                Today
              </Link>
              .
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Frequency</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as HabitFrequency)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Time of day</label>
              <select
                value={timeOfDay}
                onChange={(e) => setTimeOfDay(e.target.value as TimeOfDay | '')}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              >
                <option value="">Any time</option>
                <option value="morning">Morning</option>
                <option value="afternoon">Afternoon</option>
                <option value="evening">Evening</option>
              </select>
            </div>
          </div>
          {frequency === 'weekly' && (
            <div className="flex flex-wrap gap-1">
              {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day, daysOfWeek, setDaysOfWeek)}
                  className={`px-2 py-1 rounded text-xs font-medium border ${
                    daysOfWeek.includes(day)
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Duration (minutes)
            </label>
            <input
              type="number"
              min={5}
              max={240}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          {mode === 'edit' && (
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              Active habit
            </label>
          )}
          <button
            type="button"
            className="text-sm font-medium text-primary-600"
            onClick={() => setShowExtra((v) => !v)}
          >
            {showExtra ? 'Hide' : 'Show'} optional fields
          </button>
          {showExtra && (
            <div className="space-y-3 border-t border-slate-100 pt-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Long-term goal
                </label>
                <input
                  type="text"
                  value={longTermGoal}
                  onChange={(e) => setLongTermGoal(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Why this matters
                </label>
                <textarea
                  value={whyStatement}
                  onChange={(e) => setWhyStatement(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm resize-none"
                />
              </div>
            </div>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <footer className="border-t border-slate-200 px-4 py-3 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving || !title.trim()}
            onClick={() => void handleSubmit()}
            className="flex-1 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : mode === 'create' ? 'Add habit' : 'Save'}
          </button>
        </footer>
      </div>
    </div>
  );
}
