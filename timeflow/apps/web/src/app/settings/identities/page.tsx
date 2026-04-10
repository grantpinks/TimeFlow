'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Identity } from '@timeflow/shared';
import * as api from '@/lib/api';
import { Layout } from '@/components/Layout';
import {
  IDENTITY_COLORS,
  IDENTITY_TEMPLATES,
  IDENTITY_LIMIT,
  hexWithOpacity,
  type IdentityTemplate,
} from '@/lib/identityConstants';

// ─── Types ───────────────────────────────────────────────────────────────────

interface FormState {
  name: string;
  description: string;
  color: string;
  icon: string;
}

const EMPTY_FORM: FormState = { name: '', description: '', color: '#0d9488', icon: '⭐' };

// ─── Emoji Picker (Simple Grid) ───────────────────────────────────────────────

const COMMON_EMOJIS = [
  '⭐','💼','🌱','💪','🎨','💰','💕','📚','🧘','🏡','✈️','🎯','🔥','💡','🏆',
  '🎵','📝','🌍','🤝','💻','🎓','🍎','🏃','🧠','❤️','🌊','🦋','🎉','🚀','⚡',
];

function EmojiPicker({ value, onChange }: { value: string; onChange: (e: string) => void }) {
  return (
    <div className="grid grid-cols-10 gap-1 p-2 bg-slate-50 rounded-lg border border-slate-200">
      {COMMON_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onChange(emoji)}
          className={`
            w-8 h-8 rounded flex items-center justify-center text-lg transition-all
            ${value === emoji
              ? 'bg-primary-100 ring-2 ring-primary-500 scale-110'
              : 'hover:bg-slate-200 hover:scale-105'
            }
          `}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

// ─── Template Card ────────────────────────────────────────────────────────────

function TemplateCard({
  template,
  onSelect,
}: {
  template: IdentityTemplate;
  onSelect: (t: IdentityTemplate) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(template)}
      className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:border-primary-300 hover:bg-primary-50/40 transition-all duration-150 text-left group"
    >
      <span
        className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
        style={{ backgroundColor: hexWithOpacity(template.color, 0.15) }}
      >
        {template.icon}
      </span>
      <div className="min-w-0">
        <p className="font-semibold text-sm text-slate-900 group-hover:text-primary-700">{template.name}</p>
        <p className="text-xs text-slate-500 leading-snug mt-0.5">{template.description}</p>
      </div>
    </button>
  );
}

// ─── Identity Form Modal ──────────────────────────────────────────────────────

function IdentityFormModal({
  isOpen,
  identity,
  isFirstIdentity,
  onClose,
  onSave,
  saving,
  error,
}: {
  isOpen: boolean;
  identity: Identity | null;
  isFirstIdentity: boolean;
  onClose: () => void;
  onSave: (form: FormState) => void;
  saving: boolean;
  error: string | null;
}) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [showTemplates, setShowTemplates] = useState(true);

  useEffect(() => {
    if (identity) {
      setForm({
        name: identity.name,
        description: identity.description ?? '',
        color: identity.color,
        icon: identity.icon,
      });
      setShowTemplates(false);
    } else {
      setForm(EMPTY_FORM);
      setShowTemplates(isFirstIdentity);
    }
  }, [identity, isOpen, isFirstIdentity]);

  function applyTemplate(t: IdentityTemplate) {
    setForm({ name: t.name, description: t.description, color: t.color, icon: t.icon });
    setShowTemplates(false);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        transition={{ duration: 0.2 }}
        className="relative w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">
            {identity ? 'Edit Identity' : 'Create Identity'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          <AnimatePresence mode="wait">
            {showTemplates ? (
              <motion.div
                key="templates"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-5 space-y-4"
              >
                <p className="text-sm text-slate-600">
                  Choose a template to get started quickly, or create a custom identity.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {IDENTITY_TEMPLATES.map((t) => (
                    <TemplateCard key={t.name} template={t} onSelect={applyTemplate} />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setShowTemplates(false)}
                  className="w-full py-2.5 text-sm text-slate-500 hover:text-slate-700 border border-dashed border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  + Create custom identity
                </button>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="p-5 space-y-4"
                onSubmit={(e) => { e.preventDefault(); onSave(form); }}
              >
                {!identity && (
                  <button
                    type="button"
                    onClick={() => setShowTemplates(true)}
                    className="flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-700 font-medium"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to templates
                  </button>
                )}

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    maxLength={50}
                    placeholder="e.g. Writer, Athlete, Leader"
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm outline-none"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Description <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    maxLength={200}
                    rows={2}
                    placeholder="What does this identity mean to you?"
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm outline-none resize-none"
                  />
                </div>

                {/* Icon */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Icon</label>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="w-12 h-12 rounded-xl border-2 border-slate-200 flex items-center justify-center text-2xl"
                      style={{ backgroundColor: hexWithOpacity(form.color, 0.1) }}>
                      {form.icon}
                    </span>
                    <p className="text-xs text-slate-500">Pick an emoji that represents this identity</p>
                  </div>
                  <EmojiPicker value={form.icon} onChange={(e) => setForm((f) => ({ ...f, icon: e })) } />
                </div>

                {/* Color */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Color</label>
                  <div className="flex flex-wrap gap-2">
                    {IDENTITY_COLORS.map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, color: c.hex }))}
                        className={`
                          w-9 h-9 rounded-full transition-all duration-150
                          ${form.color === c.hex
                            ? 'scale-110 ring-2 ring-offset-2'
                            : 'hover:scale-105'
                          }
                        `}
                        style={{
                          backgroundColor: c.hex,
                          ...(form.color === c.hex ? { ringColor: c.hex } : {}),
                        }}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>

                {/* Preview */}
                {form.name && (
                  <div className="p-3 rounded-xl border border-slate-100 bg-slate-50">
                    <p className="text-xs text-slate-500 mb-2 font-medium">Preview</p>
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border"
                      style={{
                        backgroundColor: hexWithOpacity(form.color, 0.12),
                        borderColor: hexWithOpacity(form.color, 0.4),
                        color: form.color,
                      }}
                    >
                      {form.icon} {form.name}
                    </span>
                  </div>
                )}

                {error && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!form.name.trim() || saving}
                    className="flex-1 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
                  >
                    {saving ? 'Saving…' : identity ? 'Save Changes' : 'Create Identity'}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Identity Card (List Item) ────────────────────────────────────────────────

function IdentityListCard({
  identity,
  onEdit,
  onDelete,
}: {
  identity: Identity;
  onEdit: (i: Identity) => void;
  onDelete: (id: string) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-colors"
    >
      {/* Icon */}
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
        style={{ backgroundColor: hexWithOpacity(identity.color, 0.15) }}
      >
        {identity.icon}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-slate-900">{identity.name}</h3>
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: identity.color }}
          />
        </div>
        {identity.description && (
          <p className="text-sm text-slate-500 truncate mt-0.5">{identity.description}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {confirmDelete ? (
          <>
            <span className="text-xs text-slate-500 mr-1">Delete?</span>
            <button
              onClick={() => onDelete(identity.id)}
              className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              Yes
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-2.5 py-1.5 border border-slate-200 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-50 transition-colors"
            >
              No
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => onEdit(identity)}
              className="p-2 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
              title="Edit"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Delete"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function IdentitiesSettingsPage() {
  const [identities, setIdentities] = useState<Identity[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingIdentity, setEditingIdentity] = useState<Identity | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [migrationDone, setMigrationDone] = useState(false);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [fetched, migration] = await Promise.all([
          api.getIdentities(),
          api.getIdentityMigrationStatus(),
        ]);
        setIdentities(fetched);

        if (migration.needsMigration) {
          const result = await api.runIdentityMigration();
          setIdentities(result.identities);
          if (result.identities.length > 0) {
            showToast(`✨ Created ${result.identities.length} identities from your habits`);
          }
          setMigrationDone(true);
        }
      } catch {
        // Silent — migration is optional
      } finally {
        setLoading(false);
      }
    })();
  }, [showToast]);

  async function handleSave(form: FormState) {
    setError(null);
    setSaving(true);
    try {
      if (editingIdentity) {
        const updated = await api.updateIdentity(editingIdentity.id, form);
        setIdentities((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
        showToast('Identity updated');
      } else {
        const created = await api.createIdentity(form);
        setIdentities((prev) => [...prev, created]);
        showToast('Identity created!');
      }
      setModalOpen(false);
      setEditingIdentity(null);
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('maximum of 5')) setError('You have reached the limit of 5 identities.');
      else if (msg.includes('already have')) setError('You already have an identity with that name.');
      else setError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.deleteIdentity(id);
      setIdentities((prev) => prev.filter((i) => i.id !== id));
      showToast('Identity deleted');
    } catch {
      showToast('Failed to delete identity');
    }
  }

  function openCreate() {
    setEditingIdentity(null);
    setError(null);
    setModalOpen(true);
  }

  function openEdit(identity: Identity) {
    setEditingIdentity(identity);
    setError(null);
    setModalOpen(true);
  }

  const atLimit = identities.length >= IDENTITY_LIMIT;

  return (
    <Layout>
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">My Identities</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Link your tasks and habits to who you're becoming.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-sm text-slate-500">{identities.length}/{IDENTITY_LIMIT}</span>
          <button
            onClick={openCreate}
            disabled={atLimit}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Identity
          </button>
        </div>
      </div>

      {atLimit && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
          You've reached the 5 identity limit. Delete an existing identity to create a new one.
        </div>
      )}

      {migrationDone && identities.length > 0 && (
        <div className="p-3 bg-primary-50 border border-primary-200 rounded-xl text-sm text-primary-700">
          ✨ We've automatically created identities from your existing habits. Review and customize them below.
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : identities.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">🌱</div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Create your first identity</h2>
          <p className="text-slate-500 text-sm max-w-sm mx-auto mb-6">
            Identities connect your daily tasks and habits to who you want to become. Start with a template or create your own.
          </p>
          <button
            onClick={openCreate}
            className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-colors shadow-sm"
          >
            + Create Identity
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {identities.map((identity) => (
              <IdentityListCard
                key={identity.id}
                identity={identity}
                onEdit={openEdit}
                onDelete={handleDelete}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Info callout */}
      {identities.length > 0 && (
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-600 space-y-1">
          <p className="font-medium text-slate-700">How identities work</p>
          <p>Link tasks and habits to an identity to track your daily progress toward each life area. Your Today page will show identity progress rings so you can see which areas you're advancing.</p>
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {modalOpen && (
          <IdentityFormModal
            isOpen={modalOpen}
            identity={editingIdentity}
            isFirstIdentity={identities.length === 0}
            onClose={() => { setModalOpen(false); setEditingIdentity(null); setError(null); }}
            onSave={handleSave}
            saving={saving}
            error={error}
          />
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-full shadow-xl"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </Layout>
  );
}
