import { describe, expect, it } from 'vitest';
import { validateAvailabilityQuery } from '../availabilityController';

describe('availabilityController', () => {
  it('rejects missing date range', () => {
    expect(() => validateAvailabilityQuery({} as any)).toThrow(/from/);
  });
});
