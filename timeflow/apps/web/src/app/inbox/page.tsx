'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layout } from '@/components/Layout';
import { useUser } from '@/hooks/useUser';
import * as api from '@/lib/api';
import type { EmailMessage, EmailCategoryConfig } from '@/lib/api';

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
        e.snippet.toLowerCase().includes(searchQuery.toLowerCase())
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
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Web Fonts */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700&family=JetBrains+Mono:wght@400;500&family=Manrope:wght@400;500;600;700&display=swap');
      `}</style>
    </Layout>
  );
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
  onCorrect
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
                {formatTimestamp(email.date)}
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
