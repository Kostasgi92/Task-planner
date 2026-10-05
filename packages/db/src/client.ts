import { sql } from 'drizzle-orm';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema';

export type Database = NodePgDatabase<typeof schema>;
/** A database handle that is already scoped to one user (see {@link withUser}). */
export type UserScopedDb = Parameters<Parameters<Database['transaction']>[0]>[0];

/** Restricted role every request runs as. Created by the RLS migration. */
export const APP_ROLE = 'tasknest_app';

export function createDb(connectionString: string, options: { max?: number } = {}) {
  const pool = new pg.Pool({ connectionString, max: options.max ?? 5 });
  const db = drizzle(pool, { schema });
  return { db, pool };
}

/**
 * Runs `fn` inside a transaction that can only see `userId`'s rows.
 *
 * Two independent guards apply to everything inside:
 * 1. `SET LOCAL ROLE tasknest_app`: a role without owner or BYPASSRLS rights, so
 *    PostgreSQL row-level security policies are enforced.
 * 2. `app.user_id`: the setting those policies compare `user_id` against.
 *
 * Both are transaction-local, so they are safe with pooled connections (PgBouncer /
 * Neon pooler in transaction mode) and can never leak into another request.
 */
export async function withUser<T>(
  db: Database,
  userId: string,
  fn: (tx: UserScopedDb) => Promise<T>,
): Promise<T> {
  if (!userId) throw new Error('withUser requires a user id');
  return db.transaction(async (tx) => {
    await tx.execute(sql.raw(`set local role ${APP_ROLE}`));
    await tx.execute(sql`select set_config('app.user_id', ${userId}, true)`);
    return fn(tx);
  });
}
