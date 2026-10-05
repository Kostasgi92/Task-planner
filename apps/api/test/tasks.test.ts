import { beforeEach, describe, expect, it } from 'vitest';
import { type Client, makeClient, newCategory, newTask, resetDatabase } from './helpers';

const NOW = new Date('2026-10-05T09:00:00Z'); // 12:00 in Athens

describe('tasks', () => {
  const user: Client = makeClient({ now: NOW })('user_tasks', 'Europe/Athens');
  let categoryId: number;

  beforeEach(async () => {
    await resetDatabase();
    categoryId = await newCategory(user);
  });

  it('creates a task with defaults and cleans its input', async () => {
    const task = await newTask(user, {
      categoryId,
      title: '  Plan the week  ',
      notes: '   ',
      bulletPoints: [' one ', '', 'three'],
      bulletPointCompleted: [false, true, true],
    });
    expect(task).toMatchObject({
      categoryId,
      parentId: null,
      title: 'Plan the week',
      notes: null,
      bulletPoints: ['one', 'three'],
      bulletPointCompleted: [false, true],
      importance: 'medium',
      dueAt: null,
      reminderAt: null,
      completed: false,
      completedAt: null,
    });
    expect(new Date(task.createdAt as string).toString()).not.toBe('Invalid Date');
  });

  it('validates input', async () => {
    await user.post('/api/tasks', { categoryId, title: '' }).expect(400);
    await user.post('/api/tasks', { categoryId, title: '  ' }).expect(400);
    await user.post('/api/tasks', { categoryId, title: 'x'.repeat(301) }).expect(400);
    await user.post('/api/tasks', { categoryId, title: 'x', importance: 'urgent' }).expect(400);
    await user.post('/api/tasks', { categoryId, title: 'x', dueAt: 'tomorrow' }).expect(400);
    await user.post('/api/tasks', { categoryId: 999, title: 'x' }).expect(400);
    await user.get('/api/tasks?status=weird').expect(400);
    await user.get('/api/tasks?categoryId=abc').expect(400);
    const bad = await user.post('/api/tasks').set('content-type', 'application/json').send('{oops');
    expect(bad.status).toBe(400);
  });

  it('stores timestamps exactly as sent (no time-zone drift on edit)', async () => {
    const dueAt = '2030-04-05T06:30:00.000Z';
    const task = await newTask(user, { categoryId, title: 'x', dueAt, reminderAt: dueAt });
    expect(task.dueAt).toBe(dueAt);
    const again = await user.patch(`/api/tasks/${task.id}`, { dueAt: task.dueAt }).expect(200);
    expect(again.body.dueAt).toBe(dueAt);
    const cleared = await user.patch(`/api/tasks/${task.id}`, { dueAt: null }).expect(200);
    expect(cleared.body.dueAt).toBeNull();
    expect(cleared.body.reminderAt).toBe(dueAt);
  });

  it('completes and reopens a task', async () => {
    const task = await newTask(user, { categoryId, title: 'x' });
    const done = await user.patch(`/api/tasks/${task.id}`, { completed: true }).expect(200);
    expect(done.body.completed).toBe(true);
    expect(done.body.completedAt).toBe(NOW.toISOString());
    const reopened = await user.patch(`/api/tasks/${task.id}`, { completed: false }).expect(200);
    expect(reopened.body.completedAt).toBeNull();
  });

  it('toggles bullet completion without touching the items', async () => {
    const task = await newTask(user, { categoryId, title: 'x', bulletPoints: ['a', 'b'] });
    const res = await user.patch(`/api/tasks/${task.id}`, { bulletPointCompleted: [true] }).expect(200);
    expect(res.body.bulletPoints).toEqual(['a', 'b']);
    expect(res.body.bulletPointCompleted).toEqual([true, false]);
  });

  it('rejects unknown fields and missing tasks', async () => {
    const task = await newTask(user, { categoryId, title: 'x' });
    await user.patch(`/api/tasks/${task.id}`, { owner: 'me' }).expect(400);
    await user.patch('/api/tasks/99999', { title: 'y' }).expect(404);
    await user.delete('/api/tasks/99999').expect(404);
  });

  describe('subtasks', () => {
    it('nests one level under a top-level task', async () => {
      const parent = await newTask(user, { categoryId, title: 'parent' });
      const child = await newTask(user, { categoryId, title: 'child', parentId: parent.id });
      expect(child.parentId).toBe(parent.id);

      await user.post('/api/tasks', { categoryId, title: 'x', parentId: child.id }).expect(400);
      await user.patch(`/api/tasks/${parent.id}`, { parentId: parent.id }).expect(400);
      await user.patch(`/api/tasks/${parent.id}`, { parentId: child.id }).expect(400);
      await user.post('/api/tasks', { categoryId, title: 'x', parentId: 99999 }).expect(400);

      const unnested = await user.patch(`/api/tasks/${child.id}`, { parentId: null }).expect(200);
      expect(unnested.body.parentId).toBeNull();
    });

    it('deleting a task deletes its subtasks', async () => {
      const parent = await newTask(user, { categoryId, title: 'parent' });
      await newTask(user, { categoryId, title: 'child', parentId: parent.id });
      await user.delete(`/api/tasks/${parent.id}`).expect(204);
      const res = await user.get('/api/tasks').expect(200);
      expect(res.body).toEqual([]);
    });
  });

  describe('clear completed', () => {
    it('works (the route used to be shadowed by /tasks/:id)', async () => {
      const done = await newTask(user, { categoryId, title: 'done' });
      await newTask(user, { categoryId, title: 'open' });
      await user.patch(`/api/tasks/${done.id}`, { completed: true }).expect(200);

      await user.delete('/api/tasks/completed').expect(204);
      const res = await user.get('/api/tasks').expect(200);
      expect(res.body.map((t: { title: string }) => t.title)).toEqual(['open']);
    });

    it('keeps unfinished subtasks of a cleared task as top-level tasks', async () => {
      const parent = await newTask(user, { categoryId, title: 'parent' });
      const openChild = await newTask(user, { categoryId, title: 'open child', parentId: parent.id });
      const doneChild = await newTask(user, { categoryId, title: 'done child', parentId: parent.id });
      await user.patch(`/api/tasks/${parent.id}`, { completed: true }).expect(200);
      await user.patch(`/api/tasks/${doneChild.id}`, { completed: true }).expect(200);

      await user.delete('/api/tasks/completed').expect(204);
      const res = await user.get('/api/tasks').expect(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({ id: openChild.id, parentId: null });
    });

    it('can be limited to one category', async () => {
      const other = await newCategory(user, 'Other');
      const a = await newTask(user, { categoryId, title: 'a' });
      const b = await newTask(user, { categoryId: other, title: 'b' });
      await user.patch(`/api/tasks/${a.id}`, { completed: true }).expect(200);
      await user.patch(`/api/tasks/${b.id}`, { completed: true }).expect(200);

      await user.delete(`/api/tasks/completed?categoryId=${other}`).expect(204);
      const res = await user.get('/api/tasks').expect(200);
      expect(res.body.map((t: { title: string }) => t.title)).toEqual(['a']);
    });
  });

  describe('listing', () => {
    it('filters by status, category and due date (in the user’s time zone)', async () => {
      const other = await newCategory(user, 'Other');
      // Athens day of NOW: 2026-10-04T21:00Z .. 2026-10-05T21:00Z
      await newTask(user, { categoryId, title: 'late tonight', dueAt: '2026-10-05T20:30:00Z' });
      await newTask(user, { categoryId, title: 'tomorrow', dueAt: '2026-10-05T21:30:00Z' });
      await newTask(user, { categoryId: other, title: 'no date' });
      const done = await newTask(user, { categoryId, title: 'done', dueAt: '2026-10-05T08:00:00Z' });
      await user.patch(`/api/tasks/${done.id}`, { completed: true }).expect(200);

      const titles = async (query: string) =>
        (await user.get(`/api/tasks${query}`).expect(200)).body.map((t: { title: string }) => t.title);

      // Unfinished first, then by deadline (no deadline last).
      expect(await titles('')).toEqual(['late tonight', 'tomorrow', 'no date', 'done']);
      expect(await titles('?status=active')).toEqual(['late tonight', 'tomorrow', 'no date']);
      expect(await titles('?status=completed')).toEqual(['done']);
      expect(await titles(`?categoryId=${other}`)).toEqual(['no date']);
      expect(await titles('?due=today')).toEqual(['late tonight', 'done']);
      expect(await titles('?due=upcoming')).toEqual(['late tonight', 'tomorrow']);
    });
  });
});
