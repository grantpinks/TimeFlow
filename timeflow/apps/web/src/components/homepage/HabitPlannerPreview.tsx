'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useMemo, useState } from 'react';

type Block = {
  id: string;
  title: string;
  day: number; // 0 = Mon
  start: string; // HH:MM 24h
  end: string;   // HH:MM 24h
  color: string;
  type: 'habit' | 'event';
};

const dayLabels = ['Mon', 'Tue'];
const hours = ['6 AM', '8 AM', '10 AM', '12 PM', '2 PM', '4 PM', '6 PM', '8 PM'];

const toMinutes = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const dayStart = toMinutes('06:00');
const dayEnd = toMinutes('20:00');
const totalMinutes = dayEnd - dayStart;

const baseEvents: Block[] = [
  { id: 'class', title: 'Class: Data Structures', day: 0, start: '10:00', end: '11:30', color: '#3B82F6', type: 'event' },
  { id: 'work-block', title: 'Work Block', day: 0, start: '13:00', end: '15:00', color: '#475569', type: 'event' },
  { id: 'study', title: 'Study Group', day: 1, start: '14:00', end: '15:00', color: '#6366F1', type: 'event' },
  { id: 'evening-class', title: 'Evening Class', day: 1, start: '18:00', end: '19:30', color: '#8B5CF6', type: 'event' },
];

const habits: Block[] = [
  { id: 'meditation', title: 'Morning Meditation', day: 0, start: '07:00', end: '07:20', color: '#0BAF9A', type: 'habit' },
  { id: 'workout', title: 'Morning Workout', day: 0, start: '08:00', end: '08:45', color: '#F59E0B', type: 'habit' },
  { id: 'reading', title: 'Deep Reading', day: 1, start: '09:30', end: '10:00', color: '#10B981', type: 'habit' },
  { id: 'meal-prep', title: 'Meal Prep', day: 1, start: '12:30', end: '13:00', color: '#EC4899', type: 'habit' },
];

function positionBlocks(blocks: Block[]) {
  return blocks.map((block) => {
    const start = toMinutes(block.start) - dayStart;
    const end = toMinutes(block.end) - dayStart;
    const top = (start / totalMinutes) * 100;
    const height = ((end - start) / totalMinutes) * 100;
    return { ...block, top, height };
  });
}

export function HabitPlannerPreview() {
  const [scheduled, setScheduled] = useState(false);

  const positionedEvents = useMemo(() => positionBlocks(baseEvents), []);
  const positionedHabits = useMemo(() => positionBlocks(habits), []);

  const totalItems = positionedEvents.length + positionedHabits.length;

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 space-y-5 w-full max-w-[1100px]">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-lg font-bold text-gray-900">Habit-Aware Schedule</h4>
          <p className="text-sm text-gray-500">Add habits, then see them placed on your calendar—without conflicts.</p>
        </div>
        <button
          onClick={() => setScheduled((prev) => !prev)}
          className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-semibold shadow hover:bg-teal-700 transition"
        >
          {scheduled ? 'Show Before' : 'Place Habits'}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Step 1 and Step 2 stacked */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Step 1: capture */}
          <div className="space-y-3 p-5 rounded-xl border border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 font-medium">Step 1</p>
                <h5 className="text-base font-semibold text-gray-900">Add your habits</h5>
              </div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${scheduled ? 'bg-teal-100 text-teal-700' : 'bg-amber-100 text-amber-700'}`}>
                {scheduled ? 'Scheduled' : 'Waiting'}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {habits.map((habit) => (
                <div
                  key={habit.id}
                  className="p-3 rounded-lg border border-gray-100 bg-white flex items-center justify-between shadow-sm"
                >
                  <div className="min-w-0">
                    <p className="text-gray-900 font-semibold text-sm truncate">{habit.title}</p>
                    <p className="text-gray-600 text-xs">{habit.start} – {habit.end}</p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      <span className="text-xs text-gray-500 px-2 py-0.5 rounded-full bg-gray-100">flexible window</span>
                      <span className="text-xs text-gray-500 px-2 py-0.5 rounded-full bg-gray-100">recurring</span>
                    </div>
                  </div>
                  <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: habit.color }}></span>
                </div>
              ))}
            </div>

            <div className="text-xs text-gray-500 leading-relaxed">
              Specify windows like “morning workout” or “evening walk.” We keep your streaks intact when meetings pop up.
            </div>
        </div>

        {/* Step 2: schedule */}
        <div className="rounded-xl border border-gray-200 overflow-hidden shadow-sm bg-white">
          <div className="flex items-center justify-between px-4 py-3 bg-[#1a73e8] text-white text-sm font-semibold">
            <span>Step 2 · Smart schedule (2 days)</span>
            <span>Habits + events · no conflicts</span>
          </div>
          <div className="flex">
            <div className="w-20 bg-white border-r border-gray-200">
              {hours.map((time) => (
                <div key={time} className="h-16 px-2 text-xs text-gray-500 font-medium border-b border-gray-100 flex items-start justify-end pt-1">
                  {time}
                </div>
              ))}
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="grid" style={{ gridTemplateColumns: `repeat(${dayLabels.length}, minmax(0, 1fr))` }}>
                {dayLabels.map((day) => (
                  <div key={day} className="px-3 py-2 text-xs font-semibold text-gray-600 border-b border-gray-200 text-center">
                    <span className="text-gray-800">{day}</span>
                  </div>
                ))}
              </div>

              <div className="relative h-[512px] bg-white border-t border-gray-200 overflow-hidden">
                {hours.map((_, idx) => (
                  <div
                    key={idx}
                    className="absolute left-0 right-0 border-t border-gray-100"
                    style={{ top: `${(idx / hours.length) * 100}%` }}
                    />
                  ))}

                  <div
                    className="absolute left-0 right-0 h-px bg-red-500"
                    style={{ top: `${((toMinutes('14:00') - dayStart) / totalMinutes) * 100}%` }}
                  >
                    <div className="absolute -left-2 -translate-y-1/2 w-3 h-3 rounded-full bg-red-500"></div>
                  </div>

                  <div
                    className="absolute inset-0 grid"
                    style={{ gridTemplateColumns: `repeat(${dayLabels.length}, minmax(0, 1fr))` }}
                  >
                    {dayLabels.map((day, dayIndex) => (
                      <div key={day} className="relative border-l border-gray-100 first:border-l-0 px-3">
                        {/* Existing events */}
                        <AnimatePresence>
                        {positionedEvents
                          .filter((evt) => evt.day === dayIndex)
                          .map((evt) => (
                            <motion.div
                              key={evt.id}
                              initial={{ opacity: 0, x: -6 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -6 }}
                              transition={{ duration: 0.2 }}
                              className="absolute rounded-md shadow-sm border border-white/30 overflow-hidden"
                              style={{
                                top: `${evt.top}%`,
                                height: `${evt.height}%`,
                                left: '1%',
                                width: '98%',
                                  backgroundColor: `${evt.color}f2`,
                                }}
                              >
                                <div className="px-2 py-1.5 text-white h-full flex items-center">
                                  <div className="font-medium text-sm truncate w-full">{evt.title}</div>
                                </div>
                              </motion.div>
                            ))}
                      </AnimatePresence>

                      {/* Habits */}
                      <AnimatePresence>
                        {positionedHabits
                          .filter((evt) => evt.day === dayIndex)
                          .map((evt, index) => (
                            <motion.div
                              key={`${evt.id}-${scheduled}`}
                              initial={{ opacity: 0, x: scheduled ? 8 : -8, scale: 0.96 }}
                              animate={{
                                opacity: scheduled ? 1 : 0.35,
                                x: 0,
                                scale: scheduled ? 1 : 0.98,
                              }}
                              exit={{ opacity: 0, x: scheduled ? -8 : 8 }}
                              transition={{ duration: 0.25, delay: scheduled ? index * 0.05 : 0 }}
                              className="absolute rounded-md shadow-md border border-white/50 overflow-hidden"
                              style={{
                                top: `${evt.top}%`,
                                height: `${evt.height}%`,
                                left: '1%',
                                width: '98%',
                                  backgroundColor: evt.color,
                                  opacity: scheduled ? 1 : 0.7,
                                  filter: scheduled ? 'none' : 'grayscale(0.2)',
                                }}
                              >
                                <div className="px-2 py-1.5 text-white h-full flex items-center">
                                  <div className="font-medium text-sm truncate w-full">{evt.title}</div>
                                </div>
                              </motion.div>
                            ))}
                      </AnimatePresence>
                    </div>
                  ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="text-xs text-gray-500">
          {totalItems} total items shown across events and habits. Calendar spacing expanded so everything stays legible.
        </div>
      </div>
    </div>
  );
}
