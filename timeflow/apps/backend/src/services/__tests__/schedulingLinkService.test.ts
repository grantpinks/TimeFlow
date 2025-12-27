import { describe, expect, it } from 'vitest';
import { generateLinkSlug } from '../schedulingLinkService';

describe('schedulingLinkService', () => {
  it('generates URL-safe slugs', () => {
    const slug = generateLinkSlug('Team Intro');
    expect(slug).toMatch(/^[a-z0-9-]+$/);
  });
});
