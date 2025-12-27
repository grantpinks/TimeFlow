'use client';

import { useState, useEffect } from 'react';
import * as api from '@/lib/api';
import type { Meeting } from '@timeflow/shared';

type MeetingStatus = 'scheduled' | 'rescheduled' | 'cancelled' | 'all';

export function MeetingManagerPanel() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<MeetingStatus>('all');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load meetings
  useEffect(() => {
    fetchMeetings();
  }, [filter]);

  async function fetchMeetings() {
    try {
      setLoading(true);
      const data = await api.getMeetings(filter === 'all' ? undefined : filter);
      setMeetings(data);
    } catch (err) {
      console.error('Failed to fetch meetings:', err);
      setMessage({ type: 'error', text: 'Failed to load meetings' });
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelMeeting(meetingId: string) {
    if (!confirm('Are you sure you want to cancel this meeting?')) return;

    try {
      await api.hostCancelMeeting(meetingId);
      setMessage({ type: 'success', text: 'Meeting cancelled' });
      fetchMeetings();
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to cancel meeting' });
    }
  }

  function formatDateTime(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  const filteredMeetings = meetings;

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Meeting Manager</h2>
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-800 mb-2">Meeting Manager</h2>
        <p className="text-slate-600 text-sm">
          View and manage all meetings booked through your scheduling links
        </p>
      </div>

      {message && (
        <div
          className={`mb-4 px-4 py-3 rounded-lg text-sm ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 border-b border-slate-200">
        {[
          { key: 'all' as const, label: 'All' },
          { key: 'scheduled' as const, label: 'Scheduled' },
          { key: 'rescheduled' as const, label: 'Rescheduled' },
          { key: 'cancelled' as const, label: 'Cancelled' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              filter === tab.key
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filteredMeetings.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <p className="mb-2">No meetings found</p>
          <p className="text-sm">
            {filter === 'all'
              ? 'Meetings booked through your scheduling links will appear here'
              : `No ${filter} meetings`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredMeetings.map((meeting) => (
            <div
              key={meeting.id}
              className="border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-slate-800">
                      {meeting.inviteeName}
                    </h3>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        meeting.status === 'scheduled'
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : meeting.status === 'rescheduled'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}
                    >
                      {meeting.status}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mb-1">{meeting.inviteeEmail}</p>
                  <p className="text-sm text-slate-700 font-medium">
                    📅 {formatDateTime(meeting.startDateTime)}
                  </p>
                  {meeting.notes && (
                    <p className="text-sm text-slate-600 mt-2 italic">"{meeting.notes}"</p>
                  )}
                </div>
                {meeting.status !== 'cancelled' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCancelMeeting(meeting.id)}
                      className="text-sm text-red-600 hover:text-red-700 px-3 py-1 rounded hover:bg-red-50"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
