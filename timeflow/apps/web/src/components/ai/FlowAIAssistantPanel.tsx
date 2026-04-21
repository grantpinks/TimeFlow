/**
 * Flow AI Assistant Panel
 *
 * Slide-in panel for conversational task management with Flow AI
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ChatMessage } from './ChatMessage';
import { QuickActionButton } from './QuickActionButton';
import { FlowMascot } from '../FlowMascot';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import SchedulePreviewCard from '../SchedulePreviewCard';
import * as api from '@/lib/api';
import type { ChatMessage as ChatMessageType, Task, SchedulePreview, ApplyScheduleBlock, Habit } from '@timeflow/shared';

interface FlowAIAssistantPanelProps {
  isOpen: boolean;
  onClose: () => void;
  tasks?: Task[];
  habits?: Habit[];
  timeZone?: string;
  onTasksUpdate?: () => void; // Callback to refresh tasks after schedule apply
}

interface QuickAction {
  id: string;
  icon: string;
  label: string;
  prompt: string;
}

export function FlowAIAssistantPanel({
  isOpen,
  onClose,
  tasks = [],
  habits = [],
  timeZone,
  onTasksUpdate,
}: FlowAIAssistantPanelProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fix #1: Handle schedule preview responses
  const [schedulePreview, setSchedulePreview] = useState<SchedulePreview | null>(null);
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  // Phase 3B: Conversation persistence
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'error'>('idle');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingSaveRef = useRef<ChatMessageType[]>([]);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveInFlightRef = useRef(false);
  const saveInFlightPromiseRef = useRef<Promise<void> | null>(null);
  const latestMessagesRef = useRef<ChatMessageType[]>([]);
  const conversationIdRef = useRef<string | null>(null); // Fix #1: Use ref to prevent split conversations
  const sessionGenerationRef = useRef(0); // Fix #4: Session token to prevent old saves writing to new session

  // Quick actions for common queries
  const quickActions: QuickAction[] = [
    {
      id: 'schedule-unscheduled',
      icon: '📅',
      label: 'Schedule my tasks',
      prompt: 'Please help me schedule all my unscheduled tasks optimally.',
    },
    {
      id: 'due-today',
      icon: '🎯',
      label: "What's due today?",
      prompt: 'What tasks are due today and what should I prioritize?',
    },
    {
      id: 'optimize-week',
      icon: '⚡',
      label: 'Optimize my week',
      prompt: 'Can you help me reorganize my week for better productivity?',
    },
    {
      id: 'productivity-insights',
      icon: '📊',
      label: 'Show insights',
      prompt: 'Show me my productivity trends and insights.',
    },
  ];

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Focus input when panel opens and start fresh
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
      // Phase 3B: Start fresh each time (as requested by user)
      // Previous conversation is auto-saved, new conversation starts
      sessionGenerationRef.current += 1; // Fix #4: Increment generation to invalidate old saves
      setMessages([]);
      conversationIdRef.current = null; // Fix #1: Reset ref
      setSchedulePreview(null);
      setError(null);
      pendingSaveRef.current = [];
      latestMessagesRef.current = [];
      setSaveStatus('idle');
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    } else {
      // Fix #2: Flush pending saves when panel closes
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      void flushAutoSave();
    }
  }, [isOpen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Fix #2: Flush pending saves on unmount
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      void flushAutoSave();
    };
  }, []);

  const handleSend = async (messageText: string) => {
    if (!messageText.trim()) return;

    setError(null);
    // Clear previous schedule preview when user sends new message
    setSchedulePreview(null);
    setApplyError(null);

    const userMessage: ChatMessageType = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageText,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Send message with task context
      const response = await api.sendChatMessage(
        messageText,
        messages.length > 0 ? messages : undefined
      );

      setMessages((prev) => [...prev, response.message]);

      // Fix #1: Handle schedule preview in response
      if (response.suggestions) {
        setSchedulePreview(response.suggestions);
        setApplyError(null);
      } else if (response.message.metadata?.schedulePreview) {
        setSchedulePreview(response.message.metadata.schedulePreview);
        setApplyError(null);
      }

      // Phase 3B: Auto-save conversation
      const newMessages = [userMessage, response.message];
      latestMessagesRef.current = messages.concat(newMessages);
      queueAutoSave(newMessages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      console.error('Failed to send message:', err);

      // Still save failed conversations (just the user message)
      latestMessagesRef.current = [...messages, userMessage];
      queueAutoSave([userMessage]);
    } finally {
      setLoading(false);
    }
  };

  // Fix #1: Apply schedule handler
  const handleApplySchedule = async () => {
    if (!schedulePreview) return;

    setApplying(true);
    setApplyError(null);

    try {
      const applyBlocks: ApplyScheduleBlock[] = [];

      console.log('[FlowAI] Schedule preview blocks:', schedulePreview.blocks);

      schedulePreview.blocks.forEach((block) => {
        if ('taskId' in block && block.taskId) {
          applyBlocks.push({
            taskId: block.taskId,
            start: block.start,
            end: block.end,
          });
        } else if ('habitId' in block && block.habitId) {
          applyBlocks.push({
            habitId: block.habitId,
            title: (block as any).title,
            start: block.start,
            end: block.end,
          });
        }
      });

      console.log('[FlowAI] Applying schedule with blocks:', applyBlocks);

      const result = await api.applySchedule(applyBlocks);
      console.log('[FlowAI] Schedule applied successfully:', result);

      // Trigger tasks refresh
      onTasksUpdate?.();

      setSchedulePreview(null);

      // Add success message to chat
      const successMessage: ChatMessageType = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: `✅ Schedule applied successfully! ${applyBlocks.length} ${applyBlocks.length === 1 ? 'task' : 'tasks'} scheduled.`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, successMessage]);

      // Phase 3B: Save success message
      latestMessagesRef.current = [...latestMessagesRef.current, successMessage];
      queueAutoSave([successMessage]);
    } catch (err) {
      console.error('[FlowAI] Failed to apply schedule:', err);
      console.error('[FlowAI] Error details:', {
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        schedulePreview,
      });
      const errorMsg = err instanceof Error ? err.message : 'Failed to apply schedule';
      setApplyError(errorMsg);
      console.error('Failed to apply schedule:', err);
    } finally {
      setApplying(false);
    }
  };

  const handleQuickAction = (action: QuickAction) => {
    handleSend(action.prompt);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(input);
    }
  };

  // Fix #5: Navigate to assistant after flushing saves
  const handleNavigateToAssistant = async (e: React.MouseEvent) => {
    e.preventDefault();
    await flushAutoSave();
    onClose();
    router.push('/assistant');
  };

  // Phase 3B: Auto-save conversation functions
  const generateSmartTitle = (messages: ChatMessageType[]): string => {
    if (messages.length === 0) return `Tasks Chat - ${new Date().toLocaleDateString()}`;

    const firstUserMessage = messages.find(msg => msg.role === 'user');
    if (!firstUserMessage) return `Tasks Chat - ${new Date().toLocaleDateString()}`;

    let title = firstUserMessage.content.trim();
    const firstSentence = title.match(/^[^.!?]+/);
    if (firstSentence) {
      title = firstSentence[0];
    }

    if (title.length > 40) {
      title = title.substring(0, 40) + '...';
    }

    return `Tasks: ${title}`;
  };

  const scheduleAutoSaveFlush = (delayMs: number = 800) => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      void flushAutoSave();
    }, delayMs);
  };

  const flushAutoSave = async (): Promise<void> => {
    // Drain in-flight work first so await flushAutoSave() (e.g. before navigate) cannot return early.
    if (saveInFlightRef.current && saveInFlightPromiseRef.current) {
      await saveInFlightPromiseRef.current;
      return flushAutoSave();
    }

    const pending = pendingSaveRef.current.slice();
    if (pending.length === 0) return;

    // Fix #4: Capture session generation to detect stale saves
    const saveGeneration = sessionGenerationRef.current;

    pendingSaveRef.current = [];
    saveInFlightRef.current = true;
    if (sessionGenerationRef.current === saveGeneration) {
      setSaveStatus('saving');
    }

    const saveWork = async (): Promise<void> => {
      let hadError = false;
      try {
        // Fix #1: Use ref to prevent split conversations from closure staleness
        if (!conversationIdRef.current) {
          const title = generateSmartTitle(latestMessagesRef.current);
          const conversation = await api.createConversation({
            title,
            messages: latestMessagesRef.current,
          });
          // Fix #4: Only write conversation ID if session hasn't changed
          if (sessionGenerationRef.current === saveGeneration) {
            conversationIdRef.current = conversation.id;
          } else {
            console.log('Ignoring stale save completion from previous session');
          }
        } else {
          // Fix #4: Only append if session hasn't changed
          if (sessionGenerationRef.current === saveGeneration) {
            await api.addMessagesToConversation(conversationIdRef.current, pending);
          } else {
            console.log('Ignoring stale save completion from previous session');
          }
        }
        if (sessionGenerationRef.current === saveGeneration) {
          setSaveStatus('idle');
        }
      } catch (error) {
        console.error('Failed to auto-save conversation:', error);
        hadError = true;
        pendingSaveRef.current = pending.concat(pendingSaveRef.current);
        if (sessionGenerationRef.current === saveGeneration) {
          setSaveStatus('error');
        }
        scheduleAutoSaveFlush(4000);
      } finally {
        saveInFlightRef.current = false;
        saveInFlightPromiseRef.current = null;
        if (!hadError && pendingSaveRef.current.length > 0) {
          scheduleAutoSaveFlush(800);
        }
      }
    };

    const savePromise = saveWork();
    saveInFlightPromiseRef.current = savePromise;
    await savePromise;

    if (pendingSaveRef.current.length > 0) {
      return flushAutoSave();
    }
  };

  const queueAutoSave = (newMessages: ChatMessageType[]) => {
    pendingSaveRef.current.push(...newMessages);
    scheduleAutoSaveFlush(800);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full sm:w-[420px] bg-white dark:bg-slate-900 shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-primary-50 to-blue-50 dark:from-slate-800 dark:to-slate-900">
              <div className="flex items-center gap-3">
                <FlowMascot size="sm" expression="happy" />
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                    Flow AI Assistant
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {tasks.length > 0 ? `${tasks.length} tasks in context` : 'Ready to help'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-900 dark:text-white"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Quick Actions */}
            {messages.length === 0 && (
              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                  Quick Actions
                </p>
                <div className="flex flex-wrap gap-2">
                  {quickActions.map((action) => (
                    <QuickActionButton
                      key={action.id}
                      icon={action.icon}
                      label={action.label}
                      onClick={() => handleQuickAction(action)}
                      disabled={loading}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                  <FlowMascot size="lg" expression="guiding-up" />
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-4 mb-2">
                    How can I help you today?
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 max-w-xs mb-4">
                    Ask me anything about your tasks, schedule, or productivity.
                    I can help you plan, organize, and optimize your work.
                  </p>
                  {/* Phase 3B: Hint about main assistant page */}
                  <div className="mt-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg max-w-sm">
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      💡 <strong>Tip:</strong> Your conversations are auto-saved. View all past conversations in the{' '}
                      <a
                        href="/assistant"
                        className="underline hover:text-blue-800 dark:hover:text-blue-200 font-medium cursor-pointer"
                        onClick={handleNavigateToAssistant}
                      >
                        main Assistant page
                      </a>
                      .
                    </p>
                  </div>
                </div>
              )}

              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}

              {loading && (
                <div className="flex gap-3 mb-4">
                  <div className="flex-shrink-0">
                    <FlowMascot size="sm" expression="thinking" />
                  </div>
                  <div className="flex-1 max-w-[80%]">
                    <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                      <LoadingSpinner size="sm" />
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        Flow is thinking...
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3">
                  <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                </div>
              )}

              {/* Fix #1: Render schedule preview */}
              {schedulePreview && (
                <div className="mt-4">
                  <SchedulePreviewCard
                    preview={schedulePreview}
                    tasks={tasks}
                    habits={habits}
                    timeZone={timeZone}
                    onApply={handleApplySchedule}
                    onCancel={() => {
                      setSchedulePreview(null);
                      setApplyError(null);
                    }}
                    applying={applying}
                    applied={false}
                  />
                  {applyError && (
                    <div className="mt-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3">
                      <p className="text-sm text-red-700 dark:text-red-400">{applyError}</p>
                    </div>
                  )}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask Flow anything..."
                    disabled={loading}
                    className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
                <button
                  onClick={() => handleSend(input)}
                  disabled={!input.trim() || loading}
                  className="px-4 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[60px]"
                >
                  {loading ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                </button>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">
                  Press Enter to send
                  {saveStatus === 'saving' && <span className="ml-2 text-blue-600 dark:text-blue-400">• Saving...</span>}
                  {saveStatus === 'error' && <span className="ml-2 text-red-600 dark:text-red-400">• Save failed</span>}
                </span>
                {/* Fix #3: Only show "Auto-saved" when actually idle and saved */}
                {messages.length > 0 && saveStatus === 'idle' && (
                  <span className="text-slate-400 dark:text-slate-500">
                    Auto-saved
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
