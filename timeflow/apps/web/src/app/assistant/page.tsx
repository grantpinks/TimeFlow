'use client';

import { useEffect, useRef, useState } from 'react';
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

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Redirect if not authenticated (with delay to allow auth to load)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isAuthenticated && typeof window !== 'undefined') {
        window.location.href = '/';
      }
    }, 1000); // Give 1 second for auth to load

    return () => clearTimeout(timer);
  }, [isAuthenticated]);

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Handle sending a message
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

      // If AI returned schedule suggestions, store them
      if (response.suggestions) {
        setSchedulePreview(response.suggestions);
      }
    } catch (error) {
      console.error('Failed to send message:', error);

      // Show error message
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

  // Handle quick action chips
  const handleQuickAction = (query: string) => {
    setInput(query);
  };

  // Handle applying the schedule
  const handleApplySchedule = async () => {
    if (!schedulePreview) return;

    setApplying(true);

    try {
      // Extract task IDs and date range from preview blocks
      const taskIds = schedulePreview.blocks.map((b) => b.taskId);
      const dates = schedulePreview.blocks.map((b) => new Date(b.start).getTime());
      const dateRangeStart = new Date(Math.min(...dates)).toISOString();
      const dateRangeEnd = new Date(Math.max(...dates) + 24 * 60 * 60 * 1000).toISOString(); // Add 1 day

      // Call existing schedule endpoint
      await api.runSchedule({
        taskIds,
        dateRangeStart,
        dateRangeEnd,
      });

      // Success: refresh tasks, clear preview, show success message
      await refreshTasks();
      setSchedulePreview(null);

      const successMessage: ChatMessage = {
        id: `msg_${Date.now()}_success`,
        role: 'assistant',
        content:
          'Schedule applied! Your tasks are now in Google Calendar. You can view them on the Tasks or Calendar page.',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, successMessage]);
    } catch (error) {
      console.error('Failed to apply schedule:', error);

      // Error: show error message
      const errorMessage: ChatMessage = {
        id: `msg_${Date.now()}_error`,
        role: 'assistant',
        content:
          'Failed to apply schedule. Please try again or contact support if the problem persists.',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setApplying(false);
    }
  };

  // Handle canceling the schedule preview
  const handleCancelPreview = () => {
    setSchedulePreview(null);
  };

  const quickActions = [
    'What does my schedule look like today?',
    'Schedule my high priority tasks',
    'When am I free this week?',
    'Help me plan tomorrow',
  ];

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">AI Scheduling Assistant</h1>
          <p className="text-slate-600">
            Ask me anything about your schedule, and I&apos;ll help you plan your day.
          </p>
        </div>

        {/* Quick Action Chips */}
        {messages.length === 0 && (
          <div className="mb-6">
            <p className="text-sm font-medium text-slate-700 mb-3">Try asking:</p>
            <div className="flex flex-wrap gap-2">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickAction(action)}
                  className="text-sm bg-slate-100 text-slate-700 px-4 py-2 rounded-full hover:bg-slate-200 transition-colors"
                >
                  {action}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat Messages Container */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm mb-4 h-[500px] flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-slate-500 py-12">
                <p>Hi! I&apos;m your AI scheduling assistant.</p>
                <p className="mt-2">Ask me about your schedule, and I&apos;ll help you plan your day.</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-3 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-primary-600 text-white'
                        : 'bg-slate-100 text-slate-800'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <p
                      className={`text-xs mt-2 ${
                        message.role === 'user' ? 'text-primary-200' : 'text-slate-500'
                      }`}
                    >
                      {new Date(message.timestamp).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))
            )}

            {/* Loading indicator */}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-100 text-slate-800 px-4 py-3 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <form onSubmit={handleSendMessage} className="border-t border-slate-200 p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me about your schedule..."
                disabled={loading}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? 'Sending...' : 'Send'}
              </button>
            </div>
          </form>
        </div>

        {/* Schedule Preview Card */}
        {schedulePreview && (
          <div className="mb-6">
            <SchedulePreviewCard
              preview={schedulePreview}
              tasks={tasks}
              onApply={handleApplySchedule}
              onCancel={handleCancelPreview}
              applying={applying}
            />
          </div>
        )}
      </div>
    </Layout>
  );
}
