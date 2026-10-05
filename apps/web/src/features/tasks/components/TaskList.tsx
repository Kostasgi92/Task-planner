import type { Category, Task } from '@tasknest/contracts/client';
import type { ReactNode } from 'react';
import { cx } from '@/lib/cn';
import { EmptyState } from './States';
import { TaskRow } from './TaskRow';

export type TaskActions = {
  onEdit: (task: Task) => void;
  onToggle: (task: Task) => void;
  onToggleBulletPoint: (task: Task, index: number) => void;
  onDelete: (task: Task) => void;
};

/** Renders top-level tasks with their subtasks nested underneath. */
export function TaskList({
  roots,
  childrenOf,
  categories,
  actions,
  emptyTitle = 'Nothing here yet',
  emptyDetail = 'Add a task and give your future self a little less to hold.',
}: {
  roots: Task[];
  childrenOf: (id: number) => Task[];
  categories: Category[];
  actions: TaskActions;
  emptyTitle?: string;
  emptyDetail?: string;
}) {
  if (!roots.length) return <EmptyState title={emptyTitle} detail={emptyDetail} />;

  const render = (task: Task, depth: number, seen: Set<number>): ReactNode => {
    const path = new Set(seen).add(task.id);
    return (
      <div key={task.id} className={cx(depth > 0 && 'ml-7 border-l border-border pl-3')}>
        <TaskRow
          task={task}
          categoryColor={categories.find((category) => category.id === task.categoryId)?.color}
          onEdit={() => actions.onEdit(task)}
          onToggle={() => actions.onToggle(task)}
          onToggleBulletPoint={(index) => actions.onToggleBulletPoint(task, index)}
          onDelete={() => actions.onDelete(task)}
        >
          {childrenOf(task.id)
            .filter((child) => !path.has(child.id))
            .map((child) => render(child, depth + 1, path))}
        </TaskRow>
      </div>
    );
  };

  return <div className="space-y-2">{roots.map((task) => render(task, 0, new Set()))}</div>;
}
