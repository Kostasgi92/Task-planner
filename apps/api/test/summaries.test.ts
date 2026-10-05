import { beforeEach, describe, expect, it } from 'vitest';
import { makeClient, newCategory, newTask, resetDatabase } from './helpers';

// 23:30 UTC on Oct 4 = 02:30 on Oct 5 in Athens.
const NOW = new Date('2026-10-04T23:30:00Z');

describe('summaries', () => {
  const client = makeClient({ now: NOW });
  const athens = client('user_sum', 'Europe/Athens');
  const utc = client('user_sum', 'UTC');
  let categoryId: number;

  beforeEach(async () => {
    await resetDatabase();
    categoryId = await newCategory(athens);
  });

  it('computes "today" and "overdue" in the caller’s time zone', async () => {
    await newTask(athens, { categoryId, title: 'Oct 5 morning', dueAt: '2026-10-05T06:00:00Z' });
    await newTask(athens, { categoryId, title: 'Oct 4 evening', dueAt: '2026-10-04T18:00:00Z' });
    const done = await newTask(athens, { categoryId, title: 'done' });
    await athens.patch(`/api/tasks/${done.id}`, { completed: true }).expect(200);

    const inAthens = await athens.get('/api/summaries/dashboard').expect(200);
    expect(inAthens.body).toEqual({
      activeCount: 2,
      completedCount: 1,
      dueTodayCount: 1, // Oct 5 morning
      overdueCount: 1, // Oct 4 evening
      categoryCount: 1,
    });

    const inUtc = await utc.get('/api/summaries/dashboard').expect(200);
    expect(inUtc.body.dueTodayCount).toBe(1); // Oct 4 evening
  });

  it('widget lists today’s unfinished tasks by time, with an uncapped count', async () => {
    for (let hour = 10; hour >= 4; hour -= 1) {
      await newTask(athens, {
        categoryId,
        title: `at ${hour}`,
        dueAt: `2026-10-05T${String(hour).padStart(2, '0')}:00:00Z`,
      });
    }
    await newTask(athens, { categoryId, title: 'tomorrow', dueAt: '2026-10-06T06:00:00Z' });

    const res = await athens.get('/api/summaries/widget').expect(200);
    expect(res.body.dateLabel).toMatch(/^Monday,? 5 October$/);
    expect(res.body.activeCount).toBe(8);
    expect(res.body.dueTodayCount).toBe(7);
    expect(res.body.tasks.map((t: { title: string }) => t.title)).toEqual([
      'at 4',
      'at 5',
      'at 6',
      'at 7',
      'at 8',
    ]);
  });

  it('widget can be limited to one category', async () => {
    const other = await newCategory(athens, 'Other');
    await newTask(athens, { categoryId, title: 'mine', dueAt: '2026-10-05T06:00:00Z' });
    await newTask(athens, { categoryId: other, title: 'other', dueAt: '2026-10-05T07:00:00Z' });

    const res = await athens.get(`/api/summaries/widget?categoryId=${other}`).expect(200);
    expect(res.body.tasks.map((t: { title: string }) => t.title)).toEqual(['other']);
    expect(res.body.activeCount).toBe(1);
  });
});
