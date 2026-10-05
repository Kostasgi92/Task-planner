import { dayBounds, formatWidgetDateLabel, WIDGET_TASK_LIMIT } from '@tasknest/domain';
import type { RequestScope } from '../../lib/context';
import { categoriesRepository } from '../categories/categories.repository';
import { toTaskDto } from '../tasks/tasks.mapper';
import { tasksRepository } from '../tasks/tasks.repository';

export const summariesService = {
  async dashboard({ tx, userId, now, timeZone }: RequestScope) {
    const { start, end } = dayBounds(now, timeZone);
    const [counts, categoryCount] = await Promise.all([
      tasksRepository.counts(tx, userId, { start, end, now }),
      categoriesRepository.count(tx, userId),
    ]);
    return { ...counts, categoryCount };
  },

  /** Today's unfinished tasks for the widget, optionally limited to one category. */
  async widget({ tx, userId, now, timeZone }: RequestScope, categoryId?: number) {
    const { start, end } = dayBounds(now, timeZone);
    const [counts, tasks] = await Promise.all([
      tasksRepository.counts(tx, userId, { start, end, now }, categoryId),
      tasksRepository.activeDueBetween(tx, userId, { start, end }, WIDGET_TASK_LIMIT, categoryId),
    ]);
    return {
      dateLabel: formatWidgetDateLabel(now, timeZone),
      activeCount: counts.activeCount,
      // Real count, not capped at the number of tasks returned.
      dueTodayCount: counts.dueTodayCount,
      tasks: tasks.map(toTaskDto),
    };
  },
};
