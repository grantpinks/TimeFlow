'use client';

import { useState } from 'react';
import { FloatingAssistantButton } from '@/components/FloatingAssistantButton';
import { Layout } from '@/components/Layout';
import { TaskList } from '@/components/TaskList';
import { useTasks } from '@/hooks/useTasks';
import * as api from '@/lib/api';

export default function TasksPage() {
  const {
    tasks,
    loading,
    error,
    createTask,
    updateTask,
    completeTask,
    deleteTask,
    refresh,
  } = useTasks();
  const [scheduling, setScheduling] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [scheduleResult, setScheduleResult] = useState<string | null>(null);

  // Filter tasks by status
  const unscheduledTasks = tasks.filter((t) => t.status === 'unscheduled');
  const scheduledTasks = tasks.filter((t) => t.status === 'scheduled');
  const completedTasks = tasks.filter((t) => t.status === 'completed');

  const handleSmartSchedule = async () => {
    const taskIds = unscheduledTasks.map((t) => t.id);
    if (taskIds.length === 0) {
      setScheduleError('No unscheduled tasks to schedule');
      return;
    }

    setScheduling(true);
    setScheduleError(null);
    setScheduleResult(null);

    try {
      // Schedule for the next 14 days
      const now = new Date();
      const end = new Date();
      end.setDate(end.getDate() + 14);

      const result = await api.runSchedule({
        taskIds,
        dateRangeStart: now.toISOString(),
        dateRangeEnd: end.toISOString(),
      });

      setScheduleResult(
        `Successfully scheduled ${result.scheduled} task${
          result.scheduled === 1 ? '' : 's'
        }!`
      );
      refresh();
    } catch (err) {
      setScheduleError(
        err instanceof Error ? err.message : 'Failed to run scheduling'
      );
    } finally {
      setScheduling(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Tasks</h1>
            <p className="text-slate-600 mt-1">
              Manage your tasks and schedule them into your calendar
            </p>
          </div>
          <button
            onClick={handleSmartSchedule}
            disabled={scheduling || unscheduledTasks.length === 0}
            className="bg-accent-600 text-white px-6 py-3 rounded-lg hover:bg-accent-700 disabled:opacity-50 font-medium flex items-center gap-2"
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
                Smart Schedule
              </>
            )}
          </button>
        </div>

        {/* Status messages */}
        {scheduleError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {scheduleError}
          </div>
        )}
        {scheduleResult && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            {scheduleResult}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Task sections */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Unscheduled */}
          <div>
            <h2 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-slate-400"></span>
              Unscheduled
              <span className="text-slate-400 font-normal">
                ({unscheduledTasks.length})
              </span>
            </h2>
            <TaskList
              tasks={unscheduledTasks}
              onCreateTask={createTask}
              onUpdateTask={updateTask}
              onCompleteTask={completeTask}
              onDeleteTask={deleteTask}
              loading={loading}
            />
          </div>

          {/* Scheduled */}
          <div>
            <h2 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-primary-500"></span>
              Scheduled
              <span className="text-slate-400 font-normal">
                ({scheduledTasks.length})
              </span>
            </h2>
            {scheduledTasks.length === 0 ? (
              <div className="text-slate-500 text-center py-8 bg-white rounded-lg border border-slate-200">
                No scheduled tasks
              </div>
            ) : (
              <TaskList
                tasks={scheduledTasks}
                onCreateTask={createTask}
                onUpdateTask={updateTask}
                onCompleteTask={completeTask}
                onDeleteTask={deleteTask}
              />
            )}
          </div>

          {/* Completed */}
          <div>
            <h2 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-500"></span>
              Completed
              <span className="text-slate-400 font-normal">
                ({completedTasks.length})
              </span>
            </h2>
            {completedTasks.length === 0 ? (
              <div className="text-slate-500 text-center py-8 bg-white rounded-lg border border-slate-200">
                No completed tasks
              </div>
            ) : (
              <TaskList
                tasks={completedTasks}
                onCreateTask={createTask}
                onUpdateTask={updateTask}
                onCompleteTask={completeTask}
                onDeleteTask={deleteTask}
              />
            )}
          </div>
        </div>
      </div>

      <FloatingAssistantButton />
    </Layout>
  );
}

