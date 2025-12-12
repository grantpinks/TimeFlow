'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { track } from '@/lib/analytics';

interface CommandPaletteContextType {
  isOpen: boolean;
  openPalette: () => void;
  closePalette: () => void;
}

const CommandPaletteContext = createContext<CommandPaletteContextType | undefined>(undefined);

export function useCommandPalette() {
  const context = useContext(CommandPaletteContext);
  if (!context) {
    throw new Error('useCommandPalette must be used within CommandPaletteProvider');
  }
  return context;
}

interface Command {
  id: string;
  label: string;
  action: () => void;
  keywords?: string[];
}

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const router = useRouter();

  const commands: Command[] = [
    {
      id: 'today',
      label: 'Go to Today',
      action: () => router.push('/today'),
      keywords: ['today', 'home', 'dashboard'],
    },
    {
      id: 'tasks',
      label: 'Go to Tasks',
      action: () => router.push('/tasks'),
      keywords: ['tasks', 'todo'],
    },
    {
      id: 'calendar',
      label: 'Go to Calendar',
      action: () => router.push('/calendar'),
      keywords: ['calendar', 'schedule'],
    },
    {
      id: 'assistant',
      label: 'Go to AI Assistant',
      action: () => router.push('/assistant'),
      keywords: ['ai', 'assistant', 'chat'],
    },
    {
      id: 'settings',
      label: 'Go to Settings',
      action: () => router.push('/settings'),
      keywords: ['settings', 'preferences'],
    },
    {
      id: 'categories',
      label: 'Go to Categories',
      action: () => router.push('/categories'),
      keywords: ['categories', 'labels'],
    },
    {
      id: 'habits',
      label: 'Go to Habits',
      action: () => router.push('/habits'),
      keywords: ['habits', 'routines'],
    },
  ];

  const filteredCommands = commands.filter((cmd) =>
    cmd.label.toLowerCase().includes(search.toLowerCase()) ||
    cmd.keywords?.some((kw) => kw.toLowerCase().includes(search.toLowerCase()))
  );

  const openPalette = useCallback(() => {
    setIsOpen(true);
    track('command_palette_opened', { trigger: 'click' });
  }, []);

  const closePalette = useCallback(() => {
    setIsOpen(false);
    setSearch('');
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const willOpen = !isOpen;
        setIsOpen(willOpen);
        if (willOpen) {
          track('command_palette_opened', { trigger: 'keyboard' });
        }
      }
      if (e.key === 'Escape' && isOpen) {
        closePalette();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closePalette]);

  const handleCommandClick = (command: Command) => {
    track('command_palette_command_selected', { command_id: command.id });
    command.action();
    closePalette();
  };

  return (
    <CommandPaletteContext.Provider value={{ isOpen, openPalette, closePalette }}>
      {children}

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-24 px-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closePalette}
          />

          {/* Command palette */}
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-800 rounded-lg shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
              <svg
                className="w-5 h-5 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Type a command or search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-slate-900 dark:text-slate-100 placeholder-slate-400"
                autoFocus
              />
              <kbd className="px-2 py-1 text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-slate-700 dark:text-slate-400 rounded">
                ESC
              </kbd>
            </div>

            {/* Commands list */}
            <div className="max-h-96 overflow-y-auto">
              {filteredCommands.length === 0 ? (
                <div className="px-4 py-8 text-center text-slate-500">
                  No commands found
                </div>
              ) : (
                <div className="py-2">
                  {filteredCommands.map((command) => (
                    <button
                      key={command.id}
                      onClick={() => handleCommandClick(command)}
                      className="w-full px-4 py-3 text-left hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center justify-between group"
                    >
                      <span className="text-slate-900 dark:text-slate-100">
                        {command.label}
                      </span>
                      <svg
                        className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs text-slate-500">
              <span>Navigate with arrow keys</span>
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                  ↑↓
                </kbd>
                <span>to navigate</span>
                <kbd className="px-2 py-1 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                  ↵
                </kbd>
                <span>to select</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </CommandPaletteContext.Provider>
  );
}
