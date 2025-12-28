'use client';

/**
 * ShareLinkModal Component
 *
 * Modal for sharing scheduling links via email with professional templates.
 */

import { useState, useEffect } from 'react';
import type { SchedulingLink } from '@timeflow/shared';
import * as api from '@/lib/api';

interface ShareLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  links: SchedulingLink[];
  selectedLinkId?: string;
  onSuccess: () => void;
}

export function ShareLinkModal({
  isOpen,
  onClose,
  links,
  selectedLinkId,
  onSuccess,
}: ShareLinkModalProps) {
  const [selectedLink, setSelectedLink] = useState<string>(selectedLinkId || '');
  const [recipients, setRecipients] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [userName, setUserName] = useState('');

  // Fetch user name for email subject
  useEffect(() => {
    async function fetchUserName() {
      try {
        const profile = await api.getMe();
        setUserName(profile.name || '');
      } catch (err) {
        console.error('Failed to fetch user profile:', err);
      }
    }
    if (isOpen) {
      fetchUserName();
    }
  }, [isOpen]);

  // Set default subject when user name is loaded
  useEffect(() => {
    if (userName && !subject) {
      setSubject(`Meeting w/ ${userName}`);
    }
  }, [userName, subject]);

  // Set default message
  useEffect(() => {
    if (isOpen && !message) {
      setMessage(
        "Hi! I'd like to schedule a meeting with you. Please book a time that works best for you using the link below."
      );
    }
  }, [isOpen, message]);

  // Set selected link from prop if provided
  useEffect(() => {
    if (selectedLinkId && links.length > 0) {
      setSelectedLink(selectedLinkId);
    } else if (links.length === 1) {
      setSelectedLink(links[0].id);
    }
  }, [selectedLinkId, links]);

  if (!isOpen) return null;

  const selectedLinkData = links.find((l) => l.id === selectedLink);

  const handleCopyLink = () => {
    if (!selectedLinkData) return;

    const baseUrl = window.location.origin;
    const url = `${baseUrl}/book/${selectedLinkData.slug}`;
    navigator.clipboard.writeText(url);

    // Show success feedback (could integrate with toast)
    alert('Link copied to clipboard!');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedLink) {
      setError('Please select a scheduling link');
      return;
    }

    if (!recipients.trim()) {
      setError('Please enter at least one recipient');
      return;
    }

    if (!subject.trim()) {
      setError('Please enter a subject line');
      return;
    }

    if (!message.trim()) {
      setError('Please enter a message');
      return;
    }

    // Parse and validate recipients
    const recipientList = recipients
      .split(',')
      .map((r) => r.trim())
      .filter((r) => r.length > 0);

    if (recipientList.length === 0) {
      setError('Please enter valid email addresses');
      return;
    }

    if (recipientList.length > 50) {
      setError('Maximum 50 recipients allowed');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = recipientList.filter((email) => !emailRegex.test(email));

    if (invalidEmails.length > 0) {
      setError(`Invalid email format: ${invalidEmails.join(', ')}`);
      return;
    }

    setIsSubmitting(true);

    try {
      const baseUrl = window.location.origin;
      const bookingUrl = `${baseUrl}/book/${selectedLinkData!.slug}`;

      const result = await api.sendMeetingLinkEmail({
        recipients: recipientList,
        subject: subject.trim(),
        message: message.trim(),
        bookingUrl,
      });

      // Reset form
      setRecipients('');
      setSubject(userName ? `Meeting w/ ${userName}` : '');
      setMessage(
        "Hi! I'd like to schedule a meeting with you. Please book a time that works best for you using the link below."
      );

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to send emails');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setError('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl max-w-xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-lg font-semibold text-gray-900">Share Meeting Link</h2>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Link Selector */}
          {links.length > 1 && (
            <div>
              <label htmlFor="link-select" className="block text-sm font-medium text-gray-700 mb-1">
                Select Link:
              </label>
              <select
                id="link-select"
                value={selectedLink}
                onChange={(e) => setSelectedLink(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                disabled={isSubmitting}
              >
                <option value="">-- Select a link --</option>
                {links.map((link) => (
                  <option key={link.id} value={link.id}>
                    {link.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Recipients */}
          <div>
            <label htmlFor="recipients" className="block text-sm font-medium text-gray-700 mb-1">
              Recipients: *
            </label>
            <input
              id="recipients"
              type="text"
              value={recipients}
              onChange={(e) => setRecipients(e.target.value)}
              placeholder="email@example.com, another@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              disabled={isSubmitting}
            />
            <p className="text-xs text-gray-500 mt-1">Separate multiple emails with commas</p>
          </div>

          {/* Subject */}
          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
              Subject: *
            </label>
            <input
              id="subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Meeting w/ Your Name"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              disabled={isSubmitting}
            />
          </div>

          {/* Message */}
          <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
              Message: *
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder="Your message here..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              disabled={isSubmitting}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleCopyLink}
              disabled={!selectedLink || isSubmitting}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Copy Link
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 font-medium"
            >
              {isSubmitting ? 'Sending...' : 'Send Email'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
