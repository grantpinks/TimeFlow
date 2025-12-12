'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FullEmailMessage } from '@timeflow/shared';
import * as api from '@/lib/api';

interface EmailViewerProps {
  emailId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onReply?: (email: FullEmailMessage) => void;
  onArchive?: (emailId: string) => void;
  onMarkAsRead?: (emailId: string, isRead: boolean) => void;
}

export function EmailViewer({
  emailId,
  isOpen,
  onClose,
  onReply,
  onArchive,
  onMarkAsRead,
}: EmailViewerProps) {
  const [email, setEmail] = useState<FullEmailMessage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEmail = useCallback(async () => {
    if (!emailId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await api.getFullEmail(emailId);
      setEmail(data);

      // Auto-mark as read when opened
      if (!data.isRead && onMarkAsRead) {
        await api.markEmailAsRead(emailId, true);
        onMarkAsRead(emailId, true);
      }
    } catch (err) {
      console.error('Failed to fetch email:', err);
      setError('Failed to load email. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [emailId, onMarkAsRead]);

  useEffect(() => {
    if (isOpen && emailId) {
      fetchEmail();
    }
  }, [emailId, isOpen, fetchEmail]);

  const handleArchive = async () => {
    if (!email) return;

    try {
      await api.archiveEmail(email.id);
      if (onArchive) {
        onArchive(email.id);
      }
      onClose();
    } catch (err) {
      console.error('Failed to archive email:', err);
      setError('Failed to archive email');
    }
  };

  const handleToggleRead = async () => {
    if (!email) return;

    try {
      const newReadStatus = !email.isRead;
      await api.markEmailAsRead(email.id, newReadStatus);
      setEmail({ ...email, isRead: newReadStatus });
      if (onMarkAsRead) {
        onMarkAsRead(email.id, newReadStatus);
      }
    } catch (err) {
      console.error('Failed to toggle read status:', err);
      setError('Failed to update email status');
    }
  };

  const handleReply = () => {
    if (email && onReply) {
      onReply(email);
      onClose();
    }
  };

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const stripEmail = (emailString: string) => {
    // Extract just the email address from "Name <email@domain.com>" format
    const match = emailString.match(/<(.+?)>/);
    return match ? match[1] : emailString;
  };

  const getDisplayName = (emailString: string) => {
    // Extract display name from "Name <email@domain.com>" format
    const match = emailString.match(/^(.+?)\s*</);
    return match ? match[1].replace(/"/g, '') : emailString;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-4 md:inset-8 lg:inset-16 bg-white rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-br from-slate-50 to-white">
              <h2 className="text-2xl font-bold text-slate-800">Email</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                aria-label="Close email viewer"
              >
                <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {loading && (
                <div className="flex items-center justify-center h-64">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
                    <p className="text-slate-600">Loading email...</p>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              {!loading && !error && email && (
                <div className="space-y-6">
                  {/* Email Metadata */}
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-2xl font-bold text-slate-900">{email.subject}</h3>
                    </div>

                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold text-lg">
                        {getDisplayName(email.from).charAt(0).toUpperCase()}
                      </div>

                      {/* Sender Info */}
                      <div className="flex-1">
                        <p className="font-semibold text-slate-800">{getDisplayName(email.from)}</p>
                        <p className="text-sm text-slate-600">{stripEmail(email.from)}</p>
                        {email.to && (
                          <p className="text-sm text-slate-500 mt-1">
                            To: {email.to}
                          </p>
                        )}
                        {email.cc && (
                          <p className="text-sm text-slate-500">
                            Cc: {email.cc}
                          </p>
                        )}
                      </div>

                      {/* Date */}
                      <div className="text-sm text-slate-500">
                        {formatDate(email.receivedAt)}
                      </div>
                    </div>

                    {/* Importance Badge */}
                    {email.importance === 'high' && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-700 text-sm font-medium">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        High Priority
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3 pt-3 border-t border-slate-200">
                    <button
                      onClick={handleReply}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium flex items-center gap-2 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                      </svg>
                      Reply
                    </button>

                    <button
                      onClick={handleArchive}
                      className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 font-medium flex items-center gap-2 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                      </svg>
                      Archive
                    </button>

                    <button
                      onClick={handleToggleRead}
                      className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 font-medium flex items-center gap-2 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {email.isRead ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        )}
                      </svg>
                      {email.isRead ? 'Mark Unread' : 'Mark Read'}
                    </button>
                  </div>

                  {/* Email Body */}
                  <div className="pt-6 border-t border-slate-200">
                    {email.body.includes('<html') || email.body.includes('<div') ? (
                      <div
                        className="prose prose-slate max-w-none"
                        dangerouslySetInnerHTML={{ __html: email.body }}
                      />
                    ) : (
                      <div className="whitespace-pre-wrap text-slate-700 leading-relaxed">
                        {email.body}
                      </div>
                    )}
                  </div>

                  {/* Attachments */}
                  {email.attachments && email.attachments.length > 0 && (
                    <div className="pt-6 border-t border-slate-200">
                      <h4 className="font-semibold text-slate-800 mb-3">
                        Attachments ({email.attachments.length})
                      </h4>
                      <div className="space-y-2">
                        {email.attachments.map((attachment, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200"
                          >
                            <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                            <div className="flex-1">
                              <p className="font-medium text-slate-800">{attachment.filename}</p>
                              <p className="text-sm text-slate-500">
                                {(attachment.size / 1024).toFixed(1)} KB
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
