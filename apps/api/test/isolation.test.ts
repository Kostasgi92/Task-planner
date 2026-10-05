import { categoriesTable, tasksTable, withUser } from '@tasknest/db';
import { sql } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { database, makeClient, newCategory, newTask, resetDatabase } from './helpers';

/** Drizzle wraps driver errors; the PostgreSQL message is on `cause`. */
function rootMessage(error: unknown): string {
  let current = error as { message?: string; cause?: unknown } | undefined;
  while (current?.cause) current = current.cause as typeof current;
  return current?.message ?? String(error);
}

/**
 * One user must never be able to read, change or reference another user's data —
 * through the API, or even through a query that forgets its user filter.
 */
describe('user isolation', () => {
  const as = makeClient();
  const alice = as('user_alice');
  const bob = as('user_bob');

  let aliceCategory: number;
  let aliceTask: number;

  beforeEach(async () => {
    await resetDatabase();
    aliceCategory = await newCategory(alice, 'Alice private');
    aliceTask = (await newTask(alice, { categoryId: aliceCategory, title: 'Alice secret task' })).id;
    await alice.patch(`/api/tasks/${aliceTask}`, { completed: true }).expect(200);
  });

  it('requires a signed-in user for everything except the health check', async () => {
    const app = makeClient();
    const anonymous = app('');
    await anonymous.get('/api/healthz').expect(200, { status: 'ok' });
    for (const url of ['/api/categories', '/api/tasks', '/api/summaries/dashboard']) {
      await anonymous.get(url).expect(401);
    }
  });

  it('never lists or counts another user’s data', async () => {
    const categories = await bob.get('/api/categories').expect(200);
    expect(categories.body.map((c: { name: string }) => c.name)).toEqual(['Personal']);

    const tasks = await bob.get('/api/tasks?status=all').expect(200);
    expect(tasks.body).toEqual([]);

    const filtered = await bob.get(`/api/tasks?categoryId=${aliceCategory}`).expect(200);
    expect(filtered.body).toEqual([]);

    const dashboard = await bob.get('/api/summaries/dashboard').expect(200);
    expect(dashboard.body).toMatchObject({ activeCount: 0, completedCount: 0, categoryCount: 1 });
  });

  it('answers 404 (not 403) for another user’s ids, without changing them', async () => {
    await bob.patch(`/api/tasks/${aliceTask}`, { title: 'pwned' }).expect(404);
    await bob.delete(`/api/tasks/${aliceTask}`).expect(404);
    await bob.patch(`/api/categories/${aliceCategory}`, { name: 'pwned' }).expect(404);
    await bob.delete(`/api/categories/${aliceCategory}`).expect(404);

    const tasks = await alice.get('/api/tasks').expect(200);
    expect(tasks.body).toHaveLength(1);
    expect(tasks.body[0].title).toBe('Alice secret task');
    const categories = await alice.get('/api/categories').expect(200);
    expect(categories.body.find((c: { id: number }) => c.id === aliceCategory)?.name).toBe('Alice private');
  });

  it('cannot attach tasks to another user’s category or task', async () => {
    await bob.post('/api/tasks', { categoryId: aliceCategory, title: 'x' }).expect(400);

    const bobCategory = await newCategory(bob);
    await bob.post('/api/tasks', { categoryId: bobCategory, title: 'x', parentId: aliceTask }).expect(400);

    const bobTask = await newTask(bob, { categoryId: bobCategory, title: 'Bob task' });
    await bob.patch(`/api/tasks/${bobTask.id}`, { categoryId: aliceCategory }).expect(400);
    await bob.patch(`/api/tasks/${bobTask.id}`, { parentId: aliceTask }).expect(400);
  });

  it('“Clear done” only clears the caller’s tasks', async () => {
    await bob.delete('/api/tasks/completed').expect(204);
    const tasks = await alice.get('/api/tasks').expect(200);
    expect(tasks.body).toHaveLength(1);
  });

  it('cannot smuggle a user id through the request body', async () => {
    await bob.post('/api/categories', { name: 'Mine', userId: 'user_alice' }).expect(400);
    const bobCategory = await newCategory(bob);
    await bob.post('/api/tasks', { categoryId: bobCategory, title: 't', userId: 'user_alice' }).expect(400);
  });

  it('never returns the internal user id', async () => {
    const tasks = await alice.get('/api/tasks').expect(200);
    const categories = await alice.get('/api/categories').expect(200);
    expect(JSON.stringify([tasks.body, categories.body])).not.toContain('user_alice');
    expect(JSON.stringify([tasks.body, categories.body])).not.toContain('userId');
  });

  describe('database-level guarantees (independent of API code)', () => {
    it('row-level security hides other users’ rows even from an unfiltered query', async () => {
      const seenByBob = await withUser(database.db, 'user_bob', async (tx) => {
        const tasks = await tx.select().from(tasksTable);
        const categories = await tx.select().from(categoriesTable);
        return { tasks, categories };
      });
      expect(seenByBob.tasks).toEqual([]);
      expect(seenByBob.categories).toEqual([]);
    });

    it('row-level security blocks writes into another user’s rows', async () => {
      const error = await withUser(database.db, 'user_bob', (tx) =>
        tx.insert(categoriesTable).values({ userId: 'user_alice', name: 'forged' }),
      ).catch((e: unknown) => e);
      expect(rootMessage(error)).toMatch(/row-level security policy/);

      const updated = await withUser(database.db, 'user_bob', (tx) =>
        tx.update(tasksTable).set({ title: 'pwned' }).returning({ id: tasksTable.id }),
      );
      expect(updated).toEqual([]);
      const deleted = await withUser(database.db, 'user_bob', (tx) =>
        tx.delete(tasksTable).returning({ id: tasksTable.id }),
      );
      expect(deleted).toEqual([]);
    });

    it('a session without a user id sees nothing', async () => {
      const rows = await database.db.transaction(async (tx) => {
        await tx.execute(sql`set local role tasknest_app`);
        return tx.select().from(tasksTable);
      });
      expect(rows).toEqual([]);
    });

    it('foreign keys refuse a task that points at another user’s category', async () => {
      const error = await database.db
        .insert(tasksTable)
        .values({ userId: 'user_bob', categoryId: aliceCategory, title: 'cross-user' })
        .catch((e: unknown) => e);
      expect(rootMessage(error)).toMatch(/tasks_category_same_user_fk/);
    });
  });
});
