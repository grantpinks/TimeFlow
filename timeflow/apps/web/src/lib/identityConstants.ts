/**
 * Identity system constants
 * Colors, templates, and helpers shared across all identity UI.
 */

export const IDENTITY_LIMIT = 5;

export const IDENTITY_COLORS = [
  { name: 'Teal',    hex: '#0d9488' },
  { name: 'Blue',    hex: '#2563eb' },
  { name: 'Green',   hex: '#059669' },
  { name: 'Amber',   hex: '#d97706' },
  { name: 'Purple',  hex: '#7c3aed' },
  { name: 'Rose',    hex: '#e11d48' },
  { name: 'Indigo',  hex: '#4f46e5' },
  { name: 'Slate',   hex: '#475569' },
] as const;

export const IDENTITY_TEMPLATES = [
  {
    name: 'Professional',
    description: 'Career growth, skills, and work achievements',
    icon: '💼',
    color: '#0d9488',
    suggestedGoal: 'Advance in my career and build valuable skills',
  },
  {
    name: 'Personal Growth',
    description: 'Self-improvement, learning, and life goals',
    icon: '🌱',
    color: '#7c3aed',
    suggestedGoal: 'Become the best version of myself',
  },
  {
    name: 'Health & Fitness',
    description: 'Physical wellness, exercise, and nutrition',
    icon: '💪',
    color: '#059669',
    suggestedGoal: 'Build a strong, healthy body and mind',
  },
  {
    name: 'Creative',
    description: 'Art, writing, music, and creative projects',
    icon: '🎨',
    color: '#d97706',
    suggestedGoal: 'Express myself and create meaningful work',
  },
  {
    name: 'Financial Freedom',
    description: 'Money management, investing, and financial goals',
    icon: '💰',
    color: '#059669',
    suggestedGoal: 'Build wealth and achieve financial independence',
  },
  {
    name: 'Relationships & Social',
    description: 'Family, friends, and meaningful connections',
    icon: '💕',
    color: '#e11d48',
    suggestedGoal: 'Nurture deep, meaningful relationships',
  },
  {
    name: 'Learning & Knowledge',
    description: 'Education, reading, and skill acquisition',
    icon: '📚',
    color: '#2563eb',
    suggestedGoal: 'Become a lifelong learner and master new skills',
  },
  {
    name: 'Mindfulness & Spiritual',
    description: 'Meditation, reflection, and inner peace',
    icon: '🧘',
    color: '#7c3aed',
    suggestedGoal: 'Cultivate inner peace and self-awareness',
  },
  {
    name: 'Home & Environment',
    description: 'Living space, organization, and domestic life',
    icon: '🏡',
    color: '#475569',
    suggestedGoal: 'Create a peaceful, organized living space',
  },
  {
    name: 'Adventure & Travel',
    description: 'Exploration, new experiences, and travel',
    icon: '✈️',
    color: '#d97706',
    suggestedGoal: 'Explore the world and create lasting memories',
  },
] as const;

export type IdentityTemplate = (typeof IDENTITY_TEMPLATES)[number];

/** Lighten a hex color by adding transparency for background use */
export function hexWithOpacity(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
