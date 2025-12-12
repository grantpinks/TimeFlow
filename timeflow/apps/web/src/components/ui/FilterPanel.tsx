'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Input, Select, Label } from '@/components/ui';
import type { Category } from '@timeflow/shared';

export interface TaskFilters {
  categories: Set<string>;
  priority: number | null;
  dueDateFrom: string;
  dueDateTo: string;
  durationRange: 'short' | 'medium' | 'long' | null;
}

interface FilterPanelProps {
  filters: TaskFilters;
  onFiltersChange: (filters: TaskFilters) => void;
  categories: Category[];
  isOpen: boolean;
  onToggle: () => void;
}

export function FilterPanel({
  filters,
  onFiltersChange,
  categories,
  isOpen,
  onToggle,
}: FilterPanelProps) {
  const [localFilters, setLocalFilters] = useState(filters);

  const handleCategoryToggle = (categoryId: string) => {
    const newCategories = new Set(localFilters.categories);
    if (newCategories.has(categoryId)) {
      newCategories.delete(categoryId);
    } else {
      newCategories.add(categoryId);
    }
    const updated = { ...localFilters, categories: newCategories };
    setLocalFilters(updated);
    onFiltersChange(updated);
  };

  const handlePriorityChange = (priority: number | null) => {
    const updated = { ...localFilters, priority };
    setLocalFilters(updated);
    onFiltersChange(updated);
  };

  const handleDurationChange = (durationRange: 'short' | 'medium' | 'long' | null) => {
    const updated = { ...localFilters, durationRange };
    setLocalFilters(updated);
    onFiltersChange(updated);
  };

  const handleDateChange = (field: 'dueDateFrom' | 'dueDateTo', value: string) => {
    const updated = { ...localFilters, [field]: value };
    setLocalFilters(updated);
    onFiltersChange(updated);
  };

  const handleClearAll = () => {
    const cleared: TaskFilters = {
      categories: new Set(),
      priority: null,
      dueDateFrom: '',
      dueDateTo: '',
      durationRange: null,
    };
    setLocalFilters(cleared);
    onFiltersChange(cleared);
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (localFilters.categories.size > 0) count++;
    if (localFilters.priority !== null) count++;
    if (localFilters.dueDateFrom || localFilters.dueDateTo) count++;
    if (localFilters.durationRange !== null) count++;
    return count;
  };

  const activeCount = getActiveFilterCount();

  return (
    <div className="space-y-3">
      {/* Toggle Button */}
      <div className="flex items-center justify-between">
        <Button
          onClick={onToggle}
          variant="ghost"
          size="sm"
          leftIcon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
          }
        >
          Filters
          {activeCount > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-primary-600 text-white text-xs rounded-full">
              {activeCount}
            </span>
          )}
        </Button>

        {activeCount > 0 && (
          <button
            onClick={handleClearAll}
            className="text-sm text-slate-500 hover:text-slate-700 underline"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Filter Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-4">
              {/* Category Filter */}
              {categories.length > 0 && (
                <div>
                  <Label>Categories</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {categories.map((category) => {
                      const isSelected = localFilters.categories.has(category.id);
                      return (
                        <button
                          key={category.id}
                          onClick={() => handleCategoryToggle(category.id)}
                          className={`
                            px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                            ${
                              isSelected
                                ? 'ring-2 ring-primary-500 ring-offset-1'
                                : 'hover:ring-2 hover:ring-slate-300'
                            }
                          `}
                          style={{
                            backgroundColor: category.color ? `${category.color}20` : '#f1f5f9',
                            color: category.color || '#64748b',
                          }}
                        >
                          {category.name}
                          {isSelected && (
                            <svg
                              className="inline ml-1 w-3 h-3"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Priority Filter */}
              <div>
                <Label>Priority</Label>
                <div className="mt-2 flex gap-2">
                  {[
                    { value: null, label: 'Any' },
                    { value: 1, label: 'High' },
                    { value: 2, label: 'Medium' },
                    { value: 3, label: 'Low' },
                  ].map((option) => (
                    <button
                      key={option.label}
                      onClick={() => handlePriorityChange(option.value)}
                      className={`
                        px-3 py-1.5 rounded-lg text-sm font-medium transition-all border-2
                        ${
                          localFilters.priority === option.value
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-slate-200 text-slate-700 hover:border-slate-300'
                        }
                      `}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration Filter */}
              <div>
                <Label>Duration</Label>
                <div className="mt-2 flex gap-2">
                  {[
                    { value: null, label: 'Any' },
                    { value: 'short' as const, label: '< 30min' },
                    { value: 'medium' as const, label: '30-60min' },
                    { value: 'long' as const, label: '> 1hr' },
                  ].map((option) => (
                    <button
                      key={option.label}
                      onClick={() => handleDurationChange(option.value)}
                      className={`
                        px-3 py-1.5 rounded-lg text-sm font-medium transition-all border-2
                        ${
                          localFilters.durationRange === option.value
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-slate-200 text-slate-700 hover:border-slate-300'
                        }
                      `}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date Range Filter */}
              <div>
                <Label>Due Date Range</Label>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-600 mb-1 block">From</label>
                    <Input
                      type="date"
                      value={localFilters.dueDateFrom}
                      onChange={(e) => handleDateChange('dueDateFrom', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-600 mb-1 block">To</label>
                    <Input
                      type="date"
                      value={localFilters.dueDateTo}
                      onChange={(e) => handleDateChange('dueDateTo', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Filters Chips */}
      {activeCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {/* Category chips */}
          {Array.from(localFilters.categories).map((categoryId) => {
            const category = categories.find((c) => c.id === categoryId);
            if (!category) return null;
            return (
              <motion.div
                key={categoryId}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium"
                style={{
                  backgroundColor: category.color ? `${category.color}30` : '#e2e8f0',
                  color: category.color || '#64748b',
                }}
              >
                {category.name}
                <button
                  onClick={() => handleCategoryToggle(categoryId)}
                  className="hover:opacity-70"
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </motion.div>
            );
          })}

          {/* Priority chip */}
          {localFilters.priority !== null && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 rounded-md text-xs font-medium text-slate-700"
            >
              Priority:{' '}
              {localFilters.priority === 1
                ? 'High'
                : localFilters.priority === 2
                  ? 'Medium'
                  : 'Low'}
              <button onClick={() => handlePriorityChange(null)} className="hover:opacity-70">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </motion.div>
          )}

          {/* Duration chip */}
          {localFilters.durationRange && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 rounded-md text-xs font-medium text-slate-700"
            >
              Duration:{' '}
              {localFilters.durationRange === 'short'
                ? '< 30min'
                : localFilters.durationRange === 'medium'
                  ? '30-60min'
                  : '> 1hr'}
              <button onClick={() => handleDurationChange(null)} className="hover:opacity-70">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </motion.div>
          )}

          {/* Date range chip */}
          {(localFilters.dueDateFrom || localFilters.dueDateTo) && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 rounded-md text-xs font-medium text-slate-700"
            >
              Due:{' '}
              {localFilters.dueDateFrom &&
                new Date(localFilters.dueDateFrom).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              {localFilters.dueDateFrom && localFilters.dueDateTo && ' - '}
              {localFilters.dueDateTo &&
                new Date(localFilters.dueDateTo).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              <button
                onClick={() => {
                  const updated = { ...localFilters, dueDateFrom: '', dueDateTo: '' };
                  setLocalFilters(updated);
                  onFiltersChange(updated);
                }}
                className="hover:opacity-70"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}
