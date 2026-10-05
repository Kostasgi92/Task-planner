/** Keeps one completion flag per bullet point; anything missing counts as not done. */
export function alignBulletCompletion(
  bulletPoints: readonly string[],
  completed: readonly boolean[] | null | undefined,
): boolean[] {
  return bulletPoints.map((_, index) => completed?.[index] === true);
}

/**
 * Trims bullet points and drops empty ones, keeping each completion flag with its own item.
 */
export function normalizeBulletPoints(
  bulletPoints: readonly string[],
  completed: readonly boolean[] | null | undefined,
): { bulletPoints: string[]; bulletPointCompleted: boolean[] } {
  const items = bulletPoints
    .map((point, index) => ({ point: point.trim(), done: completed?.[index] === true }))
    .filter((item) => item.point.length > 0);
  return {
    bulletPoints: items.map((item) => item.point),
    bulletPointCompleted: items.map((item) => item.done),
  };
}

/** Flips one bullet point's completion flag. */
export function toggleBulletCompletion(
  bulletPoints: readonly string[],
  completed: readonly boolean[] | null | undefined,
  index: number,
): boolean[] {
  return bulletPoints.map((_, i) => (i === index ? completed?.[i] !== true : completed?.[i] === true));
}

type TreeNode = { id: number; parentId: number | null; completed: boolean };

export type TaskTree<T extends TreeNode> = {
  /** Top-level unfinished tasks (each shown with all of its subtasks). */
  activeRoots: T[];
  /** Top-level finished tasks (each shown with all of its subtasks). */
  completedRoots: T[];
  childrenOf: (id: number) => T[];
};

/**
 * Builds the list tree once, *then* splits it into the active and completed sections.
 *
 * A task is a root when it has no parent or its parent is not in `tasks` (for example on a
 * category page when the parent lives in another category), so no task is ever hidden.
 * Subtasks always render under their parent, whatever their own state.
 */
export function buildTaskTree<T extends TreeNode>(tasks: readonly T[]): TaskTree<T> {
  const ids = new Set(tasks.map((task) => task.id));
  const children = new Map<number, T[]>();
  const roots: T[] = [];
  for (const task of tasks) {
    if (task.parentId !== null && ids.has(task.parentId) && task.parentId !== task.id) {
      const list = children.get(task.parentId) ?? [];
      list.push(task);
      children.set(task.parentId, list);
    } else {
      roots.push(task);
    }
  }
  return {
    activeRoots: roots.filter((task) => !task.completed),
    completedRoots: roots.filter((task) => task.completed),
    childrenOf: (id) => children.get(id) ?? [],
  };
}
