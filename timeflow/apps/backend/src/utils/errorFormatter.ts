import { ZodError } from 'zod';

/**
 * Convert a Zod error to a user-friendly string.
 */
export function formatZodError(error: ZodError): string {
  return error.errors.map((issue) => issue.message || issue.code).join('; ');
}
