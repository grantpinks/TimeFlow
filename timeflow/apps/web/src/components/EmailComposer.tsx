'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FullEmailMessage } from '@timeflow/shared';
import * as api from '@/lib/api';

interface EmailComposerProps {
  isOpen: boolean;
  onClose: () => void;
  onSent?: () => void;
  replyToEmail?: FullEmailMessage | null;
}

export function EmailComposer({
  isOpen,
  onClose,
  onSent,
  replyToEmail,
}: EmailComposerProps) {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Pre-fill fields when replying
  useEffect(() => {
    if (replyToEmail) {
      // Extract email from "Name <email@domain.com>" format
      const emailMatch = replyToEmail.from.match(/<(.+?)>/);
      const replyToAddress = emailMatch ? emailMatch[1] : replyToEmail.from;

      setTo(replyToAddress);

      // Add "Re: " prefix if not already present
      const replySubject = replyToEmail.subject.startsWith('Re:')
        ? replyToEmail.subject
        : `Re: ${replyToEmail.subject}`;
      setSubject(replySubject);

      // Pre-fill with quoted original message
      const quotedBody = `\n\n\n------- Original Message -------\nFrom: ${replyToEmail.from}\nDate: ${new Date(replyToEmail.receivedAt).toLocaleString()}\nSubject: ${replyToEmail.subject}\n\n${replyToEmail.body}`;
      setBody(quotedBody);
    } else {
      setTo('');
      setSubject('');
      setBody('');
    }
    setError(null);
    setSuccess(false);
  }, [replyToEmail, isOpen]);

  const handleSend = async () => {
    // Validation
    if (!to.trim()) {
      setError('Please enter a recipient email address');
      return;
    }

    if (!subject.trim()) {
      setError('Please enter a subject');
      return;
    }

    if (!body.trim()) {
      setError('Please enter a message');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    setSending(true);
    setError(null);

    try {
      await api.sendEmail({
        to: to.trim(),
        subject: subject.trim(),
        body: body.trim(),
        inReplyTo: replyToEmail?.id,
        threadId: replyToEmail?.threadId,
      });

      setSuccess(true);

      // Close after brief success message
      setTimeout(() => {
        if (onSent) {
          onSent();
        }
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Failed to send email:', err);
      setError('Failed to send email. Please try again.');
      setSending(false);
    }
  };

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !sending) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, sending, onClose]);

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
            onClick={() => !sending && onClose()}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-4 md:inset-8 lg:inset-x-64 lg:inset-y-16 bg-white rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden max-h-[90vh]"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-br from-primary-50 to-white">
              <h2 className="text-2xl font-bold text-slate-800">
                {replyToEmail ? 'Reply to Email' : 'Compose Email'}
              </h2>
              <button
                onClick={onClose}
                disabled={sending}
                className="p-2 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
                aria-label="Close composer"
              >
                <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Form */}
            <div className="flex-1 overflow-y-auto p-6">
              {success ? (
                <div className="flex items-center justify-center h-64">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                      <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-lg font-semibold text-green-700">Email sent successfully!</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Error Message */}
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                      {error}
                    </div>
                  )}

                  {/* To Field */}
                  <div>
                    <label htmlFor="email-to" className="block text-sm font-medium text-slate-700 mb-1.5">
                      To
                    </label>
                    <input
                      id="email-to"
                      type="email"
                      value={to}
                      onChange={(e) => setTo(e.target.value)}
                      disabled={sending || !!replyToEmail}
                      placeholder="recipient@example.com"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-slate-100 disabled:text-slate-600"
                    />
                  </div>

                  {/* Subject Field */}
                  <div>
                    <label htmlFor="email-subject" className="block text-sm font-medium text-slate-700 mb-1.5">
                      Subject
                    </label>
                    <input
                      id="email-subject"
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      disabled={sending}
                      placeholder="Email subject"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-slate-100"
                    />
                  </div>

                  {/* Body Field */}
                  <div>
                    <label htmlFor="email-body" className="block text-sm font-medium text-slate-700 mb-1.5">
                      Message
                    </label>
                    <textarea
                      id="email-body"
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      disabled={sending}
                      placeholder="Type your message here..."
                      rows={12}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none disabled:bg-slate-100 font-mono text-sm"
                    />
                  </div>

                  {/* Formatting Hint */}
                  <p className="text-sm text-slate-500">
                    Tip: Use plain text formatting. HTML tags will be preserved.
                  </p>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            {!success && (
              <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 bg-slate-50">
                <button
                  onClick={onClose}
                  disabled={sending}
                  className="px-6 py-2.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 font-medium transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSend}
                  disabled={sending}
                  className="px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  {sending ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      Send Email
                    </>
                  )}
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
