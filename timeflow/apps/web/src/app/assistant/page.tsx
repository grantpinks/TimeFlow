'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Layout } from '../../components/Layout';
import SchedulePreviewCard from '../../components/SchedulePreviewCard';
import { useTasks } from '../../hooks/useTasks';
import { useUser } from '../../hooks/useUser';
import * as api from '../../lib/api';
import type { ChatMessage, SchedulePreview } from '@timeflow/shared';

export default function AssistantPage() {
  const { user, isAuthenticated } = useUser();
  const { tasks, refresh: refreshTasks } = useTasks();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [schedulePreview, setSchedulePreview] = useState<SchedulePreview | null>(null);
  const [applying, setApplying] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [conversations, setConversations] = useState<api.Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);

  // Determine current mascot state
  const [mascotState, setMascotState] = useState<'default' | 'thinking' | 'celebrating' | 'guiding'>('default');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
    const timer = setTimeout(() => {
      if (!isAuthenticated && typeof window !== 'undefined') {
        window.location.href = '/';
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [isAuthenticated]);

  const loadConversations = async () => {
    try {
      const convos = await api.getConversations();
      setConversations(convos);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  const handleSaveConversation = async () => {
    if (messages.length === 0) return;

    try {
      const title = `Chat - ${new Date().toLocaleDateString()}`;
      const conversation = await api.createConversation({ title, messages });
      setCurrentConversationId(conversation.id);
      await loadConversations();
    } catch (error) {
      console.error('Failed to save conversation:', error);
    }
  };

  const handleLoadConversation = async (id: string) => {
    try {
      const conversation = await api.getConversation(id);
      if (conversation.messages) {
        setMessages(conversation.messages);
        setCurrentConversationId(id);
        setSidebarOpen(false);
      }
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setCurrentConversationId(null);
    setSchedulePreview(null);
    setMascotState('default');
  };

  if (!isAuthenticated || !user) {
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
      const response = await api.sendChatMessage(input.trim(), [...messages, userMessage]);
      setMessages((prev) => [...prev, response.message]);

      if (response.suggestions) {
        setSchedulePreview(response.suggestions);
      }
    } catch (error) {
      console.error('Failed to send message:', error);

      const errorMessage: ChatMessage = {
        id: `msg_${Date.now()}_error`,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
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

    try {
      const taskBlocks = schedulePreview.blocks.filter((b) => 'taskId' in b && b.taskId);
      const habitBlocks = schedulePreview.blocks.filter((b) => 'habitId' in b && b.habitId);

      let tasksScheduled = 0;
      let habitsScheduled = 0;

      if (taskBlocks.length > 0) {
        const taskIds = taskBlocks.map((b) => b.taskId as string);
        const dates = taskBlocks.map((b) => new Date(b.start).getTime());
        const dateRangeStart = new Date(Math.min(...dates)).toISOString();
        const dateRangeEnd = new Date(Math.max(...dates) + 24 * 60 * 60 * 1000).toISOString();

        await api.runSchedule({ taskIds, dateRangeStart, dateRangeEnd });
        tasksScheduled = taskBlocks.length;
      }

      if (habitBlocks.length > 0) {
        const habitEvents = habitBlocks.map((b) => ({
          habitId: (b as any).habitId,
          title: (b as any).title,
          start: b.start,
          end: b.end,
        }));

        const result = await api.createHabitEvents(habitEvents);
        habitsScheduled = result.created;
      }

      await refreshTasks();
      setSchedulePreview(null);

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
      setMessages((prev) => [...prev, successMessage]);
    } catch (error) {
      console.error('Failed to apply schedule:', error);

      const errorMessage: ChatMessage = {
        id: `msg_${Date.now()}_error`,
        role: 'assistant',
        content: 'Failed to apply schedule. Please try again.',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setApplying(false);
    }
  };

  const quickActions = [
    'What does my schedule look like today?',
    'Schedule my high priority tasks',
    'Schedule my habits',
    'When am I free this week?',
  ];

  return (
    <Layout>
      <div className="flex h-[calc(100vh-128px)] surface-card relative overflow-hidden">
        {/* Saved Chats Sidebar */}
        <div
          className={`absolute inset-y-0 left-0 bg-slate-900 text-white w-64 md:w-72 transform transition-transform duration-300 ease-in-out z-20 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="p-4 border-b border-slate-700 flex items-center justify-between">
            <h2 className="font-semibold">Saved Chats</h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="p-3">
            <button
              onClick={handleNewChat}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-lg font-medium mb-3 transition-colors"
            >
              + New Chat
            </button>

            <div className="space-y-1 max-h-[calc(100vh-200px)] overflow-y-auto">
              {conversations.map((convo) => (
                <button
                  key={convo.id}
                  onClick={() => handleLoadConversation(convo.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-800 transition-colors ${
                    currentConversationId === convo.id ? 'bg-slate-800' : ''
                  }`}
                >
                  <div className="text-sm font-medium truncate">
                    {convo.title || 'Untitled Chat'}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    {convo._count?.messages || 0} messages
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

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
                className="text-primary-600 hover:text-primary-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-primary-50 transition-colors"
              >
                Save Chat
              </button>
            )}
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto flex items-center">
            <div className="w-full max-w-5xl mx-auto px-6">
              {/* Flow Mascot - Large and Centered */}
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center pt-12">
                  <div className="text-center mb-8">
                    <div className="relative w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 mx-auto mb-6 animate-bounce-slow">
                      <Image
                        src={`/branding/flow-${mascotState}.png`}
                        alt="Flow"
                        fill
                        className="object-contain drop-shadow-2xl"
                        priority
                      />
                    </div>
                    <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-slate-900 mb-4">
                      How can I help you today?
                    </h1>
                    <p className="text-lg sm:text-xl text-slate-600 mb-8">
                      Ask me about your schedule, tasks, or habits
                    </p>
                  </div>

                  {/* Quick Actions */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-3xl mx-auto w-full">
                    {quickActions.map((action, index) => (
                      <button
                        key={index}
                        onClick={() => handleQuickAction(action)}
                        className="text-left p-3 sm:p-4 border-2 border-slate-200 rounded-xl hover:bg-gradient-to-br hover:from-primary-50 hover:to-blue-50 hover:border-primary-300 hover:shadow-md transition-all duration-200 group"
                      >
                        <div className="text-sm sm:text-base font-medium text-slate-700 group-hover:text-primary-700">
                          {action}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Messages */}
              {messages.length > 0 && (
              <div className="space-y-6 max-w-5xl mx-auto px-6 py-4">
                {messages.map((message) => {
                  const msgMascotState = message.metadata?.mascotState || 'default';

                  return (
                    <div
                      key={message.id}
                      className={`flex gap-4 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      {message.role === 'assistant' && (
                        <div className="relative w-8 h-8 flex-shrink-0">
                          <Image
                            src={`/branding/flow-${msgMascotState}.png`}
                            alt="Flow"
                            fill
                            className="object-contain"
                          />
                        </div>
                      )}

                      <div className={`flex-1 ${message.role === 'user' ? 'max-w-[80%]' : ''}`}>
                        {message.role === 'assistant' ? (
                          <div className="prose prose-sm max-w-none">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {message.content}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <div className="bg-primary-600 text-white px-4 py-3 rounded-2xl">
                            {message.content}
                          </div>
                        )}
                      </div>

                      {message.role === 'user' && <div className="w-8"></div>}
                    </div>
                  );
                })}

                {/* Loading indicator */}
                {loading && (
                  <div className="flex gap-4">
                    <div className="relative w-8 h-8 flex-shrink-0 animate-pulse">
                      <Image
                        src="/branding/flow-thinking.png"
                        alt="Flow thinking"
                        fill
                        className="object-contain"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
              )}

              {/* Schedule Preview */}
              {schedulePreview && (
                <div className="mt-6">
                  <SchedulePreviewCard
                    preview={schedulePreview}
                    tasks={tasks}
                    onApply={handleApplySchedule}
                    onCancel={() => setSchedulePreview(null)}
                    applying={applying}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Input Area - Fixed at Bottom */}
          <div className="border-t border-slate-200 bg-white px-6 py-4">
            <div className="max-w-5xl mx-auto">
              <form onSubmit={handleSendMessage} className="flex gap-2 sm:gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Message Flow..."
                  disabled={loading}
                  className="flex-1 px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="bg-primary-600 text-white px-6 py-3 rounded-xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                >
                  Send
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
