import { type NewTaskRow, type TaskRow, tasksTable, type UserScopedDb } from '@tasknest/db';
import { and, asc, eq, gte, inArray, lt, not, type SQL, sql } from 'drizzle-orm';

export type TaskFilters = {
  categoryId?: number;
  status?: 'active' | 'completed' | 'all';
  dueFrom?: Date;
  dueBefore?: Date;
};

const owned = (userId: string) => eq(tasksTable.userId, userId);

export const tasksRepository = {
  async list(tx: UserScopedDb, userId: string, filters: TaskFilters): Promise<TaskRow[]> {
    const conditions: SQL[] = [owned(userId)];
    if (filters.categoryId !== undefined) conditions.push(eq(tasksTable.categoryId, filters.categoryId));
    if (filters.status === 'active') conditions.push(eq(tasksTable.completed, false));
    if (filters.status === 'completed') conditions.push(eq(tasksTable.completed, true));
    if (filters.dueFrom) conditions.push(gte(tasksTable.dueAt, filters.dueFrom));
    if (filters.dueBefore) conditions.push(lt(tasksTable.dueAt, filters.dueBefore));
    return tx
      .select()
      .from(tasksTable)
      .where(and(...conditions))
      .orderBy(
        asc(tasksTable.completed),
        asc(tasksTable.dueAt),
        asc(tasksTable.createdAt),
        asc(tasksTable.id),
      );
  },

  async find(tx: UserScopedDb, userId: string, id: number): Promise<TaskRow | null> {
    const [row] = await tx
      .select()
      .from(tasksTable)
      .where(and(eq(tasksTable.id, id), owned(userId)))
      .limit(1);
    return row ?? null;
  },

  async insert(tx: UserScopedDb, values: NewTaskRow): Promise<TaskRow> {
    const [row] = await tx.insert(tasksTable).values(values).returning();
    return row;
  },

  async update(
    tx: UserScopedDb,
    userId: string,
    id: number,
    values: Partial<Record<keyof NewTaskRow, unknown>>,
  ): Promise<TaskRow | null> {
    const [row] = await tx
      .update(tasksTable)
      .set(values as Partial<NewTaskRow>)
      .where(and(eq(tasksTable.id, id), owned(userId)))
      .returning();
    return row ?? null;
  },

  /** Deletes a task; its subtasks are removed by the ON DELETE CASCADE foreign key. */
  async remove(tx: UserScopedDb, userId: string, id: number): Promise<boolean> {
    const rows = await tx
      .delete(tasksTable)
      .where(and(eq(tasksTable.id, id), owned(userId)))
      .returning({ id: tasksTable.id });
    return rows.length > 0;
  },

  /**
   * Deletes completed tasks. Subtasks that are *not* being deleted (unfinished, or in another
   * category) are promoted to top level first, so nothing disappears unexpectedly.
   */
  async clearCompleted(tx: UserScopedDb, userId: string, categoryId?: number): Promise<number> {
    const conditions: SQL[] = [owned(userId), eq(tasksTable.completed, true)];
    if (categoryId !== undefined) conditions.push(eq(tasksTable.categoryId, categoryId));
    const doomed = await tx
      .select({ id: tasksTable.id })
      .from(tasksTable)
      .where(and(...conditions));
    const ids = doomed.map((row) => row.id);
    if (ids.length === 0) return 0;

    await tx
      .update(tasksTable)
      .set({ parentId: null })
      .where(and(owned(userId), inArray(tasksTable.parentId, ids), not(inArray(tasksTable.id, ids))));
    await tx.delete(tasksTable).where(and(owned(userId), inArray(tasksTable.id, ids)));
    return ids.length;
  },

  async hasChildren(tx: UserScopedDb, userId: string, id: number): Promise<boolean> {
    const rows = await tx
      .select({ id: tasksTable.id })
      .from(tasksTable)
      .where(and(owned(userId), eq(tasksTable.parentId, id)))
      .limit(1);
    return rows.length > 0;
  },

  async counts(
    tx: UserScopedDb,
    userId: string,
    window: { start: Date; end: Date; now: Date },
    categoryId?: number,
  ) {
    const conditions: SQL[] = [owned(userId)];
    if (categoryId !== undefined) conditions.push(eq(tasksTable.categoryId, categoryId));
    const active = sql`not ${tasksTable.completed}`;
    const [row] = await tx
      .select({
        activeCount: sql<number>`(count(*) filter (where ${active}))::int`,
        completedCount: sql<number>`(count(*) filter (where ${tasksTable.completed}))::int`,
        dueTodayCount: sql<number>`(count(*) filter (where ${active} and ${tasksTable.dueAt} >= ${window.start} and ${tasksTable.dueAt} < ${window.end}))::int`,
        overdueCount: sql<number>`(count(*) filter (where ${active} and ${tasksTable.dueAt} < ${window.now}))::int`,
      })
      .from(tasksTable)
      .where(and(...conditions));
    return row ?? { activeCount: 0, completedCount: 0, dueTodayCount: 0, overdueCount: 0 };
  },

  async activeDueBetween(
    tx: UserScopedDb,
    userId: string,
    window: { start: Date; end: Date },
    limit: number,
    categoryId?: number,
  ): Promise<TaskRow[]> {
    const conditions: SQL[] = [
      owned(userId),
      eq(tasksTable.completed, false),
      gte(tasksTable.dueAt, window.start),
      lt(tasksTable.dueAt, window.end),
    ];
    if (categoryId !== undefined) conditions.push(eq(tasksTable.categoryId, categoryId));
    return tx
      .select()
      .from(tasksTable)
      .where(and(...conditions))
      .orderBy(asc(tasksTable.dueAt), asc(tasksTable.id))
      .limit(limit);
  },
};
