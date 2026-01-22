'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui';
import type { Task, CalendarEvent } from '@timeflow/shared';

interface PlanningRitualPanelProps {
  tasks: Task[];
  events: CalendarEvent[];
  onComplete: (data: PlanningRitualData) => void;
  onCancel: () => void;
}

export interface PlanningRitualData {
  selectedTaskIds: string[];
  constraints: string[];
  focusAreas: string[];
  energyLevel: 'low' | 'medium' | 'high';
}

export default function PlanningRitualPanel({
  tasks,
  events,
  onComplete,
  onCancel,
}: PlanningRitualPanelProps) {
  const [step, setStep] = useState<'priorities' | 'constraints' | 'focus' | 'energy'>('priorities');
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [constraints, setConstraints] = useState<string[]>([]);
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const [energyLevel, setEnergyLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [customConstraint, setCustomConstraint] = useState('');
  const [customFocus, setCustomFocus] = useState('');

  const unscheduledTasks = tasks.filter(task => task.status === 'unscheduled');

  const handleTaskToggle = (taskId: string) => {
    setSelectedTaskIds(prev =>
      prev.includes(taskId)
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };

  const handleConstraintToggle = (constraint: string) => {
    setConstraints(prev =>
      prev.includes(constraint)
        ? prev.filter(c => c !== constraint)
        : [...prev, constraint]
    );
  };

  const addCustomConstraint = () => {
    if (customConstraint.trim()) {
      setConstraints(prev => [...prev, customConstraint.trim()]);
      setCustomConstraint('');
    }
  };

  const handleFocusToggle = (focus: string) => {
    setFocusAreas(prev =>
      prev.includes(focus)
        ? prev.filter(f => f !== focus)
        : [...prev, focus]
    );
  };

  const addCustomFocus = () => {
    if (customFocus.trim()) {
      setFocusAreas(prev => [...prev, customFocus.trim()]);
      setCustomFocus('');
    }
  };

  const handleComplete = () => {
    onComplete({
      selectedTaskIds,
      constraints,
      focusAreas,
      energyLevel,
    });
  };

  const renderStepContent = () => {
    switch (step) {
      case 'priorities':
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                What are your top priorities today?
              </h3>
              <p className="text-sm text-slate-600 mb-4">
                Select the tasks that matter most. The AI will focus on scheduling these first.
              </p>
            </div>

            {unscheduledTasks.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-500">No unscheduled tasks available.</p>
                <p className="text-sm text-slate-400 mt-1">Add some tasks to get started!</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {unscheduledTasks.map((task) => (
                  <label
                    key={task.id}
                    className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:border-primary-300 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedTaskIds.includes(task.id)}
                      onChange={() => handleTaskToggle(task.id)}
                      className="mt-0.5 text-primary-600 focus:ring-primary-500"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-slate-900">{task.title}</div>
                      {task.description && (
                        <div className="text-sm text-slate-600 mt-1">{task.description}</div>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-700">
                          {task.priority === 1 ? 'High' : task.priority === 2 ? 'Medium' : 'Low'} Priority
                        </span>
                        <span className="text-xs text-slate-500">
                          {task.durationMinutes} min
                        </span>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button variant="secondary" onClick={onCancel} className="flex-1">
                Skip Ritual
              </Button>
              <Button
                onClick={() => setStep('constraints')}
                disabled={selectedTaskIds.length === 0}
                className="flex-1"
              >
                Next
              </Button>
            </div>
          </div>
        );

      case 'constraints':
        const fixedEvents = events.filter(event =>
          event.summary?.toLowerCase().includes('meeting') ||
          event.summary?.toLowerCase().includes('call') ||
          event.summary?.toLowerCase().includes('appointment')
        );

        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Any scheduling constraints?
              </h3>
              <p className="text-sm text-slate-600 mb-4">
                Let us know about fixed commitments or time preferences.
              </p>
            </div>

            <div className="space-y-3">
              {fixedEvents.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-slate-800 mb-2">Fixed Meetings Today:</h4>
                  <div className="space-y-1">
                    {fixedEvents.slice(0, 3).map((event) => (
                      <div key={event.id} className="text-sm text-slate-600 bg-slate-50 px-3 py-2 rounded">
                        {event.summary} ({new Date(event.start).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        })})
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-sm font-medium text-slate-800 mb-2">Time Preferences:</h4>
                <div className="space-y-2">
                  {[
                    'No meetings before 10 AM',
                    'Focus time in the morning',
                    'Afternoon for meetings',
                    'Early meetings only',
                    'Flexible schedule today'
                  ].map((constraint) => (
                    <label key={constraint} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={constraints.includes(constraint)}
                        onChange={() => handleConstraintToggle(constraint)}
                        className="text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-slate-700">{constraint}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-slate-800 mb-2">Add Custom Constraint:</h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customConstraint}
                    onChange={(e) => setCustomConstraint(e.target.value)}
                    placeholder="e.g., Doctor appointment at 3 PM"
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    onKeyDown={(e) => e.key === 'Enter' && addCustomConstraint()}
                  />
                  <Button
                    size="sm"
                    onClick={addCustomConstraint}
                    disabled={!customConstraint.trim()}
                  >
                    Add
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="secondary" onClick={() => setStep('priorities')} className="flex-1">
                Back
              </Button>
              <Button onClick={() => setStep('focus')} className="flex-1">
                Next
              </Button>
            </div>
          </div>
        );

      case 'focus':
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                What areas should you focus on?
              </h3>
              <p className="text-sm text-slate-600 mb-4">
                Select focus areas to help prioritize your day.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-medium text-slate-800 mb-2">Focus Areas:</h4>
                <div className="space-y-2">
                  {[
                    'Deep work / focused tasks',
                    'Meetings & collaboration',
                    'Email & communication',
                    'Planning & organization',
                    'Learning & development',
                    'Creative work',
                    'Administrative tasks'
                  ].map((focus) => (
                    <label key={focus} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={focusAreas.includes(focus)}
                        onChange={() => handleFocusToggle(focus)}
                        className="text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-slate-700">{focus}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-slate-800 mb-2">Add Custom Focus:</h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customFocus}
                    onChange={(e) => setCustomFocus(e.target.value)}
                    placeholder="e.g., Client project work"
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    onKeyDown={(e) => e.key === 'Enter' && addCustomFocus()}
                  />
                  <Button
                    size="sm"
                    onClick={addCustomFocus}
                    disabled={!customFocus.trim()}
                  >
                    Add
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="secondary" onClick={() => setStep('constraints')} className="flex-1">
                Back
              </Button>
              <Button onClick={() => setStep('energy')} className="flex-1">
                Next
              </Button>
            </div>
          </div>
        );

      case 'energy':
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                How's your energy level today?
              </h3>
              <p className="text-sm text-slate-600 mb-4">
                This helps the AI schedule appropriately for your current state.
              </p>
            </div>

            <div className="space-y-3">
              {[
                { value: 'high' as const, label: 'High Energy', description: 'Ready for intense focus and complex tasks' },
                { value: 'medium' as const, label: 'Medium Energy', description: 'Good for balanced work and meetings' },
                { value: 'low' as const, label: 'Low Energy', description: 'Best for routine tasks and light work' },
              ].map(({ value, label, description }) => (
                <label
                  key={value}
                  className={`block p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                    energyLevel === value
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="energy"
                    value={value}
                    checked={energyLevel === value}
                    onChange={(e) => setEnergyLevel(e.target.value as typeof energyLevel)}
                    className="sr-only"
                  />
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      energyLevel === value ? 'border-primary-500 bg-primary-500' : 'border-slate-300'
                    }`}>
                      {energyLevel === value && (
                        <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-slate-900">{label}</div>
                      <div className="text-sm text-slate-600">{description}</div>
                    </div>
                  </div>
                </label>
              ))}
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="secondary" onClick={() => setStep('focus')} className="flex-1">
                Back
              </Button>
              <Button onClick={handleComplete} className="flex-1">
                Complete Planning
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ y: 20 }}
        animate={{ y: 0 }}
        className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-900">Daily Planning Ritual</h2>
            <div className="flex gap-1">
              {['priorities', 'constraints', 'focus', 'energy'].map((stepName, index) => (
                <div
                  key={stepName}
                  className={`w-2 h-2 rounded-full ${
                    ['priorities', 'constraints', 'focus', 'energy'].indexOf(step) >= index
                      ? 'bg-primary-500'
                      : 'bg-slate-200'
                  }`}
                />
              ))}
            </div>
          </div>

          {renderStepContent()}
        </div>
      </motion.div>
    </motion.div>
  );
}