'use client';

import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { CalendarView, CalendarEventItem } from '@/components/CalendarView';
import { FloatingAssistantButton } from '@/components/FloatingAssistantButton';
import { useTasks } from '@/hooks/useTasks';
import * as api from '@/lib/api';
import type { CalendarEvent } from '@timeflow/shared';

export default function CalendarPage() {
  const { tasks, loading: tasksLoading, refresh: refreshTasks } = useTasks();
  const [externalEvents, setExternalEvents] = useState<CalendarEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [scheduling, setScheduling] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedTask, setSelectedTask] = useState<{ id: string; title: string } | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);

  // Fetch calendar events for the current month
  useEffect(() => {
    async function fetchEvents() {
      try {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 2, 0); // End of next month

        const events = await api.getCalendarEvents(
          start.toISOString(),
          end.toISOString()
        );
        setExternalEvents(events);
      } catch (err) {
        console.error('Failed to fetch calendar events:', err);
      } finally {
        setEventsLoading(false);
      }
    }

    fetchEvents();
  }, []);

  const unscheduledTasks = tasks.filter((t) => t.status === 'unscheduled');

  const handleSmartSchedule = async () => {
    const taskIds = unscheduledTasks.map((t) => t.id);
    if (taskIds.length === 0) {
      setMessage({ type: 'error', text: 'No unscheduled tasks to schedule' });
      return;
    }

    setScheduling(true);
    setMessage(null);

    try {
      const now = new Date();
      const end = new Date();
      end.setDate(end.getDate() + 14);

      const result = await api.runSchedule({
        taskIds,
        dateRangeStart: now.toISOString(),
        dateRangeEnd: end.toISOString(),
      });

      setMessage({
        type: 'success',
        text: `Scheduled ${result.scheduled} task${result.scheduled === 1 ? '' : 's'}!`,
      });
      refreshTasks();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Scheduling failed',
      });
    } finally {
      setScheduling(false);
    }
  };

  const handleEventSelect = (event: CalendarEventItem) => {
    if (event.isTask && event.taskId) {
      setSelectedTask({ id: event.taskId, title: event.title });
      setShowTaskModal(true);
    }
  };

  const handleDeleteTask = async () => {
    if (!selectedTask) return;

    try {
      await api.deleteTask(selectedTask.id);
      await refreshTasks();
      setMessage({
        type: 'success',
        text: 'Task deleted successfully!',
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Failed to delete task',
      });
    } finally {
      setShowTaskModal(false);
      setSelectedTask(null);
    }
  };

  const handleUnscheduleTask = async () => {
    if (!selectedTask) return;

    try {
      // Update task status to unscheduled
      await api.updateTask(selectedTask.id, { status: 'unscheduled' });
      await refreshTasks();
      setMessage({
        type: 'success',
        text: 'Task unscheduled successfully!',
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Failed to unschedule task',
      });
    } finally {
      setShowTaskModal(false);
      setSelectedTask(null);
    }
  };

  const handleRescheduleTask = async (taskId: string, start: Date, end: Date) => {
    try {
      await api.rescheduleTask(taskId, start.toISOString(), end.toISOString());
      await refreshTasks();
      setMessage({
        type: 'success',
        text: 'Task rescheduled successfully!',
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Failed to reschedule task',
      });
      throw error; // Re-throw so the calendar knows it failed
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Calendar</h1>
            <p className="text-slate-600 mt-1">
              View your scheduled tasks alongside your Google Calendar events
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="w-3 h-3 rounded bg-primary-500"></span>
              <span className="text-slate-600">Tasks</span>
              <span className="w-3 h-3 rounded bg-slate-400 ml-4"></span>
              <span className="text-slate-600">Events</span>
              <span className="w-3 h-3 rounded bg-red-500 ml-4"></span>
              <span className="text-slate-600">Overdue</span>
            </div>
            <button
              onClick={handleSmartSchedule}
              disabled={scheduling || unscheduledTasks.length === 0}
              className="bg-accent-600 text-white px-6 py-2 rounded-lg hover:bg-accent-700 disabled:opacity-50 font-medium flex items-center gap-2"
            >
              {scheduling ? (
                <>
                  <svg
                    className="animate-spin w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Scheduling...
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                  Smart Schedule ({unscheduledTasks.length})
                </>
              )}
            </button>
          </div>
        </div>

        {/* Messages */}
        {message && (
          <div
            className={`px-4 py-3 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Calendar */}
        {tasksLoading || eventsLoading ? (
          <div className="h-[700px] bg-white rounded-lg shadow-sm border border-slate-200 flex items-center justify-center">
            <div className="text-slate-500">Loading calendar...</div>
          </div>
        ) : (
          <CalendarView
            tasks={tasks}
            externalEvents={externalEvents}
            onSelectEvent={handleEventSelect}
            onRescheduleTask={handleRescheduleTask}
          />
        )}
      </div>

      {/* Task Action Modal */}
      {showTaskModal && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-slate-800 mb-2">Task Actions</h3>
            <p className="text-slate-600 mb-6">{selectedTask.title}</p>

            <div className="space-y-3">
              <button
                onClick={handleUnscheduleTask}
                className="w-full bg-amber-500 text-white px-4 py-3 rounded-lg hover:bg-amber-600 font-medium flex items-center justify-center gap-2"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Unschedule Task
              </button>

              <button
                onClick={handleDeleteTask}
                className="w-full bg-red-500 text-white px-4 py-3 rounded-lg hover:bg-red-600 font-medium flex items-center justify-center gap-2"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                Delete Task Permanently
              </button>

              <button
                onClick={() => {
                  setShowTaskModal(false);
                  setSelectedTask(null);
                }}
                className="w-full bg-slate-200 text-slate-700 px-4 py-3 rounded-lg hover:bg-slate-300 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <FloatingAssistantButton />
    </Layout>
  );
}

