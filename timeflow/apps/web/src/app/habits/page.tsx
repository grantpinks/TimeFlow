/**
 * Habits Management Page
 *
 * Simple CRUD interface for managing habits.
 * Note: Scheduling integration will come in a future sprint.
 */

'use client';

import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Panel, SectionHeader, EmptyState } from '@/components/ui';
import { useHabits } from '@/hooks/useHabits';
import { HabitsInsights } from '@/components/habits/HabitsInsights';
import { track } from '@/lib/analytics';
import type { Habit, HabitFrequency, TimeOfDay } from '@timeflow/shared';

export default function HabitsPage() {
  const { habits, loading, createHabit, updateHabit, deleteHabit } = useHabits();
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  // Track page view
  useEffect(() => {
    track('page.view.habits', {});
  }, []);

  // Form state for add
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newFrequency, setNewFrequency] = useState<HabitFrequency>('daily');
  const [newDaysOfWeek, setNewDaysOfWeek] = useState<string[]>([]);
  const [newTimeOfDay, setNewTimeOfDay] = useState<TimeOfDay | ''>('');
  const [newDuration, setNewDuration] = useState(30);

  // Form state for edit
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editFrequency, setEditFrequency] = useState<HabitFrequency>('daily');
  const [editDaysOfWeek, setEditDaysOfWeek] = useState<string[]>([]);
  const [editTimeOfDay, setEditTimeOfDay] = useState<TimeOfDay | ''>('');
  const [editDuration, setEditDuration] = useState(30);
  const [editIsActive, setEditIsActive] = useState(true);

  const [addError, setAddError] = useState('');
  const [editError, setEditError] = useState('');

  const handleAdd = async () => {
    if (!newTitle.trim()) {
      setAddError('Title is required');
      return;
    }

    try {
      await createHabit({
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
        frequency: newFrequency,
        daysOfWeek: newFrequency === 'weekly' ? newDaysOfWeek : undefined,
        preferredTimeOfDay: newTimeOfDay || undefined,
        durationMinutes: newDuration,
      });

      // Reset form
      setNewTitle('');
      setNewDescription('');
      setNewFrequency('daily');
      setNewDaysOfWeek([]);
      setNewTimeOfDay('');
      setNewDuration(30);
      setShowAdd(false);
      setAddError('');
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to create habit');
    }
  };

  const handleEdit = (habit: Habit) => {
    setEditing(habit.id);
    setEditTitle(habit.title);
    setEditDescription(habit.description || '');
    setEditFrequency(habit.frequency as HabitFrequency);
    setEditDaysOfWeek(habit.daysOfWeek);
    setEditTimeOfDay((habit.preferredTimeOfDay as TimeOfDay) || '');
    setEditDuration(habit.durationMinutes);
    setEditIsActive(habit.isActive);
    setEditError('');
  };

  const handleSaveEdit = async () => {
    if (!editing || !editTitle.trim()) {
      setEditError('Title is required');
      return;
    }

    try {
      await updateHabit(editing, {
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
        frequency: editFrequency,
        daysOfWeek: editFrequency === 'weekly' ? editDaysOfWeek : undefined,
        preferredTimeOfDay: editTimeOfDay || undefined,
        durationMinutes: editDuration,
        isActive: editIsActive,
      });

      setEditing(null);
      setEditError('');
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update habit');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this habit?')) {
      return;
    }

    try {
      await deleteHabit(id);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete habit');
    }
  };

  const toggleDayOfWeek = (
    day: string,
    daysArray: string[],
    setter: (days: string[]) => void
  ) => {
    if (daysArray.includes(day)) {
      setter(daysArray.filter((d) => d !== day));
    } else {
      setter([...daysArray, day]);
    }
  };

  const formatFrequency = (habit: Habit) => {
    if (habit.frequency === 'daily') return 'Daily';
    if (habit.frequency === 'weekly') {
      return `Weekly (${habit.daysOfWeek.join(', ')})`;
    }
    return 'Custom';
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <SectionHeader
          title="Habits"
          subtitle="Track your progress and build better routines with Flow, your AI habits coach"
          count={habits.length}
          actions={
            <button
              onClick={() => setShowAdd(true)}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium text-sm"
            >
              Add Habit
            </button>
          }
        />

        {/* Flow Coach Welcome (only show if user has habits) */}
        {habits.length > 0 && (
          <div className="bg-gradient-to-r from-primary-50 to-primary-100 border border-primary-200 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center shadow-md">
                <span className="text-white text-xl font-bold">F</span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-primary-900 text-lg mb-1">
                  Meet Flow, your AI habits coach
                </h3>
                <p className="text-primary-800 text-sm leading-relaxed">
                  I analyze your habit patterns and provide personalized recommendations to help you build consistency.
                  Check my recommendations below and let's work together to strengthen your routines.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Insights Dashboard */}
        {habits.length > 0 && <HabitsInsights />}

        {/* Add Habit Form */}
        {showAdd && (
          <Panel className="bg-slate-50">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Add New Habit</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., Morning Exercise"
                  className="w-full px-3 py-2 border border-slate-300 rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Additional details..."
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Frequency
                  </label>
                  <select
                    value={newFrequency}
                    onChange={(e) => setNewFrequency(e.target.value as HabitFrequency)}
                    className="w-full px-3 py-2 border border-slate-300 rounded"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Time of Day
                  </label>
                  <select
                    value={newTimeOfDay}
                    onChange={(e) => setNewTimeOfDay(e.target.value as TimeOfDay | '')}
                    className="w-full px-3 py-2 border border-slate-300 rounded"
                  >
                    <option value="">Any time</option>
                    <option value="morning">Morning</option>
                    <option value="afternoon">Afternoon</option>
                    <option value="evening">Evening</option>
                  </select>
                </div>
              </div>

              {newFrequency === 'weekly' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Days of Week
                  </label>
                  <div className="flex gap-2">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() =>
                          toggleDayOfWeek(day.toLowerCase(), newDaysOfWeek, setNewDaysOfWeek)
                        }
                        className={`px-3 py-2 rounded border text-sm font-medium ${
                          newDaysOfWeek.includes(day.toLowerCase())
                            ? 'bg-primary-600 text-white border-primary-600'
                            : 'bg-white text-slate-700 border-slate-300 hover:border-primary-300'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  value={newDuration}
                  onChange={(e) => setNewDuration(Number(e.target.value))}
                  min="5"
                  max="240"
                  className="w-full px-3 py-2 border border-slate-300 rounded"
                />
              </div>

              {addError && <p className="text-sm text-red-600">{addError}</p>}

              <div className="flex gap-2">
                <button
                  onClick={handleAdd}
                  disabled={!newTitle.trim()}
                  className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                >
                  Add Habit
                </button>
                <button
                  onClick={() => {
                    setShowAdd(false);
                    setAddError('');
                  }}
                  className="px-4 py-2 bg-slate-200 text-slate-700 rounded hover:bg-slate-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </Panel>
        )}

        {/* Habits Management Section */}
        {habits.length > 0 && (
          <div className="pt-6 border-t border-slate-200">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">
              Manage Habits
            </h2>
          </div>
        )}

        {/* Habits List */}
        <Panel padding="none">
          <div className="divide-y divide-slate-100">
          {habits.map((habit) => (
            <div
              key={habit.id}
              className={`p-4 ${
                habit.isActive ? '' : 'opacity-60'
              }`}
            >
              {editing === habit.id ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded"
                  />

                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={2}
                    placeholder="Description..."
                    className="w-full px-3 py-2 border border-slate-300 rounded resize-none"
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Frequency
                      </label>
                      <select
                        value={editFrequency}
                        onChange={(e) => setEditFrequency(e.target.value as HabitFrequency)}
                        className="w-full px-3 py-2 border border-slate-300 rounded"
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="custom">Custom</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Time of Day
                      </label>
                      <select
                        value={editTimeOfDay}
                        onChange={(e) => setEditTimeOfDay(e.target.value as TimeOfDay | '')}
                        className="w-full px-3 py-2 border border-slate-300 rounded"
                      >
                        <option value="">Any time</option>
                        <option value="morning">Morning</option>
                        <option value="afternoon">Afternoon</option>
                        <option value="evening">Evening</option>
                      </select>
                    </div>
                  </div>

                  {editFrequency === 'weekly' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Days of Week
                      </label>
                      <div className="flex gap-2">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                          <button
                            key={day}
                            type="button"
                            onClick={() =>
                              toggleDayOfWeek(day.toLowerCase(), editDaysOfWeek, setEditDaysOfWeek)
                            }
                            className={`px-3 py-2 rounded border text-sm font-medium ${
                              editDaysOfWeek.includes(day.toLowerCase())
                                ? 'bg-primary-600 text-white border-primary-600'
                                : 'bg-white text-slate-700 border-slate-300'
                            }`}
                          >
                            {day}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Duration (minutes)
                      </label>
                      <input
                        type="number"
                        value={editDuration}
                        onChange={(e) => setEditDuration(Number(e.target.value))}
                        min="5"
                        max="240"
                        className="w-full px-3 py-2 border border-slate-300 rounded"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Status
                      </label>
                      <select
                        value={editIsActive ? 'active' : 'inactive'}
                        onChange={(e) => setEditIsActive(e.target.value === 'active')}
                        className="w-full px-3 py-2 border border-slate-300 rounded"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>

                  {editError && <p className="text-sm text-red-600">{editError}</p>}

                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveEdit}
                      className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditing(null);
                        setEditError('');
                      }}
                      className="px-4 py-2 bg-slate-200 text-slate-700 rounded hover:bg-slate-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-slate-800">{habit.title}</h3>
                      {!habit.isActive && (
                        <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded">
                          Inactive
                        </span>
                      )}
                    </div>
                    {habit.description && (
                      <p className="text-sm text-slate-600 mt-1">{habit.description}</p>
                    )}
                    <div className="flex gap-4 mt-2 text-sm text-slate-500">
                      <span>{formatFrequency(habit)}</span>
                      {habit.preferredTimeOfDay && (
                        <span className="capitalize">{habit.preferredTimeOfDay}</span>
                      )}
                      <span>{habit.durationMinutes} min</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(habit)}
                      className="px-3 py-1 text-sm text-primary-600 hover:bg-primary-50 rounded transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(habit.id)}
                      className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          </div>

          {habits.length === 0 && (
            <EmptyState
              icon={
                <svg
                  className="w-16 h-16 text-slate-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                  />
                </svg>
              }
              title="No habits yet"
              description="Create your first habit to start building better routines"
            />
          )}
        </Panel>
      </div>
    </Layout>
  );
}
