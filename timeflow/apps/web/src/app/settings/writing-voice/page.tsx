'use client';

/**
 * Writing & Voice Settings Page
 * Configure AI email draft writing preferences
 * Sprint 16 Phase B+: AI Email Draft Workflow
 */

import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import * as api from '@/lib/api';
import toast, { Toaster } from 'react-hot-toast';

export default function WritingVoiceSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Form state
  const [formality, setFormality] = useState(5);
  const [length, setLength] = useState(5);
  const [tone, setTone] = useState(5);
  const [voiceSamples, setVoiceSamples] = useState('');

  // Usage stats
  const [aiDraftsGenerated, setAiDraftsGenerated] = useState(0);

  // Load voice profile on mount
  useEffect(() => {
    loadVoiceProfile();
  }, []);

  async function loadVoiceProfile() {
    setLoading(true);
    try {
      const profile = await api.getWritingVoice();
      setFormality(profile.formality);
      setLength(profile.length);
      setTone(profile.tone);
      setVoiceSamples(profile.voiceSamples || '');
      setAiDraftsGenerated(profile.aiDraftsGenerated);

      // Show advanced section if user has voice samples
      if (profile.voiceSamples) {
        setShowAdvanced(true);
      }
    } catch (err) {
      console.error('Failed to load voice profile:', err);
      toast.error('Failed to load voice profile. Using defaults.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateWritingVoice({
        formality,
        length,
        tone,
        voiceSamples: voiceSamples.trim() || undefined,
      });
      toast.success('Writing voice preferences saved successfully!');

      // Reload to get updated usage stats
      await loadVoiceProfile();
    } catch (err: any) {
      console.error('Failed to save voice profile:', err);
      toast.error(err.message || 'Failed to save preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  }

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

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Writing & Voice</h1>
          <p className="text-slate-600 mt-2">
            Configure how AI drafts emails in your unique voice and style.
          </p>
        </div>

        <Toaster position="top-right" />

        <form onSubmit={handleSave} className="space-y-8">
          {/* Default Writing Style */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Default Writing Style</h2>
            <p className="text-sm text-slate-600 mb-6">
              These settings control how AI drafts your emails by default.
            </p>

            {/* Formality Slider */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-3">
                Formality: <span className="text-primary-600 font-semibold">{getSliderLabel(formality, 'formality')}</span>
              </label>
              <div className="flex items-center gap-4">
                <span className="text-sm text-slate-500 min-w-[70px]">Casual</span>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={formality}
                  onChange={(e) => setFormality(Number(e.target.value))}
                  className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                />
                <span className="text-sm text-slate-500 min-w-[100px] text-right">Professional</span>
              </div>
              <p className="text-xs text-slate-500 mt-2 ml-[86px]">
                {formality <= 3 && 'Relaxed, conversational tone with contractions and informal language'}
                {formality > 3 && formality < 7 && 'Balanced approach suitable for most business communication'}
                {formality >= 7 && 'Polished, formal language appropriate for executives and clients'}
              </p>
            </div>

            {/* Length Slider */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-3">
                Length: <span className="text-primary-600 font-semibold">{getSliderLabel(length, 'length')}</span>
              </label>
              <div className="flex items-center gap-4">
                <span className="text-sm text-slate-500 min-w-[70px]">Concise</span>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={length}
                  onChange={(e) => setLength(Number(e.target.value))}
                  className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                />
                <span className="text-sm text-slate-500 min-w-[100px] text-right">Detailed</span>
              </div>
              <p className="text-xs text-slate-500 mt-2 ml-[86px]">
                {length <= 3 && 'Brief responses (2-3 sentences), gets straight to the point'}
                {length > 3 && length < 7 && 'Moderate length (3-5 sentences), balances brevity with detail'}
                {length >= 7 && 'Comprehensive responses (5-7+ sentences), provides thorough explanations'}
              </p>
            </div>

            {/* Tone Slider */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-3">
                Tone: <span className="text-primary-600 font-semibold">{getSliderLabel(tone, 'tone')}</span>
              </label>
              <div className="flex items-center gap-4">
                <span className="text-sm text-slate-500 min-w-[70px]">Friendly</span>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={tone}
                  onChange={(e) => setTone(Number(e.target.value))}
                  className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                />
                <span className="text-sm text-slate-500 min-w-[100px] text-right">Formal</span>
              </div>
              <p className="text-xs text-slate-500 mt-2 ml-[86px]">
                {tone <= 3 && 'Warm, personable tone that builds rapport and connection'}
                {tone > 3 && tone < 7 && 'Professional yet approachable, suitable for most contexts'}
                {tone >= 7 && 'Respectful, reserved tone appropriate for formal situations'}
              </p>
            </div>
          </div>

          {/* Advanced Section */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between p-6 hover:bg-slate-50 transition-colors"
            >
              <div className="text-left">
                <h2 className="text-xl font-semibold text-slate-900">Advanced: Teach AI Your Voice</h2>
                <p className="text-sm text-slate-600 mt-1">
                  Paste examples of emails you&apos;ve written to personalize your voice
                </p>
              </div>
              <svg
                className={`w-6 h-6 text-slate-400 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showAdvanced && (
              <div className="p-6 pt-0 border-t border-slate-200">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Writing Samples
                  </label>
                  <textarea
                    value={voiceSamples}
                    onChange={(e) => setVoiceSamples(e.target.value)}
                    rows={8}
                    placeholder="Paste 2-3 emails you've written that represent your typical voice...

Example:
---
Hi Sarah,

Thanks for reaching out! I'd be happy to help with that. Let me take a look at the proposal and get back to you by end of day tomorrow.

Best,
[Your Name]
---"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none font-mono text-sm"
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    💡 <strong>Tip:</strong> Include emails showing your typical greetings, tone, sign-offs, and how you structure your messages. This helps AI match your unique voice.
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-sm text-blue-800">
                      <p className="font-semibold mb-1">Privacy Note</p>
                      <p>Your writing samples are stored securely and only used to personalize your AI-generated drafts. They are never shared with third parties.</p>
                      {/* TODO: Post-beta - Add "Clear Samples" button and privacy controls */}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Usage Stats */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-2">AI Usage This Month</h2>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-primary-600">{aiDraftsGenerated}</span>
              <span className="text-slate-600">drafts generated</span>
            </div>
            <p className="text-sm text-slate-500 mt-2">
              {/* TODO: Post-beta - Add quota enforcement and tier-based limits */}
              You&apos;re using AI email drafts to save time. Keep it up!
            </p>
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-end gap-4 pt-6 border-t border-slate-200">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="px-6 py-2.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Saving...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save Preferences
                </>
              )}
            </button>
          </div>
        </form>

        {/* Footer Note */}
        <div className="mt-8 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <p className="text-sm text-slate-600">
            <strong>Note:</strong> These settings apply to all AI-generated email drafts. You can override them on a per-draft basis when composing.
          </p>
        </div>
      </div>
    </Layout>
  );
}
