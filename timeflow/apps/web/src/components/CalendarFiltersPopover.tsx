/**
 * Calendar Filters Popover
 *
 * Replaces the always-visible category legend with a popover-based filter UI.
 * Shows category filters + event type filters in a clean, accessible menu.
 *
 * Design Philosophy:
 * - Filters hidden by default (cleaner toolbar)
 * - Quick access via single button click
 * - Shows active filter count in button
 * - Elevation level 3 for popovers
 */

import React, { useState, useRef, useEffect } from 'react';

interface Category {
  id: string;
  name: string;
  color: string;
  order: number;
}

interface CalendarFiltersPopoverProps {
  categories: Category[];
  selectedCategories: Set<string>;
  onCategoryToggle: (categoryId: string) => void;
  showEvents: boolean;
  onToggleEvents: () => void;
}

export function CalendarFiltersPopover({
  categories,
  selectedCategories,
  onCategoryToggle,
  showEvents,
  onToggleEvents,
}: CalendarFiltersPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const activeFilterCount = selectedCategories.size + (showEvents ? 0 : 1);
  const allFiltersActive = selectedCategories.size === categories.length && showEvents;

  const handleSelectAll = () => {
    categories.forEach((cat) => {
      if (!selectedCategories.has(cat.id)) {
        onCategoryToggle(cat.id);
      }
    });
    if (!showEvents) {
      onToggleEvents();
    }
  };

  const handleClearAll = () => {
    selectedCategories.forEach((catId) => {
      onCategoryToggle(catId);
    });
    if (showEvents) {
      onToggleEvents();
    }
  };

  return (
    <div className="relative" ref={popoverRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg border font-medium text-sm transition-colors
          ${isOpen
            ? 'bg-primary-50 border-primary-200 text-primary-700'
            : 'bg-white border-slate-200 text-slate-700 hover:border-primary-200 hover:text-primary-700'
          }
        `}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
          />
        </svg>
        Filters
        {!allFiltersActive && activeFilterCount > 0 && (
          <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 text-xs font-semibold rounded-full bg-primary-600 text-white">
            {activeFilterCount}
          </span>
        )}
      </button>

      {/* Popover */}
      {isOpen && (
        <>
          {/* Backdrop (invisible but clickable) */}
          <div className="fixed inset-0 z-40" />

          {/* Popover Content */}
          <div
            className="absolute right-0 mt-2 w-72 bg-white rounded-lg border border-slate-200 shadow-lg z-50"
            style={{ boxShadow: 'var(--elevation-3)' }}
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">Filter Calendar</h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
                  aria-label="Close filters"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Filter Content */}
            <div className="px-4 py-3 space-y-4 max-h-96 overflow-y-auto">
              {/* Quick Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSelectAll}
                  disabled={allFiltersActive}
                  className="flex-1 px-3 py-1.5 text-xs font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Select All
                </button>
                <button
                  onClick={handleClearAll}
                  disabled={selectedCategories.size === 0 && !showEvents}
                  className="flex-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Clear All
                </button>
              </div>

              {/* Categories Section */}
              <div>
                <h4 className="text-xs font-semibold text-slate-700 mb-2">Categories</h4>
                <div className="space-y-1">
                  {categories.map((category) => {
                    const isSelected = selectedCategories.has(category.id);
                    return (
                      <button
                        key={category.id}
                        onClick={() => onCategoryToggle(category.id)}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center justify-center w-5 h-5 flex-shrink-0">
                          {isSelected ? (
                            <svg className="w-5 h-5 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                clipRule="evenodd"
                              />
                            </svg>
                          ) : (
                            <span className="w-5 h-5 rounded-full border-2 border-slate-300" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-1">
                          <span
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: category.color }}
                          />
                          <span className="text-sm font-medium text-slate-700 text-left">
                            {category.name}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Event Types Section */}
              <div className="pt-3 border-t border-slate-200">
                <h4 className="text-xs font-semibold text-slate-700 mb-2">Event Types</h4>
                <button
                  onClick={onToggleEvents}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center justify-center w-5 h-5 flex-shrink-0">
                    {showEvents ? (
                      <svg className="w-5 h-5 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : (
                      <span className="w-5 h-5 rounded-full border-2 border-slate-300" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-1">
                    <span className="w-3 h-3 rounded bg-slate-500 flex-shrink-0" />
                    <span className="text-sm font-medium text-slate-700 text-left">
                      Calendar Events
                    </span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
