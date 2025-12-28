'use client';

/**
 * MeetingManagementPanel Component
 *
 * Calendar sidebar panel for creating and sharing scheduling links.
 */

import { useState, useEffect } from 'react';
import * as api from '@/lib/api';
import type { SchedulingLink, Meeting } from '@timeflow/shared';
import { CreateLinkModal } from './CreateLinkModal';
import { ShareLinkModal } from './ShareLinkModal';
import { ToastContainer } from './Toast';
import { useToast } from '@/hooks/useToast';

export function MeetingManagementPanel() {
  const [links, setLinks] = useState<SchedulingLink[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedLinkForShare, setSelectedLinkForShare] = useState<string | undefined>();

  // Toast notifications
  const { toasts, showToast, removeToast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);

      // Fetch links (required)
      const linksData = await api.getSchedulingLinks();
      setLinks(linksData.filter((l) => l.isActive));

      // Fetch meetings (optional, don't fail if this errors)
      try {
        const meetingsData = await api.getMeetings();
        setMeetings(meetingsData.filter((m) => m.status === 'scheduled'));
      } catch (meetingsError) {
        console.log('Meetings not available yet:', meetingsError);
        // Silently fail - meetings panel will show 0 upcoming
        setMeetings([]);
      }
    } catch (error) {
      console.error('Failed to fetch scheduling links:', error);
      // Only show error if critical data (links) fails
      showToast('Failed to load scheduling links', 'error');
    } finally {
      setLoading(false);
    }
  }

  const activeLinks = links.filter((l) => l.isActive);
  const upcomingMeetings = meetings.filter((m) => new Date(m.startDateTime) > new Date());

  function handleCopyLink(slug: string) {
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/book/${slug}`;
    navigator.clipboard.writeText(url);
    showToast('Link copied to clipboard!', 'success');
  }

  async function handleCreateSuccess(linkId: string) {
    showToast('Link created successfully!', 'success');

    // Wait for data to refresh before opening share modal
    await fetchData();

    // Auto-transition to share modal
    setSelectedLinkForShare(linkId);
    setShowShareModal(true);
  }

  function handleShareSuccess() {
    const recipientCount = 1; // Could be passed from ShareLinkModal
    showToast(`Email sent successfully!`, 'success');
    fetchData();
  }

  if (loading) {
    return (
      <div className="bg-white overflow-hidden flex-shrink-0">
        <div className="flex items-center justify-between px-3 py-2.5 bg-slate-50/50">
          <h3 className="text-sm font-semibold text-slate-600">Plan Meetings</h3>
        </div>
        <div className="p-3 text-center">
          <p className="text-xs text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white overflow-hidden flex-shrink-0 border-t border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2.5 bg-gradient-to-r from-purple-50 to-primary-50">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-primary-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <h3 className="text-sm font-semibold text-slate-700">Plan Meetings</h3>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-slate-500 hover:text-slate-700"
          >
            <svg
              className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-3 space-y-3">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-purple-50 rounded-lg p-2 text-center">
              <p className="text-xs text-purple-600 font-medium">{activeLinks.length}</p>
              <p className="text-[11px] text-purple-700">Active Links</p>
            </div>
            <div className="bg-primary-50 rounded-lg p-2 text-center">
              <p className="text-xs text-primary-600 font-medium">{upcomingMeetings.length}</p>
              <p className="text-[11px] text-primary-700">Upcoming</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-2">
            <button
              onClick={() => setShowCreateModal(true)}
              className="block w-full bg-primary-600 text-white text-xs font-medium py-2 rounded-lg hover:bg-primary-700 text-center transition-colors"
            >
              + Create Link
            </button>
            <button
              onClick={() => {
                setSelectedLinkForShare(undefined);
                setShowShareModal(true);
              }}
              className="block w-full bg-white border border-primary-600 text-primary-600 text-xs font-medium py-2 rounded-lg hover:bg-primary-50 text-center transition-colors"
            >
              📤 Share Link
            </button>
            <a
              href="/settings#meeting-manager"
              className="block w-full bg-white border border-slate-200 text-slate-700 text-xs font-medium py-2 rounded-lg hover:bg-slate-50 text-center transition-colors"
            >
              📋 View All Meetings
            </a>
          </div>

          {/* Expanded: Show Links */}
          {expanded && activeLinks.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
                Your Links
              </p>
              {activeLinks.slice(0, 3).map((link) => (
                <div
                  key={link.id}
                  className="bg-slate-50 rounded-lg p-2 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-800 truncate">{link.name}</p>
                      <p className="text-[11px] text-slate-500 truncate">/book/{link.slug}</p>
                    </div>
                    <button
                      onClick={() => handleCopyLink(link.slug)}
                      className="flex-shrink-0 text-primary-600 hover:text-primary-700"
                      title="Copy link"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
              {activeLinks.length > 3 && (
                <p className="text-[11px] text-slate-500 text-center">
                  +{activeLinks.length - 3} more
                </p>
              )}
            </div>
          )}

          {/* Empty State */}
          {activeLinks.length === 0 && (
            <div className="text-center py-2">
              <p className="text-[11px] text-slate-500">
                No active scheduling links.
                <br />
                Create one to get started!
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <CreateLinkModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateSuccess}
      />

      <ShareLinkModal
        isOpen={showShareModal}
        onClose={() => {
          setShowShareModal(false);
          setSelectedLinkForShare(undefined);
        }}
        links={activeLinks}
        selectedLinkId={selectedLinkForShare}
        onSuccess={handleShareSuccess}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  );
}
