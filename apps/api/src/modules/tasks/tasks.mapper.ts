import type { TaskRow } from '@tasknest/db';
import { alignBulletCompletion } from '@tasknest/domain';

/** Row → API shape. Lists fields explicitly so internal columns (user_id) never leave the server. */
export function toTaskDto(row: TaskRow) {
  return {
    id: row.id,
    categoryId: row.categoryId,
    parentId: row.parentId,
    title: row.title,
    notes: row.notes,
    bulletPoints: row.bulletPoints,
    bulletPointCompleted: alignBulletCompletion(row.bulletPoints, row.bulletPointCompleted),
    importance: row.importance,
    dueAt: row.dueAt?.toISOString() ?? null,
    reminderAt: row.reminderAt?.toISOString() ?? null,
    completed: row.completed,
    createdAt: row.createdAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
  };
}

export type TaskDto = ReturnType<typeof toTaskDto>;
