'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useMemo } from 'react';
import { track } from '@/lib/analytics';

const fadeInVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

type CalendarEvent = {
  id: number;
  title: string;
  start: string;
  end: string;
  color: string;
};

type DaySchedule = {
  label: string;
  date: string;
  events: CalendarEvent[];
};

// Messy calendar events (overlapping, poorly scheduled) across multiple days
const messySchedule: DaySchedule[] = [
  {
    label: 'Mon',
    date: 'Dec 11',
    events: [
      { id: 1, title: 'Morning Workout', start: '09:00', end: '09:45', color: '#EF4444' },
      { id: 2, title: 'Project Check-in', start: '09:45', end: '10:20', color: '#F59E0B' },
      { id: 3, title: 'Client Call', start: '10:00', end: '11:00', color: '#3B82F6' },
      { id: 4, title: 'Lunch Break', start: '12:00', end: '13:00', color: '#10B981' },
    ],
  },
  {
    label: 'Tue',
    date: 'Dec 12',
    events: [
      { id: 5, title: '1:1 Prep', start: '09:45', end: '10:30', color: '#0EA5E9' },
      { id: 6, title: 'Lecture: Data Structures', start: '10:30', end: '11:30', color: '#6366F1' },
      { id: 7, title: 'Study: Algorithms', start: '13:30', end: '14:30', color: '#8B5CF6' },
      { id: 8, title: 'Inbox Tidy Up', start: '14:00', end: '15:00', color: '#EC4899' },
      { id: 9, title: 'Plan Tomorrow', start: '15:00', end: '15:45', color: '#F97316' },
    ],
  },
  {
    label: 'Wed',
    date: 'Dec 13',
    events: [
      { id: 10, title: 'Design Sync', start: '10:30', end: '11:30', color: '#F97316' },
      { id: 11, title: 'Inbox Triage', start: '11:00', end: '12:00', color: '#EC4899' },
      { id: 12, title: 'Group Project', start: '13:00', end: '14:00', color: '#EF4444' },
      { id: 13, title: 'Evening Class', start: '14:00', end: '15:30', color: '#6366F1' },
    ],
  },
];

// Organized calendar events (properly spaced) across multiple days
const organizedSchedule: DaySchedule[] = [
  {
    label: 'Mon',
    date: 'Dec 11',
    events: [
      { id: 1, title: 'Morning Workout', start: '09:00', end: '09:45', color: '#0BAF9A' },
      { id: 2, title: 'Marketing Brief', start: '10:00', end: '11:00', color: '#14B8A6' },
      { id: 3, title: 'Deep Work Block', start: '11:00', end: '12:00', color: '#0BAF9A' },
      { id: 4, title: 'Lunch Break', start: '12:00', end: '13:00', color: '#10B981' },
    ],
  },
  {
    label: 'Tue',
    date: 'Dec 12',
    events: [
      { id: 5, title: '1:1 Prep', start: '09:45', end: '10:30', color: '#0EA5E9' },
      { id: 6, title: 'Lecture: Data Structures', start: '10:30', end: '11:30', color: '#6366F1' },
      { id: 7, title: 'Study Session', start: '13:00', end: '14:00', color: '#14B8A6' },
      { id: 8, title: 'Inbox Zero Sprint', start: '14:00', end: '15:00', color: '#0BAF9A' },
      { id: 9, title: 'Plan Tomorrow', start: '15:00', end: '15:45', color: '#F97316' },
    ],
  },
  {
    label: 'Wed',
    date: 'Dec 13',
    events: [
      { id: 10, title: 'Design Sync', start: '10:30', end: '11:30', color: '#14B8A6' },
      { id: 11, title: 'Inbox Triage', start: '11:30', end: '12:00', color: '#0BAF9A' },
      { id: 12, title: 'Group Project', start: '13:00', end: '14:00', color: '#EF4444' },
      { id: 13, title: 'Evening Class', start: '14:00', end: '15:30', color: '#6366F1' },
    ],
  },
];

const HOURS = ['9 AM', '10 AM', '11 AM', '12 PM', '1 PM', '2 PM', '3 PM', '4 PM'];

const toMinutes = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const dayStartMinutes = toMinutes('09:00');
const totalMinutes = toMinutes('16:00') - dayStartMinutes;

export function ProblemStatement() {
  const [isOrganized, setIsOrganized] = useState(false);
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const targetCount = 52;

  useEffect(() => {
    let current = 0;
    const increment = targetCount / 50;
    const timer = setInterval(() => {
      current += increment;
      if (current >= targetCount) {
        setCount(targetCount);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, 20);

    return () => clearInterval(timer);
  }, []);

  const handleToggle = () => {
    const newState = !isOrganized;
    setIsOrganized(newState);
    if (!hasAnimated) setHasAnimated(true);

    track('homepage_feature_viewed', {
      feature_name: newState ? 'organized_calendar' : 'messy_calendar'
    });
  };

  const schedule = isOrganized ? organizedSchedule : messySchedule;

  const positionedSchedule = useMemo(() => {
    return schedule.map((day) => ({
      ...day,
      events: day.events.map((event) => {
        const start = toMinutes(event.start) - dayStartMinutes;
        const end = toMinutes(event.end) - dayStartMinutes;
        const top = (start / totalMinutes) * 100;
        const height = ((end - start) / totalMinutes) * 100;
        return { ...event, top, height };
      }),
    }));
  }, [schedule]);

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          variants={fadeInVariants}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Your Calendar Shouldn&apos;t Control You
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            <span className="text-3xl font-bold text-teal-600">{count}%</span> of
            workers feel overwhelmed by task management and scheduling conflicts
          </p>
        </motion.div>

        {/* Interactive Calendar Demo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="max-w-4xl mx-auto"
        >
          {/* Toggle Button */}
          <div className="text-center mb-8">
            <button
              onClick={handleToggle}
              className={`group relative px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 ${
                isOrganized
                  ? 'bg-teal-600 text-white shadow-lg hover:bg-teal-700'
                  : 'bg-red-500 text-white shadow-lg hover:bg-red-600 pulse-animation'
              }`}
            >
              <span className="flex items-center gap-3">
                {isOrganized ? (
                  <>
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Organized with TimeFlow
                  </>
                ) : (
                  <>
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    Click to Organize Your Calendar
                  </>
                )}
              </span>
              {!hasAnimated && !isOrganized && (
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 rounded-xl bg-white/20 blur-xl"
                />
              )}
            </button>
            <p className="text-sm text-gray-500 mt-3">
              {isOrganized ? 'AI-optimized schedule with no conflicts' : 'Chaotic calendar with overlapping events'}
            </p>
          </div>

          {/* Calendar View */}
          <div className="relative rounded-2xl border border-gray-200 overflow-hidden shadow-2xl bg-white">
            {/* Calendar Header */}
            <div className="px-6 py-4 flex items-center justify-between bg-[#1a73e8] text-white">
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="font-bold text-lg">
                  {isOrganized ? 'Your Optimized Schedule' : 'Chaotic Schedule'}
                </span>
              </div>
              <span className="text-sm font-semibold">Monday, Dec 11</span>
            </div>

            <div className="flex">
              {/* Time labels */}
              <div className="w-24 bg-white border-r border-gray-200">
                {HOURS.map((time, i) => (
                  <div key={i} className="h-16 px-2 text-[11px] text-gray-500 font-medium border-b border-gray-100 flex items-start justify-end pt-1">
                    {time}
                  </div>
                ))}
              </div>

              {/* Events Container */}
              <div className="flex-1 overflow-hidden">
                {/* Day labels */}
                <div className="grid" style={{ gridTemplateColumns: `repeat(${positionedSchedule.length}, minmax(0, 1fr))` }}>
                  {positionedSchedule.map((day, idx) => (
                    <div key={day.label} className="px-2 py-2 text-xs font-semibold text-gray-600 border-b border-gray-200 text-center">
                      <span className="text-gray-800">{day.label}</span> <span className="text-gray-500">{day.date}</span>
                    </div>
                  ))}
                </div>

                {/* Grid */}
                <div className="relative h-[560px] bg-white border-t border-gray-200 overflow-hidden">
                  {/* Hour grid lines across all days */}
                  {HOURS.map((_, idx) => (
                    <div
                      key={idx}
                    className="absolute left-0 right-0 border-t border-gray-100"
                    style={{ top: `${(idx / (HOURS.length - 1)) * 100}%` }}
                  />
                ))}

                {/* Now indicator */}
                <div
                  className="absolute left-0 right-0 h-px bg-red-500"
                  style={{ top: `${((toMinutes('13:30') - dayStartMinutes) / totalMinutes) * 100}%` }}
                >
                  <div className="absolute -left-2 -translate-y-1/2 w-3 h-3 rounded-full bg-red-500"></div>
                </div>

                  {/* Day columns with events */}
                  <div
                    className="absolute inset-0 grid"
                    style={{ gridTemplateColumns: `repeat(${positionedSchedule.length}, minmax(0, 1fr))` }}
                  >
                    {positionedSchedule.map((day, dayIndex) => (
                      <div
                        key={day.label}
                        className="relative border-l border-gray-100 first:border-l-0 px-1"
                      >
                        <AnimatePresence mode="sync">
                          {day.events.map((event, index) => {
                            const overlapOffset = isOrganized ? 0 : (index % 2 === 0 ? 0 : 6);
                            const width = isOrganized ? 92 : 82;
                            return (
                              <motion.div
                                key={`${event.id}-${isOrganized}`}
                                initial={{ opacity: 0, x: isOrganized ? 6 : -6 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: isOrganized ? -6 : 6 }}
                                transition={{ duration: 0.25, delay: index * 0.02 }}
                                className="absolute rounded-md shadow-md border border-white/40 overflow-hidden"
                                style={{
                                  top: `${event.top}%`,
                                  height: `${event.height}%`,
                                  left: `${4 + overlapOffset}%`,
                                  width: `${width - overlapOffset}%`,
                                  backgroundColor: event.color,
                                }}
                              >
                                <div className="px-3 py-2 text-xs text-white">
                                  <div className="font-semibold text-sm truncate">{event.title}</div>
                                  <div className="text-white/80 text-[11px]">
                                    {event.start} – {event.end}
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Status Bar */}
            <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between text-sm bg-gray-50">
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${isOrganized ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></span>
                <span className={`${isOrganized ? 'text-green-800' : 'text-red-800'} font-medium`}>
                  {isOrganized ? 'All conflicts resolved' : 'Conflicts detected'}
                </span>
              </div>
              <span className="text-gray-600">
                {positionedSchedule.reduce((acc, day) => acc + day.events.length, 0)} events over {positionedSchedule.length} days
              </span>
            </div>
          </div>

          {/* Stats Below */}
          <div className="grid grid-cols-3 gap-4 mt-8">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-center p-4 bg-gray-50 rounded-lg"
            >
              <div className={`text-3xl font-bold mb-1 transition-colors duration-500 ${
                isOrganized ? 'text-teal-600' : 'text-red-500'
              }`}>
                {isOrganized ? '0' : '3'}
              </div>
              <div className="text-sm text-gray-600">Conflicts</div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-center p-4 bg-gray-50 rounded-lg"
            >
              <div className={`text-3xl font-bold mb-1 transition-colors duration-500 ${
                isOrganized ? 'text-teal-600' : 'text-red-500'
              }`}>
                {isOrganized ? '8h' : '2h'}
              </div>
              <div className="text-sm text-gray-600">Focus Time</div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-center p-4 bg-gray-50 rounded-lg"
            >
              <div className={`text-3xl font-bold mb-1 transition-colors duration-500 ${
                isOrganized ? 'text-teal-600' : 'text-red-500'
              }`}>
                {isOrganized ? '100%' : '45%'}
              </div>
              <div className="text-sm text-gray-600">Efficiency</div>
            </motion.div>
          </div>
        </motion.div>
      </div>

      <style jsx>{`
        @keyframes pulse-animation {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          50% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
        }
        .pulse-animation {
          animation: pulse-animation 2s infinite;
        }
      `}</style>
    </section>
  );
}
