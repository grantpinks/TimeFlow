/**
 * Task Template Utilities
 *
 * Utilities for managing task templates stored in localStorage.
 */

export interface TaskTemplate {
  id: string;
  name: string;
  title: string;
  description?: string;
  durationMinutes: number;
  priority: 1 | 2 | 3;
  categoryId?: string;
}

const TEMPLATES_KEY = 'timeflow_task_templates';

/**
 * Get all task templates from localStorage
 */
export function getTaskTemplates(): TaskTemplate[] {
  try {
    const stored = localStorage.getItem(TEMPLATES_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to load task templates:', error);
    return [];
  }
}

/**
 * Save a new task template
 */
export function saveTaskTemplate(template: Omit<TaskTemplate, 'id'>): TaskTemplate {
  const templates = getTaskTemplates();
  const newTemplate: TaskTemplate = {
    ...template,
    id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  };

  templates.push(newTemplate);
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
  return newTemplate;
}

/**
 * Update an existing task template
 */
export function updateTaskTemplate(id: string, updates: Partial<Omit<TaskTemplate, 'id'>>): TaskTemplate | null {
  const templates = getTaskTemplates();
  const index = templates.findIndex((t) => t.id === id);

  if (index === -1) return null;

  templates[index] = { ...templates[index], ...updates };
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
  return templates[index];
}

/**
 * Delete a task template
 */
export function deleteTaskTemplate(id: string): boolean {
  const templates = getTaskTemplates();
  const filtered = templates.filter((t) => t.id !== id);

  if (filtered.length === templates.length) return false;

  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(filtered));
  return true;
}

/**
 * Get default templates (common task patterns)
 */
export function getDefaultTemplates(): Omit<TaskTemplate, 'id'>[] {
  return [
    {
      name: 'Quick Task (15min)',
      title: '',
      description: '',
      durationMinutes: 15,
      priority: 2,
    },
    {
      name: '30min Meeting',
      title: 'Meeting: ',
      description: '',
      durationMinutes: 30,
      priority: 2,
    },
    {
      name: '1hr Deep Work',
      title: 'Focus: ',
      description: '',
      durationMinutes: 60,
      priority: 1,
    },
    {
      name: '2hr Project Work',
      title: 'Project: ',
      description: '',
      durationMinutes: 120,
      priority: 1,
    },
  ];
}
