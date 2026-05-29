'use client';

/**
 * MeetingManagementPanel Component
 *
 * Calendar sidebar panel for creating and sharing scheduling links.
 */

import { useState, useEffect, useCallback } from 'react';
import * as api from '@/lib/api';
import type { SchedulingLink, Meeting } from '@timeflow/shared';
import { CreateLinkModal } from './CreateLinkModal';
import { ShareLinkModal } from './ShareLinkModal';
import { ToastContainer } from './Toast';
import { useToast } from '@/hooks/useToast';
import {
  isMeetingsSectionDismissed,
  setMeetingsSectionDismissed,
} from '@/lib/calendarSidebarPrefs';

export function MeetingManagementPanel() {
  const [links, setLinks] = useState<SchedulingLink[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [sectionDismissed, setSectionDismissed] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedLinkForShare, setSelectedLinkForShare] = useState<string | undefined>();

  const { toasts, showToast, removeToast } = useToast();

  useEffect(() => {
    setSectionDismissed(isMeetingsSectionDismissed());
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const linksData = await api.getSchedulingLinks();
      setLinks(linksData.filter((l) => l.isActive));

      try {
        const meetingsData = await api.getMeetings();
        setMeetings(meetingsData.filter((m) => m.status === 'scheduled'));
      } catch (meetingsError) {
        console.log('Meetings not available yet:', meetingsError);
        setMeetings([]);
      }
    } catch (error) {
      console.error('Failed to fetch scheduling links:', error);
      showToast('Failed to load scheduling links', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (!sectionDismissed) {
      fetchData();
    }
  }, [fetchData, sectionDismissed]);

  const activeLinks = links.filter((l) => l.isActive);
  const upcomingMeetings = meetings.filter((m) => new Date(m.startDateTime) > new Date());

  function handleDismissSection() {
    setMeetingsSectionDismissed(true);
    setSectionDismissed(true);
  }

  function handleRestoreSection() {
    setMeetingsSectionDismissed(false);
    setSectionDismissed(false);
    setExpanded(false);
  }

  function handleCopyLink(slug: string) {
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/book/${slug}`;
    navigator.clipboard.writeText(url);
    showToast('Link copied to clipboard!', 'success');
  }

  async function handleCreateSuccess(linkId: string) {
    showToast('Link created successfully!', 'success');
    await fetchData();
    setSelectedLinkForShare(linkId);
    setShowShareModal(true);
  }

  function handleShareSuccess() {
    showToast(`Email sent successfully!`, 'success');
    fetchData();
  }

  if (sectionDismissed) {
    return (
      <div className="px-3 py-2">
        <button
          type="button"
          onClick={handleRestoreSection}
          className="text-xs font-medium text-primary-600 hover:text-primary-700"
        >
          Show Plan Meetings
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="px-3 py-2">
        <p className="text-xs text-slate-500">Loading scheduling links…</p>
      </div>
    );
  }

  return (
    <>
      <section className="flex-shrink-0 overflow-hidden">
        <div className="flex items-center gap-1 px-3 py-2">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-md px-1 py-0.5 text-left hover:bg-slate-50 transition-colors"
            aria-expanded={expanded}
          >
            <div className="flex min-w-0 items-center gap-2">
              <svg
                className="h-4 w-4 shrink-0 text-primary-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <h3 className="truncate text-sm font-semibold text-slate-800">Plan Meetings</h3>
            </div>
            <svg
              className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={handleDismissSection}
            className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            title="Hide Plan Meetings"
            aria-label="Hide Plan Meetings section"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {expanded && (
          <div className="space-y-3 px-3 pb-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-purple-50 p-2 text-center">
                <p className="text-xs font-medium text-purple-600">{activeLinks.length}</p>
                <p className="text-[11px] text-purple-700">Active Links</p>
              </div>
              <div className="rounded-lg bg-primary-50 p-2 text-center">
                <p className="text-xs font-medium text-primary-600">{upcomingMeetings.length}</p>
                <p className="text-[11px] text-primary-700">Upcoming</p>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary-600 py-2 text-xs font-medium text-white transition-colors hover:bg-primary-700"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Link
              </button>
              <button
                onClick={() => {
                  setSelectedLinkForShare(undefined);
                  setShowShareModal(true);
                }}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-primary-600 bg-white py-2 text-xs font-medium text-primary-600 transition-colors hover:bg-primary-50"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                  />
                </svg>
                Share Link
              </button>
              <a
                href="/meetings"
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                View All Meetings
              </a>
            </div>

            {activeLinks.length > 0 && (
              <div className="space-y-2 border-t border-slate-100 pt-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                  Your Links
                </p>
                {activeLinks.slice(0, 3).map((link) => (
                  <div
                    key={link.id}
                    className="rounded-lg bg-slate-50 p-2 transition-colors hover:bg-slate-100"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-slate-800">{link.name}</p>
                        <p className="truncate text-[11px] text-slate-500">/book/{link.slug}</p>
                      </div>
                      <button
                        onClick={() => handleCopyLink(link.slug)}
                        className="shrink-0 text-primary-600 hover:text-primary-700"
                        title="Copy link"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  <p className="text-center text-[11px] text-slate-500">+{activeLinks.length - 3} more</p>
                )}
              </div>
            )}

            {activeLinks.length === 0 && (
              <p className="text-center text-[11px] text-slate-500">
                No active scheduling links. Create one to get started.
              </p>
            )}
          </div>
        )}
      </section>

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

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  );
}
