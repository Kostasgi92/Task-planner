import type { z } from 'zod';
import { badRequest } from './http-errors';

/** Parses untrusted input or throws a 400 with a readable message. */
export function parseInput<S extends z.ZodType>(schema: S, value: unknown): z.output<S> {
  const result = schema.safeParse(value);
  if (!result.success) {
    const message = result.error.issues
      .map((issue) => (issue.path.length ? `${issue.path.join('.')}: ${issue.message}` : issue.message))
      .join('; ');
    throw badRequest(message);
  }
  return result.data;
}
