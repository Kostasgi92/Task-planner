import { beforeEach, describe, expect, it } from 'vitest';
import { makeClient, newCategory, newTask, resetDatabase } from './helpers';

describe('categories', () => {
  const user = makeClient()('user_cat');

  beforeEach(resetDatabase);

  it('creates the default "Personal" category on first visit', async () => {
    const res = await user.get('/api/categories').expect(200);
    expect(res.body).toEqual([
      { id: expect.any(Number), name: 'Personal', color: '#e5b94f', taskCount: 0, completedCount: 0 },
    ]);
  });

  it('does not create duplicates when the first requests arrive together', async () => {
    const responses = await Promise.all(Array.from({ length: 5 }, () => user.get('/api/categories')));
    for (const res of responses) expect(res.status).toBe(200);
    const res = await user.get('/api/categories').expect(200);
    expect(res.body).toHaveLength(1);
  });

  it('creates, renames, recolors and counts', async () => {
    const id = await newCategory(user, '  Home  ');
    const first = await newTask(user, { categoryId: id, title: 'a' });
    await newTask(user, { categoryId: id, title: 'b' });
    await user.patch(`/api/tasks/${first.id}`, { completed: true }).expect(200);

    const renamed = await user
      .patch(`/api/categories/${id}`, { name: 'Errands', color: '#d17e62' })
      .expect(200);
    expect(renamed.body).toEqual({
      id,
      name: 'Errands',
      color: '#d17e62',
      taskCount: 2,
      completedCount: 1,
    });

    const list = await user.get('/api/categories').expect(200);
    expect(list.body.map((c: { name: string }) => c.name)).toEqual(['Errands']);
  });

  it('uses the fallback color when none is given', async () => {
    const res = await user.post('/api/categories', { name: 'Plain' }).expect(201);
    expect(res.body.color).toBe('#5E61E8');
  });

  it('validates input', async () => {
    await user.post('/api/categories', { name: '' }).expect(400);
    await user.post('/api/categories', { name: '   ' }).expect(400);
    await user.post('/api/categories', { name: 'x'.repeat(61) }).expect(400);
    await user.post('/api/categories', { name: 'Bad', color: 'red' }).expect(400);
    await user.post('/api/categories', { name: 'Bad', color: '#fff' }).expect(400);
    await user.patch('/api/categories/abc', { name: 'x' }).expect(400);
    await user.patch('/api/categories/999', { name: 'x' }).expect(404);
  });

  it('deletes a category together with its tasks', async () => {
    const id = await newCategory(user);
    const parent = await newTask(user, { categoryId: id, title: 'parent' });
    await newTask(user, { categoryId: id, title: 'child', parentId: parent.id });

    await user.delete(`/api/categories/${id}`).expect(204);
    await user.delete(`/api/categories/${id}`).expect(404);
    const tasks = await user.get('/api/tasks').expect(200);
    expect(tasks.body).toEqual([]);
  });

  it('recreates "Personal" when the last category is deleted', async () => {
    const [personal] = (await user.get('/api/categories').expect(200)).body;
    await user.delete(`/api/categories/${personal.id}`).expect(204);
    const res = await user.get('/api/categories').expect(200);
    expect(res.body.map((c: { name: string }) => c.name)).toEqual(['Personal']);
  });
});
