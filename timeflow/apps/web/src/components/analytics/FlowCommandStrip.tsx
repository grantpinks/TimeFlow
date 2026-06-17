'use client';

import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { getAssistantQuickActionChips } from '@/lib/assistantQuickActions';

export type FlowCommandStripAction = {
  id: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
};

export type FlowCommandStripHandle = {
  focusInput: () => void;
};

interface FlowCommandStripProps {
  timeZone?: string;
  insightLine?: string;
  contextualAction?: FlowCommandStripAction | null;
  onSubmit: (prompt: string) => void;
}

export const FlowCommandStrip = forwardRef<FlowCommandStripHandle, FlowCommandStripProps>(
  function FlowCommandStrip({ timeZone, insightLine, contextualAction, onSubmit }, ref) {
    const [input, setInput] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      focusInput: () => {
        inputRef.current?.focus();
        inputRef.current?.select();
      },
    }));

    const chips = useMemo(
      () => getAssistantQuickActionChips(new Date(), timeZone).slice(0, 4),
      [timeZone]
    );

    const submit = (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return;
      onSubmit(trimmed);
      setInput('');
    };

    const handleFormSubmit = (event: FormEvent) => {
      event.preventDefault();
      submit(input);
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        submit(input);
      }
    };

    return (
      <div className="space-y-3">
        {insightLine && (
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-snug">{insightLine}</p>
        )}

        <form onSubmit={handleFormSubmit} className="relative">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200/80 dark:border-slate-600/80 bg-white dark:bg-slate-900 shadow-sm focus-within:border-primary-400 focus-within:ring-2 focus-within:ring-primary-500/20 transition-all">
            <span className="pl-3 text-lg select-none" aria-hidden>
              ✨
            </span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Flow anything about your tasks..."
              className="flex-1 min-w-0 py-3 pr-2 bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
              aria-label="Ask Flow AI"
            />
            <kbd className="hidden sm:inline-flex flex-shrink-0 items-center rounded border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:text-slate-400">
              ⌘K
            </kbd>
            {contextualAction && (
              <button
                type="button"
                onClick={contextualAction.onClick}
                disabled={contextualAction.disabled}
                className="hidden sm:inline-flex flex-shrink-0 rounded-lg border border-primary-200 dark:border-primary-700 bg-primary-50 dark:bg-primary-900/40 px-3 py-2 text-xs font-semibold text-primary-700 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-900/60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {contextualAction.label}
              </button>
            )}
            <button
              type="submit"
              disabled={!input.trim()}
              className="mr-1.5 flex-shrink-0 rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Ask
            </button>
          </div>
          {contextualAction && (
            <button
              type="button"
              onClick={contextualAction.onClick}
              disabled={contextualAction.disabled}
              className="sm:hidden mt-2 w-full rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-xs font-semibold text-primary-700 disabled:opacity-50"
            >
              {contextualAction.label}
            </button>
          )}
        </form>

        <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-thin">
          {chips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => onSubmit(chip.prompt)}
              className="flex-shrink-0 inline-flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-600 bg-white/80 dark:bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/30 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
            >
              <span aria-hidden>{chip.icon}</span>
              <span>{chip.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }
);
