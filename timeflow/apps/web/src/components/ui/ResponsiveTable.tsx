'use client';

import React from 'react';
import { useViewport } from '@/hooks/useViewport';

export interface Column<T> {
  header: string;
  accessor: keyof T | ((row: T) => React.ReactNode);
  className?: string;
  mobileLabel?: string; // Label to show in mobile card view
}

interface ResponsiveTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (row: T) => string | number;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
}

/**
 * Table that switches to card-based layout on mobile
 */
export function ResponsiveTable<T>({
  data,
  columns,
  keyExtractor,
  onRowClick,
  emptyMessage = 'No data available',
}: ResponsiveTableProps<T>) {
  const { isMobile } = useViewport();

  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  const getValue = (row: T, column: Column<T>): React.ReactNode => {
    if (typeof column.accessor === 'function') {
      return column.accessor(row);
    }
    return row[column.accessor] as React.ReactNode;
  };

  // Mobile: Card-based layout
  if (isMobile) {
    return (
      <div className="space-y-3">
        {data.map((row) => (
          <div
            key={keyExtractor(row)}
            className={`bg-white rounded-lg border border-slate-200 p-4 ${
              onRowClick ? 'cursor-pointer active:scale-98 transition-transform' : ''
            }`}
            onClick={() => onRowClick?.(row)}
          >
            <div className="space-y-2">
              {columns.map((column, idx) => (
                <div key={idx} className="flex justify-between items-start gap-3">
                  <span className="text-sm font-medium text-slate-600 flex-shrink-0">
                    {column.mobileLabel || column.header}:
                  </span>
                  <span className="text-sm text-slate-900 text-right">
                    {getValue(row, column)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Desktop: Standard table layout
  return (
    <div className="overflow-x-auto -mx-4 md:mx-0">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            {columns.map((column, idx) => (
              <th
                key={idx}
                className={`px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider ${column.className || ''}`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-200">
          {data.map((row) => (
            <tr
              key={keyExtractor(row)}
              className={onRowClick ? 'hover:bg-slate-50 cursor-pointer transition-colors' : ''}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((column, idx) => (
                <td key={idx} className={`px-6 py-4 whitespace-nowrap text-sm ${column.className || ''}`}>
                  {getValue(row, column)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
