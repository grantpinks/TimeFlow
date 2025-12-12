'use client';

import { Command } from 'cmdk';
import { useRouter } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import * as api from '@/lib/api';
import type { TaskPriority } from '@timeflow/shared';

type CommandPaletteContextValue = {
  openPalette: () => void;
  togglePalette: () => void;
};

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(
  null
);

type CommandPaletteProviderProps = {
  children: React.ReactNode;
};

export function CommandPaletteProvider({ children }: CommandPaletteProviderProps) {
  const [open, setOpen] = useState(false);

  const openPalette = useCallback(() => setOpen(true), []);
  const togglePalette = useCallback(() => setOpen((prev) => !prev), []);

  useKeyboardShortcuts({
    shortcuts: [
      {
        key: 'k',
        ctrlKey: true,
        description: 'Open command palette',
        handler: openPalette,
      },
      {
        key: 'k',
        metaKey: true,
        description: 'Open command palette',
        handler: openPalette,
      },
    ],
  });

  const contextValue = useMemo(
    () => ({
      openPalette,
      togglePalette,
    }),
    [openPalette, togglePalette]
  );

  return (
    <CommandPaletteContext.Provider value={contextValue}>
      {children}
      <CommandPaletteDialog open={open} onOpenChange={setOpen} />
    </CommandPaletteContext.Provider>
  );
}

export function useCommandPalette() {
  const context = useContext(CommandPaletteContext);
  if (!context) {
    throw new Error('useCommandPalette must be used within CommandPaletteProvider');
  }
  return context;
}

type CommandPaletteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function CommandPaletteDialog({ open, onOpenChange }: CommandPaletteDialogProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDuration, setTaskDuration] = useState('30');
  const [taskPriority, setTaskPriority] = useState<TaskPriority>(2);
  const [taskDueDate, setTaskDueDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (open) {
      setStatusMessage(null);
      const timer = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(timer);
    }
    setShowCreateForm(false);
    setTaskTitle('');
    setTaskDuration('30');
    setTaskDueDate('');
    setStatusMessage(null);
    return undefined;
  }, [open]);

  const handleNavigate = (href: string) => {
    router.push(href);
    onOpenChange(false);
  };

  const handleCreateTask = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!taskTitle.trim()) {
      setStatusMessage({ type: 'error', text: 'Add a title to create a task.' });
      return;
    }

    const parsedDuration = Number(taskDuration);
    const durationMinutes = Number.isFinite(parsedDuration) && parsedDuration > 0
      ? Math.round(parsedDuration)
      : 30;

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const dueDate = taskDueDate ? new Date(taskDueDate).toISOString() : undefined;
      await api.createTask({
        title: taskTitle.trim(),
        durationMinutes,
        priority: taskPriority,
        dueDate,
      });
      setStatusMessage({ type: 'success', text: 'Task created and added to your list.' });
      setShowCreateForm(false);
      setTaskTitle('');
      setTaskDuration('30');
      setTaskDueDate('');
      setTimeout(() => onOpenChange(false), 300);
    } catch (error) {
      console.error('Failed to create task from palette', error);
      setStatusMessage({
        type: 'error',
        text: 'Could not create the task. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      label="Command Palette"
      className="command-dialog"
    >
      <div className="command-header">
        <div>
          <div className="command-title">Quick actions</div>
          <p className="command-subtitle">
            Jump to key pages or create a task without leaving your flow.
          </p>
        </div>
        <div className="command-shortcut-hint">⌘K</div>
      </div>

      <Command.Input
        ref={inputRef}
        placeholder="Type a command or search..."
        className="command-input"
      />

      <Command.List className="command-list">
        <Command.Empty className="command-empty">
          No matching commands
        </Command.Empty>

        <Command.Group heading="Quick actions">
          <Command.Item
            value="create-task"
            onSelect={() => setShowCreateForm(true)}
            className="command-item"
          >
            <div className="command-item-icon">
              <PlusIcon />
            </div>
            <div>
              <div className="command-item-title">Create task</div>
              <p className="command-item-description">
                Capture a new task with duration and priority.
              </p>
            </div>
            <span className="command-item-shortcut">Enter</span>
          </Command.Item>
          <Command.Item
            value="today"
            onSelect={() => handleNavigate('/today')}
            className="command-item"
          >
            <div className="command-item-icon">
              <SunIcon />
            </div>
            <div>
              <div className="command-item-title">Go to Today</div>
              <p className="command-item-description">
                Review your schedule, inbox, and suggested habits.
              </p>
            </div>
            <span className="command-item-shortcut">T</span>
          </Command.Item>
          <Command.Item
            value="assistant"
            onSelect={() => handleNavigate('/assistant')}
            className="command-item"
          >
            <div className="command-item-icon">
              <BotIcon />
            </div>
            <div>
              <div className="command-item-title">Open Assistant</div>
              <p className="command-item-description">
                Chat with the scheduling copilot and automate updates.
              </p>
            </div>
            <span className="command-item-shortcut">A</span>
          </Command.Item>
        </Command.Group>
      </Command.List>

      {showCreateForm && (
        <form className="command-form" onSubmit={handleCreateTask}>
          <div className="command-form-grid">
            <label className="command-form-field">
              <span>Title</span>
              <input
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="Quickly jot down a task"
                className="command-form-input"
              />
            </label>
            <label className="command-form-field">
              <span>Duration (min)</span>
              <input
                type="number"
                min="5"
                value={taskDuration}
                onChange={(e) => setTaskDuration(e.target.value)}
                className="command-form-input"
              />
            </label>
            <label className="command-form-field">
              <span>Priority</span>
              <select
                value={taskPriority}
                onChange={(e) => setTaskPriority(Number(e.target.value) as TaskPriority)}
                className="command-form-input"
              >
                <option value={1}>High</option>
                <option value={2}>Medium</option>
                <option value={3}>Low</option>
              </select>
            </label>
            <label className="command-form-field">
              <span>Due date (optional)</span>
              <input
                type="date"
                value={taskDueDate}
                onChange={(e) => setTaskDueDate(e.target.value)}
                className="command-form-input"
              />
            </label>
          </div>
          <div className="command-form-actions">
            <button
              type="button"
              className="command-secondary"
              onClick={() => setShowCreateForm(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="command-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create task'}
            </button>
          </div>
        </form>
      )}

      {statusMessage && (
        <div
          className={`command-status ${
            statusMessage.type === 'success' ? 'command-status-success' : 'command-status-error'
          }`}
        >
          {statusMessage.text}
        </div>
      )}
    </Command.Dialog>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="command-icon">
      <path
        d="M12 5v14m-7-7h14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" className="command-icon">
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 2v2m0 16v2M4 12H2m20 0h-2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BotIcon() {
  return (
    <svg viewBox="0 0 24 24" className="command-icon">
      <rect
        x="5"
        y="8"
        width="14"
        height="10"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M9 18v1.5M15 18v1.5M12 5.5v2M10 12.5h4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="10" cy="12" r="1.25" fill="currentColor" />
      <circle cx="14" cy="12" r="1.25" fill="currentColor" />
    </svg>
  );
}
