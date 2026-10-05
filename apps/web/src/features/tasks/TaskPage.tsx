import { useAuth } from '@clerk/react';
import { useQueryClient } from '@tanstack/react-query';
import { type Task, useClearCompletedTasks, useDeleteTask, useUpdateTask } from '@tasknest/contracts/client';
import { buildTaskTree, formatTodayEyebrow, toggleBulletCompletion } from '@tasknest/domain';
import { Archive, ChevronDown, Plus, RotateCcw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'wouter';
import { useCategories, useDashboardSummary, useTasks, useWidgetSummary } from '@/app/api';
import { useRefreshUserData } from '@/app/query-keys';
import { useConfirm } from '@/components/ConfirmDialog';
import { PageHeading } from '@/components/layout/PageHeading';
import { cx } from '@/lib/cn';
import { PREFERENCES, usePreference } from '@/lib/preferences';
import { WidgetPreview } from '../widget/WidgetPreview';
import { SkeletonList } from './components/States';
import { StatRibbon } from './components/StatRibbon';
import { TaskComposer } from './components/TaskComposer';
import { type TaskActions, TaskList } from './components/TaskList';
import { openStateKey, readOpenState, removeOpenState, writeOpenState } from './hooks/composer-storage';

export function TaskPage({ categoryId }: { categoryId?: number }) {
  const queryClient = useQueryClient();
  const { userId } = useAuth();
  const refresh = useRefreshUserData();
  const confirm = useConfirm();
  const showWidget = usePreference(PREFERENCES.widget);

  const taskParams =
    categoryId !== undefined ? { categoryId, status: 'all' as const } : { status: 'all' as const };
  const categoriesQuery = useCategories();
  const tasksQuery = useTasks(taskParams);
  const { data: summary } = useDashboardSummary();
  const { data: widget, isLoading: loadingWidget } = useWidgetSummary(
    categoryId !== undefined ? { categoryId } : undefined,
  );
  const categories = categoriesQuery.data ?? [];
  const tasks = tasksQuery.data ?? [];

  const update = useUpdateTask();
  const remove = useDeleteTask();
  const clear = useClearCompletedTasks();

  // "New task" form state survives a reload in this tab.
  const openKey = openStateKey(userId, categoryId);
  const [composer, setComposer] = useState<'new' | Task | null>(() =>
    readOpenState(openKey)?.mode === 'new' ? 'new' : null,
  );
  useEffect(() => {
    if (composer || !userId) return;
    if (readOpenState(openKey)?.mode === 'new') setComposer('new');
  }, [composer, openKey, userId]);
  const openComposer = (next: 'new' | Task) => {
    setComposer(next);
    if (next === 'new') writeOpenState(openKey);
    else removeOpenState(openKey);
  };
  const closeComposer = () => {
    removeOpenState(openKey);
    setComposer(null);
  };

  const selectedCategory = categories.find((category) => category.id === categoryId);
  const categoryTasks =
    categoryId !== undefined ? tasks.filter((task) => task.categoryId === categoryId) : tasks;
  const activeTasks = categoryTasks.filter((task) => !task.completed);
  const completedTasks = categoryTasks.filter((task) => task.completed);
  const tree = useMemo(() => buildTaskTree(categoryTasks), [categoryTasks]);
  const categoryMissing =
    categoryId !== undefined && !categoriesQuery.isLoading && !categoriesQuery.isError && !selectedCategory;

  const actions: TaskActions = {
    onEdit: openComposer,
    onToggle: (task) =>
      update.mutate(
        { id: task.id, data: { completed: !task.completed } },
        { onSuccess: () => void refresh() },
      ),
    onToggleBulletPoint: (task, index) =>
      update.mutate(
        {
          id: task.id,
          data: {
            bulletPointCompleted: toggleBulletCompletion(task.bulletPoints, task.bulletPointCompleted, index),
          },
        },
        { onSuccess: () => void refresh() },
      ),
    onDelete: async (task) => {
      const subtasks = tree.childrenOf(task.id).length;
      const ok = await confirm({
        title: `Delete “${task.title}”?`,
        detail: subtasks
          ? `Its ${subtasks} subtask${subtasks === 1 ? '' : 's'} will be deleted too.`
          : undefined,
      });
      if (ok) remove.mutate({ id: task.id }, { onSuccess: () => void refresh() });
    },
  };

  const clearDone = async () => {
    const ok = await confirm({
      title: 'Clear all completed tasks?',
      detail: 'Unfinished subtasks of a cleared task stay on your list.',
      confirmLabel: 'Clear done',
    });
    if (ok) {
      clear.mutate(
        { params: categoryId !== undefined ? { categoryId } : undefined },
        { onSuccess: () => void refresh() },
      );
    }
  };

  const loading = categoriesQuery.isLoading || tasksQuery.isLoading;
  const loadError = categoriesQuery.isError || tasksQuery.isError;
  const pageTitle =
    selectedCategory?.name ??
    (categoryId !== undefined ? 'Category not found.' : 'A lighter day starts here.');
  const pageDetail = selectedCategory
    ? `Everything tucked inside ${selectedCategory.name}.`
    : categoryId !== undefined
      ? 'This category is no longer available in your nest.'
      : 'Keep the important things close. The rest can wait its turn.';
  const eyebrow = selectedCategory
    ? 'Focused category'
    : categoryId !== undefined
      ? 'Category'
      : formatTodayEyebrow(new Date());

  const pageAction =
    categoryId !== undefined && !selectedCategory ? (
      <Link
        href="/"
        data-testid="link-back-to-tasks"
        className="flex min-h-11 shrink-0 items-center rounded-xl border border-border bg-card px-4 text-sm font-bold transition hover:bg-muted"
      >
        Back to my tasks
      </Link>
    ) : (
      <button
        type="button"
        onClick={() => openComposer('new')}
        data-testid="button-add-task-top"
        aria-label="Add task"
        className="flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
      >
        <Plus size={17} /> <span className="hidden sm:inline">Add task</span>
      </button>
    );

  return (
    <div className="mx-auto max-w-[1100px] px-5 pb-28 pt-9 sm:px-9 sm:pt-12 lg:pb-12">
      <PageHeading eyebrow={eyebrow} title={pageTitle} detail={pageDetail} action={pageAction} />
      {categoryMissing ? (
        <div
          data-testid="category-not-found"
          className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-16 text-center"
        >
          <h2 className="font-serif text-2xl tracking-[-.03em]">This category cannot be found.</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
            It may have been deleted or belongs to a different account. Choose My tasks to continue.
          </p>
        </div>
      ) : (
        <>
          <div className="tasknest-rise">
            <StatRibbon
              activeCount={summary?.activeCount ?? activeTasks.length}
              completedCount={summary?.completedCount ?? completedTasks.length}
              dueTodayCount={summary?.dueTodayCount ?? 0}
              overdueCount={summary?.overdueCount ?? 0}
            />
          </div>
          <div className={cx('mb-7 grid gap-5', showWidget && 'lg:grid-cols-[1fr_280px]')}>
            <section className="min-w-0">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[.2em] text-muted-foreground">
                    Your list
                  </p>
                  <p data-testid="text-task-count" className="mt-1 text-sm text-muted-foreground">
                    {activeTasks.length} active {activeTasks.length === 1 ? 'task' : 'tasks'}
                  </p>
                </div>
                {completedTasks.length > 0 && (
                  <button
                    type="button"
                    disabled={clear.isPending}
                    onClick={clearDone}
                    data-testid="button-clear-completed"
                    className="flex items-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  >
                    <Archive size={14} /> Clear done
                  </button>
                )}
              </div>
              {loadError ? (
                <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center">
                  <p className="font-serif text-xl">The nest is taking a moment.</p>
                  <p className="mt-1 text-sm text-muted-foreground">We couldn't load your tasks right now.</p>
                  <button
                    type="button"
                    data-testid="button-retry-tasks"
                    onClick={() => queryClient.invalidateQueries()}
                    className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground"
                  >
                    <RotateCcw size={14} /> Try again
                  </button>
                </div>
              ) : loading ? (
                <SkeletonList />
              ) : (
                <TaskList
                  roots={tree.activeRoots}
                  childrenOf={tree.childrenOf}
                  categories={categories}
                  actions={actions}
                  emptyTitle={
                    selectedCategory ? `No tasks in ${selectedCategory.name}.` : 'A clear little horizon.'
                  }
                />
              )}
            </section>
            {showWidget && (
              <aside className="hidden lg:block" aria-label="Widget preview">
                <div className="space-y-3">
                  <p className="font-mono text-[10px] uppercase tracking-[.2em] text-muted-foreground">
                    Widget preview
                  </p>
                  <WidgetPreview
                    title={selectedCategory?.name ?? 'To-do list'}
                    tasks={widget?.tasks ?? []}
                    isLoading={loadingWidget}
                    onToggle={actions.onToggle}
                  />
                  <Link
                    href="/settings"
                    data-testid="link-widget-settings"
                    className="flex items-center justify-between px-1 text-xs font-bold text-muted-foreground transition hover:text-foreground"
                  >
                    Tune widget <ChevronDown size={14} className="-rotate-90" />
                  </Link>
                </div>
              </aside>
            )}
          </div>
          {!loading && !loadError && tree.completedRoots.length > 0 && (
            <section>
              <p className="mb-3 font-mono text-[10px] uppercase tracking-[.2em] text-muted-foreground">
                Completed · {completedTasks.length}
              </p>
              <TaskList
                roots={tree.completedRoots}
                childrenOf={tree.childrenOf}
                categories={categories}
                actions={actions}
                emptyTitle="No completed tasks"
              />
            </section>
          )}
          {composer && (
            <TaskComposer
              key={`${userId ?? 'signed-out'}:${composer === 'new' ? 'new' : composer.id}:${categoryId ?? 'all'}`}
              categories={categories}
              tasks={categoryTasks}
              defaultCategoryId={categoryId}
              initialTask={composer === 'new' ? undefined : composer}
              onClose={closeComposer}
            />
          )}
        </>
      )}
    </div>
  );
}
