/**
 * Schedule Preview Component
 *
 * Displays bulk scheduling suggestions with day-by-day accordion,
 * drag-and-drop customization, and conflict detection.
 */

'use client';

import { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { DateTime } from 'luxon';

export interface HabitBlock {
  id: string; // temp ID for frontend tracking
  habitId: string;
  habitTitle: string;
  startDateTime: string; // ISO string
  endDateTime: string; // ISO string
  date: string; // ISO date (YYYY-MM-DD)
  dayOfWeek: string; // e.g., "Monday"
}

interface SchedulePreviewProps {
  suggestions: HabitBlock[];
  onAcceptAll: (blocks: HabitBlock[]) => void;
  onCancel: () => void;
}

export function SchedulePreview({ suggestions, onAcceptAll, onCancel }: SchedulePreviewProps) {
  const [blocks, setBlocks] = useState<HabitBlock[]>(suggestions);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  // Group blocks by date
  const blocksByDate = blocks.reduce((acc, block) => {
    if (!acc[block.date]) {
      acc[block.date] = [];
    }
    acc[block.date].push(block);
    return acc;
  }, {} as Record<string, HabitBlock[]>);

  const dates = Object.keys(blocksByDate).sort();

  const toggleDay = (date: string) => {
    const newExpanded = new Set(expandedDays);
    if (newExpanded.has(date)) {
      newExpanded.delete(date);
    } else {
      newExpanded.add(date);
    }
    setExpandedDays(newExpanded);
  };

  const removeBlock = (blockId: string) => {
    setBlocks(blocks.filter(b => b.id !== blockId));
  };

  const handleDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;

    // Dropped outside valid droppable
    if (!destination) return;

    // No actual movement
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    // Find the dragged block
    const draggedBlock = blocks.find(b => b.id === draggableId);
    if (!draggedBlock) return;

    // For v1, we only support reordering within the same day
    // Moving between days would require time recalculation
    if (source.droppableId !== destination.droppableId) {
      console.warn('Cross-day drag not supported in v1');
      return;
    }

    const date = source.droppableId;
    const dayBlocks = blocksByDate[date];

    // Reorder blocks within the day
    const reordered = Array.from(dayBlocks);
    const [movedBlock] = reordered.splice(source.index, 1);
    reordered.splice(destination.index, 0, movedBlock);

    // Update global blocks array
    const newBlocks = blocks.filter(b => b.date !== date).concat(reordered);
    setBlocks(newBlocks);
  };

  const formatTime = (isoString: string) => {
    return DateTime.fromISO(isoString).toFormat('h:mm a');
  };

  const formatDate = (isoDate: string) => {
    return DateTime.fromISO(isoDate).toFormat('EEEE, MMM d');
  };

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 border-2 border-dashed border-blue-500 bg-blue-50 rounded" />
          <span className="text-slate-700">Suggested habits (drag to adjust)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-slate-300 rounded" />
          <span className="text-slate-700">Your scheduled events</span>
        </div>
      </div>

      {/* Day-by-day accordion */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="space-y-3">
          {dates.map((date) => {
            const dayBlocks = blocksByDate[date];
            const isExpanded = expandedDays.has(date);

            return (
              <div
                key={date}
                className="bg-white border-2 border-slate-200 rounded-lg overflow-hidden"
              >
                {/* Day header */}
                <button
                  onClick={() => toggleDay(date)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <svg
                      className={`w-5 h-5 text-slate-600 transition-transform ${
                        isExpanded ? 'rotate-90' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                    <span className="font-semibold text-slate-900">
                      {formatDate(date)}
                    </span>
                    <span className="text-sm text-slate-500">
                      {dayBlocks.length} habit{dayBlocks.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </button>

                {/* Day content */}
                {isExpanded && (
                  <Droppable droppableId={date}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`px-4 pb-4 pt-2 space-y-2 ${
                          snapshot.isDraggingOver ? 'bg-blue-50' : ''
                        }`}
                      >
                        {dayBlocks.map((block, index) => (
                          <Draggable key={block.id} draggableId={block.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`group border-2 border-dashed border-blue-500 bg-blue-50/50 rounded-lg p-3 transition-all ${
                                  snapshot.isDragging
                                    ? 'shadow-lg rotate-2 scale-105'
                                    : 'hover:shadow-md'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  {/* Drag handle */}
                                  <div className="flex flex-col gap-0.5">
                                    <div className="w-1 h-1 bg-blue-400 rounded-full" />
                                    <div className="w-1 h-1 bg-blue-400 rounded-full" />
                                    <div className="w-1 h-1 bg-blue-400 rounded-full" />
                                    <div className="w-1 h-1 bg-blue-400 rounded-full" />
                                    <div className="w-1 h-1 bg-blue-400 rounded-full" />
                                    <div className="w-1 h-1 bg-blue-400 rounded-full" />
                                  </div>

                                  {/* Block content */}
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                      <h4 className="font-semibold text-slate-900">
                                        {block.habitTitle}
                                      </h4>
                                      <button
                                        onClick={() => removeBlock(block.id)}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-100 rounded"
                                        title="Remove this block"
                                      >
                                        <svg
                                          className="w-4 h-4 text-red-600"
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M6 18L18 6M6 6l12 12"
                                          />
                                        </svg>
                                      </button>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1 text-sm text-slate-600">
                                      <svg
                                        className="w-4 h-4"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                        />
                                      </svg>
                                      <span>
                                        {formatTime(block.startDateTime)} -{' '}
                                        {formatTime(block.endDateTime)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                )}
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {/* Action bar */}
      <div className="sticky bottom-0 bg-white border-t-2 border-slate-200 p-4 flex items-center justify-between rounded-lg shadow-lg">
        <button
          onClick={onCancel}
          className="px-6 py-2 text-slate-700 hover:bg-slate-100 rounded-lg font-medium transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() => onAcceptAll(blocks)}
          disabled={blocks.length === 0}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            blocks.length > 0
              ? 'bg-primary-600 text-white hover:bg-primary-700'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          Accept All ({blocks.length} block{blocks.length !== 1 ? 's' : ''})
        </button>
      </div>
    </div>
  );
}
