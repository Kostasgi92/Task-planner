import { DEFAULT_CATEGORY, FALLBACK_CATEGORY_COLOR } from '@tasknest/domain';
import type { RequestScope } from '../../lib/context';
import { notFound } from '../../lib/http-errors';
import { categoriesRepository as repo } from './categories.repository';

export const categoriesService = {
  /** Lists categories; a user with none gets the default "Personal" category. */
  async list({ tx, userId }: RequestScope) {
    let categories = await repo.listWithCounts(tx, userId);
    if (categories.length === 0) {
      await repo.lockUser(tx, userId);
      if ((await repo.count(tx, userId)) === 0) {
        await repo.insert(tx, userId, { ...DEFAULT_CATEGORY });
      }
      categories = await repo.listWithCounts(tx, userId);
    }
    return categories;
  },

  async create({ tx, userId }: RequestScope, input: { name: string; color?: string }) {
    const row = await repo.insert(tx, userId, {
      name: input.name.trim(),
      color: input.color ?? FALLBACK_CATEGORY_COLOR,
    });
    return { ...row, taskCount: 0, completedCount: 0 };
  },

  async update({ tx, userId }: RequestScope, id: number, input: { name?: string; color?: string }) {
    const values = {
      ...(input.name === undefined ? {} : { name: input.name.trim() }),
      ...(input.color === undefined ? {} : { color: input.color }),
    };
    const exists =
      Object.keys(values).length > 0
        ? await repo.update(tx, userId, id, values)
        : await repo.exists(tx, userId, id);
    if (!exists) throw notFound('Category not found');
    const category = await repo.findWithCounts(tx, userId, id);
    if (!category) throw notFound('Category not found');
    return category;
  },

  /** Deletes the category; its tasks go with it (ON DELETE CASCADE). */
  async remove({ tx, userId }: RequestScope, id: number) {
    if (!(await repo.remove(tx, userId, id))) throw notFound('Category not found');
  },
};
