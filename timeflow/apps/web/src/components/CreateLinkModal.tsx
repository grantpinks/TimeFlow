'use client';

/**
 * CreateLinkModal Component
 *
 * Modal for quickly creating scheduling links with smart defaults.
 */

import { useState } from 'react';
import * as api from '@/lib/api';

interface CreateLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (linkId: string) => void;
}

export function CreateLinkModal({ isOpen, onClose, onSuccess }: CreateLinkModalProps) {
  const [name, setName] = useState('');
  const [durations, setDurations] = useState<number[]>([30]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleDurationToggle = (duration: number) => {
    if (durations.includes(duration)) {
      setDurations(durations.filter((d) => d !== duration));
    } else {
      setDurations([...durations, duration]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Link name is required');
      return;
    }

    if (durations.length === 0) {
      setError('Select at least one duration');
      return;
    }

    setIsSubmitting(true);

    try {
      const newLink = await api.createSchedulingLink({
        name: name.trim(),
        durationsMinutes: durations.sort((a, b) => a - b),
        // Smart defaults
        calendarProvider: 'google',
        googleMeetEnabled: true,
        bufferBeforeMinutes: 5,
        bufferAfterMinutes: 5,
        maxBookingHorizonDays: 14,
      });

      // Reset form
      setName('');
      setDurations([30]);

      // Call success handler with new link ID
      onSuccess(newLink.id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create link');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setName('');
      setDurations([30]);
      setError('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Create Meeting Link</h2>
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
          {/* Link Name */}
          <div>
            <label htmlFor="link-name" className="block text-sm font-medium text-gray-700 mb-1">
              Link Name *
            </label>
            <input
              id="link-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Quick Chat"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              disabled={isSubmitting}
              autoFocus
            />
          </div>

          {/* Duration Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Duration *</label>
            <div className="flex gap-3">
              {[15, 30, 60].map((duration) => (
                <button
                  key={duration}
                  type="button"
                  onClick={() => handleDurationToggle(duration)}
                  disabled={isSubmitting}
                  className={`
                    flex-1 px-4 py-2 rounded-lg border-2 font-medium text-sm
                    transition-colors disabled:opacity-50
                    ${
                      durations.includes(duration)
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-300 text-gray-700 hover:border-gray-400'
                    }
                  `}
                >
                  {duration} min
                </button>
              ))}
            </div>
          </div>

          {/* Smart Defaults Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800">
              <strong>Smart defaults applied:</strong> Google Meet enabled, 5-min buffers, 14-day booking
              window
            </p>
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
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 font-medium"
            >
              {isSubmitting ? 'Creating...' : 'Create Link'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
