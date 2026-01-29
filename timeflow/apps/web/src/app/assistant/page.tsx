'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Layout } from '../../components/Layout';
import SchedulePreviewCard from '../../components/SchedulePreviewCard';
import ThinkingState from '../../components/ThinkingState';
import { SchedulePreviewOverlay } from '../../components/calendar/SchedulePreviewOverlay';
import { useTasks } from '../../hooks/useTasks';
import { useHabits } from '../../hooks/useHabits';
import { useUser } from '../../hooks/useUser';
import * as api from '../../lib/api';
import type { ChatMessage, SchedulePreview, ApplyScheduleBlock } from '@timeflow/shared';

export default function AssistantPage() {
  const { user, isAuthenticated, loading: userLoading } = useUser();
  const { tasks, refresh: refreshTasks } = useTasks();
  const { habits } = useHabits();
  const reduceMotion = useReducedMotion();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [schedulePreview, setSchedulePreview] = useState<SchedulePreview | null>(null);
  const [previewApplied, setPreviewApplied] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [conversations, setConversations] = useState<api.Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'error'>('idle');
  const [manualSaveStatus, setManualSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  // Determine current mascot state
  const [mascotState, setMascotState] = useState<'default' | 'thinking' | 'celebrating' | 'guiding'>('default');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const pendingSaveRef = useRef<ChatMessage[]>([]);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveInFlightRef = useRef(false);
  const latestMessagesRef = useRef<ChatMessage[]>([]);
  const conversationIdRef = useRef<string | null>(null);

  // Task 13.17: Improved scroll behavior
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Scroll behavior functions
  // Check if user is near bottom of scroll area
  const checkIfNearBottom = () => {
    const container = messagesContainerRef.current;
    if (!container) return true;

    const threshold = 150; // pixels from bottom
    const isNear = container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
    return isNear;
  };

  // Handle scroll events to detect user position
  const handleScroll = () => {
    const nearBottom = checkIfNearBottom();
    setIsNearBottom(nearBottom);
    setShowScrollButton(!nearBottom && messages.length > 0);
  };

  // Smart auto-scroll: Only scroll to bottom if user is already near bottom
  useEffect(() => {
    if (isNearBottom && !schedulePreview) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
    }
  }, [messages, isNearBottom, schedulePreview]);

  // Scroll to bottom manually (for button click)
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    setIsNearBottom(true);
    setShowScrollButton(false);
  };

  const mascotStatus = loading
    ? 'Flow is thinking.'
    : mascotState === 'celebrating'
      ? 'Flow is celebrating.'
      : mascotState === 'guiding'
        ? 'Flow is guiding.'
        : 'Flow is ready.';

  useEffect(() => {
    latestMessagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    conversationIdRef.current = currentConversationId;
  }, [currentConversationId]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  // Load saved conversations on mount
  useEffect(() => {
    if (isAuthenticated) {
      loadConversations();
    }
  }, [isAuthenticated]);

  // Update mascot state based on activity
  useEffect(() => {
    if (loading) {
      setMascotState('thinking');
    } else if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'assistant' && lastMessage.metadata?.mascotState) {
        setMascotState(lastMessage.metadata.mascotState as any);
      } else {
        setMascotState('default');
      }
    } else {
      setMascotState('default');
    }
  }, [loading, messages]);

  // Redirect if not authenticated
  useEffect(() => {
    if (userLoading) return;
    if (!isAuthenticated && typeof window !== 'undefined') {
      window.location.href = '/';
    }
  }, [isAuthenticated, userLoading]);

  const loadConversations = async () => {
    try {
      const convos = await api.getConversations();
      setConversations(convos);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  // Generate smart title based on conversation content
  const generateSmartTitle = (messages: ChatMessage[]): string => {
    if (messages.length === 0) return `Chat - ${new Date().toLocaleDateString()}`;

    // Get first user message
    const firstUserMessage = messages.find(msg => msg.role === 'user');
    if (!firstUserMessage) return `Chat - ${new Date().toLocaleDateString()}`;

    // Extract first 40 chars or first sentence
    let title = firstUserMessage.content.trim();
    const firstSentence = title.match(/^[^.!?]+/);
    if (firstSentence) {
      title = firstSentence[0];
    }

    if (title.length > 40) {
      title = title.substring(0, 40) + '...';
    }

    return title;
  };

  // Delete conversation handler
  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering load conversation

    if (!confirm('Delete this conversation?')) return;

    try {
      await api.deleteConversation(id);

      // If we deleted the current conversation, start a new chat
      if (currentConversationId === id) {
        handleNewChat();
      }

      await loadConversations();
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  const handleSaveConversation = async () => {
    if (messages.length === 0) return;

    setManualSaveStatus('saving');

    try {
      const title = generateSmartTitle(messages);
      const conversation = await api.createConversation({ title, messages });
      setCurrentConversationId(conversation.id);
      await loadConversations();
      setManualSaveStatus('success');

      // Reset to idle after 2 seconds
      setTimeout(() => setManualSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to save conversation:', error);
      setManualSaveStatus('error');

      // Reset to idle after 3 seconds
      setTimeout(() => setManualSaveStatus('idle'), 3000);
    }
  };

  const handleLoadConversation = async (id: string) => {
    try {
      const conversation = await api.getConversation(id);
      if (conversation.messages) {
        setMessages(conversation.messages);
        latestMessagesRef.current = conversation.messages;
        setCurrentConversationId(id);
        setSidebarOpen(false);
        pendingSaveRef.current = [];
        setSaveStatus('idle');
        // Task 13.17: Reset scroll position to bottom when loading conversation
        setIsNearBottom(true);
        setShowScrollButton(false);
      }
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setCurrentConversationId(null);
    setSchedulePreview(null);
    setPreviewApplied(false);
    setMascotState('default');
    pendingSaveRef.current = [];
    setSaveStatus('idle');
    setManualSaveStatus('idle');
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    // Task 13.17: Reset scroll position when starting new chat
    setIsNearBottom(true);
    setShowScrollButton(false);
  };

  const scheduleAutoSaveFlush = (delayMs: number) => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      void flushAutoSave();
    }, delayMs);
  };

  const flushAutoSave = async () => {
    if (saveInFlightRef.current) return;
    const pending = pendingSaveRef.current.slice();
    if (pending.length === 0) return;

    pendingSaveRef.current = [];
    saveInFlightRef.current = true;
    setSaveStatus('saving');

    let hadError = false;

    try {
      const conversationId = conversationIdRef.current;
      if (!conversationId) {
        const title = generateSmartTitle(latestMessagesRef.current);
        const conversation = await api.createConversation({
          title,
          messages: latestMessagesRef.current,
        });
        setCurrentConversationId(conversation.id);
        await loadConversations();
      } else {
        await api.addMessagesToConversation(conversationId, pending);
      }
      setSaveStatus('idle');
    } catch (error) {
      console.error('Failed to auto-save conversation:', error);
      hadError = true;
      pendingSaveRef.current = pending.concat(pendingSaveRef.current);
      setSaveStatus('error');
      scheduleAutoSaveFlush(4000);
    } finally {
      saveInFlightRef.current = false;
      if (!hadError && pendingSaveRef.current.length > 0) {
        scheduleAutoSaveFlush(800);
      }
    }
  };

  const queueAutoSave = (newMessages: ChatMessage[]) => {
    if (!isAuthenticated) return;
    pendingSaveRef.current.push(...newMessages);
    scheduleAutoSaveFlush(800);
  };

  if (userLoading || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center app-shell">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-muted">Loading...</p>
        </div>
      </div>
    );
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await api.sendChatMessage(
        input.trim(),
        [...messages, userMessage],
        currentConversationId || undefined
      );
      const newMessages = [...messages, userMessage, response.message];
      setMessages(newMessages);

      if (response.suggestions) {
        setSchedulePreview(response.suggestions);
        setPreviewApplied(false);
      }

      latestMessagesRef.current = newMessages;
      queueAutoSave([userMessage, response.message]);
    } catch (error) {
      console.error('Failed to send message:', error);
      const detailedMessage =
        error instanceof Error && error.message
          ? error.message
          : 'Sorry, I encountered an error. Please try again.';

      const errorMessage: ChatMessage = {
        id: `msg_${Date.now()}_error`,
        role: 'assistant',
        content: detailedMessage,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => {
        const updated = [...prev, errorMessage];
        latestMessagesRef.current = updated;
        return updated;
      });
      queueAutoSave([userMessage, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = (query: string) => {
    setInput(query);
  };

  const handleApplySchedule = async () => {
    if (!schedulePreview) return;

    setApplying(true);
    setApplyError(null);

    try {
      const applyBlocks: ApplyScheduleBlock[] = [];

      schedulePreview.blocks.forEach((block) => {
        if ('taskId' in block && block.taskId) {
          applyBlocks.push({ taskId: block.taskId, start: block.start, end: block.end });
        } else if ('habitId' in block && block.habitId) {
          applyBlocks.push({
            habitId: block.habitId,
            title: (block as any).title,
            start: block.start,
            end: block.end,
          });
        }
      });

      const result = await api.applySchedule(applyBlocks);
      const tasksScheduled = result.tasksScheduled;
      const habitsScheduled = result.habitsScheduled;

      await refreshTasks();

      setSchedulePreview(null);
      setPreviewApplied(true);

      let successText = 'Schedule applied!';
      if (tasksScheduled > 0 && habitsScheduled > 0) {
        successText = `Schedule applied! ${tasksScheduled} task${tasksScheduled !== 1 ? 's' : ''} and ${habitsScheduled} habit instance${habitsScheduled !== 1 ? 's' : ''} added to your Google Calendar.`;
      } else if (tasksScheduled > 0) {
        successText = `Schedule applied! ${tasksScheduled} task${tasksScheduled !== 1 ? 's' : ''} added to your Google Calendar.`;
      } else if (habitsScheduled > 0) {
        successText = `Schedule applied! ${habitsScheduled} habit instance${habitsScheduled !== 1 ? 's' : ''} added to your Google Calendar.`;
      }

      const successMessage: ChatMessage = {
        id: `msg_${Date.now()}_success`,
        role: 'assistant',
        content: successText,
        timestamp: new Date().toISOString(),
        metadata: { mascotState: 'celebrating' },
      };
      setMessages((prev) => {
        const updated = [...prev, successMessage];
        latestMessagesRef.current = updated;
        return updated;
      });
      queueAutoSave([successMessage]);
    } catch (error) {
      console.error('Failed to apply schedule:', error);
      const detailedMessage =
        error instanceof Error && error.message
          ? error.message
          : 'Failed to apply schedule. Please try again.';
      setApplyError(detailedMessage);

      const errorMessage: ChatMessage = {
        id: `msg_${Date.now()}_error`,
        role: 'assistant',
        content: detailedMessage,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => {
        const updated = [...prev, errorMessage];
        latestMessagesRef.current = updated;
        return updated;
      });
      queueAutoSave([errorMessage]);
    } finally {
      setApplying(false);
    }
  };

  // Task 13.9: Enhanced availability question templates
  const quickActions = [
    'What does my schedule look like today?',
    'When am I free today?',
    'When am I free this week?',
    'Schedule my high priority tasks',
    'Do I have 2 hours free tomorrow?',
    'What is my busiest day this week?',
  ];

  return (
    <Layout>
      <div className="flex h-[calc(100vh-128px)] surface-card relative overflow-hidden">
        {/* Saved Chats Sidebar */}
        <aside
          className={`absolute inset-y-0 left-0 bg-slate-900 text-white w-64 md:w-72 transform transition-transform duration-300 ease-in-out z-20 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
          role="navigation"
          aria-label="Saved conversations"
          aria-hidden={!sidebarOpen}
        >
          <div className="p-4 border-b border-slate-700 flex items-center justify-between">
            <h2 className="font-semibold" id="sidebar-title">Saved Chats</h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-slate-400 hover:text-white"
              aria-label="Close sidebar"
            >
              X
            </button>
          </div>

          <div className="p-3">
            <button
              onClick={handleNewChat}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-lg font-medium mb-3 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 focus:ring-offset-slate-900"
              aria-label="Start a new chat conversation"
            >
              + New Chat
            </button>

            <nav className="space-y-1 max-h-[calc(100vh-200px)] overflow-y-auto" aria-label="Conversation history">
              {conversations.map((convo) => (
                <div
                  key={convo.id}
                  className={`relative group rounded-lg hover:bg-slate-800 transition-colors ${
                    currentConversationId === convo.id ? 'bg-slate-800' : ''
                  }`}
                >
                  <button
                    onClick={() => handleLoadConversation(convo.id)}
                    className="w-full text-left px-3 py-2.5 pr-10"
                  >
                    <div className="text-sm font-medium truncate">
                      {convo.title || 'Untitled Chat'}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      {convo._count?.messages || 0} messages • {new Date(convo.updatedAt).toLocaleDateString()}
                    </div>
                  </button>
                  <button
                    onClick={(e) => handleDeleteConversation(convo.id, e)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-400 p-1.5 rounded transition-all"
                    aria-label="Delete conversation"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </nav>
          </div>
        </aside>

        {/* Overlay when sidebar is open */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/20 z-10"
            onClick={() => setSidebarOpen(false)}
          ></div>
        )}

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Top Bar */}
          <div className="border-b border-slate-200 px-4 py-3 flex items-center justify-between bg-white">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-slate-600 hover:text-slate-900 flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <span className="text-sm font-medium">Chats</span>
            </button>

            {messages.length > 0 && (
              <button
                onClick={handleSaveConversation}
                disabled={manualSaveStatus === 'saving'}
                className={`text-sm font-medium px-4 py-2 rounded-lg transition-all ${
                  manualSaveStatus === 'success'
                    ? 'bg-green-100 text-green-700'
                    : manualSaveStatus === 'error'
                    ? 'bg-red-100 text-red-700'
                    : manualSaveStatus === 'saving'
                    ? 'bg-slate-100 text-slate-500 cursor-wait'
                    : 'text-primary-600 hover:text-primary-700 hover:bg-primary-50'
                }`}
              >
                {manualSaveStatus === 'saving'
                  ? 'Saving...'
                  : manualSaveStatus === 'success'
                  ? 'Saved!'
                  : manualSaveStatus === 'error'
                  ? 'Failed'
                  : 'Save Chat'}
              </button>
            )}
          </div>

          {/* Messages Area */}
          <div
            ref={messagesContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto relative bg-gradient-to-br from-white via-primary-50/5 to-white"
            role="main"
            aria-label="Chat conversation with Flow assistant"
          >
            <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
              {mascotStatus}
            </span>
            <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col min-h-full">
              {/* Hero State - Large and Centered */}
              <AnimatePresence mode="wait">
                {messages.length === 0 && !loading && (
                  <motion.div
                    key="hero"
                    initial={reduceMotion ? false : { opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={reduceMotion ? { duration: 0 } : { duration: 0.3 }}
                    className="flex flex-col items-center justify-start pt-20 sm:pt-24 md:pt-28 pb-12 min-h-[80vh] px-4 sm:px-6"
                  >
                    <div className="text-center mb-8 sm:mb-10">
                      <motion.div
                        className="relative w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 lg:w-72 lg:h-72 mx-auto mb-6 sm:mb-8"
                        animate={reduceMotion ? { y: 0 } : { y: [0, -10, 0] }}
                        transition={
                          reduceMotion
                            ? { duration: 0 }
                            : {
                                duration: 2,
                                repeat: Infinity,
                                ease: 'easeInOut',
                              }
                        }
                      >
                        {/* Liquid Blob Glow Effect - Radial Gradient Rings */}
                        <motion.div
                          className="absolute inset-0"
                          style={{
                            width: '180%',
                            height: '180%',
                            left: '-40%',
                            top: '-40%',
                            background: 'radial-gradient(ellipse 50% 60% at 50% 50%, rgba(11, 175, 154, 0.25) 0%, rgba(11, 175, 154, 0.15) 30%, rgba(59, 130, 246, 0.1) 50%, rgba(59, 130, 246, 0.05) 70%, transparent 100%)',
                            filter: 'blur(40px)',
                            borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
                          }}
                          animate={
                            reduceMotion
                              ? { opacity: 0.6, scale: 1 }
                              : {
                                  scale: [1, 1.08, 1],
                                  opacity: [0.8, 1, 0.8],
                                }
                          }
                          transition={
                            reduceMotion
                              ? { duration: 0 }
                              : {
                                  duration: 3,
                                  repeat: Infinity,
                                  ease: 'easeInOut',
                                }
                          }
                        />
                        <motion.div
                          className="absolute inset-0"
                          style={{
                            width: '150%',
                            height: '150%',
                            left: '-25%',
                            top: '-25%',
                            background: 'radial-gradient(ellipse 50% 60% at 50% 50%, rgba(11, 175, 154, 0.4) 0%, rgba(11, 175, 154, 0.25) 30%, rgba(59, 130, 246, 0.15) 60%, transparent 100%)',
                            filter: 'blur(30px)',
                            borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
                          }}
                          animate={
                            reduceMotion
                              ? { opacity: 0.7, scale: 1 }
                              : {
                                  scale: [1, 1.12, 1],
                                  opacity: [0.9, 1, 0.9],
                                }
                          }
                          transition={
                            reduceMotion
                              ? { duration: 0 }
                              : {
                                  duration: 2.5,
                                  repeat: Infinity,
                                  ease: 'easeInOut',
                                  delay: 0.2,
                                }
                          }
                        />
                        <motion.div
                          className="absolute inset-0"
                          style={{
                            width: '120%',
                            height: '120%',
                            left: '-10%',
                            top: '-10%',
                            background: 'radial-gradient(ellipse 50% 60% at 50% 50%, rgba(11, 175, 154, 0.5) 0%, rgba(11, 175, 154, 0.3) 40%, rgba(59, 130, 246, 0.2) 70%, transparent 100%)',
                            filter: 'blur(20px)',
                            borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
                          }}
                          animate={
                            reduceMotion
                              ? { opacity: 0.8, scale: 1 }
                              : {
                                  scale: [1, 1.15, 1],
                                  opacity: [1, 0.95, 1],
                                }
                          }
                          transition={
                            reduceMotion
                              ? { duration: 0 }
                              : {
                                  duration: 2,
                                  repeat: Infinity,
                                  ease: 'easeInOut',
                                  delay: 0.4,
                                }
                          }
                        />

                        {/* Flow Mascot */}
                        <Image
                          src={`/branding/flow-${mascotState}.png`}
                          alt={`Flow assistant mascot in ${mascotState} state`}
                          fill
                          className="object-contain drop-shadow-2xl relative z-10"
                          priority
                          aria-hidden="false"
                        />
                      </motion.div>
                      <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-slate-900 mb-4 sm:mb-6">
                        How can I help you today?
                      </h1>
                      <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-slate-600 mb-8 sm:mb-12">
                        Ask me about your schedule, tasks, or habits
                      </p>
                    </div>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 max-w-4xl mx-auto w-full px-2 sm:px-4" role="group" aria-label="Quick action suggestions">
                      {quickActions.map((action, index) => (
                        <motion.button
                          key={index}
                          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={
                            reduceMotion
                              ? { duration: 0 }
                              : { delay: index * 0.05, duration: 0.2 }
                          }
                          onClick={() => handleQuickAction(action)}
                          whileHover={reduceMotion ? undefined : { scale: 1.02 }}
                          whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                          className="min-h-[44px] text-left p-3 sm:p-4 lg:p-5 border-2 border-slate-200 rounded-xl hover:bg-gradient-to-br hover:from-primary-50 hover:to-blue-50 hover:border-primary-300 hover:shadow-md transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                          aria-label={`Quick action: ${action}`}
                        >
                          <div className="text-sm sm:text-base lg:text-lg font-medium text-slate-700 group-hover:text-primary-700">
                            {action}
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Thinking State - Medium Centered Mascot */}
                {loading && messages.length === 0 && (
                  <motion.div
                    key="thinking"
                    initial={reduceMotion ? false : { opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={reduceMotion ? { duration: 0 } : { duration: 0.3 }}
                  >
                    <ThinkingState />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Conversation State - Messages */}
              {messages.length > 0 && (
                <div className="space-y-4 sm:space-y-6 w-full py-4 sm:py-6">
                  {messages.map((message) => {
                    const msgMascotState = message.metadata?.mascotState || 'guiding';

                    return (
                      <motion.div
                        key={message.id}
                        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={reduceMotion ? { duration: 0 } : { duration: 0.2 }}
                        className={`flex gap-3 sm:gap-4 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                      >
                        {message.role === 'assistant' && (
                          <motion.div
                            initial={reduceMotion ? false : { opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={reduceMotion ? { duration: 0 } : { duration: 0.2 }}
                            className="relative w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 flex-shrink-0"
                          >
                            <Image
                              src={`/branding/flow-${msgMascotState}.png`}
                              alt={`Flow assistant ${msgMascotState}`}
                              fill
                              className="object-contain drop-shadow-md hover:scale-105 transition-transform cursor-default"
                              role="img"
                              aria-label={`Flow is ${msgMascotState === 'guiding' ? 'ready to help' : msgMascotState}`}
                            />
                          </motion.div>
                        )}

                        <div
                          className={
                            message.role === 'user'
                              ? 'max-w-[88%] sm:max-w-[75%]'
                              : 'flex-1 min-w-0 max-w-full sm:max-w-[85%]'
                          }
                        >
                          {message.role === 'assistant' ? (
                            <div className="prose prose-sm sm:prose-base lg:prose-lg max-w-none pl-4 sm:pl-6 border-l-2 sm:border-l-4 border-primary-500 py-2 sm:py-3">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  h2: ({ node, ...props }) => (
                                    <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 mt-5 mb-3 sm:mt-6 sm:mb-4" {...props} />
                                  ),
                                  h3: ({ node, ...props }) => (
                                    <h3 className="text-lg sm:text-xl font-semibold text-slate-800 mt-4 mb-2 sm:mt-5 sm:mb-3" {...props} />
                                  ),
                                  p: ({ node, ...props }) => (
                                    <p className="text-sm sm:text-base text-slate-700 leading-relaxed mb-3 sm:mb-4" {...props} />
                                  ),
                                  ul: ({ node, ...props }) => (
                                    <ul className="text-sm sm:text-base text-slate-700 space-y-2 mb-3 sm:mb-4 list-disc list-inside" {...props} />
                                  ),
                                  ol: ({ node, ...props }) => (
                                    <ol className="text-sm sm:text-base text-slate-700 space-y-2 mb-3 sm:mb-4 list-decimal list-inside" {...props} />
                                  ),
                                  code: ({ node, inline, ...props }: any) =>
                                    inline ? (
                                      <code className="bg-primary-50 text-primary-700 px-2 py-1 rounded text-xs sm:text-sm" {...props} />
                                    ) : (
                                      <code className="block bg-slate-100 border border-slate-200 rounded-lg p-4 text-xs sm:text-sm overflow-x-auto" {...props} />
                                    ),
                                }}
                              >
                                {message.content}
                              </ReactMarkdown>
                            </div>
                          ) : (
                            <motion.div
                              initial={reduceMotion ? false : { opacity: 0, x: 20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={reduceMotion ? { duration: 0 } : { duration: 0.2 }}
                              className="bg-gradient-to-br from-primary-600 to-primary-700 text-white px-4 py-3 sm:px-6 sm:py-4 rounded-2xl shadow-md text-sm sm:text-base"
                            >
                              {message.content}
                            </motion.div>
                          )}
                        </div>

                        {message.role === 'user' && <div className="w-10 sm:w-12 md:w-14 lg:w-16"></div>}
                      </motion.div>
                    );
                  })}

                  {/* Inline Loading indicator (when continuing conversation) */}
                  {loading && messages.length > 0 && (
                    <motion.div
                      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={reduceMotion ? { duration: 0 } : { duration: 0.2 }}
                      className="flex gap-4"
                    >
                      <motion.div
                        animate={reduceMotion ? { scale: 1 } : { scale: [0.98, 1.02, 0.98] }}
                        transition={
                          reduceMotion
                            ? { duration: 0 }
                            : {
                                duration: 0.8,
                                repeat: Infinity,
                                ease: 'easeInOut',
                              }
                        }
                        className="relative w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 flex-shrink-0"
                      >
                        <Image
                          src="/branding/flow-thinking.png"
                          alt="Flow is analyzing your request"
                          fill
                          className="object-contain drop-shadow-md"
                          role="img"
                          aria-label="Flow assistant is thinking and processing your request"
                        />
                      </motion.div>
                      <div className="flex items-center space-x-2.5">
                        <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-primary-500 rounded-full animate-bounce motion-reduce:animate-none" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-primary-500 rounded-full animate-bounce motion-reduce:animate-none" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-primary-500 rounded-full animate-bounce motion-reduce:animate-none" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </motion.div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}

              {/* Schedule Preview */}
              {schedulePreview && (
                <div className="mt-4 sm:mt-6">
                  <SchedulePreviewCard
                    preview={schedulePreview}
                    tasks={tasks}
                    habits={habits}
                    timeZone={user.timeZone}
                    onApply={() => {}}
                    onCancel={() => {
                      setSchedulePreview(null);
                      setPreviewApplied(false);
                      setApplyError(null);
                    }}
                    applying={applying}
                    applied={previewApplied}
                  />
                  {applyError && (
                    <div className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                      {applyError}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Task 13.17: Scroll to Bottom Button */}
            <div
              className={`fixed bottom-20 right-4 sm:bottom-24 sm:right-8 z-10 transition-all duration-300 ${
                showScrollButton
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-4 pointer-events-none'
              }`}
            >
              <button
                onClick={scrollToBottom}
                className="bg-primary-600 hover:bg-primary-700 text-white p-2.5 sm:p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2"
                aria-label="Scroll to bottom"
              >
                <svg
                  className="w-4 h-4 sm:w-5 sm:h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 14l-7 7m0 0l-7-7m7 7V3"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Input Area - Fixed at Bottom */}
          <div className="border-t border-slate-200 bg-white px-4 sm:px-6 py-3 sm:py-4">
            <div className="max-w-7xl mx-auto">
              <form onSubmit={handleSendMessage} className="flex gap-2 sm:gap-3" role="search" aria-label="Send message to Flow">
                <label htmlFor="message-input" className="sr-only">Type your message to Flow assistant</label>
                <input
                  id="message-input"
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Message Flow..."
                  disabled={loading}
                  className="flex-1 min-h-[44px] px-3 sm:px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 text-base"
                  aria-label="Message input"
                  aria-describedby="message-hint"
                />
                <span id="message-hint" className="sr-only">Press Enter to send or click the Send button</span>
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="min-h-[44px] bg-primary-600 text-white px-4 sm:px-6 py-3 rounded-xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                  aria-label={loading ? "Sending message..." : "Send message"}
                >
                  Send
                </button>
              </form>
              {saveStatus !== 'idle' && (
                <div
                  className={`mt-2 text-xs ${
                    saveStatus === 'error' ? 'text-red-600' : 'text-slate-500'
                  }`}
                >
                  {saveStatus === 'saving'
                    ? 'Saving chat...'
                    : 'Auto-save failed. Retrying...'}
                </div>
              )}
            </div>
          </div>
        </div>

        <SchedulePreviewOverlay
          blocks={schedulePreview?.blocks || []}
          onApply={handleApplySchedule}
          onCancel={() => setSchedulePreview(null)}
          applying={applying}
          applied={previewApplied}
        />
      </div>
    </Layout>
  );
}
