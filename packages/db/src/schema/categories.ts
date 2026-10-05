import { sql } from 'drizzle-orm';
import { check, index, pgTable, serial, text, unique } from 'drizzle-orm/pg-core';

export const categoriesTable = pgTable(
  'categories',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id').notNull(),
    name: text('name').notNull(),
    color: text('color').notNull().default('#5E61E8'),
  },
  (t) => [
    // Target of the composite foreign key on tasks: a task can only point at a
    // category that belongs to the same user.
    unique('categories_id_user_id_unique').on(t.id, t.userId),
    index('categories_user_id_idx').on(t.userId),
    check('categories_user_id_not_empty', sql`${t.userId} <> ''`),
  ],
);

export type CategoryRow = typeof categoriesTable.$inferSelect;
export type NewCategoryRow = typeof categoriesTable.$inferInsert;
