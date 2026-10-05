/**
 * Imports categories and tasks exported from the old Replit TaskNest database.
 *
 * 1. In the Replit Shell (before closing the Repl), export everything as JSON:
 *      psql "$DATABASE_URL" -At -c "select json_build_object('categories', (select coalesce(json_agg(c), '[]') from categories c), 'tasks', (select coalesce(json_agg(t), '[]') from tasks t))" > tasknest-export.json
 * 2. Sign in to the new app once, so you have your new Clerk user id (Clerk dashboard → Users).
 * 3. Run, with DATABASE_URL pointing at the new database:
 *      pnpm db:import-legacy tasknest-export.json --map <old_user_id>=<new_user_id>
 *    Repeat --map for each person. Rows of users without a mapping are skipped.
 *    `--map legacy=<new_user_id>` covers rows created before sign-in existed.
 *
 * Everything runs in one transaction: either all rows are imported or none.
 * Subtasks whose parent no longer exists (left behind by the old "Clear done") become
 * top-level tasks instead of being lost.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { eq } from 'drizzle-orm';
import { createDb } from './client';
import { categoriesTable, importanceValues, tasksTable } from './schema';

type LegacyCategory = { id: number; user_id: string; name: string; color: string };
type LegacyTask = {
  id: number;
  user_id: string;
  category_id: number;
  parent_id: number | null;
  title: string;
  notes: string | null;
  bullet_points: string[] | null;
  bullet_point_completed: boolean[] | null;
  importance: string;
  due_at: string | null;
  reminder_at: string | null;
  completed: boolean;
  created_at: string;
  completed_at: string | null;
};
export type LegacyExport = { categories: LegacyCategory[]; tasks: LegacyTask[] };

const toDate = (value: string | null) => (value ? new Date(value) : null);

export async function importLegacy(
  connectionString: string,
  data: LegacyExport,
  userMap: Map<string, string>,
) {
  const { db, pool } = createDb(connectionString, { max: 1 });
  const stats = { categories: 0, tasks: 0, skipped: 0, promoted: 0 };
  try {
    await db.transaction(async (tx) => {
      const categoryIds = new Map<number, number>();
      for (const category of data.categories) {
        const userId = userMap.get(category.user_id);
        if (!userId) {
          stats.skipped += 1;
          continue;
        }
        const [row] = await tx
          .insert(categoriesTable)
          .values({ userId, name: category.name, color: category.color })
          .returning({ id: categoriesTable.id });
        categoryIds.set(category.id, row.id);
        stats.categories += 1;
      }

      // Pass 1: insert every task top-level. Pass 2: restore parents that made it across.
      const taskIds = new Map<number, number>();
      for (const task of [...data.tasks].sort((a, b) => a.id - b.id)) {
        const userId = userMap.get(task.user_id);
        const categoryId = categoryIds.get(task.category_id);
        if (!userId || !categoryId) {
          stats.skipped += 1;
          continue;
        }
        const bulletPoints = task.bullet_points ?? [];
        const [row] = await tx
          .insert(tasksTable)
          .values({
            userId,
            categoryId,
            parentId: null,
            title: task.title,
            notes: task.notes,
            bulletPoints,
            bulletPointCompleted: bulletPoints.map((_, i) => task.bullet_point_completed?.[i] === true),
            importance: (importanceValues as readonly string[]).includes(task.importance)
              ? (task.importance as (typeof importanceValues)[number])
              : 'medium',
            dueAt: toDate(task.due_at),
            reminderAt: toDate(task.reminder_at),
            completed: task.completed,
            createdAt: toDate(task.created_at) ?? new Date(),
            completedAt: toDate(task.completed_at),
          })
          .returning({ id: tasksTable.id });
        taskIds.set(task.id, row.id);
        stats.tasks += 1;
      }

      for (const task of data.tasks) {
        if (task.parent_id === null || !taskIds.has(task.id)) continue;
        const newParent = taskIds.get(task.parent_id);
        const parent = data.tasks.find((t) => t.id === task.parent_id);
        if (!newParent || !parent || userMap.get(parent.user_id) !== userMap.get(task.user_id)) {
          stats.promoted += 1;
          continue;
        }
        await tx
          .update(tasksTable)
          .set({ parentId: newParent })
          .where(eq(tasksTable.id, taskIds.get(task.id) as number));
      }
    });
  } finally {
    await pool.end();
  }
  return stats;
}

function parseArgs(argv: string[]) {
  const file = argv.find((arg) => !arg.startsWith('--') && !arg.includes('='));
  const userMap = new Map<string, string>();
  argv.forEach((arg, index) => {
    if (arg !== '--map') return;
    const [from, to] = (argv[index + 1] ?? '').split('=');
    if (!from || !to) throw new Error(`Invalid --map value "${argv[index + 1]}", expected old=new`);
    userMap.set(from, to);
  });
  return { file, userMap };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { file, userMap } = parseArgs(process.argv.slice(2));
  const url = process.env.DATABASE_URL;
  if (!file || userMap.size === 0 || !url) {
    console.error(
      'Usage: DATABASE_URL=... pnpm db:import-legacy <export.json> --map <old_user_id>=<new_user_id>',
    );
    process.exit(1);
  }
  // pnpm runs this from packages/db; resolve the path from where the user typed the command.
  const data = JSON.parse(
    readFileSync(path.resolve(process.env.INIT_CWD ?? process.cwd(), file), 'utf8'),
  ) as LegacyExport;
  const stats = await importLegacy(url, data, userMap);
  console.log(
    `Imported ${stats.categories} categories and ${stats.tasks} tasks` +
      ` (${stats.skipped} rows skipped, ${stats.promoted} subtasks moved to top level).`,
  );
}
