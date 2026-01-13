'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui';
import type { TaskTemplate } from '@/utils/taskTemplates';
import {
  getTaskTemplates,
  getDefaultTemplates,
  deleteTaskTemplate,
} from '@/utils/taskTemplates';
import type { Category } from '@timeflow/shared';

interface TemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: Omit<TaskTemplate, 'id'>) => void;
  categories: Category[];
}

export function TemplateModal({
  isOpen,
  onClose,
  onSelectTemplate,
  categories,
}: TemplateModalProps) {
  const prefersReducedMotion = useReducedMotion();
  const [customTemplates, setCustomTemplates] = useState<TaskTemplate[]>([]);
  // Load custom templates
  useEffect(() => {
    if (isOpen) {
      setCustomTemplates(getTaskTemplates());
    }
  }, [isOpen]);

  const handleSelectTemplate = (template: Omit<TaskTemplate, 'id'>) => {
    onSelectTemplate(template);
    onClose();
  };

  const handleDeleteTemplate = (id: string) => {
    if (confirm('Delete this template?')) {
      deleteTaskTemplate(id);
      setCustomTemplates(getTaskTemplates());
    }
  };

  const defaultTemplates = getDefaultTemplates();

  const getCategoryName = (categoryId?: string) => {
    if (!categoryId) return undefined;
    return categories.find((c) => c.id === categoryId)?.name;
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          initial={{ opacity: prefersReducedMotion ? 1 : 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: prefersReducedMotion ? 1 : 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-2xl bg-white rounded-lg shadow-xl border border-slate-200 max-h-[80vh] overflow-hidden flex flex-col"
            initial={prefersReducedMotion ? false : { y: 20, opacity: 0 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { y: 0, opacity: 1 }}
            exit={prefersReducedMotion ? { opacity: 1 } : { y: 10, opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.18, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <h3 className="text-xl font-semibold text-slate-800">Task Templates</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Create tasks quickly from pre-defined templates
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600"
                aria-label="Close template modal"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
              {/* Default Templates */}
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3">Quick Templates</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {defaultTemplates.map((template, index) => (
                    <button
                      key={index}
                      onClick={() => handleSelectTemplate(template)}
                      className="text-left p-4 border-2 border-slate-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all"
                    >
                      <div className="font-medium text-slate-900">{template.name}</div>
                      <div className="text-sm text-slate-600 mt-1">
                        {formatDuration(template.durationMinutes)} • Priority:{' '}
                        {template.priority === 1 ? 'High' : template.priority === 2 ? 'Medium' : 'Low'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Templates */}
              {customTemplates.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-3">Custom Templates</h4>
                  <div className="space-y-2">
                    {customTemplates.map((template) => (
                      <div
                        key={template.id}
                        className="flex items-start gap-3 p-4 border border-slate-200 rounded-lg hover:bg-slate-50"
                      >
                        <button
                          onClick={() => handleSelectTemplate(template)}
                          className="flex-1 text-left"
                        >
                          <div className="font-medium text-slate-900">{template.name}</div>
                          <div className="text-sm text-slate-600 mt-1">
                            {template.title && `"${template.title}"`}
                            {template.title && ' • '}
                            {formatDuration(template.durationMinutes)} • Priority:{' '}
                            {template.priority === 1 ? 'High' : template.priority === 2 ? 'Medium' : 'Low'}
                            {template.categoryId && ` • ${getCategoryName(template.categoryId)}`}
                          </div>
                        </button>
                        <button
                          onClick={() => handleDeleteTemplate(template.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete template"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {customTemplates.length === 0 && (
                <div className="text-center py-8 text-slate-500 text-sm">
                  <svg
                    className="w-12 h-12 mx-auto mb-3 text-slate-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <p>No custom templates yet</p>
                  <p className="text-xs mt-1">Save a task as a template from the task form</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
              <Button onClick={onClose} variant="ghost">
                Close
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
