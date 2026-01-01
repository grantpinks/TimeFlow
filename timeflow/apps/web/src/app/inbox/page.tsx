'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layout } from '@/components/Layout';
import { useUser } from '@/hooks/useUser';
import * as api from '@/lib/api';
import type { EmailCategoryConfig } from '@/lib/api';
import type { EmailMessage, FullEmailMessage } from '@timeflow/shared';
import { ExternalLink, Paperclip } from 'lucide-react';
import DOMPurify from 'dompurify';

export default function InboxPage() {
  const { user, isAuthenticated } = useUser();
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'professional' | 'personal'>('all');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [categories, setCategories] = useState<EmailCategoryConfig[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedThreadId, setExpandedThreadId] = useState<string | null>(null);
  const [correctingEmailId, setCorrectingEmailId] = useState<string | null>(null);

  // Thread detail state
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [threadMessages, setThreadMessages] = useState<FullEmailMessage[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      fetchInbox();
      fetchCategories();
    }
  }, [isAuthenticated, selectedFilter, selectedCategoryId]);

  async function fetchInbox() {
    try {
      setLoading(true);
      const result = await api.getInboxEmails({ maxResults: 100 });

      // Apply client-side filtering
      let filteredEmails = result.messages;

      if (selectedFilter === 'professional') {
        filteredEmails = filteredEmails.filter(e =>
          ['Work', 'Professional', 'Business'].includes(e.category || '')
        );
      } else if (selectedFilter === 'personal') {
        filteredEmails = filteredEmails.filter(e =>
          ['Personal', 'Family', 'Friends'].includes(e.category || '')
        );
      }

      if (selectedCategoryId) {
        const category = categories.find(c => c.id === selectedCategoryId);
        if (category) {
          filteredEmails = filteredEmails.filter(e => e.category === category.name);
        }
      }

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

  async function fetchThread(threadId: string) {
    setLoadingThread(true);
    try {
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
    } finally {
      setLoadingThread(false);
    }
  }

  function getCategoryColor(categoryName: string): string {
    if (!Array.isArray(categories) || categories.length === 0) {
      return '#6B7280'; // Default gray
    }
    const category = categories.find(c => c.name === categoryName);
    return category?.color || '#6B7280';
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

  const filteredBySearch = searchQuery
    ? emails.filter(e =>
        e.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.snippet?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
      )
    : emails;

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
      <div className="min-h-screen bg-[#FFFEF7]">
        {/* Editorial Header */}
        <div className="border-b-2 border-[#1a1a1a] bg-white">
          <div className="max-w-7xl mx-auto px-8 py-8">
            <div className="flex items-end justify-between">
              <div>
                <h1 className="text-5xl font-serif font-bold text-[#1a1a1a] mb-2" style={{ fontFamily: "'Crimson Pro', serif" }}>
                  Inbox
                </h1>
                <p className="text-sm text-[#666] tracking-wider uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  {filteredBySearch.length} threads · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
              </div>

              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search inbox..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-80 px-4 py-3 border border-[#1a1a1a] bg-white text-[#1a1a1a] placeholder-[#999] focus:outline-none focus:ring-2 focus:ring-[#1a1a1a] transition-all"
                  style={{ fontFamily: "'Manrope', sans-serif" }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666] hover:text-[#1a1a1a]"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Quick Filters */}
            <div className="flex items-center gap-4 mt-6 border-t border-[#e0e0e0] pt-4">
              <button
                onClick={() => { setSelectedFilter('all'); setSelectedCategoryId(null); }}
                className={`px-5 py-2 text-sm font-medium transition-all border-2 ${
                  selectedFilter === 'all' && !selectedCategoryId
                    ? 'bg-[#1a1a1a] text-white border-[#1a1a1a]'
                    : 'bg-white text-[#1a1a1a] border-[#1a1a1a] hover:bg-[#f5f5f5]'
                }`}
                style={{ fontFamily: "'Manrope', sans-serif" }}
              >
                All
              </button>
              <button
                onClick={() => { setSelectedFilter('professional'); setSelectedCategoryId(null); }}
                className={`px-5 py-2 text-sm font-medium transition-all border-2 ${
                  selectedFilter === 'professional'
                    ? 'bg-[#1a1a1a] text-white border-[#1a1a1a]'
                    : 'bg-white text-[#1a1a1a] border-[#1a1a1a] hover:bg-[#f5f5f5]'
                }`}
                style={{ fontFamily: "'Manrope', sans-serif" }}
              >
                Professional
              </button>
              <button
                onClick={() => { setSelectedFilter('personal'); setSelectedCategoryId(null); }}
                className={`px-5 py-2 text-sm font-medium transition-all border-2 ${
                  selectedFilter === 'personal'
                    ? 'bg-[#1a1a1a] text-white border-[#1a1a1a]'
                    : 'bg-white text-[#1a1a1a] border-[#1a1a1a] hover:bg-[#f5f5f5]'
                }`}
                style={{ fontFamily: "'Manrope', sans-serif" }}
              >
                Personal
              </button>

              <div className="h-6 w-px bg-[#e0e0e0] mx-2" />

              {/* Category Pills */}
              <div className="flex items-center gap-2 flex-wrap">
                {Array.isArray(categories) && categories.filter(c => c.enabled).map((category) => (
                  <button
                    key={category.id}
                    onClick={() => {
                      setSelectedFilter('all');
                      setSelectedCategoryId(selectedCategoryId === category.id ? null : category.id);
                    }}
                    className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all border-2 ${
                      selectedCategoryId === category.id
                        ? 'border-[#1a1a1a]'
                        : 'border-transparent hover:border-[#e0e0e0]'
                    }`}
                    style={{
                      backgroundColor: selectedCategoryId === category.id ? category.color : `${category.color}20`,
                      color: selectedCategoryId === category.id ? '#1a1a1a' : category.color,
                      fontFamily: "'Manrope', sans-serif"
                    }}
                  >
                    {category.emoji && <span className="mr-1.5">{category.emoji}</span>}
                    {category.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Email List */}
        <div className="max-w-7xl mx-auto px-8 py-8">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-[#666]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                Loading inbox...
              </div>
            </div>
          ) : filteredBySearch.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">📭</div>
              <h3 className="text-2xl font-serif font-bold text-[#1a1a1a] mb-2" style={{ fontFamily: "'Crimson Pro', serif" }}>
                {searchQuery ? 'No matching emails' : 'Inbox Zero'}
              </h3>
              <p className="text-[#666]" style={{ fontFamily: "'Manrope', sans-serif" }}>
                {searchQuery ? 'Try a different search term' : 'All caught up!'}
              </p>
            </div>
          ) : (
            <div className="space-y-px">
              <AnimatePresence mode="popLayout">
                {filteredBySearch.map((email, index) => (
                  <EmailThread
                    key={email.id}
                    email={email}
                    index={index}
                    categoryColor={getCategoryColor(email.category || '')}
                    formatTimestamp={formatTimestamp}
                    isExpanded={expandedThreadId === email.id}
                    onToggleExpand={() => setExpandedThreadId(expandedThreadId === email.id ? null : email.id)}
                    isCorrecting={correctingEmailId === email.id}
                    onStartCorrect={() => setCorrectingEmailId(email.id)}
                    onCancelCorrect={() => setCorrectingEmailId(null)}
                    categories={categories}
                    onCorrect={async (categoryName: string, reason?: string) => {
                      try {
                        // Extract sender email from the email
                        const senderMatch = email.from.match(/<(.+)>/);
                        const senderEmail = senderMatch ? senderMatch[1] : email.from;

                        // Create override for this sender
                        await api.createEmailOverride({
                          overrideType: 'sender',
                          overrideValue: senderEmail.toLowerCase(),
                          categoryName,
                          reason,
                        });

                        setCorrectingEmailId(null);
                        fetchInbox();
                      } catch (error) {
                        console.error('Failed to save category override:', error);
                        alert('Failed to save category correction. Please try again.');
                      }
                    }}
                    onOpenThread={fetchThread}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Thread Detail Panel */}
        {selectedThreadId && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="fixed right-0 top-0 h-screen w-1/2 bg-white border-l border-gray-200 shadow-2xl overflow-y-auto z-50"
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
                  onClick={() => setSelectedThreadId(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Thread messages */}
            <div className="p-6 space-y-6">
              {loadingThread ? (
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
      ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'style'],
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
  formatTimestamp: (date: string) => string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  isCorrecting: boolean;
  onStartCorrect: () => void;
  onCancelCorrect: () => void;
  categories: EmailCategoryConfig[];
  onCorrect: (categoryName: string, reason?: string) => Promise<void>;
  onOpenThread: (threadId: string) => void;
}

function EmailThread({
  email,
  index,
  categoryColor,
  formatTimestamp,
  isExpanded,
  onToggleExpand,
  isCorrecting,
  onStartCorrect,
  onCancelCorrect,
  categories,
  onCorrect,
  onOpenThread
}: EmailThreadProps) {
  const [selectedCategory, setSelectedCategory] = useState(email.category || '');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.3) }}
      className="bg-white border-l-4 hover:shadow-lg transition-all duration-200 group"
      style={{ borderLeftColor: categoryColor }}
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
            <h3 className="text-lg font-semibold text-[#1a1a1a] mb-2 line-clamp-1" style={{ fontFamily: "'Crimson Pro', serif" }}>
              {email.subject}
            </h3>

            {/* Snippet */}
            <p className="text-sm text-[#666] line-clamp-2" style={{ fontFamily: "'Manrope', sans-serif" }}>
              {email.snippet}
            </p>
          </div>

          {/* Category Badge & Actions */}
          <div className="flex flex-col items-end gap-2">
            {email.category && (
              <span
                className="px-3 py-1 text-xs font-medium rounded-full border"
                style={{
                  backgroundColor: `${categoryColor}15`,
                  color: categoryColor,
                  borderColor: `${categoryColor}40`,
                  fontFamily: "'Manrope', sans-serif"
                }}
              >
                {email.category}
              </span>
            )}

            <div className="flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenThread(email.threadId || email.id);
                }}
                className="text-xs text-blue-600 hover:text-blue-800 opacity-0 group-hover:opacity-100 transition-opacity font-medium"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                View Thread →
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onStartCorrect();
                }}
                className="text-xs text-[#999] hover:text-[#1a1a1a] opacity-0 group-hover:opacity-100 transition-opacity"
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
              {/* Why This Label? */}
              <div className="bg-white border-l-4 border-[#3b82f6] p-4 mb-4">
                <div className="flex items-start gap-3">
                  <span className="text-sm font-mono text-[#3b82f6]">ℹ</span>
                  <div className="flex-1">
                    <h4 className="text-xs font-semibold text-[#1a1a1a] mb-1 tracking-wide uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      Why "{email.category}"?
                    </h4>
                    <p className="text-sm text-[#666]" style={{ fontFamily: "'Manrope', sans-serif" }}>
                      Based on sender domain and keywords in subject line.
                      {email.from.includes('@') && (
                        <span className="block mt-1 text-xs text-[#999]">
                          From: {email.from.split('@')[1]?.split('>')[0]}
                        </span>
                      )}
                    </p>
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
                {Array.isArray(categories) && categories.filter(c => c.enabled).map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.name)}
                    className={`px-4 py-2 text-sm font-medium rounded border-2 transition-all ${
                      selectedCategory === category.name
                        ? 'border-[#1a1a1a]'
                        : 'border-[#e0e0e0] hover:border-[#999]'
                    }`}
                    style={{
                      backgroundColor: selectedCategory === category.name ? category.color : 'white',
                      color: selectedCategory === category.name ? '#1a1a1a' : category.color,
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
                  onClick={() => onCorrect(selectedCategory)}
                  disabled={!selectedCategory || selectedCategory === email.category}
                  className="px-6 py-2 bg-[#1a1a1a] text-white text-sm font-medium hover:bg-[#333] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  style={{ fontFamily: "'Manrope', sans-serif" }}
                >
                  Save Correction
                </button>
                <button
                  onClick={onCancelCorrect}
                  className="px-6 py-2 border-2 border-[#1a1a1a] text-[#1a1a1a] text-sm font-medium hover:bg-[#f5f5f5] transition-all"
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
