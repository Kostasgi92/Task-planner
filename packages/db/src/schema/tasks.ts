import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';
import { categoriesTable } from './categories';

export const importanceValues = ['low', 'medium', 'high'] as const;
export type Importance = (typeof importanceValues)[number];

export const tasksTable = pgTable(
  'tasks',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id').notNull(),
    categoryId: integer('category_id').notNull(),
    parentId: integer('parent_id'),
    title: text('title').notNull(),
    notes: text('notes'),
    bulletPoints: text('bullet_points').array().notNull().default(sql`'{}'::text[]`),
    bulletPointCompleted: boolean('bullet_point_completed').array().notNull().default(sql`'{}'::boolean[]`),
    importance: text('importance').$type<Importance>().notNull().default('medium'),
    dueAt: timestamp('due_at', { withTimezone: true }),
    reminderAt: timestamp('reminder_at', { withTimezone: true }),
    completed: boolean('completed').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (t) => [
    unique('tasks_id_user_id_unique').on(t.id, t.userId),
    // Same-user guarantees enforced by the database, not just the API.
    foreignKey({
      name: 'tasks_category_same_user_fk',
      columns: [t.categoryId, t.userId],
      foreignColumns: [categoriesTable.id, categoriesTable.userId],
    }).onDelete('cascade'),
    foreignKey({
      name: 'tasks_parent_same_user_fk',
      columns: [t.parentId, t.userId],
      foreignColumns: [t.id, t.userId],
    }).onDelete('cascade'),
    index('tasks_user_id_idx').on(t.userId),
    index('tasks_user_category_idx').on(t.userId, t.categoryId),
    index('tasks_parent_id_idx').on(t.parentId),
    check('tasks_user_id_not_empty', sql`${t.userId} <> ''`),
    check('tasks_importance_check', sql`${t.importance} in ('low', 'medium', 'high')`),
    check('tasks_not_own_parent', sql`${t.parentId} is null or ${t.parentId} <> ${t.id}`),
  ],
);

export type TaskRow = typeof tasksTable.$inferSelect;
export type NewTaskRow = typeof tasksTable.$inferInsert;
