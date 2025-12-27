import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('Prisma Schema', () => {
  it('adds meeting scheduling models', () => {
    const schemaPath = join(process.cwd(), 'prisma', 'schema.prisma');
    const schema = readFileSync(schemaPath, 'utf8');
    expect(schema).toContain('model SchedulingLink');
    expect(schema).toContain('model Meeting');
    expect(schema).toContain('model MeetingActionToken');
    expect(schema).toContain('model AppleCalendarAccount');
  });
});
