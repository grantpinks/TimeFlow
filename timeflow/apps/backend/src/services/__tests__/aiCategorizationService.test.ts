import { describe, it, expect } from 'vitest';
import { scoreEventForCategory, chooseCategoryByRules } from '../aiCategorizationService';

const event = {
  id: 'evt-1',
  summary: 'Design review with Acme team',
  description: 'Discuss Q1 product roadmap',
  start: new Date().toISOString(),
  end: new Date().toISOString(),
};

const profiles = [
  {
    categoryId: 'cat-work',
    name: 'Professional',
    includeKeywords: ['review', 'roadmap'],
    excludeKeywords: ['gym'],
  },
  {
    categoryId: 'cat-personal',
    name: 'Personal',
    includeKeywords: ['gym', 'family'],
    excludeKeywords: [],
  },
];

describe('aiCategorizationService hybrid rules', () => {
  it('scores categories using include keywords', () => {
    const score = scoreEventForCategory(event, profiles[0]);
    expect(score).toBeGreaterThan(0);
  });

  it('chooses category when confident', () => {
    const result = chooseCategoryByRules(event, profiles);
    expect(result?.categoryId).toBe('cat-work');
  });
});
