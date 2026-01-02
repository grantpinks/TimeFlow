'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layout } from '@/components/Layout';
import { useUser } from '@/hooks/useUser';
import * as api from '@/lib/api';
import type { EmailCategoryConfig } from '@/lib/api';
import type { EmailMessage, FullEmailMessage } from '@timeflow/shared';
import { ExternalLink, Paperclip, Mail, MailOpen, Archive, Search } from 'lucide-react';
import Image from 'next/image';
import DOMPurify from 'dompurify';
import toast, { Toaster } from 'react-hot-toast';
import { filterInboxEmails } from '@/lib/inboxFilters';
import { CategoryPills } from '@/components/inbox/CategoryPills';

export default function InboxPage() {
  const { isAuthenticated } = useUser();
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'professional' | 'personal'>('all');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [categories, setCategories] = useState<EmailCategoryConfig[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedThreadId, setExpandedThreadId] = useState<string | null>(null);
  const [correctingEmailId, setCorrectingEmailId] = useState<string | null>(null);
  const [searchMode, setSearchMode] = useState<'client' | 'server'>('client');
  const [serverSearchResults, setServerSearchResults] = useState<EmailMessage[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchDebounceTimer = useRef<NodeJS.Timeout | null>(null);
  const searchRequestId = useRef(0);

  // Thread detail state
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [threadMessages, setThreadMessages] = useState<FullEmailMessage[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [threadError, setThreadError] = useState<string | null>(null);

  // Explanation state
  const [explanations, setExplanations] = useState<Record<string, api.EmailCategoryExplanation>>({});

  useEffect(() => {
    if (isAuthenticated) {
      fetchInbox();
      fetchCategories();
    }
  }, [isAuthenticated, selectedFilter, selectedCategoryId]);

  // Cleanup function to clear timer on unmount
  useEffect(() => {
    return () => {
      if (searchDebounceTimer.current) {
        clearTimeout(searchDebounceTimer.current);
      }
    };
  }, []);

  async function fetchInbox() {
    try {
      setLoading(true);
      const result = await api.getInboxEmails({ maxResults: 100 });

      const filteredEmails = filterInboxEmails(result.messages, {
        selectedFilter,
        selectedCategoryId,
      });
      setEmails(filteredEmails);
    } catch (error) {
      console.error('Failed to fetch inbox:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchCategories() {
    try {
      const result = await api.getEmailCategories();
      // Handle both array and object responses
      const cats = Array.isArray(result) ? result : (result?.categories || []);
      setCategories(cats);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      setCategories([]); // Ensure it's always an array
    }
  }

  async function performServerSearch(query: string) {
    if (!query || query.length < 2) {
      setSearchMode('client');
      setServerSearchResults([]);
      return;
    }

    // Increment request ID for this search
    const requestId = ++searchRequestId.current;

    setSearchLoading(true);
    setSearchMode('server');

    try {
      const result = await api.searchEmails(query);

      // Only update state if this is still the latest request
      if (requestId === searchRequestId.current) {
        setServerSearchResults(result.messages);
      }
    } catch (error: any) {
      console.error('Server search failed, falling back to client search:', error);

      // Only update state if this is still the latest request
      if (requestId === searchRequestId.current) {
        setSearchMode('client');
        setServerSearchResults([]);

        if (error.message.includes('rate limit') || error.message.includes('429')) {
          toast.error('Rate limit exceeded. Falling back to client-side search.');
        }
      }
    } finally {
      // Only clear loading if this is still the latest request
      if (requestId === searchRequestId.current) {
        setSearchLoading(false);
      }
    }
  }

  function handleSearchChange(newQuery: string) {
    setSearchQuery(newQuery);

    // Clear existing timer
    if (searchDebounceTimer.current) {
      clearTimeout(searchDebounceTimer.current);
    }

    // If query is empty, reset to client mode
    if (!newQuery) {
      setSearchMode('client');
      setServerSearchResults([]);
      setSearchLoading(false);
      return;
    }

    // Debounce server search (500ms)
    searchDebounceTimer.current = setTimeout(() => {
      performServerSearch(newQuery);
    }, 500);
  }

  async function fetchThread(threadId: string) {
    setLoadingThread(true);
    setThreadError(null);
    try {
      // TODO: This creates N+1 queries. Backend should provide /threads/:id endpoint
      // that returns all messages in one call for better performance.

      // Get all messages in the thread
      const messagesInThread = emails.filter(e => e.threadId === threadId || e.id === threadId);

      // Fetch full content for each message
      const fullMessages = await Promise.all(
        messagesInThread.map(msg => api.getFullEmail(msg.id))
      );

      setThreadMessages(fullMessages);
      setSelectedThreadId(threadId);
    } catch (error) {
      console.error('Failed to fetch thread:', error);
      setThreadError('Failed to load thread');
    } finally {
      setLoadingThread(false);
    }
  }

  async function fetchExplanation(emailId: string) {
    if (explanations[emailId]) return; // Already fetched

    try {
      const result = await api.getEmailExplanation(emailId);
      setExplanations(prev => ({ ...prev, [emailId]: result.explanation }));
    } catch (error) {
      console.error('Failed to fetch explanation:', error);
      toast.error('Failed to load explanation. Please try again.');
    }
  }

  async function handleToggleRead(emailId: string, currentIsRead: boolean) {
    const newIsRead = !currentIsRead;

    // Optimistic update
    setEmails(prev => prev.map(e =>
      e.id === emailId ? { ...e, isRead: newIsRead } : e
    ));

    try {
      await api.markEmailAsRead(emailId, newIsRead);
    } catch (error: any) {
      // Revert on error
      setEmails(prev => prev.map(e =>
        e.id === emailId ? { ...e, isRead: currentIsRead } : e
      ));

      if (error.response?.status === 429) {
        toast.error(`${error.response.data.error}. Please try again in ${error.response.data.retryAfterSeconds} seconds.`);
      } else {
        toast.error('Failed to update read status. Please try again.');
      }
    }
  }

  async function handleArchive(emailId: string) {
    // Find the email first
    const emailToArchive = emails.find(e => e.id === emailId);

    // Guard clause - if email not found, exit early
    if (!emailToArchive) {
      console.error('Email not found for archive:', emailId);
      return;
    }

    // Optimistic removal
    setEmails(prev => prev.filter(e => e.id !== emailId));

    try {
      await api.archiveEmail(emailId);

      // If thread detail is open for this email, close it
      if (selectedThreadId === emailToArchive.threadId) {
        setSelectedThreadId(null);
        setThreadMessages([]);
      }
    } catch (error: any) {
      // Revert on error
      setEmails(prev => [...prev, emailToArchive].sort((a, b) =>
        new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
      ));

      if (error.response?.status === 429) {
        toast.error(`${error.response.data.error}. Please try again in ${error.response.data.retryAfterSeconds} seconds.`);
      } else {
        toast.error('Failed to archive email. Please try again.');
      }
    }
  }

  async function handleCreateTaskFromEmail(
    email: EmailMessage,
    options: { schedule?: boolean } = {}
  ) {
    const threadId = email.threadId || email.id;
    const gmailUrl = `https://mail.google.com/mail/u/0/#inbox/${threadId}`;
    const description = [
      `From: ${email.from}`,
      `Subject: ${email.subject}`,
      `Source: ${gmailUrl}`,
      '',
      email.snippet || '',
    ].join('\n');

    try {
      const task = await api.createTask({
        title: email.subject || 'Email follow-up',
        description,
        sourceEmailId: email.id,
        sourceThreadId: email.threadId,
        sourceEmailProvider: 'gmail',
        sourceEmailUrl: gmailUrl,
      });

      track('email_converted_to_task', { email_id: email.id });

      if (options.schedule) {
        const now = new Date();
        const end = new Date();
        end.setDate(end.getDate() + 14);

        const result = await api.runSchedule({
          taskIds: [task.id],
          dateRangeStart: now.toISOString(),
          dateRangeEnd: end.toISOString(),
        });

        toast.success(
          result.scheduled > 0
            ? 'Task created and scheduled!'
            : 'Task created (no available slots found)'
        );
      } else {
        toast.success('Task created from email');
      }
    } catch (error) {
      console.error('Failed to create task from email:', error);
      toast.error('Failed to create task. Please try again.');
    }
  }

  function getCategoryConfig(categoryValue?: string | null) {
    if (!categoryValue || !Array.isArray(categories)) return null;
    return categories.find(
      (category) =>
        category.id.toLowerCase() === categoryValue.toLowerCase() ||
        category.name.toLowerCase() === categoryValue.toLowerCase()
    );
  }

  function getCategoryColor(categoryValue: string): string {
    if (!Array.isArray(categories) || categories.length === 0) {
      return '#6B7280'; // Default gray
    }
    const category = getCategoryConfig(categoryValue);
    return category?.color || '#6B7280';
  }

  function getCategoryLabel(categoryValue?: string | null): string {
    const category = getCategoryConfig(categoryValue);
    return category?.name || categoryValue || 'Uncategorized';
  }

  function getCategoryId(categoryValue?: string | null): string | null {
    const category = getCategoryConfig(categoryValue);
    return category?.id || null;
  }

  function formatTimestamp(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffHours < 48) return 'Yesterday';

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  const displayEmails = searchMode === 'server'
    ? serverSearchResults
    : (searchQuery
        ? emails.filter(e =>
            e.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
            e.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (e.snippet && e.snippet.toLowerCase().includes(searchQuery.toLowerCase()))
          )
        : emails
      );

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="min-h-screen bg-[#FFFEF7] flex items-center justify-center">
          <p className="text-[#1a1a1a] text-lg font-serif">Please sign in to view your inbox.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Toaster position="top-right" />
      <div className="min-h-screen bg-[#FFFEF7]">
        {/* Editorial Header with Flow Mascot */}
        <div className="border-b-2 border-[#0BAF9A] bg-gradient-to-r from-white to-[#0BAF9A]/5">
          <div className="max-w-7xl mx-auto px-8 py-8">
            <div className="flex items-end justify-between">
              <div className="flex items-center gap-4">
                {/* Flow Mascot Icon */}
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                >
                  <Image
                    src="/branding/flow-default.png"
                    alt="Flow assistant"
                    width={56}
                    height={56}
                    className="rounded-full"
                  />
                </motion.div>
                <div>
                  <h1 className="text-5xl font-serif font-bold text-[#1a1a1a] mb-2" style={{ fontFamily: "'Crimson Pro', serif" }}>
                    Inbox
                  </h1>
                  <p className="text-sm text-[#666] tracking-wider uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    {displayEmails.length} threads · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              </div>

              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search inbox..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-80 px-4 py-3 pl-10 border-2 border-[#0BAF9A]/30 bg-white text-[#1a1a1a] placeholder-[#999] focus:outline-none focus:ring-2 focus:ring-[#0BAF9A] focus:border-[#0BAF9A] transition-all"
                  style={{ fontFamily: "'Manrope', sans-serif" }}
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0BAF9A]" size={18} />

                {searchLoading && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#0BAF9A]"></div>
                  </div>
                )}

                {searchMode === 'server' && !searchLoading && searchQuery && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#666]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    Gmail search
                  </div>
                )}

                {searchQuery && !searchLoading && searchMode === 'client' && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSearchMode('client');
                      setServerSearchResults([]);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666] hover:text-[#1a1a1a]"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Quick Filters */}
            <div className="flex items-start gap-4 mt-6 border-t border-[#e0e0e0] pt-4">
              <button
                onClick={() => { setSelectedFilter('all'); setSelectedCategoryId(null); }}
                className={`px-5 py-2 text-sm font-medium transition-all border-2 ${
                  selectedFilter === 'all' && !selectedCategoryId
                    ? 'bg-[#0BAF9A] text-white border-[#0BAF9A] shadow-lg shadow-[#0BAF9A]/20'
                    : 'bg-white text-[#1a1a1a] border-[#0BAF9A]/30 hover:bg-[#0BAF9A]/5 hover:border-[#0BAF9A]'
                }`}
                style={{ fontFamily: "'Manrope', sans-serif" }}
              >
                All
              </button>
              <button
                onClick={() => { setSelectedFilter('professional'); setSelectedCategoryId(null); }}
                className={`px-5 py-2 text-sm font-medium transition-all border-2 ${
                  selectedFilter === 'professional'
                    ? 'bg-[#0BAF9A] text-white border-[#0BAF9A] shadow-lg shadow-[#0BAF9A]/20'
                    : 'bg-white text-[#1a1a1a] border-[#0BAF9A]/30 hover:bg-[#0BAF9A]/5 hover:border-[#0BAF9A]'
                }`}
                style={{ fontFamily: "'Manrope', sans-serif" }}
              >
                Professional
              </button>
              <button
                onClick={() => { setSelectedFilter('personal'); setSelectedCategoryId(null); }}
                className={`px-5 py-2 text-sm font-medium transition-all border-2 ${
                  selectedFilter === 'personal'
                    ? 'bg-[#0BAF9A] text-white border-[#0BAF9A] shadow-lg shadow-[#0BAF9A]/20'
                    : 'bg-white text-[#1a1a1a] border-[#0BAF9A]/30 hover:bg-[#0BAF9A]/5 hover:border-[#0BAF9A]'
                }`}
                style={{ fontFamily: "'Manrope', sans-serif" }}
              >
                Personal
              </button>

              <div className="h-6 w-px bg-[#e0e0e0] mx-1 mt-2" />

              <CategoryPills
                categories={categories}
                selectedCategoryId={selectedCategoryId}
                onSelectCategory={(categoryId) => {
                  setSelectedFilter('all');
                  setSelectedCategoryId(categoryId);
                }}
              />
            </div>
          </div>
        </div>

        {/* Email List */}
        <div className="max-w-7xl mx-auto px-8 py-8">
          {loading ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <Image
                src="/branding/flow-thinking.png"
                alt="Flow thinking"
                width={128}
                height={128}
                className="mb-6"
              />
              <div className="text-[#0BAF9A] font-medium" style={{ fontFamily: "'Manrope', sans-serif" }}>
                Flow is checking your inbox...
              </div>
              <div className="mt-2 animate-pulse text-sm text-[#666]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                Analyzing emails
              </div>
            </motion.div>
          ) : displayEmails.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="text-center py-20"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.3 }}
              >
                <Image
                  src="/branding/flow-celebrating.png"
                  alt="Flow celebrating"
                  width={160}
                  height={160}
                  className="mx-auto mb-6"
                />
              </motion.div>
              <h3 className="text-3xl font-serif font-bold text-[#1a1a1a] mb-3" style={{ fontFamily: "'Crimson Pro', serif" }}>
                {searchQuery ? 'No matching emails' : 'Inbox Zero!'}
              </h3>
              <p className="text-lg text-[#0BAF9A] mb-2" style={{ fontFamily: "'Manrope', sans-serif" }}>
                {searchQuery ? 'Try a different search term' : "You're all caught up"}
              </p>
              <p className="text-sm text-[#666]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {searchQuery ? '' : 'Take a break — you deserve it'}
              </p>
            </motion.div>
          ) : (
            <div className="space-y-px">
              <AnimatePresence mode="popLayout">
                {displayEmails.map((email, index) => (
                  <EmailThread
                    key={email.id}
                    email={email}
                    index={index}
                    categoryColor={getCategoryColor(email.category || '')}
                    categoryLabel={getCategoryLabel(email.category)}
                    categoryId={getCategoryId(email.category)}
                    formatTimestamp={formatTimestamp}
                    isExpanded={expandedThreadId === email.id}
                    onToggleExpand={() => setExpandedThreadId(expandedThreadId === email.id ? null : email.id)}
                    isCorrecting={correctingEmailId === email.id}
                    onStartCorrect={() => setCorrectingEmailId(email.id)}
                    onCancelCorrect={() => setCorrectingEmailId(null)}
                    categories={categories}
                    onCorrect={async (categoryId: string, scope: 'sender' | 'domain' | 'thread', reason?: string) => {
                      try {
                        // Extract sender email from the email
                        const senderMatch = email.from.match(/<(.+)>/);
                        const senderEmail = senderMatch ? senderMatch[1] : email.from;
                        const domain = senderEmail.split('@')[1];
                        const overrideType =
                          scope === 'thread' ? 'threadId' : scope === 'domain' ? 'domain' : 'sender';
                        const overrideValue =
                          scope === 'thread'
                            ? email.threadId || email.id
                            : scope === 'domain'
                              ? (domain || senderEmail).toLowerCase()
                              : senderEmail.toLowerCase();

                        // Create override for this sender
                        await api.createEmailOverride({
                          overrideType,
                          overrideValue,
                          categoryName: categoryId,
                          reason,
                        });

                        setCorrectingEmailId(null);
                        fetchInbox();
                      } catch (error) {
                        console.error('Failed to save category override:', error);
                        toast.error('Failed to save category correction. Please try again.');
                      }
                    }}
                    onOpenThread={fetchThread}
                    onToggleRead={handleToggleRead}
                    onArchive={handleArchive}
                    onCreateTask={handleCreateTaskFromEmail}
                    explanation={explanations[email.id]}
                    onFetchExplanation={fetchExplanation}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Thread Detail Panel */}
        <AnimatePresence>
          {selectedThreadId && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="fixed right-0 top-0 h-screen w-1/2 bg-white border-l border-gray-200 shadow-2xl overflow-y-auto z-50"
              role="dialog"
              aria-label="Email thread details"
            >
              {/* Header with Open in Gmail button */}
              <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
                <h2 className="font-serif text-xl font-bold">Thread Details</h2>
                <div className="flex gap-2">
                  <a
                    href={`https://mail.google.com/mail/u/0/#inbox/${selectedThreadId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <ExternalLink size={16} />
                    Open in Gmail
                  </a>
                  <button
                    onClick={() => {
                      setSelectedThreadId(null);
                      setThreadMessages([]);
                      setThreadError(null);
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    aria-label="Close thread details"
                  >
                    Close
                  </button>
                </div>
              </div>

              {/* Thread messages */}
              <div className="p-6 space-y-6">
                {threadError ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="text-red-600 font-semibold mb-2">{threadError}</div>
                      <button
                        onClick={() => selectedThreadId && fetchThread(selectedThreadId)}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        Try again
                      </button>
                    </div>
                  </div>
                ) : loadingThread ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  threadMessages.map((message) => (
                    <div key={message.id} className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="font-semibold text-gray-900">{message.from}</div>
                          <div className="text-sm text-gray-500">
                            To: {message.to} {message.cc && `• Cc: ${message.cc}`}
                          </div>
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(message.receivedAt).toLocaleString()}
                        </div>
                      </div>

                      <EmailBody html={message.body} plainText={message.snippet} />

                      {message.attachments && message.attachments.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-300">
                          <div className="text-sm font-semibold text-gray-700 mb-2">Attachments:</div>
                          <div className="space-y-2">
                            {message.attachments.map((att, i) => (
                              <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                                <Paperclip size={14} />
                                {att.filename} ({Math.round(att.size / 1024)}KB)
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Web Fonts */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700&family=JetBrains+Mono:wght@400;500&family=Manrope:wght@400;500;600;700&display=swap');
      `}</style>
    </Layout>
  );
}

/**
 * EmailBody Component - Safely renders HTML email content with XSS protection
 */
function EmailBody({ html, plainText }: { html?: string; plainText?: string }) {
  const sanitizedHtml = useMemo(() => {
    if (!html) return null;
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['p', 'br', 'b', 'i', 'u', 'strong', 'em', 'a', 'ul', 'ol', 'li', 'blockquote', 'div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
      ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
    });
  }, [html]);

  if (sanitizedHtml) {
    return (
      <div
        className="prose max-w-none text-gray-800"
        dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
      />
    );
  }

  if (plainText) {
    return (
      <div className="prose max-w-none whitespace-pre-wrap text-gray-800">
        {plainText}
      </div>
    );
  }

  return <div className="text-gray-400 italic">No content available</div>;
}

interface EmailThreadProps {
  email: EmailMessage;
  index: number;
  categoryColor: string;
  categoryLabel: string;
  categoryId: string | null;
  formatTimestamp: (date: string) => string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  isCorrecting: boolean;
  onStartCorrect: () => void;
  onCancelCorrect: () => void;
  categories: EmailCategoryConfig[];
  onCorrect: (categoryId: string, scope: 'sender' | 'domain' | 'thread', reason?: string) => Promise<void>;
  onOpenThread: (threadId: string) => void;
  onToggleRead?: (emailId: string, currentIsRead: boolean) => void;
  onArchive?: (emailId: string) => void;
  onCreateTask?: (email: EmailMessage, options?: { schedule?: boolean }) => void;
  explanation?: api.EmailCategoryExplanation;
  onFetchExplanation?: (emailId: string) => void;
}

function EmailThread({
  email,
  index,
  categoryColor,
  categoryLabel,
  categoryId,
  formatTimestamp,
  isExpanded,
  onToggleExpand,
  isCorrecting,
  onStartCorrect,
  onCancelCorrect,
  categories,
  onCorrect,
  onOpenThread,
  onToggleRead,
  onArchive,
  onCreateTask,
  explanation,
  onFetchExplanation
}: EmailThreadProps) {
  const [selectedCategory, setSelectedCategory] = useState(categoryId || '');
  const [correctionScope, setCorrectionScope] = useState<'sender' | 'domain' | 'thread'>('sender');

  useEffect(() => {
    setSelectedCategory(categoryId || '');
  }, [categoryId]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.3) }}
      className={`bg-white border-l-4 hover:shadow-lg transition-all duration-200 group ${
        !email.isRead ? 'bg-[#0BAF9A]/5' : ''
      }`}
      style={{ borderLeftColor: !email.isRead ? '#0BAF9A' : categoryColor }}
    >
      {/* Main Thread Row */}
      <div
        onClick={onToggleExpand}
        className="px-6 py-5 cursor-pointer border-b border-[#e0e0e0] hover:bg-[#fafafa]"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Sender & Timestamp */}
            <div className="flex items-baseline gap-3 mb-1.5">
              <span className="text-sm font-semibold text-[#1a1a1a]" style={{ fontFamily: "'Manrope', sans-serif" }}>
                {email.from.split('<')[0].trim() || email.from}
              </span>
              <span className="text-xs text-[#999] tracking-wide" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {formatTimestamp(email.receivedAt)}
              </span>
            </div>

            {/* Subject */}
            <h3 className={`text-lg text-[#1a1a1a] mb-2 line-clamp-1 ${
              !email.isRead ? 'font-bold' : 'font-semibold'
            }`} style={{ fontFamily: "'Crimson Pro', serif" }}>
              {email.subject}
            </h3>

            {/* Snippet */}
            <p className="text-sm text-[#666] line-clamp-2" style={{ fontFamily: "'Manrope', sans-serif" }}>
              {email.snippet}
            </p>
          </div>

          {/* Category Badge & Actions */}
          <div className="flex flex-col items-end gap-2">
            {categoryLabel && (
              <span
                className="px-3 py-1 text-xs font-medium rounded-full border"
                style={{
                  backgroundColor: `${categoryColor}15`,
                  color: categoryColor,
                  borderColor: `${categoryColor}40`,
                  fontFamily: "'Manrope', sans-serif"
                }}
              >
                {categoryLabel}
              </span>
            )}

            <div className="flex gap-2">
              {/* Read/Unread Action Button */}
              {onToggleRead && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleRead(email.id, email.isRead ?? false);
                  }}
                  className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 opacity-0 group-hover:opacity-100 transition-all"
                  title={email.isRead ? 'Mark as unread' : 'Mark as read'}
                >
                  {email.isRead ? <MailOpen size={16} /> : <Mail size={16} />}
                </button>
              )}

              {/* Archive Action Button */}
              {onArchive && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onArchive(email.id);
                  }}
                  className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 opacity-0 group-hover:opacity-100 transition-all"
                  title="Archive"
                >
                  <Archive size={16} />
                </button>
              )}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenThread(email.threadId || email.id);
                }}
                className="text-xs text-[#0BAF9A] hover:text-[#078c77] opacity-0 group-hover:opacity-100 transition-opacity font-medium"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                View Thread →
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onStartCorrect();
                }}
                className="text-xs text-[#999] hover:text-[#0BAF9A] opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                Correct →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden bg-[#fafafa]"
          >
            <div className="px-6 py-5 border-b border-[#e0e0e0]">
              <div className="flex flex-wrap gap-3 mb-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateTask?.(email);
                  }}
                  className="px-4 py-2 text-sm font-medium bg-white border border-[#0BAF9A] text-[#0BAF9A] hover:bg-[#0BAF9A]/10 transition-colors"
                  style={{ fontFamily: "'Manrope', sans-serif" }}
                >
                  Create Task
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateTask?.(email, { schedule: true });
                  }}
                  className="px-4 py-2 text-sm font-medium bg-[#0BAF9A] text-white hover:bg-[#078c77] transition-colors"
                  style={{ fontFamily: "'Manrope', sans-serif" }}
                >
                  Create &amp; Schedule
                </button>
              </div>

              {/* Why This Label? */}
              <div className="bg-gradient-to-r from-[#0BAF9A]/5 to-white border-l-4 border-[#0BAF9A] p-4 mb-4">
                <div className="flex items-start gap-3">
                  <span className="text-sm font-mono text-[#0BAF9A]">ℹ</span>
                  <div className="flex-1">
                    <h4 className="text-xs font-semibold text-[#1a1a1a] mb-1 tracking-wide uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      Why &ldquo;{categoryLabel}&rdquo;?
                    </h4>

                    {!explanation ? (
                      <button
                        onClick={() => onFetchExplanation && onFetchExplanation(email.id)}
                        className="text-sm text-[#0BAF9A] hover:underline font-medium"
                        style={{ fontFamily: "'Manrope', sans-serif" }}
                      >
                        Show explanation →
                      </button>
                    ) : (
                      <div>
                        <p className="text-sm text-[#666] mb-2" style={{ fontFamily: "'Manrope', sans-serif" }}>
                          {explanation.reason}
                        </p>

                        {explanation.source === 'override' && explanation.details.overrideType && (
                          <div className="text-xs text-[#0BAF9A] mt-2 font-medium" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                            ✓ Rule: {explanation.details.overrideType} ({explanation.details.matchedValue})
                          </div>
                        )}

                        {explanation.source === 'keywords' && explanation.details.matchedKeywords && (
                          <div className="text-xs text-[#0BAF9A] mt-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                            Keywords: {explanation.details.matchedKeywords.join(', ')}
                          </div>
                        )}

                        {explanation.source === 'domain' && explanation.details.matchedValue && (
                          <div className="text-xs text-[#0BAF9A] mt-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                            Domain: {explanation.details.matchedValue}
                          </div>
                        )}

                        {explanation.source === 'gmailLabel' && explanation.details.gmailLabel && (
                          <div className="text-xs text-[#0BAF9A] mt-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                            Gmail label: {explanation.details.gmailLabel}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Full Email Content Preview */}
              <div className="text-sm text-[#333] leading-relaxed" style={{ fontFamily: "'Manrope', sans-serif" }}>
                {email.snippet}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category Correction Panel */}
      <AnimatePresence>
        {isCorrecting && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden bg-[#fffdf5] border-t-2 border-[#f59e0b]"
          >
            <div className="px-6 py-5">
              <h4 className="text-sm font-semibold text-[#1a1a1a] mb-3 tracking-wide uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                Correct Category
              </h4>
              <div className="flex flex-wrap gap-2 mb-4">
                {([
                  { value: 'sender', label: 'This sender' },
                  { value: 'domain', label: 'This domain' },
                  { value: 'thread', label: 'This thread' },
                ] as const).map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setCorrectionScope(option.value)}
                    className={`px-3 py-1.5 text-xs font-medium rounded border transition-all ${
                      correctionScope === option.value
                        ? 'border-[#0BAF9A] bg-[#0BAF9A]/10 text-[#0BAF9A]'
                        : 'border-[#e0e0e0] text-[#666] hover:border-[#999]'
                    }`}
                    style={{ fontFamily: "'Manrope', sans-serif" }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                {Array.isArray(categories) && categories.filter(c => c.enabled).map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`px-4 py-2 text-sm font-medium rounded border-2 transition-all ${
                      selectedCategory === category.id
                        ? 'border-[#1a1a1a]'
                        : 'border-[#e0e0e0] hover:border-[#999]'
                    }`}
                    style={{
                      backgroundColor: selectedCategory === category.id ? category.color : 'white',
                      color: selectedCategory === category.id ? '#1a1a1a' : category.color,
                      fontFamily: "'Manrope', sans-serif"
                    }}
                  >
                    {category.emoji && <span className="mr-2">{category.emoji}</span>}
                    {category.name}
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => onCorrect(selectedCategory, correctionScope)}
                  disabled={!selectedCategory || selectedCategory === categoryId}
                  className="px-6 py-2 bg-[#0BAF9A] text-white text-sm font-medium hover:bg-[#078c77] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-[#0BAF9A]/20"
                  style={{ fontFamily: "'Manrope', sans-serif" }}
                >
                  Save Correction
                </button>
                <button
                  onClick={onCancelCorrect}
                  className="px-6 py-2 border-2 border-[#0BAF9A]/30 text-[#1a1a1a] text-sm font-medium hover:bg-[#0BAF9A]/5 hover:border-[#0BAF9A] transition-all"
                  style={{ fontFamily: "'Manrope', sans-serif" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
