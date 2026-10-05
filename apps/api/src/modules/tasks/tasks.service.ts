import type { CreateTaskBody, ListTasksQueryParams, UpdateTaskBody } from '@tasknest/contracts/zod';
import type { NewTaskRow, TaskRow, UserScopedDb } from '@tasknest/db';
import { alignBulletCompletion, dayBounds, normalizeBulletPoints } from '@tasknest/domain';
import type { z } from 'zod';
import type { RequestScope } from '../../lib/context';
import { badRequest, notFound } from '../../lib/http-errors';
import { categoriesRepository } from '../categories/categories.repository';
import { tasksRepository as repo, type TaskFilters } from './tasks.repository';

type CreateInput = z.output<typeof CreateTaskBody>;
type UpdateInput = z.output<typeof UpdateTaskBody>;
type ListQuery = z.output<typeof ListTasksQueryParams>;

const toDate = (value: string | null | undefined) =>
  value === undefined ? undefined : value === null ? null : new Date(value);

function cleanTitle(title: string) {
  const trimmed = title.trim();
  if (!trimmed) throw badRequest('title: Title is required');
  return trimmed;
}

const cleanNotes = (notes: string | null | undefined) =>
  notes === undefined ? undefined : notes?.trim() || null;

async function assertCategory(tx: UserScopedDb, userId: string, categoryId: number) {
  if (!(await categoriesRepository.exists(tx, userId, categoryId))) {
    throw badRequest('Category not found');
  }
}

/**
 * Subtasks hang under a top-level task (the composer only offers those). Enforcing it here
 * also makes parent/child cycles impossible.
 */
async function assertParent(tx: UserScopedDb, userId: string, parentId: number, selfId?: number) {
  if (parentId === selfId) throw badRequest('A task cannot be nested under itself');
  const parent = await repo.find(tx, userId, parentId);
  if (!parent) throw badRequest('Parent task not found');
  if (parent.parentId !== null) throw badRequest('Tasks can only be nested under a top-level task');
}

export const tasksService = {
  async list({ tx, userId, now, timeZone }: RequestScope, query: ListQuery): Promise<TaskRow[]> {
    const filters: TaskFilters = { categoryId: query.categoryId, status: query.status };
    if (query.due === 'today') {
      const { start, end } = dayBounds(now, timeZone);
      filters.dueFrom = start;
      filters.dueBefore = end;
    } else if (query.due === 'upcoming') {
      filters.dueFrom = now;
    }
    return repo.list(tx, userId, filters);
  },

  async create({ tx, userId }: RequestScope, input: CreateInput): Promise<TaskRow> {
    await assertCategory(tx, userId, input.categoryId);
    if (input.parentId != null) await assertParent(tx, userId, input.parentId);
    const bullets = normalizeBulletPoints(input.bulletPoints ?? [], input.bulletPointCompleted);
    return repo.insert(tx, {
      userId,
      categoryId: input.categoryId,
      parentId: input.parentId ?? null,
      title: cleanTitle(input.title),
      notes: cleanNotes(input.notes) ?? null,
      ...bullets,
      importance: input.importance ?? 'medium',
      dueAt: toDate(input.dueAt) ?? null,
      reminderAt: toDate(input.reminderAt) ?? null,
    });
  },

  async update({ tx, userId, now }: RequestScope, id: number, input: UpdateInput): Promise<TaskRow> {
    const existing = await repo.find(tx, userId, id);
    if (!existing) throw notFound('Task not found');

    if (input.categoryId !== undefined) await assertCategory(tx, userId, input.categoryId);
    if (input.parentId != null) await assertParent(tx, userId, input.parentId, id);

    const values: Partial<NewTaskRow> = {};
    if (input.categoryId !== undefined) values.categoryId = input.categoryId;
    if (input.parentId !== undefined) values.parentId = input.parentId;
    if (input.title !== undefined) values.title = cleanTitle(input.title);
    if (input.notes !== undefined) values.notes = cleanNotes(input.notes);
    if (input.importance !== undefined) values.importance = input.importance;
    if (input.dueAt !== undefined) values.dueAt = toDate(input.dueAt);
    if (input.reminderAt !== undefined) values.reminderAt = toDate(input.reminderAt);

    if (input.bulletPoints !== undefined) {
      Object.assign(values, normalizeBulletPoints(input.bulletPoints, input.bulletPointCompleted));
    } else if (input.bulletPointCompleted !== undefined) {
      values.bulletPointCompleted = alignBulletCompletion(existing.bulletPoints, input.bulletPointCompleted);
    }

    if (input.completed !== undefined) {
      values.completed = input.completed;
      // Keep the original completion time if it was already done.
      values.completedAt = input.completed ? (existing.completedAt ?? now) : null;
    }

    if (Object.keys(values).length === 0) return existing;
    const updated = await repo.update(tx, userId, id, values);
    if (!updated) throw notFound('Task not found');
    return updated;
  },

  async remove({ tx, userId }: RequestScope, id: number) {
    if (!(await repo.remove(tx, userId, id))) throw notFound('Task not found');
  },

  async clearCompleted({ tx, userId }: RequestScope, categoryId?: number) {
    await repo.clearCompleted(tx, userId, categoryId);
  },
};
