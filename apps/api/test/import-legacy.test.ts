import { importLegacy, type LegacyExport } from '@tasknest/db/import-legacy';
import { beforeEach, expect, it } from 'vitest';
import { makeClient, resetDatabase, testDatabaseUrl } from './helpers';

const base = {
  notes: null,
  bullet_points: [],
  bullet_point_completed: [],
  importance: 'medium',
  due_at: null,
  reminder_at: null,
  completed: false,
  created_at: '2026-01-01T10:00:00.000Z',
  completed_at: null,
};

const exported: LegacyExport = {
  categories: [
    { id: 10, user_id: 'user_old', name: 'Home', color: '#e5b94f' },
    { id: 11, user_id: 'someone_else', name: 'Not mine', color: '#d17e62' },
  ],
  tasks: [
    // Child created before its parent (re-parented later in the old app).
    { ...base, id: 20, user_id: 'user_old', category_id: 10, parent_id: 21, title: 'Child' },
    {
      ...base,
      id: 21,
      user_id: 'user_old',
      category_id: 10,
      parent_id: null,
      title: 'Parent',
      bullet_points: ['a', 'b'],
      bullet_point_completed: [true],
      due_at: '2026-02-01T09:00:00.000Z',
    },
    // Orphan left behind by the old "Clear done".
    { ...base, id: 22, user_id: 'user_old', category_id: 10, parent_id: 999, title: 'Orphan' },
    { ...base, id: 23, user_id: 'someone_else', category_id: 11, parent_id: null, title: 'Skip me' },
  ],
};

beforeEach(resetDatabase);

it('imports one user’s old data under their new account', async () => {
  const stats = await importLegacy(testDatabaseUrl(), exported, new Map([['user_old', 'user_new']]));
  expect(stats).toEqual({ categories: 1, tasks: 3, skipped: 2, promoted: 1 });

  const user = makeClient()('user_new');
  const categories = (await user.get('/api/categories').expect(200)).body;
  expect(categories).toMatchObject([{ name: 'Home', taskCount: 3 }]);

  const tasks = (await user.get('/api/tasks').expect(200)).body as Array<Record<string, unknown>>;
  const byTitle = Object.fromEntries(tasks.map((t) => [t.title, t]));
  expect(byTitle.Child.parentId).toBe(byTitle.Parent.id);
  expect(byTitle.Orphan.parentId).toBeNull();
  expect(byTitle.Parent).toMatchObject({
    bulletPoints: ['a', 'b'],
    bulletPointCompleted: [true, false],
    dueAt: '2026-02-01T09:00:00.000Z',
  });

  const other = makeClient()('someone_else');
  expect((await other.get('/api/tasks').expect(200)).body).toEqual([]);
});
