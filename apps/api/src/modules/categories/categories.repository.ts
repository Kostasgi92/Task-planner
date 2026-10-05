import { categoriesTable, tasksTable, type UserScopedDb } from '@tasknest/db';
import { and, asc, eq, sql } from 'drizzle-orm';

export type CategoryWithCounts = {
  id: number;
  name: string;
  color: string;
  taskCount: number;
  completedCount: number;
};

const withCounts = {
  id: categoriesTable.id,
  name: categoriesTable.name,
  color: categoriesTable.color,
  taskCount: sql<number>`count(${tasksTable.id})::int`,
  completedCount: sql<number>`(count(${tasksTable.id}) filter (where ${tasksTable.completed}))::int`,
};

export const categoriesRepository = {
  async listWithCounts(tx: UserScopedDb, userId: string): Promise<CategoryWithCounts[]> {
    return tx
      .select(withCounts)
      .from(categoriesTable)
      .leftJoin(tasksTable, and(eq(tasksTable.categoryId, categoriesTable.id), eq(tasksTable.userId, userId)))
      .where(eq(categoriesTable.userId, userId))
      .groupBy(categoriesTable.id)
      .orderBy(asc(categoriesTable.id));
  },

  async findWithCounts(tx: UserScopedDb, userId: string, id: number) {
    const [row] = await tx
      .select(withCounts)
      .from(categoriesTable)
      .leftJoin(tasksTable, and(eq(tasksTable.categoryId, categoriesTable.id), eq(tasksTable.userId, userId)))
      .where(and(eq(categoriesTable.id, id), eq(categoriesTable.userId, userId)))
      .groupBy(categoriesTable.id);
    return row ?? null;
  },

  async exists(tx: UserScopedDb, userId: string, id: number): Promise<boolean> {
    const rows = await tx
      .select({ id: categoriesTable.id })
      .from(categoriesTable)
      .where(and(eq(categoriesTable.id, id), eq(categoriesTable.userId, userId)))
      .limit(1);
    return rows.length > 0;
  },

  async count(tx: UserScopedDb, userId: string): Promise<number> {
    const [row] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(categoriesTable)
      .where(eq(categoriesTable.userId, userId));
    return row?.count ?? 0;
  },

  /** Serializes "first visit" seeding for one user so parallel requests can't double-seed. */
  async lockUser(tx: UserScopedDb, userId: string) {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`tasknest:user:${userId}`}))`);
  },

  async insert(tx: UserScopedDb, userId: string, values: { name: string; color: string }) {
    const [row] = await tx
      .insert(categoriesTable)
      .values({ userId, ...values })
      .returning({ id: categoriesTable.id, name: categoriesTable.name, color: categoriesTable.color });
    return row;
  },

  async update(tx: UserScopedDb, userId: string, id: number, values: { name?: string; color?: string }) {
    const [row] = await tx
      .update(categoriesTable)
      .set(values)
      .where(and(eq(categoriesTable.id, id), eq(categoriesTable.userId, userId)))
      .returning({ id: categoriesTable.id });
    return row ?? null;
  },

  async remove(tx: UserScopedDb, userId: string, id: number): Promise<boolean> {
    const rows = await tx
      .delete(categoriesTable)
      .where(and(eq(categoriesTable.id, id), eq(categoriesTable.userId, userId)))
      .returning({ id: categoriesTable.id });
    return rows.length > 0;
  },
};
