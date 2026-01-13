'use client';

/**
 * DraftPanel Component
 * AI-powered email draft panel with Generate -> Edit -> Preview -> Send/Draft workflow
 * Sprint 16 Phase B+: AI Email Draft Workflow
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DOMPurify from 'isomorphic-dompurify';
import Link from 'next/link';
import type { FullEmailMessage, WritingVoiceProfile } from '@timeflow/shared';
import * as api from '@/lib/api';
import { buildReplyAllRecipients, shouldShowReplyAll } from './draftPanelUtils';

interface DraftPanelProps {
  isOpen: boolean;
  onClose: () => void;
  email: FullEmailMessage;
  onSuccess?: () => void;
  userEmails?: string[];
}

type PanelState = 'setup' | 'generate' | 'generating' | 'edit' | 'preview' | 'sending' | 'success' | 'error';

type ErrorAction = 'generate' | 'preview' | 'send' | 'draft' | null;

type SuccessAction = 'send' | 'draft' | null;

export function DraftPanel({ isOpen, onClose, email, onSuccess, userEmails }: DraftPanelProps) {
  const [panelState, setPanelState] = useState<PanelState>('generate');
  const [voiceProfile, setVoiceProfile] = useState<WritingVoiceProfile | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);

  // Voice preferences (slider values)
  const [formality, setFormality] = useState(5);
  const [length, setLength] = useState(5);
  const [tone, setTone] = useState(5);

  // Draft content
  const [draftText, setDraftText] = useState('');
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [cc, setCc] = useState<string>('');
  const [baseTo, setBaseTo] = useState('');
  const [baseCc, setBaseCc] = useState<string>('');
  const [replyAllEnabled, setReplyAllEnabled] = useState(false);

  // Preview data
  const [htmlPreview, setHtmlPreview] = useState('');
  const [textPreview, setTextPreview] = useState('');
  const [determinismToken, setDeterminismToken] = useState('');

  // UI state
  const [previewing, setPreviewing] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasUnsavedEdits, setHasUnsavedEdits] = useState(false);
  const [errorAction, setErrorAction] = useState<ErrorAction>(null);
  const [successAction, setSuccessAction] = useState<SuccessAction>(null);
  const [gmailUrl, setGmailUrl] = useState<string | null>(null);

  // Abort controller for cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  // Sanitize HTML preview for safe rendering
  const sanitizedHtml = useMemo(() => {
    if (!htmlPreview) return '';
    return DOMPurify.sanitize(htmlPreview, {
      ALLOWED_TAGS: ['p', 'br', 'b', 'i', 'u', 'strong', 'em', 'div', 'span', 'ul', 'ol', 'li', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
      ALLOWED_ATTR: ['href', 'style', 'class'],
    });
  }, [htmlPreview]);

  // Load voice profile on mount
  useEffect(() => {
    if (isOpen) {
      loadVoiceProfile();
    }
  }, [isOpen]);

  // Reset state when email changes or panel opens
  useEffect(() => {
    if (isOpen) {
      setPanelState(needsSetup ? 'setup' : 'generate');
      setDraftText('');
      setTo('');
      setSubject('');
      setCc('');
      setBaseTo('');
      setBaseCc('');
      setReplyAllEnabled(false);
      setHtmlPreview('');
      setTextPreview('');
      setDeterminismToken('');
      setConfirmed(false);
      setError(null);
      setHasUnsavedEdits(false);
      setErrorAction(null);
      setSuccessAction(null);
      setGmailUrl(null);
    }
  }, [isOpen, email.id, needsSetup]);

  async function loadVoiceProfile() {
    try {
      const profile = await api.getWritingVoice();
      setVoiceProfile(profile);
      setFormality(profile.formality);
      setLength(profile.length);
      setTone(profile.tone);

      const firstRun = profile.aiDraftsGenerated === 0 && !profile.voiceSamples;
      setNeedsSetup(firstRun);
      if (isOpen) {
        setPanelState(firstRun ? 'setup' : 'generate');
      }
    } catch (err) {
      console.error('Failed to load voice profile:', err);
      setFormality(5);
      setLength(5);
      setTone(5);
      setNeedsSetup(true);
      if (isOpen) {
        setPanelState('setup');
      }
    }
  }

  async function handleGenerate(preferences?: { formality: number; length: number; tone: number }) {
    setPanelState('generating');
    setError(null);
    setErrorAction(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const nextPreferences = preferences ?? { formality, length, tone };
      const response = await api.generateEmailDraft({
        emailId: email.id,
        voicePreferences: {
          formality: nextPreferences.formality,
          length: nextPreferences.length,
          tone: nextPreferences.tone,
        },
      });

      setDraftText(response.draftText);
      setTo(response.to);
      setSubject(response.subject);
      setCc(response.cc ?? '');
      setBaseTo(response.to);
      setBaseCc(response.cc ?? '');
      setReplyAllEnabled(false);
      setPanelState('edit');
      setHasUnsavedEdits(false);
      setDeterminismToken('');
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return;
      }

      console.error('Failed to generate draft:', err);

      if (err.message?.includes('timeout')) {
        setError('AI service is taking too long. Please try again.');
      } else if (err.message?.includes('GMAIL_NOT_CONNECTED')) {
        setError('Please connect your Gmail account in Settings first.');
      } else {
        setError(err.message || 'Failed to generate draft. Please try again.');
      }
      setErrorAction('generate');
      setPanelState('error');
    } finally {
      abortControllerRef.current = null;
    }
  }

  async function handlePreview(overrides?: { to: string; cc?: string }) {
    setPreviewing(true);
    setError(null);
    setErrorAction(null);

    try {
      const nextTo = overrides?.to ?? to;
      const nextCc = overrides?.cc ?? cc;
      if (overrides) {
        setTo(nextTo);
        setCc(nextCc ?? '');
      }
      const response = await api.generateEmailPreview({
        draftText,
        to: nextTo,
        subject,
        cc: nextCc || undefined,
        inReplyTo: email.id,
        threadId: email.threadId,
      });

      setHtmlPreview(response.htmlPreview);
      setTextPreview(response.textPreview);
      setDeterminismToken(response.determinismToken);
      setPanelState('preview');
      setConfirmed(false);
    } catch (err: any) {
      console.error('Failed to generate preview:', err);
      setError(err.message || 'Failed to generate preview. Please try again.');
      setErrorAction('preview');
      setPanelState('error');
    } finally {
      setPreviewing(false);
    }
  }

  async function handleSend() {
    if (!confirmed) {
      setError('Please confirm by checking the box before sending.');
      setErrorAction('send');
      setPanelState('error');
      return;
    }

    setPanelState('sending');
    setError(null);
    setErrorAction(null);

    try {
      await api.createOrSendDraft({
        action: 'send',
        htmlPreview,
        textPreview,
        determinismToken,
        to,
        subject,
        cc: cc || undefined,
        inReplyTo: email.id,
        threadId: email.threadId,
        confirmed: true,
      });

      setSuccessAction('send');
      setPanelState('success');
    } catch (err: any) {
      console.error('Failed to send email:', err);
      setError(err.message || 'Failed to send email. Please try again.');
      setErrorAction('send');
      setPanelState('error');
    }
  }

  async function handleCreateDraft() {
    if (!confirmed) {
      setError('Please confirm by checking the box before creating a draft.');
      setErrorAction('draft');
      setPanelState('error');
      return;
    }

    setPanelState('sending');
    setError(null);
    setErrorAction(null);

    try {
      const response = await api.createOrSendDraft({
        action: 'create_draft',
        htmlPreview,
        textPreview,
        determinismToken,
        to,
        subject,
        cc: cc || undefined,
        inReplyTo: email.id,
        threadId: email.threadId,
        confirmed: true,
      });

      if (response.gmailUrl) {
        setGmailUrl(response.gmailUrl);
      }

      setSuccessAction('draft');
      setPanelState('success');
    } catch (err: any) {
      console.error('Failed to create draft:', err);
      setError(err.message || 'Failed to create draft. Please try again.');
      setErrorAction('draft');
      setPanelState('error');
    }
  }

  function handleBack() {
    if (panelState === 'edit' && hasUnsavedEdits) {
      if (!confirm('You have unsaved edits. Go back anyway?')) {
        return;
      }
    }

    if (panelState === 'preview') {
      setPanelState('edit');
    } else if (panelState === 'edit') {
      setPanelState('generate');
      setDraftText('');
      setHasUnsavedEdits(false);
    }
  }

  function handleClose() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (panelState === 'edit' && hasUnsavedEdits) {
      if (!confirm('You have unsaved edits. Close anyway?')) {
        return;
      }
    }

    onClose();
  }

  function handleDraftChange(newText: string) {
    setDraftText(newText);
    setHasUnsavedEdits(true);
    if (determinismToken) {
      setDeterminismToken('');
      setConfirmed(false);
    }
  }

  function handleQuickRefine(next: { formality?: number; length?: number; tone?: number }) {
    const nextFormality =
      typeof next.formality === 'number' ? Math.min(10, Math.max(1, formality + next.formality)) : formality;
    const nextLength =
      typeof next.length === 'number' ? Math.min(10, Math.max(1, length + next.length)) : length;
    const nextTone =
      typeof next.tone === 'number' ? Math.min(10, Math.max(1, tone + next.tone)) : tone;

    setFormality(nextFormality);
    setLength(nextLength);
    setTone(nextTone);
    handleGenerate({ formality: nextFormality, length: nextLength, tone: nextTone });
  }

  function handleRetry() {
    if (errorAction === 'generate') {
      handleGenerate();
      return;
    }
    if (errorAction === 'preview') {
      handlePreview();
      return;
    }
    if (errorAction === 'send') {
      handleSend();
      return;
    }
    if (errorAction === 'draft') {
      handleCreateDraft();
    }
  }

  function handleDraftAnother() {
    setDraftText('');
    setHtmlPreview('');
    setTextPreview('');
    setDeterminismToken('');
    setConfirmed(false);
    setError(null);
    setErrorAction(null);
    setSuccessAction(null);
    setGmailUrl(null);
    setReplyAllEnabled(false);
    setPanelState('generate');
  }

  // Helper: Get slider label
  function getSliderLabel(value: number, type: 'formality' | 'length' | 'tone'): string {
    if (type === 'formality') {
      if (value <= 3) return 'Casual';
      if (value >= 7) return 'Professional';
      return 'Balanced';
    }
    if (type === 'length') {
      if (value <= 3) return 'Concise';
      if (value >= 7) return 'Detailed';
      return 'Moderate';
    }
    if (type === 'tone') {
      if (value <= 3) return 'Friendly';
      if (value >= 7) return 'Formal';
      return 'Approachable';
    }
    return '';
  }

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && panelState !== 'sending') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, panelState, hasUnsavedEdits]);

  if (!isOpen) return null;

  const replyAllAvailable = shouldShowReplyAll({ to: email.to, cc: email.cc });
  const replyAllRecipients = replyAllAvailable
    ? buildReplyAllRecipients({
        from: email.from,
        replyTo: email.replyTo,
        to: email.to,
        cc: email.cc,
        userEmails: userEmails ?? [],
      })
    : null;
  const replyAllRecipientCount = replyAllRecipients
    ? [replyAllRecipients.to, ...(replyAllRecipients.cc ? replyAllRecipients.cc.split(',') : [])].filter(Boolean).length
    : 0;

  const showSliders = (
    <div>
      <h3 className="text-lg font-semibold text-slate-800 mb-4">Writing Style</h3>
      <p className="text-sm text-slate-600 mb-6">
        Adjust these settings to match your preferred writing style.
      </p>

      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Formality: <span className="text-primary-600">{getSliderLabel(formality, 'formality')}</span>
        </label>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">Casual</span>
          <input
            type="range"
            min="1"
            max="10"
            value={formality}
            onChange={(e) => setFormality(Number(e.target.value))}
            className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-xs text-slate-500">Professional</span>
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Length: <span className="text-primary-600">{getSliderLabel(length, 'length')}</span>
        </label>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">Concise</span>
          <input
            type="range"
            min="1"
            max="10"
            value={length}
            onChange={(e) => setLength(Number(e.target.value))}
            className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-xs text-slate-500">Detailed</span>
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Tone: <span className="text-primary-600">{getSliderLabel(tone, 'tone')}</span>
        </label>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">Friendly</span>
          <input
            type="range"
            min="1"
            max="10"
            value={tone}
            onChange={(e) => setTone(Number(e.target.value))}
            className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-xs text-slate-500">Formal</span>
        </div>
      </div>
    </div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/50 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => panelState !== 'sending' && handleClose()}
          />

          <motion.div
            className="fixed right-0 top-0 h-full w-full md:w-[600px] bg-white shadow-2xl z-50 flex flex-col overflow-hidden"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
            <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-br from-primary-50 to-white">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">AI Draft Reply</h2>
                <p className="text-sm text-slate-600 mt-1">
                  To: {email.from.split('<')[0].trim()}
                </p>
              </div>
              <button
                onClick={handleClose}
                disabled={panelState === 'sending'}
                className="p-2 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
                aria-label="Close panel"
              >
                <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {panelState === 'error' && error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                  {error}
                </div>
              )}

              {panelState === 'setup' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">Set up your voice</h3>
                    <p className="text-sm text-slate-600 mb-6">
                      Quick preferences to tailor your draft. You can refine these anytime.
                    </p>
                    {showSliders}
                    <div className="flex items-center justify-between text-sm">
                      <button
                        type="button"
                        className="text-slate-500 hover:text-slate-700"
                        onClick={() => {
                          setNeedsSetup(false);
                          setPanelState('generate');
                        }}
                      >
                        Skip and use defaults
                      </button>
                      <Link href="/settings/writing-voice" className="text-primary-600 hover:text-primary-700">
                        Go to full settings
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {panelState === 'generate' && (
                <div className="space-y-6">
                  {showSliders}
                  {voiceProfile?.voiceSamples && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-blue-800">
                        Using your custom writing voice samples for personalization.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {panelState === 'generating' && (
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                  <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
                  <p className="text-sm text-slate-600">Generating draft...</p>
                  <button
                    onClick={handleClose}
                    className="text-sm text-slate-500 hover:text-slate-700"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {panelState === 'edit' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">To</label>
                    <input
                      type="email"
                      value={to}
                      readOnly
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-600"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Subject</label>
                    <input
                      type="text"
                      value={subject}
                      readOnly
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-600"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Message</label>
                      <span className="text-xs text-slate-500">{draftText.length} chars</span>
                    </div>
                    <textarea
                      value={draftText}
                      onChange={(e) => handleDraftChange(e.target.value)}
                      rows={10}
                      className="w-full min-h-[200px] px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none font-mono text-sm"
                      placeholder="Edit your draft here..."
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleQuickRefine({ length: -2 })}
                      className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-full text-slate-600 hover:text-slate-800"
                    >
                      Make shorter
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickRefine({ formality: 2 })}
                      className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-full text-slate-600 hover:text-slate-800"
                    >
                      More formal
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickRefine({ tone: -2 })}
                      className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-full text-slate-600 hover:text-slate-800"
                    >
                      Warmer tone
                    </button>
                  </div>

                  <p className="text-xs text-slate-500">
                    Voice: Formality {formality}, Length {length}, Tone {tone}
                  </p>

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <p className="text-sm text-amber-800">Preview required before sending</p>
                  </div>
                </div>
              )}

              {panelState === 'preview' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-4">Preview</h3>

                    {replyAllAvailable && (
                      <div className="flex items-center justify-between mb-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
                        <label className="flex items-center gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            aria-label="Reply all"
                            checked={replyAllEnabled}
                            onChange={(e) => {
                              const enabled = e.target.checked;
                              setReplyAllEnabled(enabled);
                              const nextRecipients = enabled && replyAllRecipients
                                ? replyAllRecipients
                                : { to: baseTo, cc: baseCc || undefined };
                              handlePreview(nextRecipients);
                            }}
                            className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                          />
                          Reply all
                        </label>
                        {replyAllEnabled && replyAllRecipientCount > 5 && (
                          <span className="text-xs text-amber-600">
                            Sending to {replyAllRecipientCount} recipients
                          </span>
                        )}
                      </div>
                    )}

                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4">
                      <p className="text-sm text-slate-600 mb-1"><strong>From:</strong> me</p>
                      <p className="text-sm text-slate-600 mb-1"><strong>To:</strong> {to}</p>
                      {cc && <p className="text-sm text-slate-600 mb-1"><strong>Cc:</strong> {cc}</p>}
                      <p className="text-sm text-slate-600"><strong>Subject:</strong> {subject}</p>
                    </div>

                    <div className="border border-slate-300 rounded-lg p-6 bg-white min-h-[200px] max-h-[400px] overflow-y-auto">
                      <div
                        dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
                        className="prose prose-sm max-w-none"
                      />
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-300 rounded-lg p-4">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={confirmed}
                        onChange={(e) => setConfirmed(e.target.checked)}
                        className="mt-0.5 w-5 h-5 text-primary-600 border-slate-300 rounded focus:ring-primary-500"
                      />
                      <span className="text-sm text-slate-700">
                        I confirm this draft matches the preview and is ready to send
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {panelState === 'success' && (
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-lg font-semibold text-green-700">
                    {successAction === 'send' ? 'Email sent successfully!' : 'Draft created in Gmail'}
                  </p>
                  {gmailUrl && (
                    <a
                      href={gmailUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-primary-600 hover:text-primary-700"
                    >
                      View in Gmail
                    </a>
                  )}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        if (onSuccess) {
                          onSuccess();
                        }
                        handleClose();
                      }}
                      className="px-5 py-2 text-sm bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300"
                    >
                      Close
                    </button>
                    <button
                      onClick={handleDraftAnother}
                      className="px-5 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                    >
                      Draft another
                    </button>
                  </div>
                </div>
              )}

              {panelState === 'error' && (
                <div className="flex flex-col items-center justify-center h-56 gap-4">
                  <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
                    <svg className="w-7 h-7 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
                    </svg>
                  </div>
                  <p className="text-sm text-slate-700 text-center max-w-sm">
                    {error || 'Something went wrong. Please try again.'}
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleRetry}
                      className="px-5 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                    >
                      Retry
                    </button>
                    <button
                      onClick={handleClose}
                      className="px-5 py-2 text-sm bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {panelState !== 'success' && panelState !== 'error' && (
              <div className="flex items-center justify-between gap-3 p-6 border-t border-slate-200 bg-slate-50">
                {(panelState === 'generate' || panelState === 'setup' || panelState === 'generating') && (
                  <>
                    <button
                      onClick={handleClose}
                      disabled={panelState === 'generating'}
                      className="px-6 py-2.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 font-medium transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleGenerate()}
                      disabled={panelState === 'generating'}
                      className="px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                      {panelState === 'generating' ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          Generating...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          Generate Draft
                        </>
                      )}
                    </button>
                  </>
                )}

                {panelState === 'edit' && (
                  <>
                    <button
                      onClick={handleBack}
                      disabled={previewing}
                      className="px-6 py-2.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 font-medium transition-colors disabled:opacity-50"
                    >
                      Back
                    </button>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleGenerate()}
                        disabled={previewing}
                        className="px-5 py-2.5 bg-slate-600 text-white rounded-lg hover:bg-slate-700 font-medium transition-colors disabled:opacity-50"
                      >
                        Regenerate
                      </button>
                      <button
                        onClick={() => handlePreview()}
                        disabled={previewing || !draftText.trim()}
                        className="px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
                      >
                        {previewing ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            Loading...
                          </>
                        ) : (
                          'Preview Draft'
                        )}
                      </button>
                    </div>
                  </>
                )}

                {(panelState === 'preview' || panelState === 'sending') && (
                  <>
                    <button
                      onClick={handleBack}
                      disabled={panelState === 'sending'}
                      className="px-6 py-2.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 font-medium transition-colors disabled:opacity-50"
                    >
                      Back to Edit
                    </button>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleCreateDraft}
                        disabled={panelState === 'sending' || !confirmed}
                        className="px-6 py-2.5 bg-slate-600 text-white rounded-lg hover:bg-slate-700 font-medium transition-colors disabled:opacity-50"
                      >
                        Create Gmail Draft
                      </button>
                      <button
                        onClick={handleSend}
                        disabled={panelState === 'sending' || !confirmed}
                        className="px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
                      >
                        {panelState === 'sending' ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            Sending...
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                            Send from TimeFlow
                          </>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
