/**
 * Task Export Utilities
 *
 * Utilities for exporting tasks to various formats.
 */

import type { Task } from '@timeflow/shared';

/**
 * Export tasks to CSV format
 * @param tasks - Array of tasks to export
 * @param filename - Optional filename (defaults to timeflow-tasks-YYYY-MM-DD.csv)
 */
export function exportTasksToCSV(tasks: Task[], filename?: string) {
  // Define CSV headers
  const headers = [
    'Title',
    'Description',
    'Status',
    'Priority',
    'Category',
    'Duration (min)',
    'Due Date',
    'Scheduled Start',
    'Scheduled End',
    'Overflowed',
    'Created At',
  ];

  // Convert tasks to CSV rows
  const rows = tasks.map((task) => {
    const priorityLabel = task.priority === 1 ? 'High' : task.priority === 2 ? 'Medium' : 'Low';

    return [
      escapeCsvValue(task.title),
      escapeCsvValue(task.description || ''),
      task.status,
      priorityLabel,
      escapeCsvValue(task.category?.name || ''),
      task.durationMinutes.toString(),
      task.dueDate ? formatDate(new Date(task.dueDate)) : '',
      task.scheduledTask ? formatDateTime(new Date(task.scheduledTask.startDateTime)) : '',
      task.scheduledTask ? formatDateTime(new Date(task.scheduledTask.endDateTime)) : '',
      task.scheduledTask?.overflowedDeadline ? 'Yes' : 'No',
      formatDateTime(new Date(task.createdAt)),
    ];
  });

  // Generate CSV content
  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.join(',')),
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  // Generate filename if not provided
  const downloadFilename =
    filename || `timeflow-tasks-${new Date().toISOString().split('T')[0]}.csv`;

  link.href = url;
  link.download = downloadFilename;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up
  URL.revokeObjectURL(url);
}

/**
 * Escape CSV value (handle commas, quotes, and newlines)
 */
function escapeCsvValue(value: string): string {
  if (!value) return '';

  // Check if value contains comma, quote, or newline
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    // Escape quotes by doubling them and wrap in quotes
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/**
 * Format datetime as YYYY-MM-DD HH:MM
 */
function formatDateTime(date: Date): string {
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
