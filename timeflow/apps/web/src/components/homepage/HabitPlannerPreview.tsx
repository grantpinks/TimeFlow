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

const dayLabels = ['Monday', 'Tuesday'];
const hours = ['7 AM', '9 AM', '11 AM', '1 PM', '3 PM', '5 PM', '7 PM'];

const toMinutes = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const dayStart = toMinutes('07:00');
const dayEnd = toMinutes('19:00');
const totalMinutes = dayEnd - dayStart;

const baseEvents: Block[] = [
  { id: 'meeting', title: 'Team Meeting', day: 0, start: '10:00', end: '11:00', color: '#3B82F6', type: 'event' },
  { id: 'work-block', title: 'Deep Work', day: 0, start: '14:00', end: '16:00', color: '#6366F1', type: 'event' },
  { id: 'lecture', title: 'Class', day: 1, start: '11:00', end: '12:30', color: '#8B5CF6', type: 'event' },
  { id: 'project', title: 'Project Work', day: 1, start: '14:00', end: '15:30', color: '#3B82F6', type: 'event' },
];

const habits: Block[] = [
  { id: 'workout', title: 'Morning Workout', day: 0, start: '07:30', end: '08:30', color: '#0BAF9A', type: 'habit' },
  { id: 'reading', title: 'Reading Time', day: 0, start: '12:00', end: '13:00', color: '#10B981', type: 'habit' },
  { id: 'meditation', title: 'Meditation', day: 1, start: '08:00', end: '08:30', color: '#0BAF9A', type: 'habit' },
  { id: 'walk', title: 'Evening Walk', day: 1, start: '17:00', end: '17:45', color: '#10B981', type: 'habit' },
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

            <div className="grid grid-cols-1 gap-3">
              {habits.map((habit) => (
                <div
                  key={habit.id}
                  className="p-4 rounded-lg border border-gray-100 bg-white flex items-center justify-between shadow-sm"
                >
                  <div className="min-w-0">
                    <p className="text-gray-900 font-semibold text-base">{habit.title}</p>
                    <p className="text-gray-600 text-sm mt-1">{habit.start} – {habit.end}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <span className="text-xs text-gray-500 px-2 py-1 rounded-full bg-gray-100">flexible timing</span>
                      <span className="text-xs text-gray-500 px-2 py-1 rounded-full bg-gray-100">daily</span>
                    </div>
                  </div>
                  <span className="w-5 h-5 rounded-full flex-shrink-0 ml-3" style={{ backgroundColor: habit.color }}></span>
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
            <span>Step 2 · AI places habits automatically</span>
          </div>
          <div className="flex">
            <div className="w-24 bg-white border-r border-gray-200">
              {hours.map((time) => (
                <div key={time} className="h-28 px-3 text-sm text-gray-500 font-medium border-b border-gray-100 flex items-start justify-end pt-2">
                  {time}
                </div>
              ))}
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="grid" style={{ gridTemplateColumns: `repeat(${dayLabels.length}, minmax(0, 1fr))` }}>
                {dayLabels.map((day) => (
                  <div key={day} className="px-4 py-3 text-base font-semibold text-gray-800 border-b border-gray-200 text-center">
                    {day}
                  </div>
                ))}
              </div>

              <div className="relative h-[900px] bg-white border-t border-gray-200 overflow-hidden">
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
                      <div key={day} className="relative border-l border-gray-100 first:border-l-0 px-6">
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
                              className="absolute rounded-lg shadow-sm border border-white/30 overflow-hidden"
                              style={{
                                top: `${evt.top}%`,
                                height: `${evt.height}%`,
                                left: '2%',
                                width: '96%',
                                  backgroundColor: `${evt.color}f2`,
                                }}
                              >
                                <div className="px-4 py-4 text-white h-full flex flex-col justify-center">
                                  <div className="font-semibold text-base md:text-lg">{evt.title}</div>
                                  <div className="text-white/90 text-sm mt-1">{evt.start} – {evt.end}</div>
                                </div>
                              </motion.div>
                            ))}
                      </AnimatePresence>

                      {/* Habits - only render when scheduled */}
                      <AnimatePresence>
                        {scheduled && positionedHabits
                          .filter((evt) => evt.day === dayIndex)
                          .map((evt, index) => (
                            <motion.div
                              key={`${evt.id}-${scheduled}`}
                              initial={{ opacity: 0, y: -10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -10, scale: 0.95 }}
                              transition={{ duration: 0.3, delay: index * 0.15 }}
                              className="absolute rounded-lg shadow-md border-2 border-white/60 overflow-hidden"
                              style={{
                                top: `${evt.top}%`,
                                height: `${evt.height}%`,
                                left: '2%',
                                width: '96%',
                                backgroundColor: evt.color,
                              }}
                            >
                                <div className="px-4 py-4 text-white h-full flex flex-col justify-center">
                                  <div className="font-semibold text-base md:text-lg">{evt.title}</div>
                                  <div className="text-white/90 text-sm mt-1">{evt.start} – {evt.end}</div>
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

        <div className="text-sm text-gray-600 text-center">
          Spacious, easy-to-read calendar with {positionedEvents.length} events + {positionedHabits.length} habits automatically placed with zero conflicts
        </div>
      </div>
    </div>
  );
}
