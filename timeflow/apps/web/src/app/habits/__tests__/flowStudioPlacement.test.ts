import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Identity Studio page placement', () => {
  it('does not mount the heavy Flow Studio evolution panel on /habits', () => {
    const source = readFileSync(resolve(__dirname, '../page.tsx'), 'utf8');

    expect(source).not.toContain('IdentityStudioEvolutionPanel');
  });
});
