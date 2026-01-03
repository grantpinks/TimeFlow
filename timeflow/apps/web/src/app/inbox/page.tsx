'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layout } from '@/components/Layout';
import { useUser } from '@/hooks/useUser';
import * as api from '@/lib/api';
import type { EmailCategoryConfig } from '@/lib/api';
import type { EmailMessage, FullEmailMessage, InboxView } from '@timeflow/shared';
import { DEFAULT_INBOX_VIEWS } from '@timeflow/shared';
import { ExternalLink, Paperclip, Mail, MailOpen, Archive, Search, ChevronDown, ChevronUp, Clock, Calendar, Sparkles, RefreshCw, Tag, HelpCircle } from 'lucide-react';
import Image from 'next/image';
import DOMPurify from 'dompurify';
import toast, { Toaster } from 'react-hot-toast';
import { filterInboxEmails } from '@/lib/inboxFilters';
import { CategoryPills } from '@/components/inbox/CategoryPills';
import { InboxViewEditor } from '@/components/inbox/InboxViewEditor';
import { DraftPanel } from '@/components/inbox/DraftPanel';
import { InboxAiDraftPanel, type InboxAiDraft } from '@/components/inbox/InboxAiDraftPanel';
import { loadInboxViews, saveInboxViews } from '@/lib/inboxViewsStorage';
import { track } from '@/lib/analytics';

export default function InboxPage() {
  const { isAuthenticated, user } = useUser();
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshingInbox, setRefreshingInbox] = useState(false);
  const [views, setViews] = useState<InboxView[]>(DEFAULT_INBOX_VIEWS);
  const [selectedViewId, setSelectedViewId] = useState<string>(
    DEFAULT_INBOX_VIEWS[0]?.id ?? 'all'
  );
  const [showViewEditor, setShowViewEditor] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [needsResponseOnly, setNeedsResponseOnly] = useState(false);
  const [categories, setCategories] = useState<EmailCategoryConfig[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
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
  const [showExplanation, setShowExplanation] = useState(false);

  // Draft panel state (Sprint 16 Phase B+)
  const [draftPanelOpen, setDraftPanelOpen] = useState(false);
  const [draftEmail, setDraftEmail] = useState<FullEmailMessage | null>(null);
  const [aiDraftPanelOpen, setAiDraftPanelOpen] = useState(false);
  const [aiDraft, setAiDraft] = useState<InboxAiDraft | null>(null);
  const [aiDraftEmail, setAiDraftEmail] = useState<EmailMessage | null>(null);
  const [aiDraftLoading, setAiDraftLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      fetchInbox();
      fetchCategories();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const cachedViews = loadInboxViews();
    setViews(cachedViews);
    setSelectedViewId((current) => ensureSelectedViewId(cachedViews, current));

    api
      .getInboxViews()
      .then(({ views: serverViews }) => {
        setViews(serverViews);
        saveInboxViews(serverViews);
        setSelectedViewId((current) => ensureSelectedViewId(serverViews, current));
      })
      .catch((error) => {
        console.error('Failed to load inbox views:', error);
      });
  }, [isAuthenticated]);

  // Cleanup function to clear timer on unmount
  useEffect(() => {
    return () => {
      if (searchDebounceTimer.current) {
        clearTimeout(searchDebounceTimer.current);
      }
    };
  }, []);

  // Auto-select first email when list changes
  useEffect(() => {
    const displayEmails = getDisplayEmails();
    if (displayEmails.length > 0 && !selectedThreadId) {
      const firstEmail = displayEmails[0];
      fetchThread(firstEmail.threadId || firstEmail.id);
    }
  }, [emails, searchMode, serverSearchResults, searchQuery]);

  async function fetchInbox() {
    try {
      setLoading(true);
      const result = await api.getInboxEmails({ maxResults: 100 });
      setEmails(result.messages);
    } catch (error) {
      console.error('Failed to fetch inbox:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleRefreshInbox() {
    setRefreshingInbox(true);
    try {
      await fetchInbox();
    } finally {
      setRefreshingInbox(false);
    }
  }

  function ensureSelectedViewId(nextViews: InboxView[], preferredId: string) {
    if (nextViews.some((view) => view.id === preferredId)) {
      return preferredId;
    }
    const allView = nextViews.find((view) => view.id === 'all');
    return allView?.id ?? nextViews[0]?.id ?? 'all';
  }

  async function handleViewsChange(nextViews: InboxView[]) {
    setViews(nextViews);
    saveInboxViews(nextViews);
    setSelectedViewId((current) => ensureSelectedViewId(nextViews, current));

    try {
      const result = await api.updateInboxViews(nextViews);
      setViews(result.views);
      saveInboxViews(result.views);
      setSelectedViewId((current) => ensureSelectedViewId(result.views, current));
    } catch (error) {
      console.error('Failed to update inbox views:', error);
      toast.error('Failed to save view changes.');
    }
  }

  async function handleDeleteView(viewId: string) {
    const nextViews = views.filter((view) => view.id !== viewId);
    setViews(nextViews);
    saveInboxViews(nextViews);
    setSelectedViewId((current) =>
      ensureSelectedViewId(nextViews, current === viewId ? 'all' : current)
    );

    try {
      await api.deleteInboxView(viewId);
    } catch (error) {
      console.error('Failed to delete inbox view:', error);
      toast.error('Failed to delete view.');
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
    setSelectedThreadId(threadId);
    setShowExplanation(false);

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
    } catch (error) {
      console.error('Failed to fetch thread:', error);
      setThreadError('Failed to load email');
    } finally {
      setLoadingThread(false);
    }
  }

  async function fetchExplanation(emailId: string) {
    if (explanations[emailId]) {
      setShowExplanation(!showExplanation);
      return;
    }

    try {
      const result = await api.getEmailExplanation(emailId);
      setExplanations(prev => ({ ...prev, [emailId]: result.explanation }));
      setShowExplanation(true);
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
    const emailToArchive = emails.find(e => e.id === emailId);
    if (!emailToArchive) {
      console.error('Email not found for archive:', emailId);
      return;
    }

    setEmails(prev => prev.filter(e => e.id !== emailId));

    try {
      await api.archiveEmail(emailId);

      // If we archived the selected email, select the next one
      if (selectedThreadId === emailToArchive.threadId || selectedThreadId === emailToArchive.id) {
        const displayEmails = getDisplayEmails().filter(e => e.id !== emailId);
        if (displayEmails.length > 0) {
          fetchThread(displayEmails[0].threadId || displayEmails[0].id);
        } else {
          setSelectedThreadId(null);
          setThreadMessages([]);
        }
      }
    } catch (error: any) {
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
    try {
      setAiDraftLoading(true);
      const response = await api.draftTaskFromEmailAi(email.id);
      setAiDraftEmail(email);
      setAiDraft({
        type: 'task',
        draft: response.draft,
        confirmCta: response.confirmCta,
        schedule: Boolean(options.schedule),
      });
      setAiDraftPanelOpen(true);
    } catch (error) {
      console.error('Failed to generate task draft:', error);
      toast.error('Failed to generate task draft. Please try again.');
    } finally {
      setAiDraftLoading(false);
    }
  }

  async function handleDraftLabelSync(email: EmailMessage) {
    try {
      setAiDraftLoading(true);
      const response = await api.draftLabelSyncAi(email.id);
      setAiDraftEmail(email);
      setAiDraft({
        type: 'label',
        draft: response.draft,
        confirmCta: response.confirmCta,
      });
      setAiDraftPanelOpen(true);
    } catch (error) {
      console.error('Failed to generate label draft:', error);
      toast.error('Failed to generate label draft. Please try again.');
    } finally {
      setAiDraftLoading(false);
    }
  }

  async function handleDraftExplanation(email: EmailMessage) {
    try {
      setAiDraftLoading(true);
      const response = await api.draftLabelExplanationAi(email.id);
      setAiDraftEmail(email);
      setAiDraft({
        type: 'explanation',
        draft: response.draft,
        confirmCta: response.confirmCta,
      });
      setAiDraftPanelOpen(true);
    } catch (error) {
      console.error('Failed to generate explanation draft:', error);
      toast.error('Failed to generate explanation draft. Please try again.');
    } finally {
      setAiDraftLoading(false);
    }
  }

  async function handleAiDraftConfirm() {
    if (!aiDraft || !aiDraftEmail) return;

    if (aiDraft.type === 'task') {
      const threadId = aiDraftEmail.threadId || aiDraftEmail.id;
      const gmailUrl = `https://mail.google.com/mail/u/0/#inbox/${threadId}`;
      const description = [
        aiDraft.draft.description,
        '',
        `From: ${aiDraftEmail.from}`,
        `Subject: ${aiDraftEmail.subject}`,
        `Source: ${gmailUrl}`,
      ].join('\n');

      const task = await api.createTask({
        title: aiDraft.draft.title,
        description,
        priority: aiDraft.draft.priority as 1 | 2 | 3,
        dueDate: aiDraft.draft.dueDate || undefined,
        sourceEmailId: aiDraftEmail.id,
        sourceThreadId: aiDraftEmail.threadId,
        sourceEmailProvider: 'gmail',
        sourceEmailUrl: gmailUrl,
      });

      track('email_converted_to_task', { email_id: aiDraftEmail.id });

      if (aiDraft.schedule) {
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
    }

    if (aiDraft.type === 'label') {
      const overrideValue = aiDraftEmail.threadId || aiDraftEmail.id;
      await api.createEmailOverride({
        overrideType: 'threadId',
        overrideValue,
        categoryName: aiDraft.draft.categoryId,
        reason: aiDraft.draft.reason,
      });
      toast.success('Label update saved');
      fetchInbox();
    }

    if (aiDraft.type === 'explanation') {
      setExplanations((prev) => ({
        ...prev,
        [aiDraftEmail.id]: {
          category: aiDraftEmail.category || 'other',
          source: 'default',
          reason: aiDraft.draft.explanation,
          details: {},
        },
      }));
      setShowExplanation(true);
    }

    setAiDraftPanelOpen(false);
    setAiDraft(null);
    setAiDraftEmail(null);
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

  function getDisplayEmails(): EmailMessage[] {
    const baseEmails = searchMode === 'server' ? serverSearchResults : emails;
    const filteredByView = filterInboxEmails(baseEmails, {
      selectedViewId,
      views,
      selectedCategoryId,
      needsResponseOnly,
    });

    if (searchMode === 'server') {
      return filteredByView;
    }

    if (searchQuery) {
      return filteredByView.filter((email) =>
        email.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        email.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (email.snippet && email.snippet.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    return filteredByView;
  }

  const displayEmails = getDisplayEmails();
  const selectedEmail = displayEmails.find(e =>
    e.threadId === selectedThreadId || e.id === selectedThreadId
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
      <div className="h-screen flex flex-col bg-[#FFFEF7] overflow-hidden">
        {/* Header */}
        <div className="flex-none border-b-2 border-[#0BAF9A] bg-gradient-to-r from-white to-[#0BAF9A]/5">
          <div className="px-6 py-6">
            <div className="flex items-end justify-between mb-4">
              <div className="flex items-center gap-4">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <Image
                    src="/branding/flow-default.png"
                    alt="Flow"
                    width={48}
                    height={48}
                    className="rounded-full"
                  />
                </motion.div>
                <div>
                  <h1 className="text-4xl font-bold text-[#1a1a1a] mb-1" style={{ fontFamily: "'Crimson Pro', serif" }}>
                    Inbox
                  </h1>
                  <p className="text-xs text-[#666] tracking-wider uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    {displayEmails.length} threads
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
                  className="w-80 px-4 py-2.5 pl-10 border-2 border-[#0BAF9A]/30 bg-white text-[#1a1a1a] placeholder-[#999] focus:outline-none focus:ring-2 focus:ring-[#0BAF9A] focus:border-[#0BAF9A] transition-all rounded-lg"
                  style={{ fontFamily: "'Manrope', sans-serif" }}
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0BAF9A]" size={16} />

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

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setShowViewEditor((prev) => !prev)}
                className={`px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] rounded-full border ${
                  showViewEditor
                    ? 'border-[#0BAF9A] text-[#0BAF9A] bg-[#0BAF9A]/10'
                    : 'border-[#0BAF9A]/40 text-[#0BAF9A] hover:bg-[#0BAF9A]/10'
                }`}
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                Customize
              </button>

              {views.map((view) => {
                const isActive = selectedViewId === view.id && !selectedCategoryId;
                return (
                  <button
                    key={view.id}
                    onClick={() => {
                      setSelectedViewId(view.id);
                      setSelectedCategoryId(null);
                    }}
                    className={`px-4 py-1.5 text-sm font-medium transition-all border-2 rounded-full ${
                      isActive
                        ? 'bg-[#0BAF9A] text-white border-[#0BAF9A]'
                        : 'bg-white text-[#1a1a1a] border-[#0BAF9A]/30 hover:bg-[#0BAF9A]/5'
                    }`}
                    style={{ fontFamily: "'Manrope', sans-serif" }}
                  >
                    {view.name}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setNeedsResponseOnly((prev) => !prev)}
                className={`px-4 py-1.5 text-sm font-medium transition-all border-2 rounded-full ${
                  needsResponseOnly
                    ? 'bg-[#F97316] text-white border-[#F97316]'
                    : 'bg-white text-[#1a1a1a] border-[#F97316]/30 hover:bg-[#F97316]/10'
                }`}
                style={{ fontFamily: "'Manrope', sans-serif" }}
              >
                Needs Reply
              </button>

              <div className="h-6 w-px bg-[#e0e0e0] mx-1" />

              <CategoryPills
                categories={categories}
                selectedCategoryId={selectedCategoryId}
                onSelectCategory={(categoryId) => {
                  setSelectedViewId('all');
                  setSelectedCategoryId(categoryId);
                }}
                forceExpanded={showViewEditor}
              />
            </div>

            {showViewEditor && (
              <InboxViewEditor
                views={views}
                categories={categories}
                selectedViewId={selectedViewId}
                onSelectView={setSelectedViewId}
                onChange={handleViewsChange}
                onDeleteView={handleDeleteView}
              />
            )}

            <div className="mt-4 flex w-full items-center justify-between gap-4">
              <div className="inline-flex items-center rounded-full border-2 border-[#0BAF9A]/30 bg-white/80 shadow-[0_10px_30px_rgba(11,175,154,0.08)]">
                <span
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#0BAF9A] bg-[#0BAF9A]/10 rounded-l-full"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  <Mail size={14} className="text-[#0BAF9A]" />
                  Gmail
                </span>
                <span
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm text-[#1a1a1a] border-l-2 border-[#0BAF9A]/20"
                  style={{ fontFamily: "'Manrope', sans-serif" }}
                >
                  {user?.email ?? 'Connected account'}
                </span>
                <button
                  type="button"
                  onClick={handleRefreshInbox}
                  disabled={refreshingInbox}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#0BAF9A] border-l-2 border-[#0BAF9A]/20 rounded-r-full transition-all hover:bg-[#0BAF9A]/10 disabled:opacity-60"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  aria-label="Refresh inbox"
                >
                  <RefreshCw size={14} className={refreshingInbox ? 'animate-spin' : ''} />
                  {refreshingInbox ? 'Refreshing' : 'Refresh'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Split Pane Container */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Pane - Email List */}
          <div className="w-[380px] flex-none border-r border-[#e0e0e0] bg-white overflow-y-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Image
                  src="/branding/flow-thinking.png"
                  alt="Loading"
                  width={96}
                  height={96}
                  className="mb-4"
                />
                <div className="text-[#0BAF9A] text-sm" style={{ fontFamily: "'Manrope', sans-serif" }}>
                  Loading inbox...
                </div>
              </div>
            ) : displayEmails.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                <Image
                  src="/branding/flow-celebrating.png"
                  alt="Empty"
                  width={120}
                  height={120}
                  className="mb-4"
                />
                <h3 className="text-2xl font-bold text-[#1a1a1a] mb-2" style={{ fontFamily: "'Crimson Pro', serif" }}>
                  {searchQuery ? 'No matches' : 'Inbox Zero!'}
                </h3>
                <p className="text-sm text-[#666]" style={{ fontFamily: "'Manrope', sans-serif" }}>
                  {searchQuery ? 'Try a different search' : "You're all caught up"}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#e0e0e0]">
                {displayEmails.map((email) => (
                  <EmailListItem
                    key={email.id}
                    email={email}
                    isSelected={selectedThreadId === email.threadId || selectedThreadId === email.id}
                    onClick={() => fetchThread(email.threadId || email.id)}
                    onToggleRead={handleToggleRead}
                    onArchive={handleArchive}
                    categoryColor={getCategoryColor(email.category || '')}
                    categoryLabel={getCategoryLabel(email.category)}
                    formatTimestamp={formatTimestamp}
                    needsResponse={email.needsResponse}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right Pane - Reading Pane */}
          <div className="flex-1 bg-[#FFFEF7] overflow-hidden flex flex-col">
            {!selectedThreadId || threadMessages.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Image
                    src="/branding/flow-default.png"
                    alt="Select email"
                    width={120}
                    height={120}
                    className="mx-auto mb-4 opacity-30"
                  />
                  <p className="text-[#999] text-lg" style={{ fontFamily: "'Crimson Pro', serif" }}>
                    Select an email to read
                  </p>
                </div>
              </div>
            ) : loadingThread ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0BAF9A]"></div>
              </div>
            ) : threadError ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-red-600 mb-2">{threadError}</p>
                  <button
                    onClick={() => selectedThreadId && fetchThread(selectedThreadId)}
                    className="text-sm text-[#0BAF9A] hover:underline"
                  >
                    Try again
                  </button>
                </div>
              </div>
            ) : (
              <ReadingPane
                email={selectedEmail!}
                threadMessages={threadMessages}
                categoryLabel={getCategoryLabel(selectedEmail?.category)}
                categoryColor={getCategoryColor(selectedEmail?.category || '')}
                categoryId={getCategoryId(selectedEmail?.category)}
                categories={categories}
                needsResponse={selectedEmail?.needsResponse}
                onCreateTask={handleCreateTaskFromEmail}
                onDraftLabelSync={handleDraftLabelSync}
                onDraftExplanation={handleDraftExplanation}
                aiDraftLoading={aiDraftLoading}
                onArchive={handleArchive}
                onToggleRead={handleToggleRead}
                isCorrecting={correctingEmailId === selectedEmail?.id}
                onStartCorrect={() => setCorrectingEmailId(selectedEmail?.id || null)}
                onCancelCorrect={() => setCorrectingEmailId(null)}
                onCorrect={async (categoryId: string, scope: 'sender' | 'domain' | 'thread', reason?: string) => {
                  if (!selectedEmail) return;
                  try {
                    const senderMatch = selectedEmail.from.match(/<(.+)>/);
                    const senderEmail = senderMatch ? senderMatch[1] : selectedEmail.from;
                    const domain = senderEmail.split('@')[1];
                    const overrideType =
                      scope === 'thread' ? 'threadId' : scope === 'domain' ? 'domain' : 'sender';
                    const overrideValue =
                      scope === 'thread'
                        ? selectedEmail.threadId || selectedEmail.id
                        : scope === 'domain'
                          ? (domain || senderEmail).toLowerCase()
                          : senderEmail.toLowerCase();

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
                explanation={selectedEmail ? explanations[selectedEmail.id] : undefined}
                showExplanation={showExplanation}
                onToggleExplanation={() => selectedEmail && fetchExplanation(selectedEmail.id)}
                onOpenDraft={(email) => {
                  setDraftEmail(email);
                  setDraftPanelOpen(true);
                }}
              />
            )}
          </div>
        </div>

      </div>

      {/* Web Fonts */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700&family=JetBrains+Mono:wght@400;500&family=Manrope:wght@400;500;600;700&display=swap');
      `}</style>

      {/* Draft Panel (Sprint 16 Phase B+) */}
      {draftEmail && (
        <DraftPanel
          isOpen={draftPanelOpen}
          onClose={() => setDraftPanelOpen(false)}
          email={draftEmail}
          onSuccess={() => {
            fetchInbox();
            if (selectedThreadId) {
              fetchThread(selectedThreadId);
            }
          }}
        />
      )}

      <InboxAiDraftPanel
        isOpen={aiDraftPanelOpen}
        draft={aiDraft}
        onClose={() => {
          setAiDraftPanelOpen(false);
          setAiDraft(null);
          setAiDraftEmail(null);
        }}
        onConfirm={handleAiDraftConfirm}
      />
    </Layout>
  );
}

/**
 * EmailBody Component - Safely renders HTML email content with XSS protection
 */
function EmailBody({ html, plainText }: { html?: string; plainText?: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const sanitizedHtml = useMemo(() => {
    if (!html) return null;
    // Gmail-like permissive sanitization - allow almost everything except scripts
    return DOMPurify.sanitize(html, {
      // Allow all safe tags (Gmail allows nearly everything)
      ALLOWED_TAGS: [
        // Text & Formatting
        'p', 'br', 'b', 'i', 'u', 'strong', 'em', 'a', 'span', 'div', 'font', 'center', 'small', 'big', 'sub', 'sup', 's', 'strike', 'del', 'ins', 'mark',
        // Headings
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        // Lists
        'ul', 'ol', 'li', 'dl', 'dt', 'dd',
        // Quotes & Code
        'blockquote', 'pre', 'code', 'kbd', 'samp', 'var', 'cite', 'abbr', 'address',
        // Tables
        'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'colgroup', 'col', 'caption',
        // Media & Separators
        'img', 'hr', 'picture', 'figure', 'figcaption',
        // Sections & Structure
        'article', 'section', 'nav', 'aside', 'header', 'footer', 'main', 'details', 'summary',
        // Forms (display only, no submission)
        'form', 'fieldset', 'legend', 'label', 'input', 'button', 'select', 'option', 'textarea',
        // Other
        'time', 'progress', 'meter', 'wbr'
      ],
      // Allow all styling and layout attributes
      ALLOWED_ATTR: [
        'href', 'target', 'rel', 'class', 'style', 'id', 'name',
        'src', 'alt', 'title', 'width', 'height', 'sizes', 'srcset',
        'align', 'valign', 'border', 'cellpadding', 'cellspacing', 'bgcolor', 'color', 'background',
        'colspan', 'rowspan', 'nowrap',
        'dir', 'lang', 'role', 'aria-label', 'aria-labelledby', 'aria-describedby',
        'type', 'value', 'placeholder', 'disabled', 'readonly', 'checked', 'selected',
        'start', 'reversed',
        'datetime', 'cite', 'abbr'
      ],
      ALLOW_DATA_ATTR: true, // Gmail allows data attributes
      ADD_TAGS: ['style'], // Allow inline style tags
      FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'applet', 'base', 'meta', 'link'], // Block dangerous tags
      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'], // Block event handlers
    });
  }, [html]);

  // Update iframe content when HTML changes
  useEffect(() => {
    if (!iframeRef.current || !sanitizedHtml) return;

    const iframeDoc = iframeRef.current.contentDocument;
    if (!iframeDoc) return;

    // Write sanitized HTML to iframe - preserve original email styling
    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            /* Minimal reset - preserve email's original styling */
            body {
              margin: 0;
              padding: 16px;
              background: transparent;
              overflow-wrap: break-word;
              word-wrap: break-word;
            }

            /* Ensure images don't overflow */
            img {
              max-width: 100%;
              height: auto;
            }

            /* Responsive tables */
            table {
              max-width: 100%;
            }

            /* Make links work */
            a {
              cursor: pointer;
            }
          </style>
        </head>
        <body>
          ${sanitizedHtml}
        </body>
      </html>
    `);
    iframeDoc.close();

    // Auto-resize iframe to content height
    const resizeIframe = () => {
      if (iframeRef.current && iframeDoc.body) {
        iframeRef.current.style.height = iframeDoc.body.scrollHeight + 'px';
      }
    };

    // Initial resize
    setTimeout(resizeIframe, 100);

    // Resize on image load
    const images = iframeDoc.querySelectorAll('img');
    images.forEach(img => {
      img.addEventListener('load', resizeIframe);
    });

    return () => {
      images.forEach(img => {
        img.removeEventListener('load', resizeIframe);
      });
    };
  }, [sanitizedHtml]);

  if (sanitizedHtml) {
    return (
      <iframe
        ref={iframeRef}
        sandbox="allow-same-origin"
        style={{
          width: '100%',
          border: 'none',
          minHeight: '200px',
          background: 'transparent',
        }}
        title="Email content"
      />
    );
  }

  if (plainText) {
    return (
      <div className="whitespace-pre-wrap" style={{
        fontFamily: "'Crimson Pro', Georgia, serif",
        fontSize: '17px',
        lineHeight: '1.7',
        color: '#1a1a1a',
      }}>
        {plainText}
      </div>
    );
  }

  return <div className="text-gray-400 italic">No content available</div>;
}

/**
 * Email List Item - Compact row for left pane
 */
interface EmailListItemProps {
  email: EmailMessage;
  isSelected: boolean;
  onClick: () => void;
  onToggleRead: (emailId: string, currentIsRead: boolean) => void;
  onArchive: (emailId: string) => void;
  categoryColor: string;
  categoryLabel: string;
  formatTimestamp: (date: string) => string;
  needsResponse?: boolean;
}

function EmailListItem({
  email,
  isSelected,
  onClick,
  onToggleRead,
  onArchive,
  categoryColor,
  categoryLabel,
  formatTimestamp,
  needsResponse,
}: EmailListItemProps) {
  return (
    <div
      onClick={onClick}
      className={`px-4 py-3 cursor-pointer transition-all border-l-4 group ${
        isSelected
          ? 'bg-[#0BAF9A]/10 border-l-[#0BAF9A]'
          : !email.isRead
          ? 'bg-[#0BAF9A]/5 border-l-[#0BAF9A] hover:bg-[#0BAF9A]/10'
          : 'border-l-transparent hover:bg-gray-50'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className={`text-sm flex-1 truncate ${
          !email.isRead ? 'font-bold' : 'font-semibold'
        }`} style={{ fontFamily: "'Manrope', sans-serif" }}>
          {email.from.split('<')[0].trim() || email.from}
        </span>
        <span className="text-xs text-[#999] flex-none" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          {formatTimestamp(email.receivedAt)}
        </span>
      </div>

      <div className={`text-sm mb-1 truncate ${
        !email.isRead ? 'font-semibold' : 'font-normal'
      } text-[#1a1a1a]`} style={{ fontFamily: "'Crimson Pro', serif" }}>
        {email.subject}
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-[#666] truncate flex-1" style={{ fontFamily: "'Manrope', sans-serif" }}>
          {email.snippet}
        </p>

        <div className="flex items-center gap-1 flex-none opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleRead(email.id, email.isRead ?? false);
            }}
            className="p-1 hover:bg-white rounded"
            title={email.isRead ? 'Mark unread' : 'Mark read'}
          >
            {email.isRead ? <MailOpen size={14} className="text-[#666]" /> : <Mail size={14} className="text-[#0BAF9A]" />}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onArchive(email.id);
            }}
            className="p-1 hover:bg-white rounded"
            title="Archive"
          >
            <Archive size={14} className="text-[#666]" />
          </button>
        </div>
      </div>

      {(categoryLabel || needsResponse) && (
        <div className="mt-2 flex items-center gap-2">
          {categoryLabel && (
            <span
              className="inline-block px-2 py-0.5 text-xs font-medium rounded-full"
              style={{
                backgroundColor: `${categoryColor}15`,
                color: categoryColor,
                fontFamily: "'Manrope', sans-serif"
              }}
            >
              {categoryLabel}
            </span>
          )}
          {needsResponse && (
            <span
              className="inline-block px-2 py-0.5 text-xs font-medium rounded-full"
              style={{
                backgroundColor: '#F9731620',
                color: '#F97316',
                fontFamily: "'Manrope', sans-serif"
              }}
            >
              Needs Reply
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Reading Pane - Full email display
 */
interface ReadingPaneProps {
  email: EmailMessage;
  threadMessages: FullEmailMessage[];
  categoryLabel: string;
  categoryColor: string;
  categoryId: string | null;
  categories: EmailCategoryConfig[];
  needsResponse?: boolean;
  onCreateTask: (email: EmailMessage, options?: { schedule?: boolean }) => void;
  onDraftLabelSync: (email: EmailMessage) => void;
  onDraftExplanation: (email: EmailMessage) => void;
  aiDraftLoading: boolean;
  onArchive: (emailId: string) => void;
  onToggleRead: (emailId: string, currentIsRead: boolean) => void;
  isCorrecting: boolean;
  onStartCorrect: () => void;
  onCancelCorrect: () => void;
  onCorrect: (categoryId: string, scope: 'sender' | 'domain' | 'thread', reason?: string) => Promise<void>;
  explanation?: api.EmailCategoryExplanation;
  showExplanation: boolean;
  onToggleExplanation: () => void;
  onOpenDraft: (email: FullEmailMessage) => void;
}

function ReadingPane({
  email,
  threadMessages,
  categoryLabel,
  categoryColor,
  categoryId,
  categories,
  needsResponse,
  onCreateTask,
  onDraftLabelSync,
  onDraftExplanation,
  aiDraftLoading,
  onArchive,
  onToggleRead,
  isCorrecting,
  onStartCorrect,
  onCancelCorrect,
  onCorrect,
  explanation,
  showExplanation,
  onToggleExplanation,
  onOpenDraft,
}: ReadingPaneProps) {
  const [selectedCategory, setSelectedCategory] = useState(categoryId || '');
  const [correctionScope, setCorrectionScope] = useState<'sender' | 'domain' | 'thread'>('sender');

  useEffect(() => {
    setSelectedCategory(categoryId || '');
  }, [categoryId]);

  const latestMessage = threadMessages[threadMessages.length - 1] || threadMessages[0];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Action Bar - Fixed */}
      <div className="flex-none bg-white border-b border-[#e0e0e0] px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-2xl font-bold text-[#1a1a1a] pr-4 flex-1" style={{ fontFamily: "'Crimson Pro', serif" }}>
            {email.subject}
          </h2>
          <a
            href={`https://mail.google.com/mail/u/0/#inbox/${email.threadId || email.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-none px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            <ExternalLink size={14} />
            Gmail
          </a>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onCreateTask(email)}
            disabled={aiDraftLoading}
            className="px-4 py-2 text-sm font-medium bg-white border-2 border-[#0BAF9A] text-[#0BAF9A] hover:bg-[#0BAF9A]/10 transition-colors rounded-lg flex items-center gap-2 disabled:opacity-60"
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            <Clock size={14} />
            Create Task
          </button>
          <button
            onClick={() => onCreateTask(email, { schedule: true })}
            disabled={aiDraftLoading}
            className="px-4 py-2 text-sm font-medium bg-[#0BAF9A] text-white hover:bg-[#078c77] transition-colors rounded-lg flex items-center gap-2 disabled:opacity-60"
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            <Calendar size={14} />
            Schedule
          </button>
          <button
            onClick={() => onDraftLabelSync(email)}
            disabled={aiDraftLoading}
            className="px-4 py-2 text-sm font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors rounded-lg flex items-center gap-2 disabled:opacity-60"
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            <Tag size={14} />
            Label Sync
          </button>
          <button
            onClick={() => onDraftExplanation(email)}
            disabled={aiDraftLoading}
            className="px-4 py-2 text-sm font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors rounded-lg flex items-center gap-2 disabled:opacity-60"
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            <HelpCircle size={14} />
            Why this label?
          </button>
          <button
            onClick={() => onArchive(email.id)}
            className="px-4 py-2 text-sm font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors rounded-lg flex items-center gap-2"
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            <Archive size={14} />
            Archive
          </button>
          <button
            onClick={() => onToggleRead(email.id, email.isRead ?? false)}
            className="px-4 py-2 text-sm font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors rounded-lg flex items-center gap-2"
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            {email.isRead ? <Mail size={14} /> : <MailOpen size={14} />}
            {email.isRead ? 'Mark Unread' : 'Mark Read'}
          </button>
          <button
            onClick={() => onOpenDraft(latestMessage)}
            className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 transition-all rounded-lg flex items-center gap-2 shadow-sm"
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            <Sparkles size={14} />
            Draft Reply with AI
          </button>

          <div className="flex-1" />

          {(categoryLabel || needsResponse) && (
            <div className="flex items-center gap-2">
              {categoryLabel && (
                <span
                  className="px-3 py-1.5 text-sm font-medium rounded-full border"
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
              {needsResponse && (
                <span
                  className="px-3 py-1.5 text-sm font-medium rounded-full border"
                  style={{
                    backgroundColor: '#F9731620',
                    color: '#F97316',
                    borderColor: '#F9731640',
                    fontFamily: "'Manrope', sans-serif"
                  }}
                >
                  Needs Reply
                </span>
              )}
              {categoryLabel && (
                <button
                  onClick={onStartCorrect}
                  className="text-xs text-[#0BAF9A] hover:underline"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  Correct
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Email Content - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-6">
          {/* Email Metadata */}
          <div className="mb-6 pb-6 border-b border-[#e0e0e0]">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="text-lg font-bold text-[#1a1a1a] mb-1" style={{ fontFamily: "'Manrope', sans-serif" }}>
                  {latestMessage.from}
                </div>
                <div className="text-sm text-[#666]" style={{ fontFamily: "'Manrope', sans-serif" }}>
                  To: {latestMessage.to}
                  {latestMessage.cc && ` • Cc: ${latestMessage.cc}`}
                </div>
              </div>
              <div className="text-sm text-[#999]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {new Date(latestMessage.receivedAt).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </div>
            </div>
          </div>

          {/* Why This Label */}
          <button
            onClick={onToggleExplanation}
            className="w-full mb-6 p-4 bg-gradient-to-r from-[#0BAF9A]/5 to-transparent border-l-4 border-[#0BAF9A] hover:from-[#0BAF9A]/10 transition-all text-left rounded-r-lg"
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold text-[#1a1a1a] tracking-wide uppercase mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  Why &quot;{categoryLabel}&quot;?
                </h4>
                {showExplanation && explanation && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <p className="text-sm text-[#666] mt-2" style={{ fontFamily: "'Manrope', sans-serif" }}>
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
                    {explanation.source === 'gmailLabel' && explanation.details.gmailLabel && (
                      <div className="text-xs text-[#0BAF9A] mt-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        Gmail label: {explanation.details.gmailLabel}
                      </div>
                    )}
                  </motion.div>
                )}
              </div>
              {showExplanation ? <ChevronUp size={16} className="text-[#0BAF9A]" /> : <ChevronDown size={16} className="text-[#0BAF9A]" />}
            </div>
          </button>

          {/* Correction Panel */}
          <AnimatePresence>
            {isCorrecting && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 p-4 bg-[#fffdf5] border-2 border-[#f59e0b] rounded-lg"
              >
                <h4 className="text-sm font-semibold text-[#1a1a1a] mb-3 tracking-wide uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  Correct Category
                </h4>
                <div className="flex gap-2 mb-4">
                  {([
                    { value: 'sender', label: 'This sender' },
                    { value: 'domain', label: 'This domain' },
                    { value: 'thread', label: 'This thread' },
                  ] as const).map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setCorrectionScope(option.value)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-full border-2 transition-all ${
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
                  {categories.filter(c => c.enabled).map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`px-4 py-2 text-sm font-medium rounded-lg border-2 transition-all ${
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
                    className="px-6 py-2 bg-[#0BAF9A] text-white text-sm font-medium hover:bg-[#078c77] disabled:opacity-50 disabled:cursor-not-allowed transition-all rounded-lg"
                    style={{ fontFamily: "'Manrope', sans-serif" }}
                  >
                    Save Correction
                  </button>
                  <button
                    onClick={onCancelCorrect}
                    className="px-6 py-2 border-2 border-[#0BAF9A]/30 text-[#1a1a1a] text-sm font-medium hover:bg-[#0BAF9A]/5 transition-all rounded-lg"
                    style={{ fontFamily: "'Manrope', sans-serif" }}
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Email Messages */}
          <div className="space-y-6">
            {threadMessages.map((message, index) => (
              <div key={message.id} className={index < threadMessages.length - 1 ? 'opacity-60' : ''}>
                <EmailBody html={message.body} plainText={message.snippet} />

                {message.attachments && message.attachments.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-[#e0e0e0]">
                    <div className="text-sm font-semibold text-[#1a1a1a] mb-3" style={{ fontFamily: "'Manrope', sans-serif" }}>
                      Attachments
                    </div>
                    <div className="space-y-2">
                      {message.attachments.map((att, i) => (
                        <div key={i} className="flex items-center gap-3 px-3 py-2 bg-white border border-[#e0e0e0] rounded-lg">
                          <Paperclip size={16} className="text-[#0BAF9A]" />
                          <span className="text-sm flex-1" style={{ fontFamily: "'Manrope', sans-serif" }}>
                            {att.filename}
                          </span>
                          <span className="text-xs text-[#999]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                            {Math.round(att.size / 1024)}KB
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
