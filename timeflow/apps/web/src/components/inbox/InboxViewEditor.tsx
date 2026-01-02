'use client';

import React, { useMemo } from 'react';
import type { InboxView } from '../../../../../packages/shared/src/types/email.js';
import type { EmailCategoryConfig } from '@/lib/api';

type Props = {
  views: InboxView[];
  categories: EmailCategoryConfig[];
  selectedViewId: string;
  onSelectView: (viewId: string) => void;
  onChange: (views: InboxView[]) => void;
  onDeleteView: (viewId: string) => void;
};

export function InboxViewEditor({
  views,
  categories,
  selectedViewId,
  onSelectView,
  onChange,
  onDeleteView,
}: Props) {
  const enabledCategories = useMemo(
    () => (Array.isArray(categories) ? categories.filter((category) => category.enabled) : []),
    [categories]
  );

  const selectedView = views.find((view) => view.id === selectedViewId) ?? views[0];
  const isLocked = selectedView?.id === 'all';
  const canDelete = Boolean(selectedView && !selectedView.isBuiltin && selectedView.id !== 'all');

  function updateSelectedView(nextView: InboxView) {
    onChange(views.map((view) => (view.id === nextView.id ? nextView : view)));
  }

  function handleAddView() {
    const newView: InboxView = {
      id: `custom-${Date.now()}`,
      name: 'New view',
      labelIds: [],
      isBuiltin: false,
    };
    onChange([...views, newView]);
    onSelectView(newView.id);
  }

  function toggleLabel(labelId: string) {
    if (!selectedView) return;
    const nextLabelIds = selectedView.labelIds.includes(labelId)
      ? selectedView.labelIds.filter((id) => id !== labelId)
      : [...selectedView.labelIds, labelId];
    updateSelectedView({ ...selectedView, labelIds: nextLabelIds });
  }

  if (!selectedView) {
    return null;
  }

  return (
    <div className="mt-4 rounded-2xl border border-[#e7e7e7] bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-[#1a1a1a]" style={{ fontFamily: "'Manrope', sans-serif" }}>
            Customize views
          </div>
          <div className="text-xs text-[#6b6b6b]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            Choose labels per view
          </div>
        </div>
        <button
          type="button"
          onClick={handleAddView}
          className="rounded-full border border-[#0BAF9A]/40 px-3 py-1 text-xs font-semibold text-[#0BAF9A] hover:bg-[#0BAF9A]/10"
          style={{ fontFamily: "'Manrope', sans-serif" }}
        >
          Add view
        </button>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-[180px_1fr]">
        <div className="flex flex-col gap-2">
          {views.map((view) => (
            <button
              key={view.id}
              type="button"
              onClick={() => onSelectView(view.id)}
              className={`rounded-lg border px-3 py-2 text-left text-sm transition-all ${
                view.id === selectedViewId
                  ? 'border-[#0BAF9A] bg-[#0BAF9A]/10 text-[#0BAF9A]'
                  : 'border-[#e0e0e0] text-[#1a1a1a] hover:border-[#0BAF9A]/60'
              }`}
              style={{ fontFamily: "'Manrope', sans-serif" }}
            >
              {view.name}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <label
                htmlFor={`inbox-view-name-${selectedView.id}`}
                className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8a8a8a]"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                View name
              </label>
              <input
                id={`inbox-view-name-${selectedView.id}`}
                type="text"
                value={selectedView.name}
                onChange={(event) =>
                  updateSelectedView({ ...selectedView, name: event.target.value })
                }
                disabled={isLocked}
                className="mt-2 w-full rounded-xl border border-[#e0e0e0] px-3 py-2 text-sm text-[#1a1a1a] disabled:bg-[#f5f5f5] disabled:text-[#9c9c9c]"
                style={{ fontFamily: "'Manrope', sans-serif" }}
              />
            </div>
            {canDelete && (
              <button
                type="button"
                onClick={() => onDeleteView(selectedView.id)}
                className="mt-6 rounded-full border border-[#f3b0b0] px-3 py-1 text-xs font-semibold text-[#c0392b] hover:bg-[#f3b0b0]/30"
                style={{ fontFamily: "'Manrope', sans-serif" }}
              >
                Delete view
              </button>
            )}
          </div>

          <div>
            <div
              className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8a8a8a]"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              Labels
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {enabledCategories.map((category) => {
                const isSelected = selectedView.labelIds.includes(category.id);
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => toggleLabel(category.id)}
                    disabled={isLocked}
                    className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all border-2 ${
                      isSelected ? 'border-[#1a1a1a]' : 'border-transparent hover:border-[#e0e0e0]'
                    }`}
                    style={{
                      backgroundColor: isSelected ? category.color : `${category.color}20`,
                      color: isSelected ? '#1a1a1a' : category.color,
                      fontFamily: "'Manrope', sans-serif",
                      opacity: isLocked ? 0.6 : 1,
                    }}
                  >
                    {category.emoji && <span className="mr-1.5">{category.emoji}</span>}
                    {category.name}
                  </button>
                );
              })}
            </div>
            {enabledCategories.length === 0 && (
              <div className="mt-2 text-xs text-[#9c9c9c]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                No labels available.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
