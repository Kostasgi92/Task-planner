import { type Database, type UserScopedDb, withUser } from '@tasknest/db';
import type { Request } from 'express';
import { userIdOf } from '../middleware/auth';
import { timeZoneOf } from '../middleware/request-context';

export type AppDeps = {
  db: Database;
  /** Injectable clock so "today"/"overdue" logic is testable. */
  now?: () => Date;
};

export type RequestScope = {
  tx: UserScopedDb;
  userId: string;
  timeZone: string;
  now: Date;
};

/**
 * Runs `fn` with a database handle that can only reach the caller's own rows
 * (row-level security + explicit user filters in every query).
 */
export function inUserScope<T>(
  deps: AppDeps,
  req: Request,
  fn: (scope: RequestScope) => Promise<T>,
): Promise<T> {
  const userId = userIdOf(req);
  const timeZone = timeZoneOf(req);
  const now = deps.now?.() ?? new Date();
  return withUser(deps.db, userId, (tx) => fn({ tx, userId, timeZone, now }));
}
